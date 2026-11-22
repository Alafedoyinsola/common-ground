import { Scene } from "phaser";
import * as Phaser from "phaser";
import type {
  ActionType,
  BoardTile,
  Terrain,
} from "../../shared/game";
import { DAILY_BOARD } from "../../shared/game";
import type {
  GameActionResponse,
  GameStateResponse,
} from "../../shared/api";

type TileView = {
  tile: BoardTile;
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

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
  mountain: 0x777d83,
  forest: 0x28734b,
  wetland: 0x247e9a,
  farmland: 0xa77b38,
  village: 0x986b58,
};

export class Game extends Scene {
  private titleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private indicatorText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private tileViews: TileView[] = [];
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
      color: "#e9f5df",
      align: "center",
    }).setOrigin(0.5);

    this.statusText = this.add.text(0, 0, "Loading today's watershed...", {
      fontFamily: "Arial",
      fontSize: 15,
      color: "#c8dfcc",
      align: "center",
    }).setOrigin(0.5);

    this.indicatorText = this.add.text(0, 0, "", {
      fontFamily: "Arial",
      fontSize: 14,
      color: "#f0e9d4",
      align: "center",
      lineSpacing: 5,
    }).setOrigin(0.5);

    this.messageText = this.add.text(0, 0, "Choose a tile to help restore the island.", {
      fontFamily: "Arial",
      fontSize: 13,
      color: "#d6e5d5",
      align: "center",
      wordWrap: { width: 340 },
    }).setOrigin(0.5);

    this.createBoard();

    this.scale.on("resize", this.handleResize, this);
    this.updateLayout(this.scale.width, this.scale.height);

    void this.loadState();
  }

  private createBoard() {
    this.tileViews = DAILY_BOARD.map((tile) => {
      const background = this.add.rectangle(
        0,
        0,
        48,
        48,
        TERRAIN_COLORS[tile.terrain],
      )
        .setStrokeStyle(2, 0xd8e6d0)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(0, 0, TERRAIN_LABELS[tile.terrain], {
        fontFamily: "Arial Black",
        fontSize: 11,
        color: "#ffffff",
        align: "center",
      }).setOrigin(0.5);

      background.on("pointerover", () => {
        if (!this.busy && ACTION_BY_TERRAIN[tile.terrain]) {
          background.setStrokeStyle(3, 0xffdf8b);
        }
      });

      background.on("pointerout", () => {
        background.setStrokeStyle(2, 0xd8e6d0);
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
      this.refreshDisplay();
      this.setMessage("Tap a forest, wetland, farm or village tile to contribute.");
    } catch (error) {
      console.error("Failed to load game state:", error);
      this.statusText.setText("Unable to load the island");
      this.setMessage(
        error instanceof Error ? error.message : "Please try again.",
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
      this.setMessage("You have used both of your actions for today.");
      return;
    }

    const actionType = ACTION_BY_TERRAIN[tile.terrain];

    if (!actionType) {
      this.setMessage("Mountain tiles cannot be changed in this challenge.");
      return;
    }

    this.busy = true;
    this.setMessage(`Submitting your contribution to ${tile.terrain}...`);

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
          : "Contribution recorded. The community island has improved!",
      );
    } catch (error) {
      console.error("Failed to submit game action:", error);
      this.setMessage(
        error instanceof Error ? error.message : "Your action could not be saved.",
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
      `${username}  |  ${date}  |  Actions left: ${remainingActions}/2`,
    );

    this.indicatorText.setText(
      `WATER ${indicators.waterSecurity}   FOOD ${indicators.foodProduction}\n` +
      `BIODIVERSITY ${indicators.biodiversity}   COMMUNITY ${indicators.communityWellbeing}`,
    );

    const improvedTiles = new Map(
      state.tiles.map((tile) => [tile.id, tile.improvementLevel]),
    );

    for (const view of this.tileViews) {
      const level = improvedTiles.get(view.tile.id) ?? 0;
      const color = TERRAIN_COLORS[view.tile.terrain];

      view.background.setFillStyle(color);
      view.background.setAlpha(level > 0 ? 1 : 0.78);
      view.label.setText(
        level > 0
          ? `${TERRAIN_LABELS[view.tile.terrain]}\n${level}/3`
          : TERRAIN_LABELS[view.tile.terrain],
      );
    }
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

  private setMessage(message: string) {
    if (this.messageText) {
      this.messageText.setText(message);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.updateLayout(gameSize.width, gameSize.height);
  }

  private updateLayout(width: number, height: number) {
    this.cameras.resize(width, height);

    this.titleText.setPosition(width / 2, 35);
    this.statusText.setPosition(width / 2, 76);
    this.indicatorText.setPosition(width / 2, 119);

    const boardSize = Math.min(width - 28, height * 0.56, 560);
    const cellSize = boardSize / 6;
    const boardLeft = (width - boardSize) / 2;
    const boardTop = Math.max(165, (height - boardSize) * 0.48);

    for (const view of this.tileViews) {
      const x = boardLeft + view.tile.column * cellSize + cellSize / 2;
      const y = boardTop + view.tile.row * cellSize + cellSize / 2;

      view.background.setPosition(x, y);
      view.background.setSize(cellSize - 3, cellSize - 3);
      view.label.setPosition(x, y);
      view.label.setFontSize(Math.max(9, Math.min(13, cellSize * 0.22)));
    }

    this.messageText.setPosition(width / 2, height - 35);
    this.messageText.setWordWrapWidth(Math.max(220, width - 30));
  }
}
