// The eight Astor collections, in the order they appear in the menu, the
// footer and the collection switcher. Shakespeare is a collection like the
// others: the site presents it in date order between the Renaissance and the
// Restoration shelves rather than as a separate range.
//
// `featured` names the three covers shown in each collection's heading. They
// are ordinary book pages, so the covers are always real Astor artwork.
//
// `editionDates` supplies a first-publication year for the few shelf cards
// whose own label carries no year, so every shelf can be sorted in order of
// first publication. Anthologies drawn from many years are sorted last.

const collections = [
  {
    file: 'ancient-epic/index.html',
    name: 'Ancient & Epic',
    shortName: 'Ancient & Epic',
    href: '/ancient-epic/',
    tagline: 'Homer and Virgil',
    span: 'Eighth century BC to 19 BC',
    featured: ['/books/the-iliad/', '/books/the-odyssey/', '/books/the-aeneid/']
  },
  {
    file: 'renaissance-early-modern/index.html',
    name: 'Renaissance & Early Modern',
    shortName: 'Renaissance',
    href: '/renaissance-early-modern/',
    tagline: 'More, Marlowe, Webster and Milton',
    featured: ['/books/paradise-lost/', '/books/doctor-faustus/', '/books/the-duchess-of-malfi/']
  },
  {
    file: 'shakespeare/index.html',
    name: 'Shakespeare',
    shortName: 'Shakespeare',
    href: '/shakespeare/',
    tagline: 'All the plays and the poems',
    span: '1593 to 1623',
    featured: ['/books/hamlet/', '/books/macbeth/', '/books/a-midsummer-nights-dream/'],
    groups: [
      { id: 'tragedies', title: 'Tragedies', match: /tragedy/i },
      { id: 'comedies', title: 'Comedies', match: /comedy/i },
      { id: 'histories', title: 'Histories', match: /history/i },
      { id: 'late-plays', title: 'Late plays', match: /romance|tragicomedy/i },
      { id: 'poems', title: 'Poems', match: /poem|poetry|sonnet/i }
    ],
    // Labels are tested in this order, so "Comedy / problem play" is a comedy
    // and "Problem play / tragedy" is a tragedy.
    groupOrder: ['poems', 'late-plays', 'histories', 'comedies', 'tragedies']
  },
  {
    file: 'restoration-enlightenment/index.html',
    name: 'Restoration & Enlightenment',
    shortName: 'Restoration',
    href: '/restoration-enlightenment/',
    tagline: 'Behn, Defoe, Swift and Richardson',
    featured: ['/books/robinson-crusoe/', '/books/gullivers-travels/', '/books/pamela/']
  },
  {
    file: 'romantic-regency/index.html',
    name: 'Romantic & Regency',
    shortName: 'Romantic & Regency',
    href: '/romantic-regency/',
    tagline: 'Austen, Shelley, Coleridge and Goethe',
    featured: ['/books/pride-and-prejudice/', '/books/frankenstein/', '/books/lyrical-ballads/']
  },
  {
    file: 'victorian/index.html',
    name: 'Victorian',
    shortName: 'Victorian',
    href: '/victorian/',
    tagline: 'Dickens, the Brontës, Hardy, Stoker and Wilde',
    featured: ['/books/great-expectations/', '/books/jane-eyre/', '/books/dracula/']
  },
  {
    file: 'american/index.html',
    name: 'American Classics',
    shortName: 'American',
    href: '/american/',
    tagline: 'Douglass, Melville, Twain and Fitzgerald',
    featured: ['/books/moby-dick/', '/books/the-scarlet-letter/', '/books/narrative-of-the-life-of-frederick-douglass/']
  },
  {
    file: 'modern/index.html',
    name: 'Modern Classics',
    shortName: 'Modern',
    href: '/modern/',
    tagline: 'Woolf, Orwell, Kafka and Mansfield',
    featured: ['/books/mrs-dalloway/', '/books/animal-farm/', '/books/the-metamorphosis/']
  }
];

// A year of 9999 sorts an anthology after the dated works. A `label` replaces
// the shelf card's own label where that label gives no date.
const editionDates = {
  '/books/the-iliad/': { year: -750, label: 'Epic · Greek, eighth century BC' },
  '/books/the-odyssey/': { year: -700, label: 'Epic · Greek, eighth century BC' },
  '/books/the-aeneid/': { year: -19, label: 'Epic · Latin, 19 BC' },
  '/books/selected-poems-of-john-skelton/': { year: 1500, label: 'Poems · late fifteenth and early sixteenth century' },
  '/books/utopia/': { year: 1516, label: 'Political fiction · 1516' },
  '/books/the-prince/': { year: 1532, label: 'Political treatise · written 1513, printed 1532' },
  '/books/doctor-faustus/': { year: 1604, label: 'Tragedy · performed by 1594, printed 1604' },
  '/books/the-duchess-of-malfi/': { year: 1623, label: 'Tragedy · performed 1613–14, printed 1623' },
  '/books/paradise-lost/': { year: 1667, label: 'Epic poem · 1667' },
  '/books/the-scarlet-letter/': { year: 1850, label: 'Novel · 1850' },
  '/books/sleepy-hollow-and-other-stories/': { year: 9999 },
  '/books/victorian-ghost-stories/': { year: 9999 },
  '/books/a-victorian-christmas/': { year: 9999, label: 'Annotated collection · Christmas customs and stories' },
  '/books/a-victorian-bonfire-night/': { year: 9999, label: 'Annotated collection · Bonfire Night customs and stories' }
};

module.exports = { collections, editionDates };
