function coverFormat(filename) {
  const decoded = decodeURIComponent(filename);
  if (/hard[\s_-]*(?:cover|back)/i.test(decoded)) return 'Hardcover';
  if (/main[\s_-]*cover/i.test(decoded)) return 'Paperback';
  return null;
}

function editionSchema(record, format, pageUrl, imageUrl) {
  return {
    '@type': 'Book',
    '@id': pageUrl + '#' + format.key + '-edition',
    name: record.title,
    bookFormat: 'https://schema.org/' + format.label,
    image: imageUrl(format.image),
    url: pageUrl,
    publisher: { '@type': 'Organization', '@id': 'https://astorlibrary.com/#organization', name: 'Astor Library' },
    potentialAction: { '@type': 'BuyAction', target: format.purchaseUrl }
  };
}

function paperbackEditionSchema(record, pageUrl, imageUrl) {
  if (coverFormat(record.image) !== 'Paperback') throw new Error(`${record.title}: paperback cover is not identified by its filename`);
  return editionSchema(record, { key: 'paperback', label: 'Paperback', image: record.image, purchaseUrl: record.purchaseUrl }, pageUrl, imageUrl);
}

// This registry already supplies the two visible format cards. Keep each
// edition's cover, format and retailer link together in its own Book entity.
function bookEditionSchemas(record, pageUrl, imageUrl) {
  const formats = [
    { key: 'paperback', label: 'Paperback', image: record.paperbackImage, purchaseUrl: record.paperbackPurchaseUrl },
    { key: 'hardback', label: 'Hardcover', image: record.image, purchaseUrl: record.purchaseUrl }
  ];
  for (const format of formats) {
    const identified = coverFormat(format.image);
    if (identified && identified !== format.label) throw new Error(`${record.title}: ${format.label} metadata uses ${identified} artwork`);
  }
  if (formats[0].image === formats[1].image || formats[0].purchaseUrl === formats[1].purchaseUrl) {
    throw new Error(`${record.title}: paperback and hardcover metadata must have distinct covers and purchase links`);
  }
  return formats.map(format => editionSchema(record, format, pageUrl, imageUrl));
}

module.exports = { coverFormat, bookEditionSchemas, paperbackEditionSchema };
