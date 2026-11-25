-- =====================================================================================
-- Tibia Map - database step 30: Paradox Tower - complete the Riddler and Prisoner talks (user, 2026-11-25)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again: every change checks that it hasn't been made yet. Only these steps of The Paradox Tower Quest
-- (quest 74) are touched; everything else (also the editors' own texts) is left as it is.
--
-- Checked against the NPC scripts (TVP riddler.npc / a prisoner.npc):
--   * Both Riddler talks stopped at "none": the last question, "What is 1 plus 1?", had no line. On the second visit
--     that answer (the Prisoner's number) is the one that gets you into the treasure room (32478,31905,1).
--   * Step 444 said "any colour works" and "any other wrong answer and you have to start the test again". Wrong:
--     only 13 colours are known (another word sends you to Hellgate WITHOUT a colour, and the Prisoner then won't
--     help), and every wrong answer sends you to Hellgate.
--   * Not mentioned anywhere: saying bye or walking away during the test leaves the test "open"; the next test then
--     asks "What do I have in my pocket?", and every answer to that sends you to Hellgate.
--   * The Prisoner picks the number at random (49, 94, 13 or 1) and tells it only once.
-- =====================================================================================

-- 444, first visit to the Riddler: correct text + the last line (any number is wrong: off to Hellgate, as planned).
update public.map_quest_steps set
  text = 'Say the answers below in one go. Don''t say bye or walk away during the test: the next time, he asks what''s in his pocket, and any answer to that sends you to Hellgate.' || chr(10) ||
         'Every wrong answer sends you to Hellgate. "demonbunny" only works after all four talks of "The feared Hugo"; otherwise he calls you a cheater and sends you to Hellgate too.' || chr(10) ||
         'Your favourite colour must be one of: red, blue, black, white, orange, green, yellow, brown, violet, pink, silver, gold or grey (this guide uses green). Any other word sends you to Hellgate without a colour, and the Prisoner won''t help you.' || chr(10) ||
         'You can''t answer "1 plus 1" yet: any number is wrong and sends you to Hellgate. That''s expected. The Prisoner tells you the right number.',
  dialog = dialog || $j$[{
    "say": "<any number>",
    "reply": "WRONG!",
    "fx": ["ends the conversation", "quest 212 becomes 0", "teleports you to 32725, 31589, 12"],
    "cond": ["you haven't learned the number from the Prisoner yet"]
  }]$j$::jsonb,
  updated_at = now()
where id = 444 and quest_id = 74 and kind = 'talk' and dialog::text not like '%<any number>%';

-- 450, the Prisoner: the number is random and told only once.
update public.map_quest_steps set
  text = coalesce(nullif(text, '') || chr(10), '') ||
         'He picks the number at random (49, 94, 13 or 1) and tells it to you only once. If you ask again, he only says you already know it, so write it down.',
  updated_at = now()
where id = 450 and quest_id = 74 and kind = 'talk' and coalesce(text, '') not like '%only once%';

-- 458, back to the Riddler: the winning last line + the bye/pocket warning.
update public.map_quest_steps set
  text = coalesce(nullif(text, '') || chr(10), '') ||
         'Say everything in one go. Don''t say bye or walk away during the test: the next time, he asks what''s in his pocket, and any answer to that sends you to Hellgate.',
  updated_at = now()
where id = 458 and quest_id = 74 and kind = 'talk' and coalesce(text, '') not like '%pocket%';

update public.map_quest_steps set
  dialog = dialog || $j$[{
    "say": "<the Prisoner's number>",
    "reply": "DAMN YOUUUUUUUUUUUUUUUUUUUUUU!",
    "fx": ["ends the conversation", "quest 212 becomes 0", "teleports you to 32478, 31905, 1"],
    "cond": ["the number the Prisoner told you: 49, 94, 13 or 1"],
    "alts": [{ "other": true, "reply": "WRONG!", "fx": ["ends the conversation", "quest 212 becomes 0", "teleports you to 32725, 31589, 12"] }]
  }]$j$::jsonb,
  updated_at = now()
where id = 458 and quest_id = 74 and kind = 'talk' and dialog::text not like '%DAMN YOU%';

-- What it looks like now (each step's last line):
select id, npc, text, dialog -> -1 ->> 'say' as last_say, dialog -> -1 ->> 'reply' as last_reply
from public.map_quest_steps where id in (444, 450, 458) order by id;
