---
name: tower
description: Start Habitower (claude-office/server.js), the habit-quest tower, and open it in the browser. Use when the user says "open my tower", "open Habitower", "start the tower", "habitower", "claude office", "lifehack simulator", "퀘스트 타워 열어줘", "타워 켜줘", or runs /tower. Also use to stop or restart it ("stop the tower", "restart the tower").
---

# Habitower launcher

Habitower is a zero-dependency Node app: an office tower where project floors show live Claude Code sessions, and a life island with quests.

- App folder: `claude-office/` in this project (the folder that holds `CLAUDE.md`)
- Server: `claude-office/server.js` (Node 18+, no `npm install`), listens on `http://localhost:7777` (127.0.0.1 only)
- Data: `claude-office/data/quests.json` (the user's progress, not in git; created on first run) and `claude-office/data/building.json` (the config)

## Open the tower

1. **Is it already running?** Check the port before starting anything:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:7777/api/building
   ```
   `200` means it is up: skip to step 3.
2. **Start it in the background**, so it keeps running after this turn (never as a foreground command, it never exits). From the project root, run with Bash, `run_in_background: true`:
   ```bash
   node claude-office/server.js
   ```
   If the session is not in the project root, use the absolute path to `claude-office/server.js` instead. Then re-check step 1 (allow a second or two). If the port is taken by something else, say so, and offer another port with the `PORT` environment variable (e.g. `PORT=7778`).
3. **Open it.** In the Claude desktop app, open `http://localhost:7777` in the built-in browser (preview start with a `url`). Otherwise open it in the user's default browser (`start "" http://localhost:7777` on Windows, `open http://localhost:7777` on macOS).
4. Tell the user it is open, and the short tour if they seem new: 🏝️ life island and studios at the top of the floor guide, project floors below; **📜 퀘스트** for quests, **🧭 진로** for life paths, **🛍️ 상점** to fix up the 옥탑방, **🏗️ 건물** to edit categories and studios, **🎨 나 꾸미기** for the character.

## Stop or restart

- Stop: find what listens on 7777 and stop it (Windows PowerShell: `Get-NetTCPConnection -LocalPort 7777 -State Listen` → `Stop-Process -Id <OwningProcess>`; macOS/Linux: `lsof -ti :7777 | xargs kill`). Confirm only that process is stopped.
- Restart (needed after editing `server.js`; `office.html` and the data files are re-read on every reload): stop, then open again.

## Don'ts

- Don't edit or reset `data/quests.json` (the user's real XP, coins and history) while launching. For experiments, start a second server with `PORT=7779` and `TOWER_DATA` pointing at a copy of `data/`.
- Don't leave extra test servers running.
