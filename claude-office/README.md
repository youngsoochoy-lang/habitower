# Habitower

Build your life, one floor at a time: a 3D tower where your habits are quests and your Claude Code sessions work on the floors below.
A 3D high-rise office that shows what Claude Code is doing, live. Works with Claude Code; not affiliated with Anthropic.
Inspired by @cowboy76's Threads post.

The view is isometric, looking down on one floor of a glass tower at dusk, with the city skyline behind it.
Your office is the corner room, with floor-to-ceiling windows on two sides.
Drag to rotate, right-drag to pan and use the wheel to zoom; ⟲ resets the view.
The original 2D pixel version is still there at http://localhost:7777/pixel.

The 3D page loads three.js from cdn.jsdelivr.net, so it needs an internet connection.

### Time of day

The sky follows your computer's clock. It blends through dawn (🌌 새벽, 🌅 해돋이), 🌤️ morning, ☀️ midday, 🌤️ afternoon, 🌇 golden hour, 🌆 sunset, 🌃 evening and 🌙 night.

- **What changes:** the sun's angle and colour, shadows, stars and the moon, clouds, lit windows across the city and the tower, and how bright the office lights look.
- **Updates:** the sky repaints every minute.
- **Preview:** the clock chip at the bottom right shows the current phase. Click it to cycle through other times of day, and keep clicking to get back to live time.

### No sessions on this computer: the demo office

The tower reads Claude Code sessions on this computer (`~/.claude/projects`). When there are none (you only use cloud sessions, or you're looking at the web preview), the office still stands as **🏢 Claude 사무실 (데모)**: a scripted session plays through the same event handler on a loop (reading, searching, an Explore agent, editing, a failed check and a fix, reporting back), so you can see how it works.

### Moving between projects

Each project is a storey of the tower. The floors below yours show as lit facades with floor signs, and the floors above are ghosted glass.

- **🛗 내가 일하는 층으로 같이 이동** (on by default): when you start using Claude Code in another project, Claude and you walk into the elevator together. The camera then rides up or down the tower, and you both step out on that project's floor.
- **Picking a floor yourself:** clicking a floor in the guide rides there too, and switches auto-follow off so the view stays put. Turn the toggle back on to resume following.

### Characters

The characters are pixel-art office workers, built in 3D from little blocks with a thin dark outline, so they keep the retro pixel look inside the 3D office.

- **Look:** slim bodies, domed pixel hair, bead eyes, and varied skin tones and outfits.
- **Hair:** bob, pigtails, ponytail, bun, short, spiky or messy style.
- **Outfits:** a tee, a dress, a knit or a hoodie.
- **Accessories:** headbands, ribbons, a cap, a beanie, a fedora, a halo and glasses.
- **3D characters:** Claude is the Mage, Explore agents the hooded Rogue, Plan agents the Knight (visor up), other agents the Barbarian, and you the Rogue. All share one skeleton, so only `kaykit-rogue.glb` carries the clips; the others were stripped with `tools/strip-glb-animations.js` (3.6 MB → 0.3 MB each).
- **Your figure is a rigged 3D character:** a skinned model with a skeleton (KayKit Adventurers by Kay Lousberg, CC0, `assets/characters/`), animated by an `AnimationMixer` that picks the clip for each pose and cross-fades between them: Idle, Walking, Sit_Chair (desk, sofa), Sit_Floor (cushion), Lie_Down → Lie_Idle (bed), Cheer (dance), Interact (cooking, typing), Use_Item (snacks), with a phone in the right hand when scrolling. If the model can't load you get the block figure, and **🎨 나 꾸미기 → 몸** switches between 🧍 3D 캐릭터 and 🧱 블록.
- **Your look:** click **🎨 나 꾸미기** to change your own character (the hair and outfit options apply to the block figure). Your choice is saved in your browser.
- **Killing time:** when nothing is happening for 20 seconds on a life floor, in your 옥탑방 or on the island, your character finds something to do: 😴 a nap (sits on the bed edge or sofa, then lies back, z Z z), 📺 TV from the floor cushion or lounge sofa, 📱 doom-scrolling (in bed, phone held up), 🎮 gaming, 🍜 a snack from the fridge or water cooler, 🍳 cooking ramyeon at the hob, 🖥️ web-surfing at the desk, 💃 dancing, 🙆 stretching or ☁️ staring out of the window, with a funny line now and then. The 옥탑방 has the basics from day one: a kitchen corner (fridge, sink, hob), a wardrobe, a folding chair, cushions, a rug, a laundry basket. Pick one under 🎨 나 꾸미기 → 심심할 때, or leave it on 🎲 랜덤 to change every few minutes. Starting a quest gets you up straight away.
- **Claude** wears a coral tee with a pixel ✳ and an orange ✳ hair clip. When several sessions run on one floor, each Claude gets a different hair colour and accessory.
- **Explore agents** wear a green hoodie and cap.
- **Plan agents** have messy gray hair, glasses and a purple tee.
- **Pixel ❤️:** a pixel heart pops up when Claude brings you a finished answer, and when a subagent reports back.
- **Labels:** speech bubbles and thought labels use a pixel font (Galmuri) in pale boxes with a dark border.

### Thought clouds

Every character carries a thought cloud saying what it is doing right now, in plain words.

- **Main line:** the current tool call, for example "📖 office.html 읽는 중", "✏️ server.js 고치는 중", "⚡ Run the tests" or "🔎 'three.js fog' 검색 중".
- **Second line:** Claude's latest progress note, when there is one.
- **Speech bubbles:** reports, questions and errors briefly replace the cloud.

### Street level

1F stands on a small city-block diorama with a plaza, a road ring, trees, street lamps that light up after dark, and toy cars.
New projects stack upward as new floors.

### The life island and quests

Your life happens away from the office: on the **🏝️ 라이프 아일랜드**, a floating island with one street, listed at the top of the floor guide. The tower keeps only the project floors where Claude works.

- **Instant travel:** going to or from a life place is an instant lift trip: you step into the lift, the screen fades, and you are there. Project floors still ride the lift up and down the tower.
- **🏝️ The island:** your old block with the 🏚️ 옥탑방 on its roof, one building per studio, and empty lots with 매물 signs. Each studio building's look follows the average skill level of its rooms (임시 공간 → 동네 건물 → 번듯한 건물 → 랜드마크). The greenery grows with your level: dead trees and broken lamps at first, then trees, flowers, a pond.
- **🏚️ 내 옥탑방:** you start shabby: a mattress on the floor, a flickering bulb, a bucket under the leaky ceiling, peeling wallpaper, a rattling fan, a crate table and an old CRT. In **🛍️ 상점 › 내 옥탑방 고치기**, each of the seven slots shows its whole upgrade chain; buying the next item replaces the old one in the room (and some fixes show on the island too: the tarp comes off the roof once the ceiling is repaired). The top item of each chain unlocks at Lv.25.
- **Studio buildings:** each studio floor is now its own glass pavilion on a lawn. Starting a quest takes you straight to its building and room.

The default building has three studio buildings:

| Floor | Rooms |
|---|---|
| 🏠 홈 & 스터디 | 🧹 집안일 (kitchen and laundry) · 📚 공부 (study) · 🌱 자기계발 (meditation corner) |
| 🩰 웰니스 센터 | 🩰 발레 (mirrored studio with barres) · 🧘 필라테스 (reformers) · 🏋️ 헬스 (gym) |
| 🎹 크리에이터 스튜디오 | 🎹 피아노 (grand piano) · 🎬 영상 편집 (edit bay) · 💰 부업 (shop HQ) |

- **Quests:** click **📜 퀘스트** at the bottom of the view. Each quest has a category, an optional subcategory, a length in minutes and a repeat (매일, 매주 or 한 번). Nine sample quests are added the first time.
- **Checklists:** a quest can have subtasks. Add them when you create the quest (one per line), or with ＋ in the 전체 tab. Tick them off in the quest list; they reset with the quest each day or week.
- **▶ Start:** turns on a focus timer. You ride the elevator alone to that room, and your character does the activity (ballet turns, presses at the gym, playing the piano and so on). Claude stays behind and keeps the office running. Your thought cloud shows the countdown.
- **✓ Done:** earns XP. A quest is worth 10 XP plus 1 XP per minute. Finishing the full timer adds +50%, and each day of your streak adds +10% (up to +50%).
- **Levels:** you level up on a gentle curve: Lv.2 costs 40 XP and each level after that costs 16 XP more than the one before (Lv.10 at 936 XP, about a week of three quests a day; Lv.25 at 5,376; Lv.80 at 52,456, about 14 months). Every skill levels up too (Lv.2 at 40 XP, Lv.3 at 160, Lv.4 at 360, and so on); room signs show the skill level, and trophy cups appear on the room's shelf at Lv.2, 4 and 6.
- **Next unlock:** the pink chip next to the XP bar shows the next map and how much XP is left (hover it for the whole list). Reaching an unlock level shows a 🔓 banner. The maps themselves are still being built (see [DESIGN.md](DESIGN.md)).
- **🧭 Life paths:** the 🧭 진로 tab shows what you focused on over the last 30 days, and five paths you can grow along: 💼 사업가, 🏅 운동선수, 🎨 크리에이터, 📚 학자 and 🌿 균형 잡힌 삶.
  - Each path has stages, for example 💼 부업러 → 1인 사업자 → 스타트업 대표 → CEO. A stage needs XP in the path's categories plus a milestone (days in a row, focus timers finished, or balance across areas).
  - Open any path to preview every stage: the title it puts on your name tag, its XP perk and what it will unlock. Unlocks that are not built yet are marked 곧 열려요.
  - From Lv.15 you can pick a path. When one path's categories make up 45% of your recent XP (or none is above 40%, for 🌿), it is suggested with a banner.
  - Switching is free and loses nothing: progress is worked out from your quest history, so going back picks up where you were.
  - Your path's stage title shows under your name, its XP perk applies to that path's quests, and a 🎖️ banner marks each promotion.
- **🔥 Streak:** counts the days in a row you finished at least one quest.
- **🪙 Coins:** you earn 1 coin per 5 XP and spend them in the **🛍️ 상점** tab of the quest panel.
  - **Room decorations:** 18 items, two for each studio, from 25 to 90 coins. Examples: a mirror ball and a Swan Lake poster for ballet, a cat on a cushion for the kitchen, a crystal chandelier and a cello for the piano room, a punching bag and a "NO PAIN NO GAIN" neon for the gym, and a gold safe and a "LIKE A BOSS" neon for the side hustle. Bought items appear in the room right away. You can hide or show each one, and 📍 takes you to its room.
  - **Outfits:** 13 items, from 20 to 120 coins: the bun and spiky hairstyles, pink, mint and silver hair, the hoodie and the dress, pink and gold shirts, and the beanie, cap, fedora and halo. Locked options show 🔒 in 🎨 나 꾸미기 too; clicking one there offers to unlock it. Anything you were already wearing when the shop opened stays free.
- **Working with Claude counts too:** every turn Claude finishes in the office adds 2 XP to the ✳ 업무 skill.
- **Quest boards:** each studio building's lobby has a board showing its quests.
- **Storage:** quests, history and what you own are saved in `data/quests.json` next to `server.js` (or the folder in `TOWER_DATA`). It is plain JSON, so you can ask Claude Code to add or change quests and the page picks up the change within a few seconds.

### Building your own tower (🏗️ 건물)

Categories, rooms and floors are not hardcoded. They come from `data/building.json`, and the **🏗️ 건물** tab of the quest panel edits that file for you.

- **Categories:** add, rename or remove a category or a subcategory, and change its icon, name and activity pose. Adding a category builds a new room for it straight away. If the floors are full, a new floor appears on top, and you can ride there and do quests in the new room.
- **Rooms:** pick each category's room template (any template fits in any of a floor's three zones), its floor and its floor colour.
- **Floors:** rename a floor, or delete one that has no rooms left.
- **Deleting a category:** its room goes too. Its quests stay, listed under ❔ 기타, until you delete them.

Changes save at once and the tower rebuilds. You can also edit `data/building.json` by hand (or ask Claude Code to), and the page picks it up within a few seconds.

#### `data/building.json` schema

The server serves it at `GET /api/building` and saves it with `PUT /api/building`, the same way as `/api/quests`: the PUT needs an `X-Tower: 1` header, and the file is written to a temp file and renamed, so a write is never half done. If the file is missing, the tower has no life floors until you add some.

```jsonc
{
  "version": 1,
  "progression": { "curve": "linear", "base": 40, "step": 16 },   // your level curve
  "maps": [                               // places that unlock with your level (shown in the next-unlock chip)
    { "id": "rooftop", "icon": "🌿", "ko": "옥상 정원", "en": "ROOFTOP GARDEN", "unlock": { "level": 10 }, "scene": "rooftop", "planned": true }
  ],
  "areas": [                              // area > category > subcategory
    { "id": "home", "ko": "홈 & 스터디", "en": "HOME & STUDY", "icon": "🏠",
      "categories": [
        { "id": "chores",                 // what quests.json's "cat" points at
          "ko": "집안일", "en": "HOME CARE", "icon": "🧹",
          "verb": "집안일 하는 중",        // shown while you do one of its quests
          "pose": "sweep",                // see the pose list below
          "subs": [                       // optional
            { "id": "laundry", "ko": "빨래", "en": "LAUNDRY", "icon": "🧺", "verb": "빨래 하는 중", "pose": "sweep" }
          ] }
      ] }
  ],
  "floors": [                             // bottom to top, above the project floors
    { "id": "life:home", "name": "🏠 홈 & 스터디", "en": "HOME & STUDY",
      "rooms": [                          // rooms[i] stands in zone i; null leaves a zone empty
        { "template": "chores", "cat": "chores" },
        { "template": "learning", "cat": "learning", "tint": "#8a6446" },
        null
      ] }
  ],
  "shop": {
    "decor": [ { "id": "cat", "model": "cat", "template": "chores", "icon": "🐱", "name": "고양이와 방석", "price": 60 } ],
    "outfits": { "hairStyle:bun": 20, "acc:halo": 120 }
  },
  "seed": [ { "title": "빨래 개고 정리하기", "cat": "chores", "minutes": 15, "repeat": "daily" } ]
}
```

| Field | Meaning |
|---|---|
| `progression` | Your level curve. `linear`: each level costs `base + step × (L − 1)` XP (default 40 and 16). `sqrt`: the old curve, `base × (L − 1)²` XP in total. Skill levels always use the old curve. |
| `maps[]` | Places unlocked by level: `id`, `icon`, `ko`, `en`, `unlock.level`, `scene`. `planned: true` marks a map that is not built yet ("곧 열려요"). |
| `pathRules` | When paths open up: `minLevel` (15), `focusShare` (0.45: the share of recent XP that suggests a path), `balancedMax` (0.4: below this for every path suggests 🌿), `windowDays` (30). |
| `paths[]` | `id`, `icon`, `ko`, `en`, `desc`, `categories` (category ids, or `"*"` for all), `balanced`, `stages[]`. |
| `stages[]` | `ko`, `en`, `title` (shown under your name), `needXP` (XP in the path's categories), `milestone` (`streak`: best run of days in a row; `focused`: full timers finished; `quests`: quests finished; `balance`: the smallest area share over the window), `perk.xp` (bonus XP on the path's quests), `unlocks[]` (`icon`, `ko`, `planned`). |
| `areas[]` | Groups of categories (`id`, `ko`, `en`, `icon`, `categories[]`). They group the editor and the quest form; they do not decide floors. |
| `categories[]` | `id` (unique; `work` is reserved for ✳ 업무, the XP Claude's turns earn), `ko`, `en` (written on the room floor), `icon`, `verb`, `pose`, `subs[]`. |
| `subs[]` | Subcategories: `id`, `ko`, `en`, `icon`, `verb`, `pose`. A quest with a `sub` uses its icon, verb and pose. |
| `pose` | One of `sweep`, `read`, `meditate`, `ballet`, `pilates`, `lift`, `piano`, `type`, `write`. |
| `floors[]` | `id` (`life:` is added if missing), `name` (floor guide and sign), `en` (lobby floor text), `rooms[]`. |
| `rooms[]` | By zone: 0 and 1 are the two rooms along the back glass, 2 is the front-left room. A floor with more than three rooms carries on in extra storeys (`<id>~2`, `<name> 2`, …). A category no floor lists gets a plain room on a 🧩 더 많은 방 floor. |
| `template` | `chores`, `learning`, `growth`, `ballet`, `pilates`, `gym`, `piano`, `video`, `hustle` or `blank` (a plain room with a sign, and a desk or a mat that suits the pose). An unknown template falls back to `blank`. |
| `tint` | Optional floor colour for the room (`#rrggbb`). |
| `shop.decor[]` | Decorations sold in 🛍️ 상점: `model` is one of the decoration models built into `office.html` (`cat`, `sunflower`, `globe`, `moodrug`, `lanterns`, `monstera`, `mirrorball`, `swan`, `mats`, `hanging`, `bag`, `nopain`, `chandelier`, `cello`, `mic`, `rgb`, `boss`, `safe`). It appears in whichever room uses its `template`. |
| `shop.outfits` | `"<option>:<value>": price` for outfits locked in 🎨 나 꾸미기. |
| `home` | Your first home: `id`, `ko`, `icon`, and `slots[]`, each with `id`, `icon`, `ko` and `tiers[]` (`ko`, `price`, `minLevel`). Tier 0 is the shabby item you start with; the 3D models for each slot's tiers are built into `office.html`. |
| `seed[]` | The quests added the first time `data/quests.json` is created. |

`data/quests.json` also keeps your home's slots, `home` (`{ "bed": 2, "light": 1, … }`, the tier you have in each), and your life path: `path` (`{ id, since }`, or null), `pathSeen` (the last stage you were shown per path, for promotion banners) and `pathOffered` (the last path suggested to you).

Quests in `data/quests.json` keep `cat`, and may also have `sub` (a subcategory id) and `subtasks`:

```json
{ "id": "q…", "title": "하체 근력 운동", "cat": "gym", "sub": "legs", "minutes": 45, "repeat": "weekly",
  "subtasks": [ { "title": "스쿼트 3세트", "done": "2026-10-21" }, { "title": "런지 3세트", "done": null } ],
  "done": [], "created": 1792566745462 }
```

A subtask's `done` is the day it was ticked (or `null`). It counts for today (daily quests), this week (weekly quests) or for good (one-off quests), the same way the quest's own `done` does.

Room templates are drawn for one zone and carried to any other: furniture keeps its size and moves with the room (turned round when the door is on the other side), while floors and long pieces such as mirror walls stretch to fit.

### Courses (📦 코스), your own edits, and goals (🎯 목표)

A course pack is a ready-made life plan: its own areas, categories, subcategories, floors, paths, goals and starter quests. `/api/building` returns every pack it finds next to `building.json`, and the page lays them over it at load time. Packs **add to** the defaults; they never replace them.

The **📦 코스** tab lists them. Curated courses ship in `data/packs/` and are off until you press **이 코스 시작**: 📱 인플루언서, 🎤 K-pop 아이돌, 🍣 스시 셰프, 🏝️ 부자 은퇴 (파이어족), 💻 개발자, 🏃 마라토너 (generated by `tools/make-courses.py`). Starting one adds its floor, skills, path, goals and starter quests; **그만두기** asks first, then removes the starter quests you never did (anything you did, and its XP, stays). Your own packs in `data/private/` are on unless you switch them off.

| Folder | In git? | For |
|---|---|---|
| `data/packs/` | yes | curated courses anyone can start |
| `data/private/` | **no** (git-ignored) | your own pack (`personal.json`) and your edit layer (`user.json`) |

**Edit anything, from the page.** In **전체** every category (even an empty one) has ✏️ (rename, icon, pose, weekly target hours, subcategories: rename, delete, add) and ＋ (quick-add a quest); every quest has ✏️ (title, category, subcategory, minutes, repeat and how often, cue, two-minute version, subtasks), ＋ (subtask) and 🗑. **＋ 새 카테고리** makes a category with its own room on a '✨ 내 공간' floor. In **🎯 목표** every goal has ✏️ and 🗑, numbers have *마지막 기록 지우기*, and **＋ 새 목표** makes a number or checklist goal. These edits never touch `building.json` or a pack file: they go to `data/private/user.json` (a pack with `edit`, `hide`, `areas`, `floors`, `goals`, `weeklyHours` and `courses`), which is applied last. A deletion only hides the item, so it can always come back.

**Undo everything.** Every change (completing or deleting a quest, editing, recording a goal, buying, starting or leaving a course, 🏗️ edits) shows a **↩ 되돌리기** toast for 10 seconds; **Ctrl+Z** (⌘Z) undoes further back, up to 50 steps. The app no longer uses browser confirm/prompt pop-ups.

The 🏗️ editor still edits `building.json` (rooms and floors); it shows what a pack or your layer added with 📦 and locks it there.

To keep a private pack in sync across computers, make a **private** GitHub repo for it and clone that repo into the folder: `git clone https://github.com/<you>/habitower-private claude-office/data/private`. The main repo stays public; the private one only you can see.

```jsonc
{
  "pack": { "id": "personal", "version": 1, "ko": "나의 코스", "en": "MY COURSE", "desc": "…" },
  "weeklyHours": { "deal": 7.5, "english": 7 },            // the weekly plan shown in 🎯 목표
  "areas": [                                                // a new area id adds an area…
    { "id": "career", "ko": "커리어 & 자산", "icon": "💼", "categories": [ { "id": "deal", "ko": "M&A·전략", "pose": "type", "subs": [ … ] } ] },
    { "id": "creative", "categories": [ { "id": "video", "subs": [ … ] } ] }   // …an existing category only gains subs
  ],
  "floors": [ { "id": "life:career", "name": "💼 커리어 & 언어", "rooms": [ { "template": "hustle", "cat": "deal" } ] } ],
  "paths":  [ { "id": "dealmaker", "categories": ["deal", "english", "invest"], "stages": [ … ] } ],   // same shape as building.json paths
  "goals":  [
    { "id": "yt", "icon": "▶️", "ko": "유튜브 구독자", "kind": "number", "unit": "명",
      "milestones": [ { "at": 1000, "ko": "1천", "by": "2027.07" } ], "note": "…" },
    { "id": "weight", "kind": "number", "unit": "kg", "delta": true, "milestones": [ { "at": 2 } ] },   // counted from the first value you record
    { "id": "repertoire", "kind": "checklist", "items": [ { "id": "r1", "ko": "쇼팽 왈츠 A단조", "tier": "1단계" } ] }
  ],
  "seed": [ { "title": "쉐도잉: 1분 클립 따라 하기", "cat": "english", "sub": "fluency", "minutes": 5, "repeat": "daily",
              "cue": "아침 커피 내리는 동안", "easy": "한 문장 3번", "subtasks": ["그냥 듣기", "따라 말하기 ×3"], "days": [1, 2, 3, 4, 5] },
            { "title": "발레 클래스", "cat": "ballet", "minutes": 75, "repeat": "weekly", "times": 2 } ],
  "retire": [ "old starter quest title" ]
}
```

- **Starter quests** arrive once per pack `version`; on an upgrade, a starter quest whose category moved follows it (tracked in `quests.json` → `packs`), skipping titles you already have. Bump `version` to send new ones. A pack can list old starter quest titles in `retire`: on the upgrade those are removed, but only if you never completed them.
- **Routines and schedules:** a daily quest can carry `days` (weekdays it's on, 0 = Sun … 6 = Sat; `[]` pauses it), and a `weekly` or `monthly` quest `times` (how often per period, e.g. ballet 2 a week, a lesson 4 a month). The 📅 일정 tab books flexible sessions day by day for this week or next (with an optional time), sets how often and whether that counts per week or per month (주 ⇄ 월), and toggles routine weekdays; 전체 / 해제 select or clear all seven days at once. A booked session shows under 📅 오늘 일정 on its day, and a weekly quest booked for another day stays off 오늘 until then. Bookings live in `quests.json` → `book` (`{ weekStart: { questId: { date: "HH:MM" } } }`).
- **Small habits (Atomic Habits):** any quest can carry a `cue` (the habit stack: when or after what you do it) and an `easy` two-minute version. The quest row shows both, and a daily quest you missed yesterday says so and offers the two-minute version, so you never miss twice.
- **Goals** follow real-world numbers that XP can't: followers, net worth, kg, pieces learned. You enter values in 🎯 목표; they are saved in `quests.json` → `goals` (on your machine only, like the rest of your progress). The tab also shows this week's hours per category against `weeklyHours`, counted from the quests you finished.
- New categories can only use the existing poses and room templates, since the 3D rooms are drawn in code.

### Floor plans

Every project floor uses the same layout for now. Rooms, door positions and seats are all defined in `ROOMDEF` / `ROOM_BOX` in `office.html`, so a per-project layout can be added later. Life floors are laid out from `data/building.json` (see above); the three room zones are `ZONES` in `office.html`.

## Roadmap

Where Habitower is heading is written up in [DESIGN.md](DESIGN.md). In short:

- **A reachable XP curve:** Lv.80 in about 14 months of steady play instead of 5–7 years.
- **A life island:** your life spaces leave the office tower for a floating island with one street, reached instantly by lift. You start in a shabby 옥탑방 next to empty lots, replace its worn-out things with coins, and watch each habit's building grow with its skill (sketch: [mockups/life-island.html](mockups/life-island.html)).
- **Homes and islands unlocked by level:** 🌿 옥탑 정원 (Lv.10), 🏠 원룸 (15), 🏡 타운하우스 (25), 🏖️ beach-house island (40), 🏔️ mountain-cabin island (50), 🌃 penthouse (60), a 🏛️ hillside villa above the city with a garage of original supercars (80), and your own 🏝️ island resort (100).
- **Sims-style life paths** that follow what you focus on: 💼 Entrepreneur, 🏅 Athlete, 🎨 Creator, 📚 Scholar or 🌿 Balanced Life, each with stages, promotions and perks. Entrepreneurs eventually leave the office and work from home, with their Claude sessions working at the home desk.

## Run it

Requires Node.js 18+ (no `npm install`, no packages).

```
node server.js
```

Then open http://localhost:7777. On Windows you can also double-click `start.cmd`.

Leave it open next to your terminal or the Claude desktop app and work as usual.

## What you see

| Room | When Claude goes there |
|---|---|
| 📚 Library · 자료실 | Read, Grep, Glob, ToolSearch: opens a book |
| 💻 Dev · 개발실 | Edit, Write: code scrolls on the iMac |
| 🗄️ Server · 서버실 | Bash, PowerShell, git: rack LEDs speed up while it runs |
| 🌐 Research · 정보검색실 | WebSearch, WebFetch, MCP tools, browser |
| 🗒️ Meeting · 회의실 | TodoWrite / plan updates, which get written on the whiteboard |
| 🌇 My office · 내 자리 | AskUserQuestion / ExitPlanMode, plus final answers: Claude walks to *your* corner office |

- 💭 Cloud bubble while thinking. Claude Code redacts thinking text in its logs, so the cloud usually just shows "…".
- 💦 Cold sweat and a red bubble when a tool fails.
- 📞 Agent/Task calls: Claude makes a phone call, then a subagent arrives by elevator.
  Explore wears green with a cap, Plan wears purple with glasses, and other agents get their own colours.
  When it finishes, the subagent walks over to Claude, reports, says "👋 퇴근합니다!" and leaves by elevator.
  If it gets more work on the way out, it goes back to work.
- Floors are projects, and the stores on each floor are sessions. A green light means the floor was active in the last 2 minutes.
  Click a floor to take the elevator there, or click a store to watch just that one session.
- **One Claude per session:** by default (👥 활동 중인 세션 모두 보기) every session on the floor that was written in the last 10 minutes gets its own Claude, desk, thought cloud and subagents.
  Their name tags read "Claude · <session title>", and up to four Claudes have their own desks in the open plan.
  A session that starts on the floor (including after `/clear`) brings a new Claude up by elevator, and a session that has been quiet for 10 minutes sends its Claude home.
  When you change floors, every Claude on the floor rides the elevator with you.
- After 90 s of quiet a Claude dozes off at its desk. After 10 minutes the lights go out.

## How it works

`server.js` reads Claude Code's own transcripts in `~/.claude/projects/<project>/<session>.jsonl`
and in `<session>/subagents/agent-*.jsonl`. It checks them for new lines every 250 ms
and streams simplified events to the page over Server-Sent Events.
It is read-only: it changes no hooks or settings. It listens on 127.0.0.1 only, so only your machine can open it.

Options (environment variables):

- `PORT`: default `7777`
- `CLAUDE_PROJECTS_DIR`: override where transcripts are read from
- `TOWER_DATA`: the folder for `quests.json` and `building.json` (default `data/` next to `server.js`)

## Known limits

- Permission prompts aren't written to the transcript, so they aren't shown.
- With more than four sessions on one floor, the extra Claudes share desks.
- The meeting-room whiteboard shows the plan of whichever Claude updated its plan most recently.
