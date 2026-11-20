# Brainstorm: quest guides for the 7.2 release

> Generated on 2026-11-19 (brainstorm with the user). Kept up to date while building, like design.md.

## The idea
Full quest guides in the mapper, released together with the server's 7.2 update. You pick the quest you're on; the map shows the current segment's steps and the route through them, a bring list, and NPC dialogs with copy buttons. Quest data lives in Supabase and only the user and Ryndean edit it, on the map itself.

## Goals
- As many of the 83 quests (the user's Project Fibula list) as possible at launch. Unchecked drafts are shown, marked "not checked".
- Dialogs come from the NPC scripts, so copied lines work in the game.
- Editing is fast and done on the map, so the hand-checking fits before the release.

## Decisions
- **Structure:** quest → segments → steps. Step types: Talk, Go/use, Get, Kill, Note. A simple quest has one segment.
- **Any order:** the data allows "any order" groups of steps inside a segment, but at first they show in saved order. Letting players reorder them is a later feature (the user: keep the design space, don't release it yet). Either/or choices are Note steps.
- **On the map:** the current segment in full, with numbered markers on its steps and the route through them in order. The step you're on is brightest; other segments don't show. The route starts at the segment's first step; your own start is set as now (From field, right-click).
- **Progress:** stored in the browser (localStorage), no login for players. Each step has a tick that moves the guide on, plus Back a step. **The guide never moves on by itself** (user). Copying a dialog line marks it done (another colour); clicking it again undoes that.
- **Dialogs:** read from the NPC behaviour scripts (`npc/behavior/*.npc`, CipSoft format: keyword, reply, conditions like `QuestValue`, `Topic`, `Type`/`Amount`). TVP 7.6 scripts are stand-ins until Ryndean's 7.2 scripts arrive; wiki text fills gaps. Two modes: the full conversation, or only your own lines. Each of your lines has a copy button. The full conversation also shows muted **"if it goes wrong"** replies from the script (missing item, already done); remove these if they clutter.
- **Bring list:** per segment, worked out from the data (items NPCs ask for, keys for locked doors on the route, rope and shovel). You can add items by hand and hide wrong ones. Items picked up along the way are Get steps.
- **Rewards:** a field on the quest that you edit by hand (7.2 changes some), not taken from map chests.
- **Data and rights:** Supabase (already running for the house planner), the planner's Discord login, and only the user's and Ryndean's two Discord IDs may edit (hard-coded in the database rules, no editors table). Every save is kept in a history table so a bad edit can be undone. Each step has its own "checked" tick; a quest is checked once all its steps are ("12 of 18 steps checked").
- **Editing on the map:** right-click "Add step here", click an NPC for "Add talk step", drag to reorder in the panel, click through an NPC's script keywords to build a dialog in a wider pop-out window.
- **First drafts:** steps drafted by AI from the TibiaWiki walkthroughs. A draft may only point at real things: an existing NPC, a keyword in that NPC's script, a spot on the map. Anything else becomes a Note step marked "needs placing". Each drafted step keeps the wiki sentence it came from.
- **Old system:** locked doors and keys stay (the router needs them; steps can point at them). The quest spots, quest window and Quests checklist become starting data and then go away.
- **7.2 world:** barely changes (user), so the 7.1 map stays. Mostly quest rewards change.

## Challenges and how they're handled
| Challenge | Resolution |
|---|---|
| 83 quests to check by hand before 7.2 | AI drafts, editing on the map, drafts shown with a mark, a checked tick per step |
| Wiki dialogs don't match old NPCs | Dialogs come from the NPC scripts; the wiki only fills gaps |
| The scripts are 7.6, not 7.2 | Stand-ins until Ryndean's 7.2 scripts; every dialog starts as a draft |
| AI drafts that look right but are wrong | Drafts can only link to real things; anything else becomes "needs placing"; the source sentence is kept |
| A bad edit goes live straight away | History table, so changes can be undone |
| Rewards change in 7.2 | Rewards edited by hand |
| Long quests clutter the map | Only the current segment shows |

## Slices
Each slice adds something you can use on its own (user: small slices of functionality, not layers that add nothing by themselves). Agree each one before building it, then build one at a time.

### 13a. NPC conversations from the scripts
- The converter reads every `.npc` behaviour file into keywords, replies and conditions (taken from a data folder, so the 7.2 scripts can be dropped in).
- The NPC window gets a **Conversation** view: what you can say and what the NPC answers, with the conditions in plain words ("only if you have 1 apple").
- A copy button on each keyword.
- **Useful because:** any player can look up what to say to any NPC, before a single quest exists.
- **Built (2026-11-19):** `tools/lib/talk.js` → `public/map-data/talk/<script>.json` (one per script, fetched when a conversation is opened; NPCs get `t` in npcs.json). 262 of 265 NPCs have one.
  - Follow-ups: a reply that sets `Topic=N` gets the `Topic=N` rules nested under it ("yes" → ..., "anything else" → ...), so a whole exchange reads as a tree. Type/Amount/Price/Data carry down from the line that asked, so "if you have 7 red apples" reads right. Loops stop when a topic repeats; at most 6 deep.
  - `*` lines (same answer) become one entry with several ways to say it ("labyrinth / way"); if their conditions differ, each way keeps its own ("red (quest 2 is 1) / blue (quest 2 is 2)").
  - Known at build time: everyone is premium, the world is not PvP-enforced, BUSY lines left out; a line that can never fire (an earlier one with the same words and no conditions) is left out; Data=/Amount= conditions are checked against what the earlier answer set (the Oracle shows only the right town per branch).
  - Shop lines (an item with a price, or a number you say) are left out: Sells/Buys already show them. Spell lines stay.
  - Quest values show as numbers ("quest 1 above 0", "quest 1 becomes 2") until 13f gives them meaning.
  - `Town(N)` is named from the temple nearest the line's teleport (TVP town ids differ from the 7.1 map's).
  - **Conversation window (reworked 2026-11-19, user: the tree didn't read well; paths should stay hidden until you choose, in a bigger window that comes out of the NPC):** the NPC window has **Conversation** next to Route here; it opens a 300 px window next to the NPC on the map (`src/map/NpcTalk.jsx`). It follows the NPC when the map pans, sits right of the NPC (left when there's no room), level with its tile so the name stays clear, is kept inside the map (at most 380 px high, the body scrolls) and hides while the NPC is out of view. Selecting another NPC closes it.
  - **Collapsible tree** (the user chose it over a chat log): every line starts folded (▸); clicking it shows the answer, what happens and what you can say next (also folded). Opening a line folds the others on its level, so one path shows at a time. Clicking a word also copies it (it flashes green).
  - **Find a word** keeps the top lines that contain it (words, answers or what happens, e.g. "silver key") and opens the paths down to it.
  - Your words in say-yellow, answers in light blue, conditions grey, what happens (items, teleport, quest value, ends the conversation) in gold. Options not chosen: a chat log with "say next" buttons; the window docked by the side panel.

### 13b. Quest list from the database
- Supabase tables for quests (with a history table from the start); the 83 quests are moved over from `tools/data/fibula-quests.json` and the wiki data: name, area, rewards, status "not checked".
- A quest panel replaces the Quests checklist: list, search, rewards, and "I'm on this quest" (kept in the browser).
- **Useful because:** players get the quest list with rewards, and pick one to follow.
- **Built (2026-11-19):**
  - **Database step 1:** `supabase/migrations/0001_map_quests.sql`, written by `tools/quests-sql.js` from `tools/data/fibula-quests.json` (84 quests; 71 matched on TibiaWiki). Tables are prefixed `map_` because they share the house planner's Supabase project. `map_quests`: name (unique), sort (gaps of 10), level, area, rewards, notes, status (`not checked` / `checked`), fibula_mark (the list's ✅), wiki_version, wiki_reward, updated_at/by. `map_quest_history`: a trigger stores the old row on every update/delete (the new row on insert), with who and when. Everyone may read quests; nobody may write yet (13c). Rerunning it is safe: existing quests are left alone.
  - **Reading** goes through Supabase's REST address with the public key (`src/map/engine/questdb.js`), so no npm package is needed for it. Settings: `<TibiaMap supabaseUrl supabaseKey />` (Ryndean passes the planner's), or `VITE_SUPABASE_URL` / `_ANON_KEY` in `.env.local` locally. Without settings, or if the database can't be reached, the list the converter wrote is shown (with a note when it failed).
  - **Merging:** database quests are matched by name with the converted list, which still gives the spots until 13i. The database decides which quests are listed, their order, level, area and rewards.
  - **Quests button for everyone** (was development only): **Route and Quests sit on their own row under the search field** (user 2026-11-19: no Quests button; with Search, Back and Home the row was 235 px in a 178 px panel, so Quests was cut off). a search field (name, area, rewards), rows with name and level (area and rewards in the tooltip), "You're on" at the top. In development the slice 12 filters, ✅/⬜, spot counts and ✓ stay (renamed "spots checked", so they aren't confused with the guide's checked status).
  - **Quest window:** level · area · came in; "Not checked yet" (orange) while the quest's status is not checked; **I'm on this quest** (pressed when on; kept in localStorage `tm-on-quest`, one quest at a time); notes; rewards with TibiaWiki's below.

### 13c. Editing quests (login)
- The planner's Discord login; only the two Discord IDs may edit.
- Edit a quest's name, area, rewards and notes; every save goes into the history.
- **Useful because:** you can already fix rewards for 7.2.
- **Built (2026-11-20):**
  - **Database step 2:** `supabase/migrations/0002_map_quest_editors.sql`. `map_is_editor()` checks the login's Discord ID in `auth.identities` (not `user_metadata`, which users can change themselves) against two hard-coded IDs (the repo keeps placeholders, the real IDs are only in Supabase: user 2026-11-20); editors may update `map_quests` and read `map_quest_history`. Names may not be empty. Adding and deleting quests isn't in the map yet.
  - **Login** (`src/map/engine/questauth.js`) works like the planner's: Discord through Supabase (PKCE), and `@supabase/supabase-js` is only downloaded when someone presses the login, comes back from Discord or was logged in before. It's now in package.json (same version as the planner's, so Ryndean's site already has it). Discord returns to the page without the map's place, so the `#x,y,z,zoom` is kept in sessionStorage over the login and put back.
  - **Editor login** is a small link at the bottom of the quest list (only when the map has database settings); logged in it shows the Discord name with "· editor" or "· not an editor", and Log out. Players see only the link.
  - **Edit** button in the quest window for editors: name, level, area, rewards, notes and a **Checked** tick (the quest's status; from 13d a quest is checked when all its steps are, so this tick is temporary). Save writes the row (the history trigger from step 1 keeps the old one) and the map uses the saved row straight away; a renamed quest you're on stays the one you're on. Errors (name taken, not an editor) show in the form.
  - A renamed quest loses its slice 10/12 spots (they're matched by name) until 13i moves the spots to steps.
  - Tested 2026-11-20 on the test server: login, Edit, Save (note saved with the editor as updated_by), "name taken" error. The development tick for slice 12 spots is now labelled "Spots checked" so it isn't confused with the quest's Checked status.
  - Supabase's allowed redirect URLs must include the map's addresses (local test ports and the page on Ryndean's site).

### 13d. Steps and segments on the map
- Segments and steps in the database (the "any order" group is in the data, not yet in the UI).
- Editing: right-click "Add step here", click an NPC for "Add talk step", drag to reorder, a checked tick per step.
- The guide: numbered markers for the current segment, a step list with ticks, Back a step, "not checked" marks and "12 of 18 steps checked".
- **Useful because:** the first fully guided quests, entered by hand.
- **Split in two (user, 2026-11-20):** 13d-1 the steps as a list (usable on its own as a written guide), 13d-2 the numbered markers on the map.
- **13d-1 built (2026-11-20):**
  - **Database step 3:** `supabase/migrations/0003_map_quest_steps.sql`: `map_quest_segments` (quest, sort, name; null name shows as "Part N") and `map_quest_steps` (quest, segment, sort, kind talk/go/get/kill/note, text, x/y/z, npc, monster, items [[id, count]], any_group, checked, source for 13j). Everyone reads; editors write. Changes go into `map_quest_history` too (new columns `tbl` = quest/segment/step and `row_id`; `quest_id` stays the quest so a quest's whole history is together). Sort numbers in gaps of 10; a move renumbers the segment.
  - Players read steps over REST (no npm package); editors write through the Supabase client (`src/map/engine/questguide.js`).
  - **Guide** section in the quest window (`src/map/QuestGuide.jsx`), between the Edit button and Reward. Steps numbered through the whole quest, with a kind tag (Talk, Go, Get, Kill, Note) and their text; without text: "Talk to Riddler", "Kill Dragon", "Get 2 Gold Coin", "Go here". An orange dot marks a step that isn't checked; "12 of 18 steps checked" on top.
  - **Progress:** a tick per step; ticking it means done and moves you to the next step, unticking one goes back to it. **Back a step** and **Start over**. The step you're on has a frame, done steps are struck through. Kept in localStorage `tm-quest-progress` per quest id (survives renaming).
  - **Segments:** headers only when there's more than one (always for editors), folded except the one you're on.
  - Clicking a step goes to its spot (a Talk step without a spot: the NPC's).
  - **Editors:** right-click the map **Add step here (quest)** adds a Go step at that tile; the NPC window gets **Add talk step**; the guide has **Add note step** and **Add segment**. New steps go to the end of the last segment and open their form. The form: kind, what to do, NPC or monster (with name suggestions) or items (item picker + counts), the spot ("Move step here" in the right-click menu while the form is open, "remove spot"), Checked, Save / Cancel / Delete. Drag a step onto another to put it before it, or onto a segment to put it at the end. Segments: rename, delete when empty.
  - The guide belongs to the last opened quest that's in the database and stays while the quest window is closed, so "Add talk step" works from an NPC window.
  - **Checked status:** a quest with steps is checked when all its steps are; the editors' changes keep `map_quests.status` in step, and the quest's own Checked tick only shows while it has no steps. Deleting the last step makes the quest not checked.
  - Tested 2026-11-20 on Paradox Tower: Add step here (creates Part 1), Add talk step (Riddler), Add note step, edit + save, drag to reorder and into another segment, ticks / Back a step (kept in localStorage), all steps checked -> "Not checked yet" gone, add / rename / delete segment, delete steps. Test data removed afterwards.
- **13d-2 built (2026-11-20):**
  - **Which guide shows on the map:** the quest you're on ("I'm on this quest"), also while its window is closed and you look at other quests; for editors, the quest whose window is open (so they see what they're building), else the one they're on. Players see no markers for quests they're only reading about.
  - **Markers:** a numbered circle on each step of the current segment that has a spot (a Talk step without one: its NPC), from zoom 4, where its floor is shown (as NPCs). The step you're on: white ring and number, larger, drawn on top; steps still to do: gold; done steps: faint. Other segments don't show.
  - Clicking a marker opens the quest's window (it's on top of NPCs and everything else on the map).
  - Progress now lives in TibiaMap (per quest, still localStorage `tm-quest-progress`), so ticking in the window moves the markers straight away. The guides are kept per quest, so the quest you're on keeps its markers while an editor opens another.
  - Tested 2026-11-20 on Paradox Tower (3 temporary steps, then removed): markers, done/current/to-do looks, markers stay with the window closed, clicking a marker opens the quest.

### 13e. Route through the segment
- The route from step to step in order, drawn with the existing router (locked doors, boats, climbing).
- The current leg brightest.
- **Useful because:** you can see how to get from step to step.
- **Agreed (user, 2026-11-20):**
  - For the guide on the map (the same quest as the markers): every leg of the current segment is drawn, from step to step in order (steps without a spot are skipped; the leg starts at the last step with one). Done legs faint, legs still to do dimmer, the leg to the step you're on bright.
  - ~~The leg to the step you're on fills the Route panel~~ **Changed (user, 2026-11-20, after trying it):** the quest route is separate from the Route panel. Filling the panel overwrote your own From/To, popped the panel open and drew the leg twice. Now the guide never touches the panel by itself; the step you're on has a **route here** link that sets only the panel's To (your own From stays).
  - **Fastest route only** per leg (no cheapest search).
  - The guide shows each step's **walking time from the step before** (your character's speed, like the Route panel) and the segment's **total**, with **Show route** to fit the view to the whole segment. A leg that can't be found says why (locked doors, not connected).
- **Built (2026-11-20, not yet browser-tested: Chrome extension offline):**
  - The legs are searched in TibiaMap (`questLegs`, `legRes`) with the panel's router worker, one at a time and only while the Route panel isn't searching: the worker's searches share their bookkeeping, so a leg search would stop the panel's cheapest search. Found legs are kept per from/to + Oracle level/climbing/doors (like the panel, they're searched again when those change); times follow the character's speed straight away.
  - **Drawing:** the leg to the step you're on is drawn as "the route" (the same drawing as the panel's: floor-change markers, boat arcs, see-through, clickable climbs) while the Route panel has no route of its own; when it has one, that one wins and the quest leg becomes a plain bright gold line (black edge). The other legs: plain gold lines on the floor you look at (surface legs also from the other surface floors, fainter), still to do at 55 %, done at 25 %.
  - In the guide: "Route: 4 min 10 s · Show route" under the checked count (" + …" while legs are still being searched), and each step's time on its row (orange "no route" with the reason in its tooltip). Clicking a time fits the view to that leg.
  - **Why no route showed (user, 2026-11-20):** the Paradox Tower steps were added while looking at floor 1, and the right-click menu took the floor you look at, so they were saved in the air on floor 1, 6 tiles off the ground you clicked; the router couldn't start there. Fixed: the right-click menu and the position readout now take the tile you see (from the view's floor down to 7, the highest one with something on that spot). The 7 saved steps need moving (one-off SQL).

### 13f. Quest dialogs
- In a talk step, build the dialog by clicking through the NPC's keywords from 13a, in a wider pop-out window.
- The guide's dialog window: full conversation or only your lines; copy buttons; copied lines change colour (click again to undo).
- **Useful because:** the heart of the feature: say exactly the right things.
- **Agreed (user, 2026-11-20):** three slices.
  - **13f-0 Quest panel on the left:** the quest list and the open quest (info, guide, steps, times) move out of the right panel into their own panel left of the map, about 260 px wide, so steps and dialogs have room. It opens with the Quests button, a step marker or opening a quest, has a close button, and stays open (remembered in the browser) until closed; the map gets narrower while it's open. The right panel keeps search, route and the NPC / monster / item / door windows.
  - **13f-1 Building dialogs + your lines:** "Build dialog" in a talk step's form opens a wider pop-out with the NPC's conversation tree; clicking a word adds that line (with the NPC's answer and what happens) to the step's dialog; lines can be removed and a free line added for things not in the script. The dialog is stored as a **copy of the lines** in the step (stays as checked when the 7.2 scripts replace the TVP ones; a later check can flag lines no longer in the script). Players see your lines under the talk step in the left panel, each with a copy button; copied lines change colour, click again to undo.
  - **13f-2 Dialog window:** full conversation (NPC answers + what happens) or only your lines.
- **13f-0 built (2026-11-20, not yet browser-tested: Chrome extension offline):**
  - `.tm-left` (260 client px, scaled like the right panel) before the map holds the quest list (top, at most 40 % high; the whole height when no quest is open) and the quest window (the rest).
  - Open/closed is kept in localStorage `tm-quests-open`. The Quests button opens and closes it; the list's × closes the panel and the open quest. Opening a quest (list, search, step marker, Back) opens the panel.
  - The quest window no longer closes when you open an NPC, monster or door window, and opening a quest no longer closes those: they're in different panels now.
  - Phones (≤ 600 px): the quest panel goes under the map (at most half the screen high), above the other panel.

### 13g. "If it goes wrong" replies
- Muted lines in the full conversation: what the NPC says when an item is missing or a part is already done, and what that means.
- **Useful because:** players can see why an NPC doesn't react.

### 13h. Bring list
- Per segment, worked out from the data: NPC items, keys for doors on the route, rope and shovel.
- Add items by hand, hide wrong ones.
- **Useful because:** you know what to pack before you set off.

### 13i. Old quest system moved over and removed
- Quest spots become draft Get steps of their quests; the quest window, gold rings and checklist go away. Locked doors and keys stay.
- **Useful because:** one quest system instead of two, and existing spot work isn't lost.

### 13j. AI drafts from the wiki
- AI-drafted segments and steps for every quest, written to the database as unchecked steps: real NPCs, keywords and spots only; "needs placing" notes otherwise; the source sentence on each step.
- **Useful because:** every quest has a guide to start from, and checking replaces typing.

### 13k. Undo from the history
- See a quest's earlier versions and put one back.
- **Useful because:** a bad edit can be undone without SQL.

### Later (designed for, not planned yet)
- Players choose the order of "any order" groups.
- Ryndean's 7.2 NPC scripts swapped in, as soon as they arrive (ask him now). The converter already takes a data folder, so this is a rerun plus checking dialogs.
