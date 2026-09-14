// Shared checks for generated HTML and the preferred URLs in the sitemap.
// Attribute order and quote style must not hide duplicate or conflicting tags.
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
    .map(match => [match[1].toLowerCase(), match[2] ?? match[3]]));
}

function metadata(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
  const meta = [...head.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0]));
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map(match => attributes(match[0]));
  return {
    titles: [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map(match => match[1].trim()),
    descriptions: meta.filter(tag => tag.name?.toLowerCase() === 'description').map(tag => tag.content || ''),
    canonicals: links.filter(tag => tag.rel?.toLowerCase().split(/\s+/).includes('canonical')).map(tag => tag.href || ''),
    sharingUrls: meta.filter(tag => tag.property?.toLowerCase() === 'og:url').map(tag => tag.content || ''),
    noindex: meta.some(tag => /^(robots|googlebot)$/i.test(tag.name || '') && /(?:^|[\s,])noindex(?:$|[\s,])/i.test(tag.content || '')),
    redirect: meta.some(tag => tag['http-equiv']?.toLowerCase() === 'refresh')
  };
}

function validatePageSeo(html, expectedUrl) {
  const data = metadata(html);
  const errors = [];
  if (data.redirect) return errors;
  for (const [name, values] of [['title', data.titles], ['search description', data.descriptions]]) {
    if (values.length !== 1 || !values[0]) errors.push(`must have one nonempty ${name}`);
  }
  if (data.canonicals.length !== 1 || data.canonicals[0] !== expectedUrl) errors.push(`must have exactly one canonical matching ${expectedUrl}`);
  if (data.sharingUrls.length !== 1 || data.sharingUrls[0] !== expectedUrl) errors.push(`must have exactly one og:url matching ${expectedUrl}`);
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (attributes(match[1]).type?.toLowerCase() !== 'application/ld+json') continue;
    try { JSON.parse(match[2]); } catch { errors.push('contains invalid JSON-LD'); }
  }
  return errors;
}

function validateSitemapUrls(urls, expectedUrls) {
  const errors = [];
  const actual = new Set(urls);
  const expected = new Set(expectedUrls);
  if (actual.size !== urls.length) errors.push('The XML sitemap repeats a preferred URL');
  for (const url of expected) if (!actual.has(url)) errors.push(`The XML sitemap is missing ${url}`);
  for (const url of actual) if (!expected.has(url)) errors.push(`The XML sitemap includes a noncanonical or nonindexable URL: ${url}`);
  return errors;
}

module.exports = { metadata, validatePageSeo, validateSitemapUrls };
