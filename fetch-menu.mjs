import { writeFileSync } from 'fs';

const today = new Date().toISOString().slice(0, 10);
const url = `https://jedalen.tuke.sk/jedalny-listok/jedalen-nemcovej-1/${today}`;

const categoryPatterns = [
  { re: /polievka/i, key: 'Polievka' },
  { re: /menu\s*1/i, key: 'Menu 1' },
  { re: /menu\s*2/i, key: 'Menu 2' },
  { re: /šalát|salat/i, key: 'Šalát' }
];

async function fetchMenu() {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TUKE-Hub-Bot/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();

    const items = [];
    const menuBlockRe = /<div[^>]*class=["'][^"']*(?:ponuka|menu|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
    const blocks = [];
    let m;
    while ((m = menuBlockRe.exec(html)) !== null) blocks.push(m[1]);

    const text = blocks.length ? blocks.join('\n') : html;
    const lines = text.split('\n')
      .map(l => l.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim())
      .filter(Boolean);

    const priceRe = /(\d+[.,]\d{2})\s*€/;
    let currentCategory = 'Iné';

    lines.forEach(line => {
      const hasPrice = priceRe.test(line);
      const catMatch = categoryPatterns.find(c => c.re.test(line));
      if (catMatch && !hasPrice) { currentCategory = catMatch.key; return; }
      if (!hasPrice) return;
      const pm = line.match(priceRe);
      const price = parseFloat(pm[1].replace(',', '.'));
      const name = line.replace(priceRe, '').replace(/€/g, '').trim().replace(/[-–:]+$/, '').trim();
      if (name && !isNaN(price)) items.push({ rawCategory: currentCategory, name, price });
    });

    const result = { date: today, items, source: url, fetchedAt: new Date().toISOString() };
    writeFileSync('data/menu.json', JSON.stringify(result, null, 2));
    console.log(`Saved ${items.length} dishes for ${today}`);
  } catch (e) {
    console.error('Fetch failed:', e.message);
    writeFileSync('data/menu.json', JSON.stringify({ date: today, items: [], error: e.message, source: url }, null, 2));
    process.exit(1);
  }
}

fetchMenu();
