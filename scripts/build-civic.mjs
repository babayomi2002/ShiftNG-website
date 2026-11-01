// Builds the data files for the Civic pages from the public projects in the
// ShiftNG app. Reads as an anonymous visitor, so it can only see what the
// public can see.
//
// Needs two environment variables (kept as GitHub Actions secrets):
//   SUPABASE_URL, SUPABASE_ANON_KEY
// Run: node scripts/build-civic.mjs
//
// Writes, under data/civic/:
//   index.json        the states that have projects, with counts
//   <state>.json      one state's project cards, its LGAs and wards
//   p/<id>.json       one project's page: places, history, offices, and how
//                     many residents say what they see on site
// Residents' reports themselves (words, photos, who wrote them) are never
// copied: only counts, one per person, as the app counts them. Officials are
// named by office, not by person.
// Files are only rewritten when their contents change, so a night with no
// change makes no commit.

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  process.exit(1);
}

async function all(query) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${url}/rest/v1/${query}&limit=1000&offset=${offset}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`${query.split('?')[0]}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

const safeLink = (u) => {
  try {
    const p = new URL(u);
    return p.protocol === 'https:' || p.protocol === 'http:' ? p.href : null;
  } catch {
    return null;
  }
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const one = (v) => (Array.isArray(v) ? v[0] ?? null : v);

const OFFICE = {
  senator: (o) => `Senator, ${o.constituency || o.state}`,
  federal_rep: (o) => `Member, House of Representatives${o.constituency ? `, ${o.constituency}` : ''}`,
  governor: (o) => `Governor of ${o.state} State`,
  fct_minister: () => 'Minister of the FCT',
  state_assembly_member: (o) => `Member, ${o.state} State House of Assembly${o.constituency ? `, ${o.constituency}` : ''}`,
  lga_chairman: (o) => `Chairman, ${o.lga} Local Government`,
  ward_councillor: (o) => `Councillor, ${o.ward} ward, ${o.lga}`,
};

const projects = await all(
  'projects?select=id,title,description,project_level,state,lga,ward,funded_by_name,stage,current_budget,paid_to_date,' +
    'budget_year,last_source_title,last_source_page,sector,' +
    'project_places(lga,ward,role,basis,confirmed),' +
    'project_offices(is_primary,offices(office_type,state,lga,ward,constituency)),' +
    'project_readings(page,approved,final_budget,paid_in_period,paid_to_date,budget_sources(title,period,kind,period_end,published_url))' +
    '&order=id',
);

// What residents say they see, counted once per person over 12 months
// (the same count the app shows). user_id is read only to count people.
const since = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
const reports = await all(
  `project_comments?select=project_id,user_id,site_says&status=eq.visible&parent_id=is.null&site_says=not.is.null&created_at=gte.${since}&order=id`,
);
const residents = {};
for (const r of reports) {
  const bucket = r.site_says === 'finished' ? 'finished' : r.site_says === 'in_progress' ? 'inProgress'
    : r.site_says === 'not_started' || r.site_says === 'abandoned' ? 'notDone' : null;
  if (!bucket) continue;
  const p = (residents[r.project_id] ??= { finished: new Set(), inProgress: new Set(), notDone: new Set() });
  p[bucket].add(r.user_id);
}

// LGAs and wards as INEC names them, from the polling-unit finder's files.
const meta = JSON.parse(readFileSync('data/meta.json', 'utf8'));
function placesOf(state) {
  const s = meta.states.find((x) => x.name === state);
  if (!s || !existsSync(`data/units/${s.code}.json`)) return [];
  const units = JSON.parse(readFileSync(`data/units/${s.code}.json`, 'utf8'));
  return units.lgas.map((l) => ({ n: l.n, w: l.wards.map((w) => w.n) }));
}

let changed = 0;
function write(path, value) {
  const text = JSON.stringify(value);
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return;
  writeFileSync(path, text, 'utf8');
  changed++;
}

mkdirSync('data/civic/p', { recursive: true });
const byState = {};
const keep = new Set();
for (const p of projects) {
  const places = (p.project_places ?? []).map((x) => ({ lga: x.lga, ward: x.ward, role: x.role, basis: x.basis }));
  const card = {
    i: p.id,
    t: p.title,
    l: p.project_level,
    w: p.funded_by_name,
    s: p.stage,
    b: p.current_budget,
    p: p.paid_to_date,
    y: p.budget_year,
    src: p.last_source_title,
    pg: p.last_source_page,
    L: p.lga,
    W: p.ward,
    sec: p.sector,
    pl: places.map((x) => [x.lga, x.ward, x.role]),
  };
  (byState[p.state] ??= []).push(card);

  const offices = (p.project_offices ?? [])
    .map((po) => ({ primary: po.is_primary, o: one(po.offices) }))
    .filter((x) => x.o && OFFICE[x.o.office_type])
    .sort((a, b) => Number(b.primary) - Number(a.primary))
    .map((x) => OFFICE[x.o.office_type](x.o));
  const history = (p.project_readings ?? [])
    .map((r) => ({ r, s: one(r.budget_sources) }))
    .filter((x) => x.s)
    .sort((a, b) => b.s.period_end.localeCompare(a.s.period_end) || (a.s.kind === 'quarterly_report' ? -1 : 1))
    .map(({ r, s }) => ({
      period: s.period, kind: s.kind, title: s.title, page: r.page, url: safeLink(s.published_url),
      approved: r.approved, final: r.final_budget, inPeriod: r.paid_in_period, toDate: r.paid_to_date,
    }));
  const res = residents[p.id];
  write(`data/civic/p/${p.id}.json`, {
    ...card,
    state: p.state,
    d: p.description,
    places,
    offices,
    history,
    residents: {
      finished: res ? res.finished.size : 0,
      inProgress: res ? res.inProgress.size : 0,
      notDone: res ? res.notDone.size : 0,
    },
  });
  keep.add(`${p.id}.json`);
}

// A project taken down leaves no page behind.
for (const f of readdirSync('data/civic/p')) {
  if (!keep.has(f)) {
    unlinkSync(`data/civic/p/${f}`);
    changed++;
  }
}

const index = [];
for (const [state, cards] of Object.entries(byState).sort()) {
  cards.sort((a, b) => (b.b ?? -1) - (a.b ?? -1) || a.t.localeCompare(b.t));
  write(`data/civic/${slug(state)}.json`, { state, lgas: placesOf(state), projects: cards });
  index.push({
    state,
    slug: slug(state),
    projects: cards.length,
    budget: cards.reduce((n, c) => n + (c.b ?? 0), 0),
  });
  keep.add(`${slug(state)}.json`);
}
for (const f of readdirSync('data/civic')) {
  if (f.endsWith('.json') && f !== 'index.json' && !keep.has(f)) {
    unlinkSync(`data/civic/${f}`);
    changed++;
  }
}

const before = existsSync('data/civic/index.json') ? JSON.parse(readFileSync('data/civic/index.json', 'utf8')) : null;
if (changed || !before || JSON.stringify(before.states) !== JSON.stringify(index)) {
  writeFileSync('data/civic/index.json', JSON.stringify({ builtAt: new Date().toISOString(), states: index }), 'utf8');
  console.log(`civic written: ${projects.length} projects in ${index.length} state(s), ${changed} file(s) changed`);
} else {
  console.log('No change in Civic.');
}
