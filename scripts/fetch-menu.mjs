import { writeFileSync } from 'fs';

const today = new Date().toISOString().slice(0, 10);
const url = `https://jedalen.tuke.sk/jedalny-listok/jedalen-nemcovej-1/${today}`;

const categoryPatterns = [
  { re: /polievka/i, key: 'Polievka' },
  { re: /menu\s*1/i, key: 'Menu 1' },
  { re: /menu\s*2/i, key: 'Menu 2' },
  { re: /šalát|salat/i, key: 'Šalát' },
  { re: /dezert|dessert|sladk/i, key: 'Dezert' },
  { re: /príloha|priloha|side/i, key: 'Príloha' }
];

function stripTags(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchMenu() {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TUKE-Hub-Bot/1.0; +https://github.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sk,en;q=0.8'
      }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();

    const blockRes = [];
    const blockRe = /<(?:div|section|table|tr|td|li|p|h[1-6])[^>]*>([\s\S]*?)<\/(?:div|section|table|tr|td|li|p|h[1-6])>/gi;
    let m;
    while ((m = blockRe.exec(html)) !== null) {
      const text = stripTags(m[1]);
      if (text.length > 5 && text.length < 400) blockRes.push(text);
    }

    const fullText = stripTags(html);
    const candidates = blockRes.length ? blockRes : fullText.split(/(?<=[.!?€])\s+/);

    const priceRe = /(\d+[.,]\d{2})\s*€?/;
    const items = [];
    let currentCategory = 'Iné';
    const seen = new Set();

    for (const line of candidates) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const catMatch = categoryPatterns.find(c => c.re.test(trimmed) && !priceRe.test(trimmed));
      if (catMatch) {
        currentCategory = catMatch.key;
        continue;
      }

      if (!priceRe.test(trimmed)) continue;
      const pm = trimmed.match(priceRe);
      if (!pm) continue;
      const price = parseFloat(pm[1].replace(',', '.'));
      if (isNaN(price) || price <= 0 || price > 50) continue;

      let name = trimmed.replace(priceRe, '').replace(/€/g, '').trim().replace(/[-–:|]+$/g, '').trim();
      if (!name || name.length < 3 || /^\d+$/.test(name)) continue;

      const inlineCat = categoryPatterns.find(c => c.re.test(name));
      if (inlineCat) {
        currentCategory = inlineCat.key;
        name = name.replace(inlineCat.re, '').trim().replace(/^[-–:|]+/, '').trim();
      }

      const key = `${currentCategory}|${name}|${price}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ rawCategory: currentCategory, name, price });
    }

    const result = {
      date: today,
      items,
      source: url,
      fetchedAt: new Date().toISOString()
    };
    writeFileSync('data/menu.json', JSON.stringify(result, null, 2));
    console.log(`Saved ${items.length} dishes for ${today}`);
  } catch (e) {
    console.error('Fetch failed:', e.message);
    writeFileSync(
      'data/menu.json',
      JSON.stringify({ date: today, items: [], error: e.message, source: url, fetchedAt: new Date().toISOString() }, null, 2)
    );
    process.exit(1);
  }
}

fetchMenu();
