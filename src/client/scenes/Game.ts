import { Scene } from "phaser";
import * as Phaser from "phaser";
import type {
  ActionType,
  BoardTile,
  Terrain,
} from "../../shared/game";
import {
  BOARD_TILE_COUNT,
  DAILY_BOARD,
  MAX_TILE_IMPROVEMENT,
} from "../../shared/game";
import type {
  GameActionResponse,
  GameStateResponse,
} from "../../shared/api";

type TileView = {
  tile: BoardTile;
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

type MessageTone = "normal" | "success" | "error";

const ACTION_BY_TERRAIN: Record<Terrain, ActionType | null> = {
  mountain: null,
  forest: "plant-forest",
  wetland: "restore-wetland",
  farmland: "support-farmland",
  village: "support-village",
};

const TERRAIN_LABELS: Record<Terrain, string> = {
  mountain: "MTN",
  forest: "FOR",
  wetland: "WET",
  farmland: "FARM",
  village: "VIL",
};

const TERRAIN_COLORS: Record<Terrain, number> = {
  mountain: 0x68747c,
  forest: 0x23764d,
  wetland: 0x168ba0,
  farmland: 0xb78a3e,
  village: 0x9b6852,
};

export class Game extends Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private indicatorText!: Phaser.GameObjects.Text;
  private legendTitle!: Phaser.GameObjects.Text;
  private legendText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private progressTrack!: Phaser.GameObjects.Rectangle;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private messageText!: Phaser.GameObjects.Text;

  private tileViews: TileView[] = [];
  private board: readonly BoardTile[] = DAILY_BOARD;
  private gameState: GameStateResponse | undefined;
  private busy = false;

  constructor() {
    super("Game");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x10251f);

    this.titleText = this.add.text(0, 0, "COMMON GROUND", {
      fontFamily: "Arial Black",
      fontSize: 27,
      color: "#eff8e9",
      align: "center",
    }).setOrigin(0.5);

    this.subtitleText = this.add.text(
      0,
      0,
      "THE LIVING WATERSHED",
      {
        fontFamily: "Arial",
        fontSize: 11,
        color: "#9dc5a7",
        letterSpacing: 3,
        align: "center",
      },
    ).setOrigin(0.5);

    this.statusText = this.add.text(0, 0, "Loading today's watershed...", {
      fontFamily: "Arial",
      fontSize: 12,
      color: "#c8dfcc",
      align: "center",
    }).setOrigin(0.5);

    this.indicatorText = this.add.text(0, 0, "", {
      fontFamily: "Arial",
      fontSize: 13,
      color: "#f0e9d4",
      align: "center",
      lineSpacing: 5,
    }).setOrigin(0.5);

    this.legendTitle = this.add.text(0, 0, "YOUR RESTORATION GUIDE", {
      fontFamily: "Arial Black",
      fontSize: 12,
      color: "#e9f5df",
      align: "center",
    }).setOrigin(0.5);

    this.legendText = this.add.text(
      0,
      0,
      "FOREST  + Water  + Biodiversity\n" +
      "WETLAND  ++ Water  + Biodiversity\n" +
      "FARMLAND  + Food  - Water\n" +
      "VILLAGE  + Wellbeing  - Water",
      {
        fontFamily: "Arial",
        fontSize: 11,
        color: "#c8dfcc",
        align: "center",
        lineSpacing: 4,
      },
    ).setOrigin(0.5);

    this.progressText = this.add.text(0, 0, "COMMUNITY RESTORATION: 0%", {
      fontFamily: "Arial Black",
      fontSize: 11,
      color: "#e9f5df",
      align: "center",
    }).setOrigin(0.5);

    this.progressTrack = this.add.rectangle(
      0,
      0,
      200,
      9,
      0x344c40,
    ).setOrigin(0.5);

    this.progressFill = this.add.rectangle(
      0,
      0,
      0,
      9,
      0x79c58b,
    ).setOrigin(0, 0.5);

    this.messageText = this.add.text(
      0,
      0,
      "Choose a tile to help restore the island.",
      {
        fontFamily: "Arial",
        fontSize: 12,
        color: "#d6e5d5",
        align: "center",
        wordWrap: { width: 340 },
      },
    ).setOrigin(0.5);

    this.createBoard();

    this.scale.on("resize", this.handleResize, this);
    this.updateLayout(this.scale.width, this.scale.height);

    void this.loadState();
  }

  private createBoard(board: readonly BoardTile[] = this.board) {
    for (const view of this.tileViews) {
      view.background.destroy();
      view.label.destroy();
    }

    this.board = board;

    this.tileViews = board.map((tile) => {
      const background = this.add.rectangle(
        0,
        0,
        48,
        48,
        TERRAIN_COLORS[tile.terrain],
      )
        .setStrokeStyle(2, 0xc3d9c4)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(0, 0, TERRAIN_LABELS[tile.terrain], {
        fontFamily: "Arial Black",
        fontSize: 11,
        color: "#ffffff",
        align: "center",
        lineSpacing: 2,
      }).setOrigin(0.5);

      background.on("pointerover", () => {
        if (!this.busy && ACTION_BY_TERRAIN[tile.terrain]) {
          background.setStrokeStyle(3, 0xffdf8b);
        }
      });

      background.on("pointerout", () => {
        background.setStrokeStyle(2, 0xc3d9c4);
      });

      background.on("pointerdown", () => {
        void this.submitAction(tile);
      });

      return { tile, background, label };
    });
  }

  private async loadState() {
    this.setMessage("Connecting to the community island...");

    try {
      const response = await fetch("/api/game/state");
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(this.getErrorMessage(payload));
      }

      if (
        typeof payload !== "object" ||
        payload === null ||
        !("status" in payload) ||
        payload.status !== "ok"
      ) {
        throw new Error("The server returned an unexpected game response.");
      }

      this.gameState = payload as GameStateResponse;
      this.createBoard(this.gameState.board);
      this.updateLayout(this.scale.width, this.scale.height);
      this.refreshDisplay();
      this.setMessage("Choose a forest, wetland, farm or village tile.");
    } catch (error) {
      console.error("Failed to load game state:", error);
      this.statusText.setText("Unable to load the island");
      this.setMessage(
        error instanceof Error ? error.message : "Please try again.",
        "error",
      );
    }
  }

  private async submitAction(tile: BoardTile) {
    if (this.busy) return;

    if (!this.gameState) {
      this.setMessage("The island is still loading. Please wait.");
      return;
    }

    if (this.gameState.remainingActions <= 0) {
      this.setMessage(
        "You have used both of your actions for today.",
        "error",
      );
      return;
    }

    const actionType = ACTION_BY_TERRAIN[tile.terrain];

    if (!actionType) {
      this.setMessage("Mountain tiles cannot be changed in this challenge.");
      return;
    }

    this.busy = true;
    this.setMessage(`Restoring ${tile.terrain}...`);

    try {
      const requestId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const response = await fetch("/api/game/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          actionType,
          tileId: tile.id,
        }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(this.getErrorMessage(payload));
      }

      if (
        typeof payload !== "object" ||
        payload === null ||
        !("status" in payload) ||
        payload.status !== "ok"
      ) {
        throw new Error("The server returned an unexpected action response.");
      }

      const result = payload as GameActionResponse;
      this.gameState = result;
      this.refreshDisplay();

      this.setMessage(
        result.result === "duplicate"
          ? "Your previous contribution was already recorded."
          : "Contribution saved! The community island is improving.",
        "success",
      );
    } catch (error) {
      console.error("Failed to submit game action:", error);
      this.setMessage(
        error instanceof Error
          ? error.message
          : "Your action could not be saved.",
        "error",
      );
    } finally {
      this.busy = false;
    }
  }

  private refreshDisplay() {
    if (!this.gameState) return;

    const { state, username, remainingActions, date } = this.gameState;
    const { indicators } = state;

    this.statusText.setText(
      `@${username}  |  ${date}  |  ${remainingActions}/2 actions left`,
    );

    this.indicatorText.setText(
      `WATER ${indicators.waterSecurity}     FOOD ${indicators.foodProduction}\n` +
      `BIODIVERSITY ${indicators.biodiversity}     WELLBEING ${indicators.communityWellbeing}`,
    );

    const improvedTiles = new Map(
      state.tiles.map((tile) => [tile.id, tile.improvementLevel]),
    );

    for (const view of this.tileViews) {
      const level = improvedTiles.get(view.tile.id) ?? 0;
      const color = TERRAIN_COLORS[view.tile.terrain];

      view.background.setFillStyle(color);
      view.background.setAlpha(level > 0 ? 1 : 0.84);
      view.label.setText(
        level > 0
          ? `${TERRAIN_LABELS[view.tile.terrain]}\n${level}/3`
          : TERRAIN_LABELS[view.tile.terrain],
      );
    }

    const progress = Math.min(
      100,
      Math.round(
        (state.totalActions / (BOARD_TILE_COUNT * MAX_TILE_IMPROVEMENT)) *
        100,
      ),
    );

    this.progressText.setText(
      `COMMUNITY RESTORATION: ${state.totalActions}/${BOARD_TILE_COUNT * MAX_TILE_IMPROVEMENT}  |  ${progress}%`,
    );

    const barWidth = this.progressTrack.width;
    this.progressFill.setSize(barWidth * progress / 100, 9);
  }

  private getErrorMessage(payload: unknown): string {
    if (
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
    ) {
      return payload.message;
    }

    return "The request could not be completed.";
  }

  private setMessage(
    message: string,
    tone: MessageTone = "normal",
  ) {
    if (!this.messageText) return;

    const colors: Record<MessageTone, string> = {
      normal: "#d6e5d5",
      success: "#9ee6a9",
      error: "#ffaaa0",
    };

    this.messageText.setText(message);
    this.messageText.setColor(colors[tone]);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.updateLayout(gameSize.width, gameSize.height);
  }

  private updateLayout(width: number, height: number) {
    this.cameras.resize(width, height);

    this.titleText.setPosition(width / 2, 25);
    this.subtitleText.setPosition(width / 2, 52);
    this.statusText.setPosition(width / 2, 78);
    this.statusText.setFontSize(13);
    this.indicatorText.setPosition(width / 2, 117);

    const boardSize = Math.min(width - 28, height * 0.44, 500);
    const cellSize = boardSize / 6;
    const boardLeft = (width - boardSize) / 2;
    const boardTop = 150;
    const boardBottom = boardTop + boardSize;

    for (const view of this.tileViews) {
      const x = boardLeft + view.tile.column * cellSize + cellSize / 2;
      const y = boardTop + view.tile.row * cellSize + cellSize / 2;

      view.background.setPosition(x, y);
      view.background.setSize(cellSize - 3, cellSize - 3);
      view.label.setPosition(x, y);
      view.label.setFontSize(Math.max(9, Math.min(13, cellSize * 0.22)));
    }

    this.legendTitle.setPosition(width / 2, boardBottom + 14);
    this.legendText.setPosition(width / 2, boardBottom + 48);
    this.legendText.setFontSize(12);
    this.progressText.setPosition(width / 2, boardBottom + 88);
    this.progressText.setFontSize(12);

    const progressWidth = Math.min(width - 64, 320);
    const progressY = boardBottom + 106;

    this.progressTrack.setPosition(width / 2, progressY);
    this.progressTrack.setSize(progressWidth, 9);

    this.progressFill.setPosition(
      width / 2 - progressWidth / 2,
      progressY,
    );

    this.messageText.setPosition(width / 2, height - 20);
    this.messageText.setWordWrapWidth(Math.max(220, width - 30));
  }
}