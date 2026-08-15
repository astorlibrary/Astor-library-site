const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');

const root = process.cwd();
const index = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'content-index.json'), 'utf8'));
const outputDirectory = path.join(root, 'assets', 'book-thumbs');
const mappingFile = path.join(root, 'assets', 'book-thumbnails.json');
const mapping = {};
const items = [
  ...(index.books || []),
  ...(index.studyEditions || []),
  ...(index.resources || []),
  ...(index.passages || []),
  ...(index.teachingRooms || []),
  ...(index.subjects || []),
  ...(index.authors || []),
  ...(index.collections || [])
];
const seenSources = new Set();

fs.mkdirSync(outputDirectory, { recursive: true });

for (const item of items) {
  const sourceHref = item.image;
  if (!sourceHref || /^(?:[a-z]+:|\/\/)/i.test(sourceHref) || seenSources.has(sourceHref)) continue;
  seenSources.add(sourceHref);
  const sourceFile = path.join(root, decodeURIComponent(sourceHref.replace(/^\//, '')));
  if (!fs.existsSync(sourceFile)) throw new Error('Missing cover for thumbnail: ' + sourceHref);

  const slugSource = item.type === 'book' && /^\/books\//.test(item.href || '')
    ? item.href.replace(/^\/books\//, '').replace(/\/$/, '')
    : item.title || item.href || sourceHref;
  const slug = String(slugSource)
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'catalogue-image';
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

const activeFiles = new Set(Object.values(mapping).map(value => path.basename(value)));
for (const fileName of fs.readdirSync(outputDirectory)) {
  if (/\.jpg$/i.test(fileName) && !activeFiles.has(fileName)) {
    fs.unlinkSync(path.join(outputDirectory, fileName));
  }
}

fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2) + '\n');
console.log('Generated ' + Object.keys(mapping).length + ' catalogue thumbnails.');
