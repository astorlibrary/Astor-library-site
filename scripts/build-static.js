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
    fs.copyFileSync(source, destination);
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const entry of fs.readdirSync(root)) {
  if (excluded.has(entry)) continue;
  copyRecursive(path.join(root, entry), path.join(outDir, entry));
}

console.log('Static site copied to dist/ without repository metadata.');
