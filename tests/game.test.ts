import test from "node:test";
import assert from "node:assert/strict";

import {
  BOARD_SIZE,
  BOARD_TILE_COUNT,
  DAILY_BOARD,
  getDailyBoard,
  calculateIslandState,
  isPlayerAction,
  validateAction,
  type ActionType,
  type PlayerAction,
} from "../src/shared/game.ts";

test("daily board contains exactly 36 tiles", () => {
  assert.equal(DAILY_BOARD.length, BOARD_TILE_COUNT);
  assert.equal(BOARD_TILE_COUNT, BOARD_SIZE * BOARD_SIZE);
});

test("daily board has unique tile IDs", () => {
  const ids = DAILY_BOARD.map((tile) => tile.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("daily board coordinates are within the 6x6 grid", () => {
  for (const tile of DAILY_BOARD) {
    assert.ok(tile.row >= 0 && tile.row < BOARD_SIZE);
    assert.ok(tile.column >= 0 && tile.column < BOARD_SIZE);
  }
});

const validCases: { actionType: ActionType; tileId: string }[] = [
  { actionType: "restore-wetland", tileId: "r0c3" },
  { actionType: "plant-forest", tileId: "r0c1" },
  { actionType: "support-farmland", tileId: "r3c0" },
  { actionType: "support-village", tileId: "r4c2" },
];

for (const item of validCases) {
  test(`${item.actionType} is accepted on matching terrain`, () => {
    const action: PlayerAction = {
      requestId: "test-request-1",
      player: "test-player",
      actionType: item.actionType,
      tileId: item.tileId,
      createdAt: 1_800_000_000_000,
    };

    assert.deepEqual(validateAction(action), { valid: true });
  });
}

test("unknown tile is rejected", () => {
  const action: PlayerAction = {
    requestId: "test-request-2",
    player: "test-player",
    actionType: "restore-wetland",
    tileId: "r9c9",
    createdAt: 1_800_000_000_000,
  };

  assert.deepEqual(validateAction(action), {
    valid: false,
    reason: "invalid-tile",
  });
});

test("action on incompatible terrain is rejected", () => {
  const action: PlayerAction = {
    requestId: "test-request-3",
    player: "test-player",
    actionType: "restore-wetland",
    tileId: "r0c1",
    createdAt: 1_800_000_000_000,
  };

  assert.deepEqual(validateAction(action), {
    valid: false,
    reason: "incompatible-terrain",
  });
});

test("empty request ID is rejected", () => {
  const action: PlayerAction = {
    requestId: "   ",
    player: "test-player",
    actionType: "restore-wetland",
    tileId: "r0c3",
    createdAt: 1_800_000_000_000,
  };

  assert.deepEqual(validateAction(action), {
    valid: false,
    reason: "invalid-request-id",
  });
});

test("request ID longer than 128 characters is rejected", () => {
  const action: PlayerAction = {
    requestId: "a".repeat(129),
    player: "test-player",
    actionType: "restore-wetland",
    tileId: "r0c3",
    createdAt: 1_800_000_000_000,
  };

  assert.deepEqual(validateAction(action), {
    valid: false,
    reason: "invalid-request-id",
  });
});

test("empty player name is rejected", () => {
  const action: PlayerAction = {
    requestId: "test-request-4",
    player: " ",
    actionType: "restore-wetland",
    tileId: "r0c3",
    createdAt: 1_800_000_000_000,
  };

  assert.deepEqual(validateAction(action), {
    valid: false,
    reason: "invalid-player",
  });
});

test("player name longer than 64 characters is rejected", () => {
  const action: PlayerAction = {
    requestId: "test-request-5",
    player: "a".repeat(65),
    actionType: "restore-wetland",
    tileId: "r0c3",
    createdAt: 1_800_000_000_000,
  };

  assert.deepEqual(validateAction(action), {
    valid: false,
    reason: "invalid-player",
  });
});

test("zero timestamp is rejected", () => {
  const action: PlayerAction = {
    requestId: "test-request-6",
    player: "test-player",
    actionType: "restore-wetland",
    tileId: "r0c3",
    createdAt: 0,
  };

  assert.deepEqual(validateAction(action), {
    valid: false,
    reason: "invalid-timestamp",
  });
});

test("unsafe integer timestamp is rejected", () => {
  const action: PlayerAction = {
    requestId: "test-request-7",
    player: "test-player",
    actionType: "restore-wetland",
    tileId: "r0c3",
    createdAt: Number.MAX_SAFE_INTEGER + 1,
  };

  assert.deepEqual(validateAction(action), {
    valid: false,
    reason: "invalid-timestamp",
  });
});

test("null action is rejected safely", () => {
  assert.deepEqual(validateAction(null), {
    valid: false,
    reason: "invalid-action",
  });
});

test("primitive action is rejected safely", () => {
  assert.deepEqual(validateAction("not-an-action"), {
    valid: false,
    reason: "invalid-action",
  });
});

test("unknown action type is rejected", () => {
  assert.deepEqual(
    validateAction({
      requestId: "test-request-8",
      player: "test-player",
      actionType: "build-dam",
      tileId: "r0c3",
      createdAt: 1_800_000_000_000,
    }),
    {
      valid: false,
      reason: "invalid-action-type",
    },
  );
});

function createTestAction(
  requestId: string,
  actionType: ActionType,
  tileId: string,
): PlayerAction {
  return {
    requestId,
    player: "test-player",
    actionType,
    tileId,
    createdAt: 1_800_000_000_000,
  };
}

test("empty island starts with baseline indicators", () => {
  const state = calculateIslandState([]);

  assert.deepEqual(state.indicators, {
    waterSecurity: 45,
    foodProduction: 30,
    biodiversity: 35,
    communityWellbeing: 35,
  });
  assert.equal(state.totalActions, 0);
  assert.equal(state.tiles.length, BOARD_TILE_COUNT);
});

test("one action of each type updates the correct indicators", () => {
  const actions = [
    createTestAction("wetland-1", "restore-wetland", "r0c3"),
    createTestAction("forest-1", "plant-forest", "r0c1"),
    createTestAction("farm-1", "support-farmland", "r3c0"),
    createTestAction("village-1", "support-village", "r4c2"),
  ];

  const state = calculateIslandState(actions);

  assert.deepEqual(state.indicators, {
    waterSecurity: 51,
    foodProduction: 40,
    biodiversity: 48,
    communityWellbeing: 47,
  });
  assert.equal(state.totalActions, 4);
});

test("tile improvement level is capped at three", () => {
  const actions = [
    createTestAction("wetland-1", "restore-wetland", "r0c3"),
    createTestAction("wetland-2", "restore-wetland", "r0c3"),
    createTestAction("wetland-3", "restore-wetland", "r0c3"),
    createTestAction("wetland-4", "restore-wetland", "r0c3"),
  ];

  const state = calculateIslandState(actions);
  const tile = state.tiles.find((item) => item.id === "r0c3");

  assert.equal(tile?.improvementLevel, 3);
  assert.equal(state.indicators.waterSecurity, 69);
  assert.equal(state.indicators.biodiversity, 53);
  assert.equal(state.totalActions, 3);
});

test("action order does not change the calculated island state", () => {
  const actions = [
    createTestAction("wetland-1", "restore-wetland", "r0c3"),
    createTestAction("forest-1", "plant-forest", "r0c1"),
    createTestAction("farm-1", "support-farmland", "r3c0"),
    createTestAction("village-1", "support-village", "r4c2"),
  ];

  const forward = calculateIslandState(actions);
  const reversed = calculateIslandState([...actions].reverse());

  assert.deepEqual(forward, reversed);
});

test("invalid stored actions do not affect island state", () => {
  const actions = [
    createTestAction("valid-1", "restore-wetland", "r0c3"),
    createTestAction("invalid-1", "restore-wetland", "r0c1"),
  ];

  const state = calculateIslandState(actions);

  assert.equal(state.totalActions, 1);
  assert.equal(state.indicators.waterSecurity, 53);
  assert.equal(state.indicators.biodiversity, 41);
});


test("valid action passes the PlayerAction type guard", () => {
  const action = createTestAction(
    "guard-test-1",
    "restore-wetland",
    "r0c3",
  );

  assert.equal(isPlayerAction(action), true);
});

test("malformed data fails the PlayerAction type guard", () => {
  assert.equal(isPlayerAction(null), false);
  assert.equal(isPlayerAction({ actionType: "unknown" }), false);
});


test("November 22, 2026 keeps the original community board", () => {
  assert.deepEqual(getDailyBoard("2026-11-22"), DAILY_BOARD);
});

test("the same date always produces the same daily board", () => {
  assert.deepEqual(
    getDailyBoard("2026-11-23"),
    getDailyBoard("2026-11-23"),
  );
});

test("different dates produce different board layouts", () => {
  assert.notDeepEqual(
    getDailyBoard("2026-11-23"),
    getDailyBoard("2026-11-24"),
  );
});

test("daily boards preserve the original terrain distribution", () => {
  const countTerrains = (board: readonly { terrain: string }[]) => {
    const counts: Record<string, number> = {};

    for (const tile of board) {
      counts[tile.terrain] = (counts[tile.terrain] ?? 0) + 1;
    }

    return counts;
  };

  assert.deepEqual(
    countTerrains(getDailyBoard("2026-11-23")),
    countTerrains(DAILY_BOARD),
  );
});

test("generated daily boards contain 36 unique tiles in the 6x6 grid", () => {
  const board = getDailyBoard("2026-11-23");
  const ids = board.map((tile) => tile.id);

  assert.equal(board.length, BOARD_TILE_COUNT);
  assert.equal(new Set(ids).size, BOARD_TILE_COUNT);

  for (const tile of board) {
    assert.ok(tile.row >= 0 && tile.row < BOARD_SIZE);
    assert.ok(tile.column >= 0 && tile.column < BOARD_SIZE);
  }
});

test("daily board generator rejects invalid calendar dates", () => {
  assert.throws(() => getDailyBoard("23-11-2026"));
  assert.throws(() => getDailyBoard("2026-13-45"));
  assert.throws(() => getDailyBoard("2026-02-30"));
});
