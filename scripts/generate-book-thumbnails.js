const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');

const root = process.cwd();
const index = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'content-index.json'), 'utf8'));
const outputDirectory = path.join(root, 'assets', 'book-thumbs');
const mappingFile = path.join(root, 'assets', 'book-thumbnails.json');
const mapping = {};

fs.mkdirSync(outputDirectory, { recursive: true });

for (const book of index.books || []) {
  const sourceHref = book.image;
  const sourceFile = path.join(root, decodeURIComponent(sourceHref.replace(/^\//, '')));
  if (!fs.existsSync(sourceFile)) throw new Error('Missing cover for thumbnail: ' + sourceHref);

  const slug = book.href.replace(/^\/books\//, '').replace(/\/$/, '').replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  const hash = crypto.createHash('sha1').update(sourceHref).digest('hex').slice(0, 8);
  const fileName = slug + '-' + hash + '.jpg';
  const destination = path.join(outputDirectory, fileName);

  childProcess.execFileSync('/usr/bin/sips', [
    '-s', 'format', 'jpeg',
    '-s', 'formatOptions', '78',
    '-Z', '720',
    sourceFile,
    '--out', destination
  ], { stdio: 'ignore' });

  mapping[sourceHref] = '/assets/book-thumbs/' + fileName;
}

fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2) + '\n');
console.log('Generated ' + Object.keys(mapping).length + ' book thumbnails.');
