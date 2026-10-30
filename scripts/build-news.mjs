// Builds data/news.json for the News page from the stories an admin has
// approved in the ShiftNG app (news_items with status 'published'). Reads
// as an anonymous visitor, so it can only see what the public can see.
//
// Needs two environment variables (kept as GitHub Actions secrets):
//   SUPABASE_URL, SUPABASE_ANON_KEY
// Run: node scripts/build-news.mjs
//
// Only the story's own fields are copied: headline, summary, source name,
// source link, date, category and whether it is the category's star. The
// account that approved it is never copied.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  process.exit(1);
}

// The app's eight news sections, in its order.
const CATEGORIES = [
  ['civic-accountability', 'Civic & Accountability'],
  ['politics-government', 'Politics & Government'],
  ['business-economy', 'Business & Economy'],
  ['banking-finance', 'Banking & Finance'],
  ['manufacturing-industry', 'Manufacturing & Industry'],
  ['human-rights-social-justice', 'Human Rights & Social Justice'],
  ['international', 'International'],
  ['sport', 'Sport'],
];
const PER_CATEGORY = 15;

const safeLink = (u) => {
  try {
    const p = new URL(u);
    return p.protocol === 'https:' || p.protocol === 'http:' ? p.href : null;
  } catch {
    return null;
  }
};

const categories = [];
for (const [slug, label] of CATEGORIES) {
  const q = `news_items?status=eq.published&category=eq.${slug}` +
    `&select=headline,excerpt,source_name,source_url,published_at,is_star` +
    `&order=is_star.desc,published_at.desc&limit=${PER_CATEGORY}`;
  const res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`${slug}: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  const stories = rows
    .map((r) => ({
      h: r.headline,
      e: r.excerpt,
      s: r.source_name,
      u: safeLink(r.source_url),
      d: r.published_at,
      star: !!r.is_star,
    }))
    .filter((s) => s.h && s.u);
  categories.push({ slug, label, stories });
}

const out = { categories };
const path = 'data/news.json';
// Only touch the file (and so only make a commit) when the stories change.
const before = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
if (before && JSON.stringify(before.categories) === JSON.stringify(out.categories)) {
  console.log('No change in the news.');
} else {
  mkdirSync('data', { recursive: true });
  writeFileSync(path, JSON.stringify({ builtAt: new Date().toISOString(), ...out }), 'utf8');
  console.log('news.json written:', categories.map((c) => `${c.slug} ${c.stories.length}`).join(', '));
}
