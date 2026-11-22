// NPC conversations (slice 13a): a CipSoft .npc behaviour script as what you can say and what the NPC answers.
//
// Script format (TVP / CipSoft): one rule per line, `conditions -> actions`, first matching rule wins.
//   conditions: "keyword" (a trailing $ = whole word), %1 (a number you say), ADDRESS (greeting), VANISH (you walk
//   away), BUSY, Topic=N (only right after a reply that set Topic=N), Druid/Knight/..., male/female, Premium,
//   QuestValue(n)=v, Count(Type)>=Amount, CountMoney>=Price, Level>=N, SpellKnown(String)=0, ..., ! (ignored here)
//   actions: "reply" (or * = the previous rule's actions), Type=, Data=, Amount=, Price=, String=, Topic=N,
//   Create(Type), Delete(Type), CreateMoney, DeleteMoney, Teleport(x,y,z), SetQuestValue(n,v), TeachSpell(String),
//   Idle, EffectOpp(n), Queue, NOP, ...
//   @"file.ndb" includes another file at that spot; a line without -> continues the previous rule's reply.
//
// Output per script: entries [{ k, s, c, r, x, n }]
//   k  [[word, ...], ...]  ways to say it (one array of words each; "#" = a number); none = anything else
//   kc [[text], ...]       per way of saying it, its own conditions (only when they differ; then no c)
//   s  'greet' | 'vanish'  greeting (k: hi/hello) or what the NPC says when you walk away
//   c  [text]              conditions in plain words
//   r  text                the reply (%N -> <your name>; %P, %A filled in where known)
//   x  [text]              what happens (items taken/given, teleport, quest value, ends the conversation)
//   n  [entry]             what you can say next (the rules for the Topic this reply sets)
// Known at build time: everyone is premium, the world is not PvP-enforced, BUSY rules are left out.
// Shop lines (an item with a price, or a number you say) are left out: the NPC window's Sells/Buys show them.
import fs from 'node:fs';
import path from 'node:path';

// Splits on commas that are outside quotes and brackets.
function splitTop(s) {
  const out = [];
  let depth = 0, q = false, cur = '';
  for (const ch of s) {
    if (ch === '"') q = !q;
    else if (!q && ch === '(') depth++;
    else if (!q && ch === ')') depth--;
    if (ch === ',' && !q && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// Position of the rule arrow outside quotes, or -1.
function arrowAt(line) {
  let q = false;
  for (let i = 0; i < line.length - 1; i++) {
    if (line[i] === '"') q = !q;
    else if (!q && line[i] === '-' && line[i + 1] === '>') return i;
  }
  return -1;
}

// The script's lines with includes resolved and comments removed.
function scriptLines(file, seen = new Set()) {
  if (seen.has(file) || !fs.existsSync(file)) return [];
  seen.add(file);
  const out = [];
  for (const raw of fs.readFileSync(file, 'latin1').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const inc = /^@"([^"]+)"/.exec(line);
    if (inc) { out.push(...scriptLines(path.join(path.dirname(file), inc[1]), seen)); continue; }
    if (/^Behaviou?r\s*=\s*\{$/i.test(line) || line === '}' || /^(Name|Outfit|Home|Radius|GoStrength|Sex|Race)\s*=/i.test(line)) continue;
    out.push(line);
  }
  return out;
}

// Raw rules: [{ left: [token], right: [token] }] in script order (* resolved to the previous right side).
function readRules(lines) {
  const rules = [];
  let prevRight = [];
  for (const line of lines) {
    const a = arrowAt(line);
    if (a < 0) { // a reply continued on the next line
      const r = rules[rules.length - 1];
      if (r && /^"/.test(line)) r.rightText += ' ' + line;
      continue;
    }
    rules.push({ left: splitTop(line.slice(0, a)), rightText: line.slice(a + 2).trim() });
  }
  for (const r of rules) {
    r.right = r.rightText === '*' ? prevRight : splitTop(r.rightText.replace(/"\s+"/g, ' '));
    prevRight = r.right;
    delete r.rightText;
  }
  return rules;
}

const VOC = { druid: 'druids', sorcerer: 'sorcerers', knight: 'knights', paladin: 'paladins' };

// A rule's conditions into { when (its Topic=N), words, conds (raw tokens), special, drop };
// its actions into { vars, acts, reply, topic (the Topic it sets) }.
function parseLeft(tokens) {
  const out = { when: null, words: [], conds: [], special: null, drop: false };
  for (const t of tokens) {
    if (t.startsWith('"')) out.words.push(t.slice(1, -1).replace(/\$$/, '').toLowerCase());
    else if (/^%\d$/.test(t)) out.words.push('#');
    else if (t === '!' || t === '') continue;
    else if (/^topic\s*=\s*(\d+)$/i.test(t)) out.when = +/(\d+)/.exec(t)[1];
    else if (/^(ADDRESS|VANISH|BUSY)$/.test(t)) { out.special = t; if (t === 'BUSY') out.drop = true; }
    else if (/^premium$/i.test(t)) continue; // everyone is premium
    else if (/^PvPEnforced$/i.test(t)) out.drop = true; // not a PvP-enforced world
    else if (/^\d+\s*<\s*%\d$/.test(t)) continue; // "more than one" (number variants of a line)
    else out.conds.push(t);
  }
  return out;
}

function parseRight(tokens) {
  const vars = {}, acts = [];
  let reply = null, topic = null;
  for (const t of tokens) {
    if (t.startsWith('"')) { reply = (reply ? reply + ' ' : '') + t.slice(1, -1); continue; }
    const asg = /^(\w+)\s*=\s*(.+)$/.exec(t);
    if (asg && /^(type|data|amount|price|string|topic|hp)$/i.test(asg[1])) {
      const k = asg[1].toLowerCase(), v = asg[2].trim();
      if (k === 'topic') topic = +v;
      else if (k === 'string') vars.string = v.replace(/^"|"$/g, '');
      else if (k === 'hp') acts.push('heal');
      else vars[k] = /^\d+$/.test(v) ? +v : v;
      continue;
    }
    acts.push(t);
  }
  return { vars, acts, reply, topic };
}

// How many questions in a row a conversation is followed (a topic is never repeated on one path, so no loops).
// Was 6; the Riddler's test (Paradox Tower) asks 12 questions in a row (user 2026-11-22: add Paradox Tower).
const MAX_TOPICS = 16;

// ---------- plain words ----------
export function makeTalk({ itemName, townName }) {
  const n = (v) => (typeof v === 'number' ? v : null);
  const amountText = (ctx) => (n(ctx.amount) ?? (/%\d/.test(String(ctx.amount ?? '')) ? 'the number you said:' : 1));
  const item = (sid, ctx) => {
    const a = sid === ctx.type ? amountText(ctx) : 1;
    const name = itemName(sid, sid === ctx.type ? ctx.data : null, a);
    return a === 1 ? name : `${a} ${name}`;
  };
  const money = (ctx) => (n(ctx.price) != null ? `${ctx.price} gp` : /\*\s*%\d|%\d\s*\*/.test(String(ctx.price)) ? `${String(ctx.price).replace(/\s*\*?\s*%\d\s*\*?\s*/, '')} gp each` : 'the price');
  const spell = (ctx) => (ctx.string ? `'${ctx.string}'` : 'the spell');
  const qv = (a, op, b) => `quest ${a} ${{ '=': 'is', '>': 'above', '<': 'below', '>=': 'at least', '<=': 'at most', '<>': 'not' }[op] || op} ${b}`;

  function cond(t, ctx) {
    const s = t.replace(/\s+/g, '');
    let m;
    if (VOC[s.toLowerCase()]) return `${VOC[s.toLowerCase()]} only`;
    if (/^(male|female)$/i.test(s)) return `${s.toLowerCase()} characters only`;
    if (/^promoted$/i.test(s)) return 'promoted only';
    if ((m = /^questvalue\((\d+)\)(<>|>=|<=|=|>|<)(\d+)$/i.exec(s))) return qv(m[1], m[2], m[3]);
    if ((m = /^questvalue\((\d+)\)(<>|>=|<=|=|>|<)questvalue\((\d+)\)$/i.exec(s))) return `quest ${m[1]} ${m[2]} quest ${m[3]}`;
    if ((m = /^count\((type|\d+)\)(>=|>|<|<=|=)(amount|\d+)$/i.exec(s))) {
      const sid = /type/i.test(m[1]) ? ctx.type : +m[1];
      let a = /amount/i.test(m[3]) ? amountText(ctx) : +m[3];
      if (m[2] === '>') a = typeof a === 'number' ? a + 1 : a;
      const what = sid == null ? 'the item' : itemName(sid, sid === ctx.type ? ctx.data : null, a);
      const txt = a === 1 ? what : `${a} ${what}`;
      return /^>/.test(m[2]) ? `if you have ${txt}` : `if you don't have ${txt}`;
    }
    if ((m = /^countmoney(>=|<)(price|\d+)$/i.exec(s))) {
      const p = /price/i.test(m[2]) ? money(ctx) : `${m[2]} gp`;
      return m[1] === '>=' ? `if you have ${p}` : `if you don't have ${p}`;
    }
    if ((m = /^level(>=|>|<|<=)(\d+)$/i.exec(s))) {
      const lv = +m[2];
      return m[1] === '>=' ? `level ${lv}+` : m[1] === '>' ? `level ${lv + 1}+` : m[1] === '<' ? `below level ${lv}` : `level ${lv} or below`;
    }
    if ((m = /^spellknown\(string\)=(\d)$/i.exec(s))) return m[1] === '0' ? `if you don't know ${spell(ctx)} yet` : `if you know ${spell(ctx)}`;
    if (/^magiclevel<spellmagiclevel\(string\)$/i.test(s)) return 'if your magic level is too low for it';
    if (/^level<spelllevel\(string\)$/i.test(s)) return 'if your level is too low for it';
    if ((m = /^amount(=|>|<)(\d+)$/i.exec(s))) {
      if (/^random/i.test(String(ctx.amount))) return `random answer ${m[2]} (the NPC picks one)`;
      return `if the number is ${{ '=': '', '>': 'over ', '<': 'under ' }[m[1]]}${m[2]}`;
    }
    if (/^topic>0$/i.test(s)) return 'only right after a question';
    if (/^pzblock$/i.test(s)) return 'if you have been fighting (protection zone block)';
    if ((m = /^random\(1,(\d+)\)=1$/i.exec(s))) return `1 in ${m[1]} chance`;
    if (/^\d+>%\d$|^countmoney>=%\d$/i.test(s)) return null; // limits on a number you say
    if ((m = /^poison>(\d+)$/i.exec(s))) return 'if you are poisoned';
    if ((m = /^burning>(\d+)$/i.exec(s))) return 'if you are burning';
    if ((m = /^hp<(\d+)$/i.exec(s))) return `if your health is below ${m[1]}`;
    return s; // anything rarer stays as written
  }

  function effect(t, ctx) {
    const s = t.replace(/\s+/g, ' ').trim();
    let m;
    if (/^(idle)$/i.test(s)) return 'ends the conversation';
    if (/^(NOP|Queue|EffectOpp\(.*\)|EffectMe\(.*\))$/i.test(s)) return null;
    if (s === 'heal') return 'heals you';
    if ((m = /^Create\((Type|\d+)\)$/i.exec(s))) {
      const sid = /type/i.test(m[1]) ? ctx.type : +m[1];
      return sid == null ? null : `you get ${item(sid, ctx)}`;
    }
    if ((m = /^Delete\((Type|\d+)\)$/i.exec(s))) {
      const sid = /type/i.test(m[1]) ? ctx.type : +m[1];
      return sid == null ? null : `takes ${item(sid, ctx)}`;
    }
    if (/^DeleteMoney$/i.test(s)) return `takes ${money(ctx)}`;
    if (/^CreateMoney$/i.test(s)) return `you get ${money(ctx)}`;
    if ((m = /^Teleport\((\d+),\s*(\d+),\s*(\d+)\)$/i.exec(s))) return `teleports you to ${m[1]}, ${m[2]}, ${m[3]}`;
    if ((m = /^SetQuestValue\s*\(\s*(\d+)\s*,\s*(.+?)\s*\)$/i.exec(s))) return `quest ${m[1]} becomes ${m[2].replace(/QuestValue\((\d+)\)/i, 'quest $1')}`;
    if (/^TeachSpell\(String\)$/i.test(s)) return `teaches you ${spell(ctx)}`;
    if ((m = /^Summon\("([^"]+)"\)$/i.exec(s))) return `summons a ${m[1].toLowerCase()}`;
    if ((m = /^(Burning|Poison)\((\d+),\s*(\d+)\)$/i.exec(s))) {
      const what = m[1].toLowerCase() === 'burning' ? 'fire' : 'poison';
      return +m[2] === 0 ? `cures ${what}` : what === 'fire' ? 'sets you on fire' : 'poisons you';
    }
    if ((m = /^Town\((\d+)\)$/i.exec(s))) return `makes you a citizen of ${townName(ctx.teleport) || 'that town'}`;
    if (/^Profession\(.*\)$/i.test(s)) return 'gives you your vocation';
    if (/^Promote$/i.test(s)) return 'promotes you';
    if (/^Bless\(\d+\)$/i.test(s)) return 'blesses you';
    return s;
  }

  const fill = (reply, ctx) => reply
    .replace(/%N/g, '<your name>')
    .replace(/%T/g, '<the time>')
    .replace(/%P/g, () => (n(ctx.price) != null ? String(ctx.price) : '<price>'))
    .replace(/%A/g, () => (n(ctx.amount) != null ? String(ctx.amount) : '<amount>'));

  // ---------- one script ----------
  return function parseTalk(file) {
    const rules = readRules(scriptLines(file)).map((r) => ({ ...parseLeft(r.left), ...parseRight(r.right) }))
      .filter((r) => !r.drop);
    // A rule can't fire if an earlier one with the same topic and words has no conditions left.
    const shadow = new Set();
    const live = rules.filter((r) => {
      const key = `${r.special}|${r.when}|${r.words.join(' ')}`;
      if (shadow.has(key)) return false;
      if (!r.conds.length) shadow.add(key);
      return true;
    });
    const isShop = (r) => r.words.includes('#') || (r.vars.type != null && r.vars.price != null && !r.vars.string);

    // Entries for a list of rules, merging * aliases (same conditions and reply) into one entry.
    function entries(list, ctx0, path) {
      const out = [];
      let prev = null;
      for (const r0 of list) {
        // Data=N / Amount=N against what an earlier answer set (e.g. the town you picked at the Oracle): a rule
        // that can't match on this path is left out, one that always matches loses the condition.
        let dead = false;
        const conds = r0.conds.filter((t) => {
          const m = /^(data|amount)\s*=\s*(\d+)$/i.exec(t.replace(/\s+/g, ''));
          const v = m && ctx0[m[1].toLowerCase()];
          if (typeof v !== 'number') return true;
          if (v !== +m[2]) dead = true;
          return false;
        });
        if (dead) continue;
        const r = { ...r0, conds };
        const tp = r.acts.map((a) => /^Teleport\((\d+),\s*(\d+),\s*(\d+)\)$/i.exec(a)).find(Boolean);
        const ctx = { ...ctx0, ...r.vars, teleport: tp ? [+tp[1], +tp[2], +tp[3]] : null };
        const sig = `${r.special}|${r.reply}|${r.acts.join(',')}|${r.topic}|${JSON.stringify(r.vars)}`;
        const c = r.conds.map((t) => cond(t, ctx)).filter(Boolean);
        if (prev && prev.sig === sig && r.words.length && prev.e.k) {
          // Another way to say the same thing; with other conditions (e.g. "red" if quest 2 is 1, "blue" if it
          // is 2) each way keeps its own: kc [[text], ...] next to k, and c moves into it.
          const e = prev.e;
          if (!e.kc && (e.c || []).join() !== c.join()) { e.kc = e.k.map(() => e.c || []); delete e.c; }
          e.k.push(r.words);
          if (e.kc) e.kc.push(c);
          continue;
        }
        const e = {};
        if (r.words.length) e.k = [r.words];
        if (r.special === 'ADDRESS') e.s = 'greet';
        if (r.special === 'VANISH') e.s = 'vanish';
        if (c.length) e.c = c;
        if (r.reply) e.r = fill(r.reply, ctx);
        const x = r.acts.map((t) => effect(t, ctx)).filter(Boolean);
        if (x.length) e.x = x;
        if (r.topic != null && !path.includes(r.topic) && path.length < MAX_TOPICS) {
          const next = entries(live.filter((f) => f.when === r.topic && !f.special), ctx, [...path, r.topic]);
          if (next.length) e.n = next;
        }
        if (!e.r && !e.n && (!e.k || !e.x)) { prev = null; continue; } // nothing to show (e.g. ADDRESS,! -> Idle)
        out.push(e);
        prev = { sig, e };
      }
      return out;
    }
    const top = live.filter((r) => r.when == null && !isShop(r));
    const greet = entries(top.filter((r) => r.special === 'ADDRESS'), {}, []);
    const vanish = entries(top.filter((r) => r.special === 'VANISH'), {}, []);
    const talk = entries(top.filter((r) => !r.special), {}, []);
    return [...greet, ...talk, ...vanish];
  };
}
