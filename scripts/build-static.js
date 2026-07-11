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
      let html = fs.readFileSync(source, 'utf8');
      if (!html.includes('/assets/site.js')) {
        html = html.replace('</head>', '<script src="/assets/site.js" defer></script></head>');
      }
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
