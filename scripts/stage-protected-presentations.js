const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const sourceRoot = path.join(root, 'assets', 'presentations');
const outputFlag = process.argv.indexOf('--output');
const outputArgument = outputFlag === -1 ? '' : process.argv[outputFlag + 1];

if (!outputArgument) {
  console.error('Choose an empty staging directory with --output.');
  process.exit(1);
}

const outputRoot = path.resolve(outputArgument);
if (outputRoot === root || outputRoot === path.parse(outputRoot).root || root.startsWith(outputRoot + path.sep) || outputRoot.startsWith(root + path.sep)) {
  console.error('The staging directory must be outside the project and must not be a filesystem root or project parent.');
  process.exit(1);
}
if (fs.existsSync(outputRoot) && fs.readdirSync(outputRoot).length) {
  console.error('The staging directory must be empty. Nothing was overwritten.');
  process.exit(1);
}
if (!fs.existsSync(sourceRoot)) {
  console.error('Presentation sources are missing. Use a complete repository checkout before staging.');
  process.exit(1);
}

fs.mkdirSync(outputRoot, { recursive: true });
const objects = [];

for (const deck of fs.readdirSync(sourceRoot).sort()) {
  const deckDirectory = path.join(sourceRoot, deck);
  if (!fs.statSync(deckDirectory).isDirectory()) continue;
  const slides = new Map();

  for (const file of fs.readdirSync(deckDirectory)) {
    const match = file.match(/^(\d+)\.png(?:\.part-(\d{3}))?$/);
    if (!match || Number(match[1]) <= 3) continue;
    const number = Number(match[1]);
    const record = slides.get(number) || { direct: '', parts: [] };
    if (match[2]) record.parts.push({ number: Number(match[2]), file });
    else record.direct = file;
    slides.set(number, record);
  }

  for (const [number, record] of [...slides.entries()].sort((a, b) => a[0] - b[0])) {
    if (record.direct && record.parts.length) throw new Error(`${deck} slide ${number} has both a complete PNG and chunks.`);
    let bytes;
    if (record.direct) {
      bytes = fs.readFileSync(path.join(deckDirectory, record.direct));
    } else {
      record.parts.sort((a, b) => a.number - b.number);
      record.parts.forEach((part, index) => {
        if (part.number !== index + 1) throw new Error(`${deck} slide ${number} has a missing or out-of-order chunk.`);
      });
      bytes = Buffer.concat(record.parts.map(part => fs.readFileSync(path.join(deckDirectory, part.file))));
    }
    if (!bytes?.length) throw new Error(`${deck} slide ${number} has no source data.`);

    const key = `presentations/${deck}/${number}.png`;
    const destination = path.join(outputRoot, ...key.split('/'));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
    objects.push({
      key,
      bytes: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex')
    });
  }
}

if (!objects.length) {
  console.error('No protected slides were found. Use a complete repository checkout rather than a sparse one.');
  process.exit(1);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  previewSlides: 3,
  objectCount: objects.length,
  totalBytes: objects.reduce((sum, object) => sum + object.bytes, 0),
  objects
};
fs.writeFileSync(path.join(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(`Staged ${manifest.objectCount} protected slides (${manifest.totalBytes} bytes) in ${outputRoot}.`);
