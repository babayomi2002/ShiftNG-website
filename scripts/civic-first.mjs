// First-screen files for the Civic page (audit PM-70): a state's page, and the
// Federal page, first show only the section counts, the amount and stage
// counts, and the first page of cards in each section. Those come from a
// small <slug>.first.json; the full <slug>.json is fetched only when the
// visitor searches, filters, turns a page or opens an LGA or ward.
//
// The section rules are the page's own (civic-common.js, loaded as is), so
// the first screen is exactly what the full file would show.
//
// Used by build-civic.mjs. Run on its own to make the files from the state
// files already in data/civic:  node scripts/civic-first.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..');
const Civic = vm.runInNewContext(readFileSync(join(site, 'civic-common.js'), 'utf8') + '\n;Civic;', {});

export const PAGE = 20;

// The same ranges as civic.js and the app (civic_band, step 35).
export function band(b) {
  if (b == null) return 'none';
  if (b < 1e7) return 'u10m';
  if (b < 5e7) return '10m_50m';
  if (b < 1e8) return '50m_100m';
  if (b < 5e8) return '100m_500m';
  if (b < 1e9) return '500m_1bn';
  if (b < 1e10) return '1bn_10bn';
  return 'o10bn';
}

// The sections of a state's own page, or of the Federal page (civic.js sections()).
function pageSections(state) {
  return state === 'Federal' ? ['multi', 'national'] : ['state', 'lga', 'federal'];
}

// From a full state file { state, lgas, projects } (projects already in page order).
export function makeFirst(full) {
  const keys = pageSections(full.state);
  const sections = {};
  const bands = {};
  const shown = new Set();
  for (const key of keys) sections[key] = { n: 0, b: 0 };
  for (const c of full.projects) {
    let placed = false;
    for (const key of keys) {
      if (!Civic.inSection(c, key, null, null)) continue;
      placed = true;
      const s = sections[key];
      s.n += 1;
      s.b += c.b || 0;
      if (s.n <= PAGE) shown.add(c);
    }
    if (placed) {
      const k = band(c.b);
      bands[k] = (bands[k] || 0) + 1;
    }
  }
  return {
    state: full.state,
    lgas: full.lgas,
    first: true,
    sections,
    bands,
    projects: full.projects.filter((c) => shown.has(c)),
  };
}

// On its own: make every <slug>.first.json from the <slug>.json files present.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(site, 'data', 'civic');
  let n = 0;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json') || f.endsWith('.first.json') || ['index.json', 'config.json'].includes(f)) continue;
    const full = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    if (!full.projects) continue;
    writeFileSync(join(dir, f.replace(/\.json$/, '.first.json')), JSON.stringify(makeFirst(full)), 'utf8');
    n++;
  }
  console.log(`${n} first-screen files written`);
}
