const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');
const formatReleaseData = require('./format-release-data');

const root = process.cwd();
const index = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'content-index.json'), 'utf8'));
const outputDirectory = path.join(root, 'assets', 'book-thumbs');
const mappingFile = path.join(root, 'assets', 'book-thumbnails.json');
const mapping = {};
const formatImages = formatReleaseData.hardbacks.map(function (hardback) {
  return {
    type: 'hardback',
    title: hardback.title + ' hardback',
    href: hardback.href,
    image: '/' + encodeURIComponent(hardback.image).replace(/'/g, '%27')
  };
});
// Covers that appear only in the buying box on a book page (second editions,
// study editions not yet in the index).
const formatBoxImages = Object.entries(JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'book-formats.json'), 'utf8')))
  .flatMap(([slug, formats]) => formats.map(format => ({
    type: 'format',
    title: [slug, format.format, format.edition].filter(Boolean).join(' '),
    image: format.image
  })));
const items = [
  ...(index.books || []),
  ...(index.studyEditions || []),
  ...(index.resources || []),
  ...(index.passages || []),
  ...(index.teachingRooms || []),
  ...(index.subjects || []),
  ...(index.authors || []),
  ...(index.collections || []),
  ...formatImages,
  ...formatBoxImages
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
  const smallFileName = slug + '-' + hash + '-360.jpg';

  // Two sizes per cover: 720px for hero covers and retina grids, 360px for
  // catalogue and explore grid cells. Consumers derive the -360 name from the
  // mapped path, so both files must always exist together.
  for (const [maxSize, quality, name] of [[720, '78', fileName], [360, '74', smallFileName]]) {
    // A thumbnail is named after its source path, so an existing file is current.
    if (fs.existsSync(path.join(outputDirectory, name))) continue;
    childProcess.execFileSync('/usr/bin/sips', [
      '-s', 'format', 'jpeg',
      '-s', 'formatOptions', quality,
      '-Z', String(maxSize),
      sourceFile,
      '--out', path.join(outputDirectory, name)
    ], { stdio: 'ignore' });
  }

  mapping[sourceHref] = '/assets/book-thumbs/' + fileName;
}

const activeFiles = new Set(Object.values(mapping).flatMap(value => {
  const base = path.basename(value);
  return [base, base.replace(/\.jpg$/, '-360.jpg')];
}));
for (const fileName of fs.readdirSync(outputDirectory)) {
  if (/\.jpg$/i.test(fileName) && !activeFiles.has(fileName)) {
    fs.unlinkSync(path.join(outputDirectory, fileName));
  }
}

fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2) + '\n');
console.log('Generated ' + Object.keys(mapping).length + ' catalogue thumbnails.');
