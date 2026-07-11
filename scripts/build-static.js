const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, 'dist');

const excluded = new Set([
  '.git',
  '.github',
  '.wrangler',
  'dist',
  'node_modules',
  'scripts',
  'README.md',
  'EDITORIAL_GUIDE.md',
  'wrangler.toml',
  '.DS_Store'
]);

function addImageHints(tag) {
  let result = tag;
  if (!/\bloading=/.test(result)) result = result.replace('<img', '<img loading="lazy"');
  if (!/\bdecoding=/.test(result)) result = result.replace('<img', '<img decoding="async"');
  return result;
}

function prepareHtml(html) {
  if (!html.includes('/assets/site.js')) {
    html = html.replace('</head>', '<script src="/assets/site.js" defer></script></head>');
  }

  if (html.includes('<main') && !html.includes('class="skip-link"')) {
    html = html.replace(/<main(?![^>]*\bid=)([^>]*)>/, '<main id="main-content"$1>');
    html = html.replace(/<body([^>]*)>/, '<body$1><a class="skip-link" href="#main-content">Skip to main content</a>');
  }

  html = html.replace(/<img\b[^>]*\bsrc="https?:\/\/[^"]+"[^>]*>/gi, addImageHints);
  html = html.replace(/<a class="(?:resource-card|study-card[^"]*)"[\s\S]*?<\/a>/g, block => {
    return block.replace(/<img\b[^>]*>/, addImageHints);
  });
  html = html.replace(/<img\b[^>]*\bloading="lazy"[^>]*>/g, addImageHints);
  return html;
}

function copyRecursive(source, destination) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }

  if (stat.isFile()) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (path.extname(source) === '.html') {
      const html = prepareHtml(fs.readFileSync(source, 'utf8'));
      fs.writeFileSync(destination, html);
    } else {
      fs.copyFileSync(source, destination);
    }
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const entry of fs.readdirSync(root)) {
  if (excluded.has(entry)) continue;
  copyRecursive(path.join(root, entry), path.join(outDir, entry));
}

console.log('Static site copied to dist/ without repository metadata.');
