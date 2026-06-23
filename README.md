# 🛢️ Rust Clan Wipe Bot

Production-ready Discord bot for tracking Rust wipe attendance. Built with **Discord.js v14**, **TypeScript**, and **SQLite**.

---

## Features

- `/wipe` — Post a wipe announcement embed with live attendance buttons
- `/attendance` — Display a formatted attendance list (Yes / Late / No + VIP)
- `/export` — Download attendance as a CSV file
- `/closewipe` — Lock the wipe so further reactions don't count
- **VIP DM flow** — Automatically DMs attending members to ask if they have VIP
- **Live embed footer** — Counts update in real-time as members click buttons
- Role-based permission guard on admin commands

---

## Requirements

- Node.js 20+
- A Discord application & bot token from the [Discord Developer Portal](https://discord.com/developers/applications)

---

## Installation

```bash
git clone <repo-url>
cd rust-clan-bot
npm install
cp .env.example .env
# Edit .env with your values
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from Discord Developer Portal |
| `CLIENT_ID` | ✅ | Application (client) ID |
| `GUILD_ID` | ❌ | Guild ID for instant command registration during dev. Leave empty for global. |
| `ALLOWED_ROLES` | ❌ | Comma-separated role IDs allowed to use `/wipe`, `/closewipe`, `/export` |
| `TEAM_ROLE_ID` | ❌ | Role mentioned in wipe announcements |
| `EMBED_COLOR` | ❌ | Hex color without `#` (default: `FF4500`) |
| `SERVER_NAME` | ❌ | Server name shown in embeds (default: `Rusticated EU Main`) |
| `TIMEZONE` | ❌ | IANA timezone string (default: `UTC`) |
| `DATABASE_PATH` | ❌ | SQLite file path (default: `./data/bot.db`) |

---

## Running Locally

```bash
# 1. Deploy slash commands (do this once, or when commands change)
npm run deploy

# 2. Start in development mode (auto-reloads on file change)
npm run dev

# 3. Or build and run in production mode
npm run build
npm start
```

---

## Docker

```bash
# Build and start
docker compose up -d

# Deploy slash commands inside the container
docker compose exec bot node dist/deploy-commands.js

# View logs
docker compose logs -f bot

# Stop
docker compose down
```

Data is persisted in Docker volumes `bot-data` and `bot-logs`.

---

## Discord Bot Permissions

In the Developer Portal, enable these **Privileged Gateway Intents**:
- *(none required beyond defaults)*

When generating the bot invite URL, select these **OAuth2 scopes**:
- `bot`
- `applications.commands`

And these **Bot Permissions**:
| Permission | Why |
|---|---|
| Send Messages | Post wipe embeds |
| Send Messages in Threads | Thread support |
| Embed Links | Rich embeds |
| Attach Files | CSV export |
| Read Message History | Fetch existing wipe messages to update them |
| Use External Emojis | Button emojis |
| Mention Everyone | Ping the team role |

---

## Slash Commands

### `/wipe`
Creates a new wipe attendance announcement.

| Option | Required | Description |
|---|---|---|
| `date` | ✅ | Wipe date (e.g. `Thursday 19 June`) |
| `time` | ✅ | Wipe time (e.g. `18:00 UTC`) |
| `notes` | ❌ | Additional notes |

**Restricted to:** roles listed in `ALLOWED_ROLES`

---

### `/attendance`
Displays current wipe attendance grouped by Yes / Late / No with VIP labels.

---

### `/export`
Sends a CSV file with columns: `Username`, `Discord ID`, `Status`, `VIP`, `Timestamp`.

**Restricted to:** roles listed in `ALLOWED_ROLES`

---

### `/closewipe`
Locks the current wipe. Buttons are disabled and the embed is updated with a 🔒 indicator.

**Restricted to:** roles listed in `ALLOWED_ROLES`

---

## Project Structure

```
src/
├── commands/          # Slash command handlers
│   ├── index.ts       # Command registry
│   ├── wipe.ts
│   ├── attendance.ts
│   ├── export.ts
│   └── closewipe.ts
├── events/            # Discord.js event handlers
│   ├── index.ts       # Event registration
│   ├── ready.ts
│   └── interactionCreate.ts
├── database/          # SQLite init & types
│   ├── index.ts
│   └── types.ts
├── services/          # Business logic
│   ├── wipeService.ts
│   └── vipService.ts
├── utils/             # Shared utilities
│   ├── embeds.ts
│   ├── logger.ts
│   └── permissions.ts
├── config/            # Env config
│   └── index.ts
├── index.ts           # Entry point
└── deploy-commands.ts # One-shot command deployer
```

---

## How the VIP Flow Works

1. A member clicks **✅ Yes** or **⏰ Late** on a wipe embed.
2. The bot immediately sends them a DM: *"Will you have VIP?"* with Yes/No buttons.
3. If their DMs are closed, the bot mentions them in the channel instead.
4. Their VIP answer is stored in the database and shown in `/attendance`.

---

## Deploying to Railway

### 1. Push your code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create rust-clan-bot --private --source=. --push
```

### 2. Create a Railway project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your repository — Railway auto-detects Node.js and runs `npm ci && npm run build`

### 3. Add a Volume (SQLite persistence)

Without a volume, your database is wiped on every deploy.

1. In your Railway service → **Volumes** → **Add Volume**
2. Set the mount path to `/data`
3. Set `DATABASE_PATH=/data/bot.db` in your environment variables (see next step)

### 4. Set environment variables

In Railway → your service → **Variables**, add every key from `.env.example`:

| Key | Value |
|---|---|
| `DISCORD_TOKEN` | Your bot token |
| `CLIENT_ID` | Your application ID |
| `GUILD_ID` | Guild ID (optional, for instant command deployment) |
| `ALLOWED_ROLES` | Comma-separated role IDs |
| `TEAM_ROLE_ID` | Role to mention in wipe embeds |
| `EMBED_COLOR` | `FF4500` |
| `SERVER_NAME` | Your server name |
| `TIMEZONE` | `UTC` |
| `DATABASE_PATH` | `/data/bot.db` |

### 5. Deploy slash commands (one-time)

After your first deploy, run the deploy-commands script once via Railway's **Shell** tab:

```bash
node dist/deploy-commands.js
```

Or run it locally pointing at the same tokens:

```bash
npm run deploy
```

Global commands take up to 1 hour to appear. Set `GUILD_ID` for instant registration during setup, then remove it once you go live.

### 6. Done

Railway will automatically redeploy on every push to your main branch. Monitor logs in Railway → **Deployments** → **View Logs**.

---

## License

MIT
