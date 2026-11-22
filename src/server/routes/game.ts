import { Hono } from 'hono';
import { redis, reddit } from '@devvit/web/server';

import {
  calculateIslandState,
  getDailyBoard,
  isPlayerAction,
  validateAction,
  type BoardTile,
  type PlayerAction,
} from '../../shared/game';

const ACTIONS_PER_PLAYER = 2;

type ErrorResponse = {
  status: 'error';
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyKey(date: string): string {
  return `common-ground:daily:${date}:actions`;
}

function getPlayerField(username: string, slot: number): string {
  return `player:${username.toLowerCase()}:${slot}`;
}

function parseStoredAction(
  value: string,
  board: readonly BoardTile[],
): PlayerAction | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return isPlayerAction(parsed, board) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function getActions(
  entries: Record<string, string>,
  board: readonly BoardTile[],
): PlayerAction[] {
  return Object.values(entries).flatMap((value) => {
    const action = parseStoredAction(value, board);
    return action ? [action] : [];
  });
}

function getUsedSlots(
  entries: Record<string, string>,
  username: string,
): number {
  return [1, 2].filter((slot) =>
    Boolean(entries[getPlayerField(username, slot)]),
  ).length;
}

export const game = new Hono();

game.get('/state', async (c) => {
  try {
    const username = await reddit.getCurrentUsername();

    if (!username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'A Reddit account is required.' },
        401,
      );
    }

    const date = getUtcDate();
    const board = getDailyBoard(date);
    const entries = await redis.hGetAll(getDailyKey(date));
    const actions = getActions(entries, board);
    const usedSlots = getUsedSlots(entries, username);

    return c.json({
      status: 'ok',
      date,
      username,
      remainingActions: ACTIONS_PER_PLAYER - usedSlots,
      board: [...board],
      state: calculateIslandState(actions, board),
    });
  } catch (error) {
    console.error('Game state error:', error);

    return c.json<ErrorResponse>(
      { status: 'error', message: 'Could not load the island state.' },
      500,
    );
  }
});

game.post('/actions', async (c) => {
  try {
    const username = await reddit.getCurrentUsername();

    if (!username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'A Reddit account is required.' },
        401,
      );
    }

    const date = getUtcDate();
    const board = getDailyBoard(date);

    let body: unknown;

    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Request body must be valid JSON.' },
        400,
      );
    }

    if (!isRecord(body)) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Invalid action request.' },
        400,
      );
    }

    const candidate: unknown = {
      requestId: body.requestId,
      player: username,
      actionType: body.actionType,
      tileId: body.tileId,
      createdAt: Date.now(),
    };

    if (!isPlayerAction(candidate, board)) {
      const validation = validateAction(candidate, board);

      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: validation.valid
            ? 'Invalid action.'
            : validation.reason,
        },
        400,
      );
    }

    const action = candidate;
    const key = getDailyKey(date);

    let result: 'accepted' | 'duplicate' | 'conflict' | 'full' = 'full';

    for (let slot = 1; slot <= ACTIONS_PER_PLAYER; slot += 1) {
      const field = getPlayerField(username, slot);
      const existing = await redis.hGet(key, field);

      if (existing) {
        const stored = parseStoredAction(existing, board);

        if (stored?.requestId === action.requestId) {
          result =
            stored.actionType === action.actionType &&
            stored.tileId === action.tileId
              ? 'duplicate'
              : 'conflict';
          break;
        }

        continue;
      }

      const inserted = await redis.hSetNX(
        key,
        field,
        JSON.stringify(action),
      );

      if (inserted === 1) {
        result = 'accepted';
        break;
      }

      // Another request claimed this slot after our initial read.
      const latest = await redis.hGet(key, field);
      const stored = latest ? parseStoredAction(latest, board) : undefined;

      if (stored?.requestId === action.requestId) {
        result =
          stored.actionType === action.actionType &&
          stored.tileId === action.tileId
            ? 'duplicate'
            : 'conflict';
        break;
      }
    }

    if (result === 'conflict') {
      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: 'This request ID was already used for a different action.',
        },
        409,
      );
    }

    if (result === 'full') {
      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: 'You have used both actions for today.',
        },
        429,
      );
    }

    const entries = await redis.hGetAll(key);
    const actions = getActions(entries, board);
    const usedSlots = getUsedSlots(entries, username);

    return c.json({
      status: 'ok',
      result,
      date,
      username,
      remainingActions: ACTIONS_PER_PLAYER - usedSlots,
      board: [...board],
      state: calculateIslandState(actions, board),
    });
  } catch (error) {
    console.error('Game action error:', error);

    return c.json<ErrorResponse>(
      { status: 'error', message: 'Could not record the game action.' },
      500,
    );
  }
});
