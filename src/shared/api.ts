import type { IslandState } from "./game";

export type InitResponse = {
  type: "init";
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: "increment";
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: "decrement";
  postId: string;
  count: number;
};

export type GameStateResponse = {
  status: "ok";
  date: string;
  username: string;
  remainingActions: number;
  state: IslandState;
};

export type GameActionResponse = GameStateResponse & {
  result: "accepted" | "duplicate";
};
