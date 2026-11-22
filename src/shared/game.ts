export const BOARD_SIZE = 6;
export const BOARD_TILE_COUNT = BOARD_SIZE * BOARD_SIZE;

export type Terrain =
  | "mountain"
  | "forest"
  | "wetland"
  | "farmland"
  | "village";

export type ActionType =
  | "restore-wetland"
  | "plant-forest"
  | "support-farmland"
  | "support-village";

export type BoardTile = {
  id: string;
  row: number;
  column: number;
  terrain: Terrain;
};

export type PlayerAction = {
  requestId: string;
  player: string;
  actionType: ActionType;
  tileId: string;
  createdAt: number;
};

export type ActionValidationResult =
  | { valid: true }
  | {
      valid: false;
      reason:
        | "invalid-request-id"
        | "invalid-player"
        | "invalid-tile"
        | "invalid-timestamp"
        | "incompatible-terrain"
        | "invalid-action"
        | "invalid-action-type";
    };

export const DAILY_BOARD: readonly BoardTile[] = [
  { id: "r0c0", row: 0, column: 0, terrain: "mountain" },
  { id: "r0c1", row: 0, column: 1, terrain: "forest" },
  { id: "r0c2", row: 0, column: 2, terrain: "forest" },
  { id: "r0c3", row: 0, column: 3, terrain: "wetland" },
  { id: "r0c4", row: 0, column: 4, terrain: "wetland" },
  { id: "r0c5", row: 0, column: 5, terrain: "mountain" },
  { id: "r1c0", row: 1, column: 0, terrain: "forest" },
  { id: "r1c1", row: 1, column: 1, terrain: "forest" },
  { id: "r1c2", row: 1, column: 2, terrain: "wetland" },
  { id: "r1c3", row: 1, column: 3, terrain: "wetland" },
  { id: "r1c4", row: 1, column: 4, terrain: "forest" },
  { id: "r1c5", row: 1, column: 5, terrain: "forest" },
  { id: "r2c0", row: 2, column: 0, terrain: "forest" },
  { id: "r2c1", row: 2, column: 1, terrain: "wetland" },
  { id: "r2c2", row: 2, column: 2, terrain: "wetland" },
  { id: "r2c3", row: 2, column: 3, terrain: "forest" },
  { id: "r2c4", row: 2, column: 4, terrain: "forest" },
  { id: "r2c5", row: 2, column: 5, terrain: "forest" },
  { id: "r3c0", row: 3, column: 0, terrain: "farmland" },
  { id: "r3c1", row: 3, column: 1, terrain: "farmland" },
  { id: "r3c2", row: 3, column: 2, terrain: "wetland" },
  { id: "r3c3", row: 3, column: 3, terrain: "wetland" },
  { id: "r3c4", row: 3, column: 4, terrain: "farmland" },
  { id: "r3c5", row: 3, column: 5, terrain: "farmland" },
  { id: "r4c0", row: 4, column: 0, terrain: "farmland" },
  { id: "r4c1", row: 4, column: 1, terrain: "farmland" },
  { id: "r4c2", row: 4, column: 2, terrain: "village" },
  { id: "r4c3", row: 4, column: 3, terrain: "village" },
  { id: "r4c4", row: 4, column: 4, terrain: "farmland" },
  { id: "r4c5", row: 4, column: 5, terrain: "farmland" },
  { id: "r5c0", row: 5, column: 0, terrain: "mountain" },
  { id: "r5c1", row: 5, column: 1, terrain: "forest" },
  { id: "r5c2", row: 5, column: 2, terrain: "farmland" },
  { id: "r5c3", row: 5, column: 3, terrain: "village" },
  { id: "r5c4", row: 5, column: 4, terrain: "village" },
  { id: "r5c5", row: 5, column: 5, terrain: "mountain" },
];

const ACTION_TERRAIN: Record<ActionType, Terrain> = {
  "restore-wetland": "wetland",
  "plant-forest": "forest",
  "support-farmland": "farmland",
  "support-village": "village",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isActionType(value: unknown): value is ActionType {
  return (
    value === "restore-wetland" ||
    value === "plant-forest" ||
    value === "support-farmland" ||
    value === "support-village"
  );
}

export function validateAction(
  action: unknown,
  board: readonly BoardTile[] = DAILY_BOARD,
): ActionValidationResult {
  if (!isRecord(action)) {
    return { valid: false, reason: "invalid-action" };
  }

  if (!isActionType(action.actionType)) {
    return { valid: false, reason: "invalid-action-type" };
  }

  if (
    typeof action.requestId !== "string" ||
    action.requestId.trim().length === 0 ||
    action.requestId.length > 128
  ) {
    return { valid: false, reason: "invalid-request-id" };
  }

  if (
    typeof action.player !== "string" ||
    action.player.trim().length === 0 ||
    action.player.length > 64
  ) {
    return { valid: false, reason: "invalid-player" };
  }

  if (
    typeof action.createdAt !== "number" ||
    !Number.isSafeInteger(action.createdAt) ||
    action.createdAt <= 0
  ) {
    return { valid: false, reason: "invalid-timestamp" };
  }

  const tile = board.find((candidate) => candidate.id === action.tileId);

  if (!tile) {
    return { valid: false, reason: "invalid-tile" };
  }

  if (tile.terrain !== ACTION_TERRAIN[action.actionType]) {
    return { valid: false, reason: "incompatible-terrain" };
  }

  return { valid: true };
}


export const MAX_TILE_IMPROVEMENT = 3;

export type IslandIndicators = {
  waterSecurity: number;
  foodProduction: number;
  biodiversity: number;
  communityWellbeing: number;
};

export type ImprovedTile = BoardTile & {
  improvementLevel: number;
};

export type IslandState = {
  indicators: IslandIndicators;
  tiles: ImprovedTile[];
  totalActions: number;
};

const BASE_INDICATORS: IslandIndicators = {
  waterSecurity: 45,
  foodProduction: 30,
  biodiversity: 35,
  communityWellbeing: 35,
};

function clampIndicator(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function calculateIslandState(
  actions: readonly PlayerAction[],
  board: readonly BoardTile[] = DAILY_BOARD,
): IslandState {
  const improvementCounts = new Map<string, number>();

  for (const action of actions) {
    if (!validateAction(action, board).valid) {
      continue;
    }

    improvementCounts.set(
      action.tileId,
      (improvementCounts.get(action.tileId) ?? 0) + 1,
    );
  }

  const tiles: ImprovedTile[] = board.map((tile) => ({
    ...tile,
    improvementLevel: Math.min(
      improvementCounts.get(tile.id) ?? 0,
      MAX_TILE_IMPROVEMENT,
    ),
  }));

  let waterSecurity = BASE_INDICATORS.waterSecurity;
  let foodProduction = BASE_INDICATORS.foodProduction;
  let biodiversity = BASE_INDICATORS.biodiversity;
  let communityWellbeing = BASE_INDICATORS.communityWellbeing;

  for (const tile of tiles) {
    const level = tile.improvementLevel;

    switch (tile.terrain) {
      case "wetland":
        waterSecurity += level * 8;
        biodiversity += level * 6;
        break;

      case "forest":
        waterSecurity += level * 3;
        biodiversity += level * 7;
        break;

      case "farmland":
        waterSecurity -= level * 3;
        foodProduction += level * 10;
        communityWellbeing += level * 2;
        break;

      case "village":
        waterSecurity -= level * 2;
        communityWellbeing += level * 10;
        break;

      case "mountain":
        break;
    }
  }

  return {
    indicators: {
      waterSecurity: clampIndicator(waterSecurity),
      foodProduction: clampIndicator(foodProduction),
      biodiversity: clampIndicator(biodiversity),
      communityWellbeing: clampIndicator(communityWellbeing),
    },
    tiles,
    totalActions: tiles.reduce(
      (total, tile) => total + tile.improvementLevel,
      0,
    ),
  };
}

export function isPlayerAction(
  value: unknown,
  board: readonly BoardTile[] = DAILY_BOARD,
): value is PlayerAction {
  return validateAction(value, board).valid;
}
