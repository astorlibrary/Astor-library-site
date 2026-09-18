// A catalogue sentence must not stop at personal initials or common titles.
function firstSentence(value) {
  for (const match of value.matchAll(/[.!?](?=\s|$)/g)) {
    if (match[0] === '.') {
      const prefix = value.slice(0, match.index).replace(/<[^>]*>/g, '');
      const token = prefix.match(/([\p{L}]+)$/u)?.[1] || '';
      if (/^[A-Z]$/.test(token) || /^(?:Mr|Mrs|Ms|Dr|Prof|Rev|St|Jr|Sr|c|e|g|i)$/i.test(token)) continue;
    }
    return value.slice(0, match.index + 1);
  }
  return value;
}
module.exports = { firstSentence };
