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

test('search descriptions keep whole sentences and fill out a one-line description from the deck', () => {
  const long = 'Years ago Nora Helmer forged her dead father’s signature to borrow the money that saved her husband’s life. She has kept the secret from Torvald ever since, paying the debt in instalments out of her housekeeping, and now the man who lent it wants his job back.';
  assert.equal(excerpts.searchDescription(long), 'Years ago Nora Helmer forged her dead father’s signature to borrow the money that saved her husband’s life.');
  const deck = 'The larger Astor Othello. The commentary sits on the same page as the text, with notes on the Quarto and the Folio. The introduction covers Venice and Cyprus, race in Shakespeare’s London and the play on stage.';
  assert.equal(excerpts.searchDescription('The larger Astor Othello.', deck), 'The larger Astor Othello. The commentary sits on the same page as the text, with notes on the Quarto and the Folio.');
  assert.equal(excerpts.searchDescription('Choose a new password.', 'An unrelated deck.'), 'Choose a new password.');
  assert.equal(excerpts.searchDescription('M. R. James wrote the stories for Christmas Eve. They were read aloud.'), 'M. R. James wrote the stories for Christmas Eve. They were read aloud.');
  assert.deepEqual(excerpts.sentences('Mr. Pooter writes. Carrie laughs! Does Lupin care?'), ['Mr. Pooter writes.', 'Carrie laughs!', 'Does Lupin care?']);
});
