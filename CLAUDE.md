# Habitower

A gamified habit app: your to-dos are quests that earn XP and coins. Your life happens on a small floating **life island** (a shabby 옥탑방 you fix up, plus one building per studio that grows with its skill level). Next to it, an office tower shows your live Claude Code sessions, one Claude per session, working floor by floor. The UI text is Korean.

## Run it

- Node 18+ only, **no packages, no build step**: `node claude-office/server.js`, then open http://localhost:7777 (or `/tower`, or double-click `claude-office/start.cmd` on Windows).
- The page loads three.js, Pretendard and Galmuri from jsDelivr, so it needs internet.
- After editing `server.js`, restart the server. `office.html` and the data files are re-read on every page load.

## Files

| Path | What |
|---|---|
| `claude-office/server.js` | Reads Claude Code transcripts in `~/.claude/projects` and streams events (SSE); serves `data/*.json` at `/api/quests` and `/api/building` (GET, and PUT with an `X-Tower: 1` header, atomic write). 127.0.0.1 only. |
| `claude-office/office.html` | The whole app in one file: three.js scene, characters, life island, quests, paths, shop, editor. |
| `claude-office/data/building.json` | The config: progression curve, maps, paths, areas > categories > subcategories, studio floors and room templates, the 옥탑방's item slots, shop, starter quests. Schema in README.md. |
| `claude-office/data/quests.json` | **The user's own progress. Not in git.** Created from `seed` on first run. |
| `claude-office/README.md` | What exists, and the full config schema. |
| `claude-office/DESIGN.md` | Where it is going: life island, home and facility tiers, maps up to a Lv.80 villa, Sims-style life paths, build order and open questions. |
| `claude-office/mockups/` | Static concept sketches (life island, a 2D concept). |

## Conventions

- **Zero dependencies.** Plain JS modules in one HTML file; three.js from the CDN import map. Keep it that way unless the user decides otherwise.
- **Data-driven.** Anything a user might customise belongs in `building.json`, not hard-coded.
- **UI design rules** (from the user): Pretendard for all interface text, tracking −1.5% to −3%, tight line-height on headings; a 6:3:1 palette (near-black background · warm off-white content · one amber accent `--accent`, red only for errors); no neon glows, no decorative gradients, no cards inside cards (use rows and hairlines); generous spacing; a left reading axis. The in-world speech bubbles and name tags keep their pixel style (Galmuri).
- **3D look:** low-poly, flat-shaded, cozy farm-game greenery (the vegetation kit: `roundTree`, `pineTree`, `bush`, `scatter`, `pond`…). Scenery uses its own seeded random (`vrng`, `vhash`) so the shared `rand()` sequence (bookshelves) never shifts. Static scenery is merged with `bakeStatic` to keep draw calls low (~100–300).
- **Never test on the real `data/quests.json`** (the user's XP and coins). Start a second server: `PORT=7779 TOWER_DATA=<a temp copy of data/> node claude-office/server.js`, and delete it afterwards.
- Verify changes in the browser: no console errors, and a screenshot. Remove any test hooks afterwards.

## Where we left off (2026-10-23)

- Built: data-driven building config and editor (🏗️), linear XP curve and next-unlock chip, life paths (🧭 진로) with stage previews and free switching, the life island with instant lift travel, the 옥탑방 with seven upgradeable item slots, studio pavilions, richer vegetation, the UI redesign above.
- Next options (see DESIGN.md §12 and §13):
  - studio interiors that start makeshift at tier 1;
  - clicking island buildings to enter them;
  - the faster facility skill curve (undecided);
  - the Entrepreneur path end to end (home office, Claude working from home);
  - going online: a swappable store module, then Supabase sign-in and sync, static hosting and a PWA. The user put this on hold for now.
