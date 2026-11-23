# Common Ground: The Living Watershed

**A cooperative daily ecological restoration game built for Reddit using Devvit.**

One island. One shared future. Every action makes a difference.

Common Ground is a multiplayer community game where Reddit users work together to restore a shared island ecosystem. Players make daily restoration decisions across forests, wetlands, farmland, and villages. Each decision affects the island's ecological balance and community wellbeing.

The objective is to build a healthier, more resilient watershed through collective action.

## The Game

### The Island

The game uses a 6 x 6 grid containing 36 terrain tiles across five terrain types:

| Terrain | Restoration action | Ecological effect |
|---|---|---|
| Forest | Plant forest | Improves water security and biodiversity |
| Wetland | Restore wetland | Strongly improves water security and biodiversity |
| Farmland | Support farmland | Improves food production and wellbeing, but reduces water security |
| Village | Support village | Improves community wellbeing, but reduces water security |
| Mountain | No restoration action | Provides part of the island's terrain landscape |

### Daily Gameplay

- Every player receives **two restoration actions per UTC day**.
- All players contribute to the same community island.
- Each action must match the terrain of the selected tile.
- Each tile can receive up to three improvement levels.
- Community actions are stored and contribute to the shared island state.
- The daily board changes its terrain layout while preserving the original terrain distribution.
- The same UTC date always produces the same board.

### Island Indicators

The island tracks four indicators:

- **Water Security:** The island's water resilience.
- **Food Production:** The island's agricultural output.
- **Biodiversity:** The health and diversity of its natural ecosystems.
- **Community Wellbeing:** The wellbeing of the island's settlements.

Each restoration action changes one or more indicators. Farmland and villages create trade-offs by increasing food production or wellbeing while placing additional pressure on water security.

Indicators are calculated from the community's valid restoration actions and constrained to a range of 0 to 100.

## Technology Stack

| Technology | Purpose |
|---|---|
| Reddit Devvit | Reddit application platform and integration |
| Phaser 4 | Interactive 2D game engine |
| TypeScript | Application logic and type safety |
| Vite | Client and server build tooling |
| Hono | Backend HTTP routes |
| Devvit Redis | Persistent community game data |
| Node.js 24+ | Development runtime |

## Architecture

The project separates the shared game rules, Reddit backend, and interactive client.

### Client

The Phaser game client provides:

- The interactive 6 x 6 island board.
- Terrain identification and restoration interactions.
- Island indicator displays.
- Community restoration progress.
- The Common Ground welcome screen.

### Server

The Hono backend provides the game API:

- `GET /api/game/state` retrieves the current daily island state.
- `POST /api/game/actions` validates and records a restoration action.

The server identifies players through their Reddit usernames. It validates actions against the current daily board and enforces the two-action daily limit.

### Persistence

Community actions are stored in Devvit Redis using date-specific keys.

The implementation includes:

- Persistent actions across page refreshes.
- Per-player daily action limits.
- Request ID checks to prevent duplicate submissions.
- Protection against conflicting reuse of request IDs.
- Server-side action validation.

### Daily Board Generation

Daily boards are generated deterministically using the UTC date.

The generator preserves the original distribution of terrain types while changing their positions. This gives the community a different island layout on different days while ensuring that all players see the same board for a given date.

The original November 22, 2026 board is preserved for compatibility with existing community contributions.

## Reddit Integration

Common Ground runs as an interactive Reddit post using Devvit.

The post workflow is moderator-controlled:

1. A subreddit moderator selects **Create Daily Challenge Post** from the subreddit menu.
2. The application creates a custom Reddit post.
3. The post loads the Common Ground welcome screen.
4. Players select **ENTER THE WATERSHED** to open the game.

A text fallback is provided for clients that cannot display the interactive post.

**Daily posting note:** The game board changes automatically according to the UTC date, but creating a new Reddit challenge post currently requires a moderator to use the menu action. An automatic daily posting scheduler is not implemented.

## Getting Started

### Requirements

- Node.js 24 or later.
- npm.
- A Reddit account.
- Access to Reddit's developer platform.
- A subreddit where you have permission to install and test Devvit applications.

### Installation

Clone the repository and enter its directory:

```bash
git clone https://github.com/Alafedoyinsola/common-ground.git
cd common-ground
```

Install dependencies:

```bash
npm install
```

Log in to Reddit:

```bash
npm run login
```

### Start a Reddit Playtest

Run:

```bash
npm run dev
```

The Devvit CLI builds the application and starts the Reddit playtest workflow. Follow the terminal instructions and open the generated playtest URL.

After installing the playtest version in your development subreddit, a moderator can use the **Create Daily Challenge Post** menu action to create an interactive game post.

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the Reddit Devvit playtest workflow |
| `npm run build` | Build the client and server |
| `npm run test:types` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run unit tests |
| `npm run login` | Authenticate the Devvit CLI |
| `npm run deploy` | Run type checking and linting, then upload the app |
| `npm run launch` | Run deployment and publish the app through Devvit |

**Publishing caution:** `npm run launch` includes `devvit publish`. It is intended for the publishing workflow, not routine local development.

## Testing

Run the project's checks individually:

```bash
npm run test:types
npm run lint
npm run test:unit
npm run build
```

The unit test suite covers:

- Daily board dimensions and tile uniqueness.
- Terrain and action compatibility.
- Invalid action rejection.
- Island indicator calculations.
- Tile improvement limits.
- Deterministic daily board generation.
- Terrain distribution preservation.
- Invalid date handling.

## Current Project Scope

The current implementation focuses on the core cooperative restoration experience.

Included:

- Shared daily island board.
- Four restoration action types.
- Two actions per player per UTC day.
- Persistent community progress.
- Four ecological and community indicators.
- Daily deterministic board layouts.
- Moderator-controlled interactive Reddit post creation.

Not currently implemented:

- Automatic scheduled Reddit post creation.
- Player roles or voting systems.
- A historical leaderboard or community archive.

## Project Information

- **Project:** Common Ground: The Living Watershed
- **Platform:** Reddit
- **Framework:** Devvit
- **Game engine:** Phaser
- **Language:** TypeScript
- **Repository:** https://github.com/Alafedoyinsola/common-ground

## Acknowledgements

Built with Reddit Devvit and Phaser.
