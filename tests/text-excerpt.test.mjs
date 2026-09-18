import test from 'node:test';
import assert from 'node:assert/strict';
import excerpts from '../scripts/text-excerpt.js';
test('catalogue excerpts preserve initials, titles and the complete first sentence', () => {
  for (const [input, expected] of [
    ['Ten tales, including two C. Auguste Dupin investigations. Notes follow.', 'Ten tales, including two C. Auguste Dupin investigations.'],
    ['M. R. James published the collection in 1904. It contains eight stories.', 'M. R. James published the collection in 1904.'],
    ['Mr. Pooter records his daily life. More follows.', 'Mr. Pooter records his daily life.'],
    ['Read <em>Dr. Jekyll and Mr. Hyde</em> with notes. More.', 'Read <em>Dr. Jekyll and Mr. Hyde</em> with notes.'],
    ['The play in R. Farquharson Sharp’s translation. With notes.', 'The play in R. Farquharson Sharp’s translation.'],
    ['A Visit from St. Nicholas opens the collection. Other stories follow.', 'A Visit from St. Nicholas opens the collection.'],
    ['Includes the original A. Frederics illustrations. Further context follows.', 'Includes the original A. Frederics illustrations.'],
    ['A sentence without final punctuation', 'A sentence without final punctuation'],
    ['What happened? Read the account.', 'What happened?']
  ]) assert.equal(excerpts.firstSentence(input), expected);
});
