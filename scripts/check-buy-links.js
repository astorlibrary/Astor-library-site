// Checks every outbound purchase link (Amazon and Ko-fi) used by the
// source pages and data files. Run with: npm run check:links
// Network-dependent, so it is not part of predeploy; run it before releases
// and whenever a listing changes. Exit code 1 means at least one hard failure.
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const skipDirs = new Set(['dist', 'node_modules', '.git', '.wrangler', '.github']);
const linkPattern = /https:\/\/(?:ko-fi\.com|(?:www\.)?amazon\.[a-z.]+)\/[^"'\s<>)]+/g;

const sources = new Map(); // url -> [files]
(function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) collect(fullPath);
      continue;
    }
    if (!/\.(?:html|js|json)$/.test(entry.name)) continue;
    const text = fs.readFileSync(fullPath, 'utf8');
    for (const match of text.match(linkPattern) || []) {
      const url = match.replace(/&amp;$/, '');
      if (!sources.has(url)) sources.set(url, []);
      const relative = path.relative(root, fullPath);
      if (!sources.get(url).includes(relative)) sources.get(url).push(relative);
    }
  }
})(root);

const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml',
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function checkUrl(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(20000) });
      const finalUrl = response.url || url;
      // Retailer bot checks are inconclusive; they do not verify the listing.
      if (response.ok) return { url, status: response.status, finalUrl, verdict: 'ok' };
      if (/amazon\./.test(finalUrl) && [403, 405, 429, 503].includes(response.status)) {
        return { url, status: response.status, finalUrl, verdict: 'unverifiable (retailer bot check)' };
      }
      // Ko-fi serves humans fine but walls off non-browser clients with 403.
      if (/ko-fi\.com/.test(finalUrl) && response.status === 403) {
        return { url, status: 403, finalUrl, verdict: 'unverifiable (retailer bot check)' };
      }
      // Rate limiting from the link service itself: back off and retry; a
      // persistent 429 is inconclusive, never a dead link.
      if (response.status === 429) {
        if (attempt < 3) { await wait(8000 * (attempt + 1)); continue; }
        return { url, status: 429, finalUrl, verdict: 'unverifiable (rate limited)' };
      }
      if (attempt === 0) continue;
      return { url, status: response.status, finalUrl, verdict: 'fail' };
    } catch (error) {
      if (attempt === 0) continue;
      return { url, status: 0, finalUrl: '', verdict: 'fail', error: error.message };
    }
  }
}

(async () => {
  const urls = [...sources.keys()].sort();
  console.log('Checking ' + urls.length + ' outbound purchase links...');
  const results = [];
  const queue = [...urls];
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (queue.length) {
      const url = queue.shift();
      results.push(await checkUrl(url));
      await wait(700);
    }
  }));

  const failures = results.filter(result => result.verdict === 'fail');
  const unverifiable = results.filter(result => result.verdict.startsWith('unverifiable'));
  console.log((results.length - failures.length - unverifiable.length) + ' ok, ' + unverifiable.length + ' unverifiable (retailer bot checks), ' + failures.length + ' failing.');
  for (const failure of failures) {
    console.log('\nFAIL ' + failure.url + ' -> ' + (failure.status || failure.error));
    for (const file of sources.get(failure.url)) console.log('  used by ' + file);
  }
  if (failures.length) process.exit(1);
})();
