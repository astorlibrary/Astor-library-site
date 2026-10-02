// A catalogue sentence must not stop at personal initials or common titles.
function isAbbreviation(prefix) {
  const token = prefix.replace(/<[^>]*>/g, '').match(/([\p{L}]+)$/u)?.[1] || '';
  return /^[A-Z]$/.test(token) || /^(?:Mr|Mrs|Ms|Dr|Prof|Rev|St|Jr|Sr|c|e|g|i)$/i.test(token);
}

function firstSentence(value) {
  for (const match of value.matchAll(/[.!?](?=\s|$)/g)) {
    if (match[0] === '.' && isAbbreviation(value.slice(0, match.index))) continue;
    return value.slice(0, match.index + 1);
  }
  return value;
}

function sentences(value) {
  const found = [];
  let start = 0;
  for (const match of value.matchAll(/[.!?](?=\s|$)/g)) {
    if (match[0] === '.' && isAbbreviation(value.slice(start, match.index))) continue;
    found.push(value.slice(start, match.index + 1).trim());
    start = match.index + 1;
  }
  const rest = value.slice(start).trim();
  if (rest) found.push(rest);
  return found;
}

// A search description is made of whole sentences: long enough to say what the
// page is, and short enough that a results page does not cut it off mid-sentence.
// A one-sentence description may borrow the next sentence of the page's own deck.
function searchDescription(value, deck = '', min = 90, max = 160) {
  const text = value.length < min && deck.length > value.length && deck.startsWith(value) ? deck : value;
  const parts = sentences(text);
  let result = parts[0] || text;
  for (const part of parts.slice(1)) {
    const next = result + ' ' + part;
    if (result.length >= min && next.length > max) break;
    result = next;
  }
  return result;
}

module.exports = { firstSentence, sentences, searchDescription };
