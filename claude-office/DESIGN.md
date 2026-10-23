# Habitower — game design

*Build your life, one floor at a time.*

Status: draft, 2026-10-22. Built so far: step 1 (XP curve, next-unlock chip) and step 2 (life paths v1), 2026-10-23. Updated 2026-10-23: life spaces move to a life island (section 5). Step 3 (life island v1) built 2026-10-23. This document describes where Habitower is going. [README.md](README.md) describes what exists today.

## 1. Vision

Habitower turns habits into a life-sim. Your to-dos are quests. Doing them earns XP and coins, and they grow a little world you live in. Your Claude Code sessions work in an office tower; your life happens on a small floating island next to it. You start in a shabby rooftop room on an almost empty street, and the island grows into a neighbourhood, and later new islands, as you level up, and it takes a different shape depending on what you spend your time on, the way a Sim's life follows their aspiration and career.

Two questions drive the design:

- **How far have I come?** Your **level**: it upgrades your home (옥탑방 → … → villa → island resort) and unlocks new islands. Each habit's **skill level** upgrades its own building on your street.
- **Who am I becoming?** Your **life path**, picked up from what you actually focus on: entrepreneur, athlete, creator, scholar, or a balanced life.

## 2. Design principles

1. **Reward consistency, not overwork.** Progress comes from streaks, focus share and milestones, never from raw hours alone. Promotions must not push people into working longer.
2. **Balance is a valid path.** A user who spreads time evenly gets rewards too: the 🌿 Balanced Life path.
3. **Always something next.** The next unlock is always visible and never more than a few weeks away.
4. **Choices, not labels.** The game *offers* a path when it sees a focus; the user accepts, waits or picks another one, and can switch later.
5. **Data-driven.** Maps, paths, stages and shop items live in `data/building.json`, so other users, and later a cloud or mobile version, can define their own (see the schema in the README).
6. **Keep the look.** Low-poly 3D with pixel-art characters, dusk skies, warm interior light. No new dependencies.

## 3. What exists today

- A 3D tower. Project floors show live Claude Code sessions (one Claude per session, subagents arriving by lift). Life floors hold category rooms (ballet, gym, piano, side hustle, …).
- Quests with a category and optional subcategory, a timer, a repeat (daily / weekly / once) and an optional checklist. XP, coins, a streak and per-category skill levels.
- A shop with 18 room decorations and 13 outfits.
- The 🏗️ 건물 editor: areas > categories > subcategories, a room template per category, floors of three rooms.

## 4. Progression and the XP curve

### Problem

Today `Lv = ⌊√(XP / 40)⌋ + 1`. At a realistic 120 XP a day (three 30-minute quests), Lv.80 takes about **2,080 days (5.7 years)**. Mid-game unlocks are too slow as well: Lv.25 takes about 6 months.

### Proposal

Each level costs **40 + 16 × (L − 1)** XP to reach the next one. That is a gentle linear ramp: every level costs a bit more than the last.

| Level | Total XP (new) | Days at 120 XP/day (new) | Days (today's curve) |
|---|---:|---:|---:|
| 5 | 256 | 2 | 5 |
| 10 | 936 | 8 | 27 |
| 15 | 2,016 | 17 | 65 |
| 25 | 5,376 | 45 | 192 |
| 40 | 13,416 | 112 | 507 |
| 60 | 29,736 | 248 | 1,160 |
| 80 | 52,456 | **437 (~14 months)** | 2,080 |

- This curve is for the **player level** only. **Skill (category) levels** keep their current curve, so trophies at Lv.2, 4 and 6 stay meaningful.
- **Migration:** a player's level only goes up with the new curve. Nothing is taken away.
- **XP sources stay as they are:** 10 + 1 per minute; +50% for finishing the full timer; up to +50% for the streak; +2 for each Claude turn in the office (✳ 업무).
- **HUD:** show a "다음 해금" (next unlock) chip, e.g. "🌿 옥상 정원 · Lv.10까지 120 XP".

## 5. The life island

*Decided 2026-10-23: personal-development spaces leave the office tower.* The tower keeps only the project floors where Claude works ("work over there"). Your life happens on a small **floating island** with one street ("life over here"). A sketch is in [mockups/life-island.html](mockups/life-island.html).

### Travel

- Each place has a **lift kiosk**. Stepping in is instant: the doors close, the screen fades, the doors open at the destination. No walking between places.
- Destinations: the office tower, your home, each facility on the street, and later other islands (other maps).
- **Starting a quest** drops you straight inside that category's facility, at its activity spot.

### Starting shabby

You start with almost nothing, so every improvement is visible. The tone is cozy-scrappy and a bit funny, a fresh start, and never shaming.

- **Home:** a cramped **옥탑방** (rooftop room) on a tired three-storey block. A mattress on the floor, a flickering bulb, a bucket under a leak, peeling wallpaper, a rattling fan, a crate as a table, an old CRT TV.
- **The street:** mostly **empty lots** with 매물 or 공사 예정 signs, weeds, broken street lamps, a dead tree.
- **Facilities start makeshift:** the gym is a garage with one rusty bench, the piano is an old upright with sticky keys in your room, studying happens on the window ledge.
- **Sky and light:** greyish at first; the island gets warmer and greener as it grows.

### Replacing shabby things (home items)

Your home is made of **slots**, and each slot holds one item from a chain of upgrades. Buying the next item in a chain replaces the old one: the old item disappears and the room changes a little. Moving to a bigger home keeps your items, and adds new slots.

| Slot | Chain (coins) |
|---|---|
| 🛏️ Bed | 바닥 매트리스 → 싱글 침대 (40) → 퀸 침대 (200) → 캐노피 침대 (900) |
| 💡 Light | 깜빡이는 전구 → LED 스탠드 (25) → 펜던트 조명 (60) → 샹들리에 (500) |
| 🏚️ Ceiling | 비 새는 천장 + 양동이 → 방수 수리 (30) → 새 천장 (120) → 천창 (600) |
| 🧱 Walls | 벗겨진 벽지 → 새 벽지 (50) → 원목 패널 (250) → 갤러리 월 (800) |
| ❄️ Air | 덜덜이 선풍기 → 새 선풍기 (20) → 에어컨 (120) → 시스템 냉난방 (700) |
| 🪵 Table | 박스 테이블 → 접이식 테이블 (25) → 원목 책상 (150) → 아일랜드 키친 (900) |
| 📺 Screen | 브라운관 TV → 모니터 (80) → 빔 프로젝터 (300) → 홈시어터 (1,200) |
| 🪟 Window | 테이프 붙인 창문 → 새 창문 (60) → 통창 (400) → 파노라마 창 (1,500) |
| 🍳 Kitchen | 휴대용 버너 → 원룸 주방 (100) → 풀 키친 (600) → 셰프 키친 (2,000) |

- **The first fixes are cheap** (20–60 coins): the first week already changes the room.
- **Higher tiers need a home big enough** for them: a chandelier needs the townhouse or later, a home theatre needs the penthouse or later.
- The existing shop decorations (the cat, the mirror ball, …) stay as extras on top of the slots.

### Your home grows with your level

| Level | Home | Notes |
|---|---|---|
| 1 | 🏚️ 옥탑방 | One room on a tired block |
| 10 | 🌿 옥탑 정원 | Fix up the roof: plants, a deck and a bench (the rooftop-garden map, now part of your home) |
| 15 | 🏠 원룸 | A small studio flat in a renovated building on your street |
| 25 | 🏡 타운하우스 | Two storeys with a garden and a fence |
| 40 | 🏖️ / 🏔️ Second home | A beach-house island or a mountain-cabin island, your pick (the other one opens at Lv.50) |
| 60 | 🌃 펜트하우스 | A city-island penthouse with a home theatre |
| 80 | 🏛️ 힐사이드 빌라 | The villa island and the garage (sections 7 and 8) |
| 100 | 🏝️ 나만의 섬 리조트 | Your home island becomes a resort: private beach, pier, lighthouse, island-wide lights |

Earlier homes are not lost: you can still visit them, and the street keeps your first building, renovated.

### Facilities grow with their skill

Every category has a building (a lot) on the street. Its **look** follows that category's skill level, in tiers. A new category built in the 🏗️ editor takes the next empty lot.

| Tier (skill level) | 🏋️ Gym | 🎹 Piano | 📚 Study | 💰 Side hustle |
|---|---|---|---|---|
| 1 | Garage, one rusty bench | Old upright at home | Window ledge, borrowed books | Laptop on the bed |
| 10 | Neighbourhood gym | Practice room | Study café | Market stall |
| 30 | Fitness club | Music school | Library café | Small shop (💼 path: your store) |
| 60 | Sports centre with a pool | Concert hall | Library tower | Office building |
| 100 | Stadium | Opera house | University | Company HQ |

Inside each facility, the same slot system applies (equipment chains bought with coins).

## 6. Time to level 100

The table below assumes 30-minute quests:

| Bonus situation | XP per hour |
|---|---:|
| No bonuses | 80 |
| Timer finished (+50%) | 120 |
| Timer finished and a 5-day streak (+100%) | 160 |

| Goal | XP needed | Hours (no bonus / timer / best) | At 1 focused hour a day (best) |
|---|---:|---|---:|
| Player Lv.80 (villa) | 52,456 | 656 / 437 / 328 | ~11 months |
| **Player Lv.100 (home: island resort)** | 81,576 | 1,020 / 680 / **510** | **~17 months** |
| Facility Lv.100 with **today's** skill curve | 392,040 | 4,901 / 3,267 / 2,450 | ~6.7 years in *one* category |
| **Facility Lv.100 with the proposed curve** | 40,788 | 510 / 340 / **255** | ~8.5 months at 1 h/day in that category, ~1.4 years at 30 min |

- **Problem:** with today's skill curve (`√(XP / 40)`), a facility never realistically reaches Lv.100.
- **Proposal:** skill levels get a linear curve too, half the player's: **20 + 8 × (L − 1)** XP per level. The trophy cups move to Lv.10, 30 and 60, matching the facility tiers.
- **Coins:** by player Lv.100 you have earned about **16,300 coins**. Upgrading every home slot to the top costs about 11,700, most of that, so you choose what to upgrade first. Facility equipment, the shop extras and cars come on top. That is intentional: there is always something to save up for.

## 7. Maps (other islands)

Maps are now **other islands**, reached instantly by lift. Your home island (section 5) is the first; the others are second homes unlocked by level. The rooftop garden became a home tier (Lv.10) on your own island.

| Unlock | Map | Scene | Zones | Signature features |
|---|---|---|---|---|
| Lv.1 | 🏢 **The office tower** | Glass tower over a city block (today) | — | Project floors with Claude only |
| Lv.1 | 🏝️ **Home island** | Floating island with one street (section 5) | Lots on the street | Your home, the facilities, empty lots to fill |
| Lv.40 | 🏖️ **Beach-house island** (or 🏔️ first) | Low wooden house on a dune, ocean horizon | 4 | Surf rack, running track on the sand, sunset deck |
| Lv.50 | 🏔️ **Mountain-cabin island** (or 🏖️) | Timber cabin among pines | 4 | Fireplace reading nook, hiking trailhead, snow at night |
| Lv.60 | 🌃 **Penthouse** | Top of a skyscraper, glass all round | 5 | Home gym, cinema room, city-wide night view |
| Lv.80 | 🏛️ **Hillside villa** | A modern villa on a hill above a sprawling city | 6 + outdoor | See below |
| Lv.100 | 🏝️ **Island resort** | Your home island, transformed | Whole island | Private beach, pier, lighthouse, island-wide lights |

### The hillside villa (grand reward, Lv.80)

Inspired by the hillside estates above Los Angeles, as a mood, not a brand. Use a generic name in the product, such as **"Hillside Villa"** / **"힐사이드 빌라"**, and not a real neighbourhood's name.

- **Setting:** a terraced lot on a ridge at dusk. The city spreads out below as a carpet of lights, reusing the tower's sky, sun and city-light system. Palm and cypress silhouettes, a winding driveway.
- **Main house:** double-height living room with a glass wall, a floating staircase, an open kitchen with an island, a grand salon (the piano goes here).
- **Outdoor:** an infinity pool whose edge meets the city view, a pool house, a fire-pit lounge, a tennis or padel court, a garden with a koi pond.
- **Wellness wing:** spa and sauna, a mirrored pavilion (ballet / pilates), a gym facing the view.
- **Garage:** a glass-walled showroom for cars (section 8).
- **Your rooms move in:** any category room can be placed in a villa zone. The room templates are already zone-independent. Villa-only templates (pool deck, pavilion, salon, wine cellar) add to the list.
- **Luxury shop tier:** a crystal staircase chandelier, an art wall, a wine cellar, a grand fountain, a yacht model, a private-chef kitchen set. Only for sale on the villa map.

## 8. Cars and the garage

- **Unlock:** at Lv.80, with the villa. A starter car could come earlier (e.g. a vintage convertible at Lv.40 for the cabin road trip).
- **Buying:** with coins, like outfits. A few price tiers.
- **Showing:** parked in the villa's glass garage. Your character arrives by car on the driveway when you travel to the villa. A car also appears on the street of the tower diorama.
- **Designs must be original.** Supercar-*like* silhouettes with invented names and badges, never real makes, logos or exact body shapes, because carmakers protect their designs. Example names: *Vento GT*, *Aurora S*, *Kestrel R*.

## 9. Life paths (the Sims-style layer)

### Borrowed from The Sims

| The Sims | Habitower |
|---|---|
| Skills | Category XP and skill levels (exists) |
| Aspirations with milestones and a reward trait | **Life paths** with stages and permanent **perks** |
| Careers with promotions and a branch at a mid level | **Stages** within a path, one **branch** choice |
| Work-from-home careers / freelancer | Your Claude office moves to your home |
| Owning a business (Get to Work) | Your side hustle becomes a business you visit and grow |

### Focus

- **Focus share** = each area's share of your XP over the **last 30 days**, so it follows what you do now, not what you did a year ago.
- **Path offer:** when one area passes **45%** and you are **Lv.15+**, a banner offers that area's path. You choose: accept, "나중에" (later), or 🌿 Balanced Life.
- **Balanced:** if no area is above **40%** for 30 days, the Balanced Life path is offered instead.
- **Switching:** free, at any time (decided 2026-10-23). Progress is worked out from your quest history, so every path keeps its stage and switching back picks up where you were.
- **Previews:** every path's stages can be opened before you reach them, showing the name-tag title, the perk, the requirements with progress bars, and the unlocks (marked 곧 열려요 until built). The point is expectation: you see what you are working towards.

### Paths

| Path | Driven by | Stages | Signature unlocks and perks |
|---|---|---|---|
| 💼 **Entrepreneur · 사업가** | 💰 부업 (+ 📚 공부) | 부업러 → 1인 사업자 → 스타트업 대표 → CEO | Storefront on the street; home office; **work from home**; at CEO, own the tower or go remote |
| 🏅 **Athlete · 운동선수** | 🩰 🧘 🏋️ wellness | 운동 입문 → 생활 체육인 → 코치 → 챔피언 | Private studio, outdoor track, competitions with trophies; +XP in wellness |
| 🎨 **Creator · 크리에이터** | 🎹 🎬 creative | 취미러 → 크리에이터 → 아티스트 → 스타 | Recording studio, concert stage, fan mail on the quest board |
| 📚 **Scholar · 학자** | 📚 공부 + 🌱 자기계발 | 학생 → 연구자 → 교수 → 마스터 | Library tower, observatory on the roof |
| 🌿 **Balanced Life · 균형 잡힌 삶** | No area above 40% | 균형 찾기 → 조화 → 현자 | A small XP bonus in *every* area, zen garden |

### Promotions

A stage needs **both**:

1. **XP in the path's areas**, for example 3,000 / 12,000 / 40,000.
2. **A milestone**, for example a 30-day streak in the area, 50 focused (full-timer) quests in it, 10 one-off quests finished in it, or a checklist quest with 5+ subtasks done.

Each promotion gives a title (shown under your name tag), a perk, and usually a place or item. At the middle stage, a path can **branch**. For example, an Entrepreneur picks *Retail* (storefront, stock room) or *Tech* (startup loft, servers).

### The "leave the office" moment (Entrepreneur)

The "work office" in Habitower is literally your Claude Code project floors, which makes this path special:

- **1인 사업자:** a **home office** appears in your life space, with a desk, a second monitor and a plant. The 🛗 follow toggle gets a third option, **"집에서 일하기"** (work from home): your Claude sessions are shown at the home office instead of the tower floors. Claude walks in, sits at your home desk and works there.
- **CEO:** a branch choice:
  - **Own the tower:** the tower becomes your company HQ. Project floors become departments with your logo on the sign, and you get a CEO office on the top project floor.
  - **Go remote:** the office floors are let go. All work happens from your home, or from the villa once unlocked, with Claude working poolside.

## 10. Config (`data/building.json` additions)

Everything below is data, so the 🏗️ editor and a future cloud version can change it.

```jsonc
{
  "progression": { "curve": "linear", "base": 40, "step": 16 },        // XP to next level = base + step × (L − 1)
  "maps": [
    { "id": "tower", "ko": "타워", "unlock": { "level": 1 }, "scene": "tower" },
    { "id": "rooftop", "ko": "옥상 정원", "unlock": { "level": 10 }, "scene": "rooftop", "zones": 3 },
    { "id": "villa", "ko": "힐사이드 빌라", "unlock": { "level": 80 }, "scene": "villa", "zones": 6,
      "rooms": [ { "template": "pavilion", "cat": "ballet" }, { "template": "salon", "cat": "piano" } ] }
  ],
  "paths": [
    { "id": "entrepreneur", "ko": "사업가", "icon": "💼",
      "focus": { "categories": ["hustle", "learning"], "share": 0.45, "minLevel": 15 },
      "stages": [
        { "ko": "부업러", "needXP": 0 },
        { "ko": "1인 사업자", "needXP": 3000, "milestone": { "streak": 30 }, "unlocks": ["map:homeoffice", "perk:wfh"] },
        { "ko": "스타트업 대표", "needXP": 12000, "milestone": { "focusedQuests": 50 }, "branch": ["retail", "tech"] },
        { "ko": "CEO", "needXP": 40000, "choice": ["perk:ownTower", "perk:remote"] }
      ] }
  ],
  "shop": {
    "decor": [ { "id": "fountain", "model": "fountain", "map": "villa", "minLevel": 80, "price": 400 } ],
    "cars":  [ { "id": "vento", "name": "Vento GT", "model": "coupe", "color": "#c8323c", "minLevel": 80, "price": 1200 } ]
  }
}
```

Player state (`data/quests.json`) gains `path: { id, stage, branch, since }`, `pausedPaths`, `perks[]`, `cars[]` and `map` (the map you are on).

## 11. UI

- **HUD:** the level and XP bar use the new curve. Next to it, a **next-unlock chip**; your path title under your name tag.
- **🧭 진로 tab** in the quest panel: your focus share as a bar per area (30 days), the current path and stage, progress towards the next promotion (XP and the milestone), and the path offer and switch buttons.
- **🗺️ 지도** picker above the floor guide: unlocked maps, plus locked ones shown greyed with their unlock level. A **preview** button lets you walk around a locked map without using it, as motivation.
- **Travel:** the lift doors open onto the new map. For the villa, you arrive by car on the driveway.
- **Shop:** tabs per map; items above your level are shown with 🔒 Lv.N.

## 12. Build order

1. ✅ **XP curve:** the new player-level curve, `progression` in the config, the next-unlock chip.
2. ✅ **Paths v1:** 30-day focus tracking, the path offer, stages, promotions, the 🧭 진로 tab, titles under name tags.
3. ✅ **Life island v1:** the island scene with a street and lots, instant lift travel, the shabby 옥탑방 with seven item slots and their upgrade chains in the shop, studio buildings on lots with four exterior tiers, greenery by level. Life floors left the tower and became pavilions. *Not yet:* facility interiors still use the existing studios (not makeshift at tier 1), clicking buildings on the island to enter them, and the facility skill curve (open question).
4. **Upgrades:** slot item chains in the shop, home tiers by level (옥탑 정원, 원룸, 타운하우스), facility tiers by skill level.
5. **Entrepreneur end to end:** your shop on the street, the home office with "집에서 일하기" (Claude working at your home desk), and the CEO choice.
6. **Other islands:** beach house and mountain cabin, then the penthouse.
7. **Hillside villa:** scene, villa templates, the luxury shop tier, the garage and the first original cars. Then the Lv.100 island resort.
8. **The other paths' places:** Athlete, Creator, Scholar and Balanced unlocks.

## 13. Open questions

- **Facility curve:** switch skill levels to 20 + 8 × (L − 1) per level (section 6), and move the trophy cups to Lv.10, 30 and 60?
- **Old homes:** keep every earlier home visitable, or turn them into rentals (a small daily coin income)?
- **Multiple paths at once:** one active path (simpler, Sims-like), or a main and a side path?
- **Locked map preview:** unlimited, or one visit a week?
- **Cars:** only cosmetic, or a small perk (e.g. faster travel animation, a daily coin bonus)?
- **Old curve users:** leave levels as they jump, or show a one-time "레벨 재계산" (level recalculated) banner explaining it?
- **Public launch:** keep the Claude Code integration as a feature ("works with Claude Code"), with no Anthropic branding in the name, logo or store listing.
