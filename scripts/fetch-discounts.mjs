/**
 * Best-effort ISIC discounts fetcher.
 * Official site loads data via private WordPress AJAX (action=providers) — often returns null without browser session.
 * This script:
 *  1) Tries AJAX with several param variants
 *  2) Falls back to keeping existing data/discounts.json
 *  3) Optionally merges known seed list
 *
 * For full scrape use Chrome headless with virtual-time-budget on a machine that has google-chrome.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';

const AJAX = 'https://isic.sk/wp-admin/admin-ajax.php';
const OUT = 'data/discounts.json';

async function tryAjax() {
  const variants = [
    { action: 'providers', offset: 0, limit: 50 },
    { action: 'providers', offset: 0, limit: 50, 'facets[]': 'categories' },
    { action: 'providers', page: 1, pageSize: 50 }
  ];
  for (const body of variants) {
    try {
      const res = await fetch(AJAX, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (compatible; TUKE-Hub-Bot/1.0)',
          Referer: 'https://isic.sk/zlavy-na-slovensku/',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: new URLSearchParams(body).toString()
      });
      const text = await res.text();
      if (!text || text === 'null' || text === '0') continue;
      const data = JSON.parse(text);
      if (data && Array.isArray(data.items) && data.items.length) {
        return data.items.map((it, i) => ({
          id: String(it.id || it.providerId || i),
          name: it.name || it.title || 'Partner',
          discount: (it.discounts && it.discounts[0] && (it.discounts[0].title || it.discounts[0].description)) || it.discount || 'ISIC zľava',
          category: (it.categories && it.categories[0] && it.categories[0].name) || 'other',
          url: it.url || `https://isic.sk/zlavy-na-slovensku/`,
          lat: it.lat ?? it.latitude ?? null,
          lng: it.lng ?? it.longitude ?? null,
          branches: (it.branches && it.branches.length) || 1
        }));
      }
    } catch (e) {
      console.warn('AJAX variant failed:', e.message);
    }
  }
  return null;
}

async function main() {
  mkdirSync('data', { recursive: true });
  console.log('Trying ISIC AJAX...');
  let items = await tryAjax();

  if (!items || !items.length) {
    console.log('AJAX unavailable — keeping existing data/discounts.json if present');
    if (existsSync(OUT)) {
      const prev = JSON.parse(readFileSync(OUT, 'utf8'));
      console.log('Existing items:', prev.count || (prev.items && prev.items.length));
      process.exit(0);
    }
    items = [];
  }

  const out = {
    fetchedAt: new Date().toISOString(),
    source: 'https://isic.sk/zlavy-na-slovensku/',
    count: items.length,
    items
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log('Saved', items.length, 'items to', OUT);
}

main().catch(e => { console.error(e); process.exit(1); });
