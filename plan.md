# Implementation Plan: DM Cockpit Combat & Encounter Expansion

## Overview
This plan implements the full feature set requested across combat flow, initiative, quick-ref, encounter builder, data persistence, and UX polish.

## Phase 1: Core Combat State Enhancements
**Goal:** Make the initiative ladder a rich tactical dashboard.

### 1.1 Data Model Extensions (`initiativeOrder` entries)
Add these fields to every participant when `initiateEngagement()` builds the array:
- `tempHp: number` — temporary hit points
- `conditions: string[]` — active status conditions (e.g., `['Prone','Concentrating']`)
- `reactionUsed: boolean` — reaction spent this round
- `legendaryResistances: number|null` — remaining uses; `null` = creature doesn't have it
- `lairActions: string|null` — lair action text; `null` = none
- `regionalEffects: string|null` — regional effect text; `null` = none

### 1.2 Initiative Ladder UI Updates
- **HP bar** — thin colored bar next to HP text (green → yellow → red gradient based on %)
- **Bloodied indicator** — when `hp <= maxHp * 0.5`, show a `🩸 BLOODIED` chip
- **Dead styling** — already exists, keep as-is
- **Condition chips** — render each condition as a small removable tag next to the name
- **Temp HP** — numeric input + `[+]` button next to damage controls for NPCs; display as `+3 temp` if >0
- **Reaction toggle** — `⚡ REACTION` button per NPC row; turns grey when used, resets each round
- **Legendary Resistance** — show `LR: 3` (or however many) as a small badge; click to decrement
- **Lair/Regional** — if present, show a small 🏰 / 🌎 icon with tooltip/hover text

### 1.3 Round-End Reset
In `nextTurn()`, when `crossedRound === true`:
- Reset `reactionUsed = false` for all participants
- Log "Round N begins" to combat log

### 1.4 Server Changes (`resolve-monster`)
Extract additional DDB fields and return:
- `avatarUrl` — monster portrait image URL
- `damageResistances`, `damageImmunities`, `damageVulnerabilities` — arrays of strings
- `conditionImmunities` — array of strings
- `lairActions` — `lairActionsDescription` or `lairActions` text
- `regionalEffects` — `regionalEffectsDescription` text

---

## Phase 2: Initiative & Quick-Ref Improvements
**Goal:** Smarter rolling, richer stat block display, interactive rolls.

### 2.1 Initiative Advantage (Surprise / 5.5e)
In `showInitiativeEntry()`:
- Add a checkbox `[ ] Advantage` per NPC row
- When checked, the 🎲 Roll button rolls `max(d20, d20) + DEX mod`
- PCs can also check advantage (for features like Gloom Stalker)
- Add a **ROLL ALL NPCs** button at the top of the initiative panel

### 2.2 Drag-to-Reorder
- Make initiative entry rows draggable via HTML5 Drag & Drop API
- Before `beginCombat()`, allow manual re-ordering (for house-rule initiative adjustments)
- Store the reordered array back into `initiativeOrder`

### 2.3 Quick-Ref: Monster Image
- If `avatarUrl` exists, render an `<img>` at the top of the quick-ref panel
- Style with `max-height: 160px`, `border-radius: 4px`, `object-fit: cover`

### 2.4 Quick-Ref: Resistance / Vulnerability Cheat Sheet
- Render `damageResistances`, `damageImmunities`, `damageVulnerabilities`, `conditionImmunities` as a compact row of colored chips:
  - Resistant = blue, Immune = green, Vulnerable = red, Condition Immune = purple

### 2.5 Click-to-Roll from Stat Block
- Parse the `actions` / `bonusActions` / `reactions` / `legendary` HTML text
- For each `<p>` element, scan for:
  - `to hit` modifier: regex `/[+-]\d+(?=\s+to\s+hit)/i`
  - Damage dice: regex `/\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)/`
- Inject small inline buttons after each paragraph:
  - `🎲 ATK` — rolls `1d20 + mod`, shows result in a toast/inline
  - `⚔️ DMG` — rolls the damage expression, shows result
- Store a `rollLog` array for this creature (cleared on new quick-ref load)

### 2.6 Recharge Tracker
- Scan action text for `(Recharge 5-6)` or `(Recharge 6)` patterns
- When found, render a `🎲 Recharge` button next to that action in the quick-ref
- Click rolls `1d6`; if roll is in recharge range, show green "RECHARGED"; else show remaining cooldown

---

## Phase 3: Encounter Builder Expansion
**Goal:** More tools for building and running encounters.

### 3.1 Random Encounter Generator
- Add UI in encounter builder: **Environment** dropdown + **CR Range** (min/max)
- When clicked, search DDB for monsters, then randomly select 1-3 creatures matching criteria
- Add them to the encounter pool with qty 1

### 3.2 Loot Generator
- Add a **Generate Loot** button next to the encounter pool
- Accept a CR input (or derive from highest CR in pool)
- Use DMG individual/hoard tables (client-side hardcoded tables) to generate:
  - Coins (CP/SP/GP/PP)
  - Gems/art objects (by value tier)
  - Magic items (roll on Table A-I based on CR)
- Render loot in a small card below the encounter pool

### 3.3 Environment Tags
- Add an **Environment** dropdown to each encounter (Arctic, Coastal, Desert, Forest, Grassland, Hill, Mountain, Swamp, Underdark, Underwater, Urban)
- Store in encounter object; display in encounter library list
- Future: soundboard could use this for ambiance selection

### 3.4 Fullscreen Quick-Ref Toggle
- Add a `⛶` button to the quick-ref panel header
- When clicked, open a modal overlay that takes up 80% of viewport
- Render the full stat block with larger text for readability during combat
- Press `Esc` or click backdrop to close

---

## Phase 4: Data Persistence & UX Polish
**Goal:** Never lose combat state, faster workflow.

### 4.1 Combat Log
- New array: `combatLog = []`
- Each entry: `{ timestamp: ISO, round, turn, message }`
- Auto-log events:
  - Combat begins
  - Turn changes ("Goblin #1's turn")
  - Damage/heal/death
  - Condition added/removed
  - Recharge rolls
  - Round start
- Display in a collapsible panel (toggle button in combat manager header)

### 4.2 Session Snapshots (Auto-Save Combat State)
- Every 5 seconds during active combat, save to `localStorage` key `dm-cockpit-combat-state`:
  - `initiativeOrder` (full)
  - `round`, `currentInitiativeIndex`
  - `encounterPool`, `activeEncounterId`
- On page load (boot), detect saved combat state and offer **RESUME ENCOUNTER** button on splash screen
- Abandoning combat clears the saved state

### 4.3 Creature Library Cache (IndexedDB)
- Open IndexedDB `DMCockpitCache` with store `monsterCache`
- When `resolve-monster` returns data, store it keyed by lowercase name
- TTL: 7 days (store `cachedAt` timestamp)
- Future lookups hit cache first, skip server call
- Bonus: offline mode — if DDB is unreachable, use cached data

### 4.4 Keyboard Shortcuts
- `Space` — next turn (only when engagement mode is active and no input is focused)
- `Shift+Space` — previous turn
- `N` or `D` — focus the damage input of the currently active creature
- `Enter` — apply damage (when damage input is focused)
- `Esc` — cancel/close modals; abort combat if no modal open
- `F` — toggle fullscreen quick-ref for active creature
- Prevent shortcuts when typing in `<input>` or `<textarea>`

### 4.5 Bulk Initiative Roll
- Button at top of initiative entry panel: **ROLL ALL NPCs**
- Rolls initiative for every NPC at once using their DEX mod
- Respects advantage checkboxes

---

## Files to Modify
1. **`server.js`** — expand `resolve-monster` endpoint to return `avatarUrl`, damage resistances/immunities/vulnerabilities, condition immunities, lair actions, regional effects
2. **`index.html`** — extensive changes across:
   - CSS: new styles for HP bars, condition chips, reaction button, bloodied indicator, fullscreen modal, combat log panel
   - HTML: new UI elements (advantage checkbox, bulk roll button, environment dropdown, loot generator, combat log toggle)
   - JS: all new functions for conditions, temp HP, reactions, legendary resistance, lair actions, drag-and-drop, click-to-roll, recharge tracker, random encounters, loot tables, session snapshots, keyboard shortcuts

## Notes
- **Soundboard integration** skipped per user request — not clear how to bridge given current architecture.
- **Monster image** assumes DDB monster detail API returns an `avatarUrl` field. If absent, quick-ref simply won't show an image.
- **Lair actions / regional effects** only render if the creature data includes them. No UI clutter for creatures without them.
- **Legendary resistance** only renders if the resolved monster has `legendaryActionsDescription` or a dedicated count field. If DDB doesn't expose a count, we'll default to 3 (standard for legendary creatures) when legendary actions are present.
