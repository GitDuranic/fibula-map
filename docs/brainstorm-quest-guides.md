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
  - NPC window: Trade / Conversation buttons (the choice is kept between NPCs; an NPC with nothing to trade opens on its conversation), a "Find a word" filter, and each way to say something is a button that copies it ("copied" flashes). Your words in say-yellow, replies in light blue, conditions grey, what happens (items, teleport, quest value, ends the conversation) in gold.

### 13b. Quest list from the database
- Supabase tables for quests (with a history table from the start); the 83 quests are moved over from `tools/data/fibula-quests.json` and the wiki data: name, area, rewards, status "not checked".
- A quest panel replaces the Quests checklist: list, search, rewards, and "I'm on this quest" (kept in the browser).
- **Useful because:** players get the quest list with rewards, and pick one to follow.

### 13c. Editing quests (login)
- The planner's Discord login; only the two Discord IDs may edit.
- Edit a quest's name, area, rewards and notes; every save goes into the history.
- **Useful because:** you can already fix rewards for 7.2.

### 13d. Steps and segments on the map
- Segments and steps in the database (the "any order" group is in the data, not yet in the UI).
- Editing: right-click "Add step here", click an NPC for "Add talk step", drag to reorder, a checked tick per step.
- The guide: numbered markers for the current segment, a step list with ticks, Back a step, "not checked" marks and "12 of 18 steps checked".
- **Useful because:** the first fully guided quests, entered by hand.

### 13e. Route through the segment
- The route from step to step in order, drawn with the existing router (locked doors, boats, climbing).
- The current leg brightest.
- **Useful because:** you can see how to get from step to step.

### 13f. Quest dialogs
- In a talk step, build the dialog by clicking through the NPC's keywords from 13a, in a wider pop-out window.
- The guide's dialog window: full conversation or only your lines; copy buttons; copied lines change colour (click again to undo).
- **Useful because:** the heart of the feature: say exactly the right things.

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
