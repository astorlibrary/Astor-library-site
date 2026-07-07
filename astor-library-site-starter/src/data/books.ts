export type Source = {
  label: string;
  url: string;
  note?: string;
};

export type Adaptation = {
  title: string;
  year: string;
  type: string;
  note: string;
};

export type Book = {
  slug: string;
  title: string;
  author: string;
  authorSlug: string;
  period: string;
  periodSlug: string;
  category: string;
  cover?: string;
  accent: string;
  shortDescription: string;
  openingContext: string[];
  knownFor: string[];
  studySections: string[];
  adaptations: Adaptation[];
  sources: Source[];
  buyLinks: {
    amazonUk?: string;
    amazonUs?: string;
    payhip?: string;
  };
};

export const books: Book[] = [
  {
    slug: 'macbeth',
    title: 'Macbeth',
    author: 'William Shakespeare',
    authorSlug: 'william-shakespeare',
    period: 'Renaissance & Early Modern',
    periodSlug: 'renaissance-early-modern',
    category: 'Shakespeare',
    accent: '#6E1F2B',
    shortDescription: 'A dark, fast-moving tragedy of prophecy, kingship, violence and theatrical invention.',
    openingContext: [
      'The Macbeth most students meet is not simply Scottish history placed on stage. It is Shakespeare making history faster, stranger and more theatrically useful.',
      'The historical Macbeth ruled for years after Dunsinane. Shakespeare turns that long political story into a compressed tragedy of fear, murder and succession.',
      'The surviving early text also raises questions about performance, revision and collaboration: the play’s brevity and the Hecate material have long made editors cautious.'
    ],
    knownFor: [
      'prophecy and political anxiety',
      'the theatrical force of darkness, blood and sleep',
      'a plot shaped by succession, kingship and legitimacy',
      'performance history that keeps remaking the play'
    ],
    studySections: [
      'Scene-by-scene guide',
      'Characters',
      'Key passages',
      'Themes and motifs',
      'Context and criticism',
      'Performance and adaptation'
    ],
    adaptations: [
      {
        title: 'Throne of Blood',
        year: '1957',
        type: 'Film',
        note: 'Akira Kurosawa relocates the play into a Japanese feudal setting, using Noh-influenced performance and visual austerity.'
      },
      {
        title: 'Macbeth',
        year: '1971',
        type: 'Film',
        note: 'Roman Polanski’s version is unusually physical and bleak, shaped by a grim sense of violence and exposure.'
      },
      {
        title: 'The Tragedy of Macbeth',
        year: '2021',
        type: 'Film',
        note: 'Joel Coen’s stark black-and-white film makes the play feel architectural, ritualised and dreamlike.'
      }
    ],
    sources: [
      {
        label: 'British Library: “The Scottish Play” and the real Macbeth',
        url: 'https://www.bl.uk/stories/blogs/posts/the-scottish-play-and-the-real-macbeth',
        note: 'Historical Macbeth, Dunsinane and Shakespeare’s reshaping of the record.'
      },
      {
        label: 'RSC: Macbeth dates and sources',
        url: 'https://www.rsc.org.uk/macbeth/about-the-play/dates-and-sources',
        note: 'First Folio text, date, sources and possible Middleton material.'
      },
      {
        label: 'Folger Shakespeare: Macbeth',
        url: 'https://www.folger.edu/explore/shakespeares-works/macbeth/',
        note: 'Play hub, reading support, characters and critical material.'
      },
      {
        label: 'Shakespeare’s Globe: Gunpowder Plot and Macbeth',
        url: 'https://www.shakespearesglobe.com/discover/blogs-and-features/2014/11/05/the-gunpowder-plot-and-shakespeares-macbeth/',
        note: 'Succession, James I and the Stuart line.'
      }
    ],
    buyLinks: {
      amazonUk: '#',
      payhip: '#'
    }
  },
  {
    slug: 'animal-farm',
    title: 'Animal Farm',
    author: 'George Orwell',
    authorSlug: 'george-orwell',
    period: 'Modern',
    periodSlug: 'modern',
    category: 'Political fiction',
    accent: '#30343A',
    shortDescription: 'A compact political fable about revolution, language, power and betrayal.',
    openingContext: [
      'Animal Farm is short, but it is not simple. Its force comes from the way Orwell makes political corruption readable as a story of animals, slogans and gradually altered rules.',
      'A good study page should treat the book as a crafted political fable: accessible on the surface, precise in its handling of propaganda, class and memory.'
    ],
    knownFor: [
      'political allegory',
      'slogans and propaganda',
      'language as control',
      'the failure of revolutionary ideals'
    ],
    studySections: [
      'Plot guide',
      'Characters',
      'Key passages',
      'Political context',
      'Language and propaganda',
      'Adaptations'
    ],
    adaptations: [
      {
        title: 'Animal Farm',
        year: '1954',
        type: 'Animated film',
        note: 'The first British animated feature released theatrically; useful for discussing Cold War reception.'
      },
      {
        title: 'Animal Farm',
        year: '1999',
        type: 'Television film',
        note: 'A live-action/animatronic version that changes the ending and reshapes the political emphasis.'
      }
    ],
    sources: [
      {
        label: 'The Orwell Foundation: Animal Farm',
        url: 'https://www.orwellfoundation.com/the-orwell-foundation/orwell/books-by-orwell/animal-farm/',
        note: 'Authoritative starting point for Orwell’s book and publication context.'
      }
    ],
    buyLinks: {
      amazonUk: '#',
      payhip: '#'
    }
  },
  {
    slug: 'tess-of-the-durbervilles',
    title: "Tess of the d'Urbervilles",
    author: 'Thomas Hardy',
    authorSlug: 'thomas-hardy',
    period: 'Victorian',
    periodSlug: 'victorian',
    category: 'Novel',
    accent: '#5E2C2E',
    shortDescription: 'Hardy’s tragic novel of class, sexuality, rural change and social judgement.',
    openingContext: [
      'Tess is often reduced to plot, but the more interesting page begins with pressure: class aspiration, Victorian morality, rural labour, naming and the violence of respectability.',
      'The d’Urberville name matters because it turns history into a trap. Tess is pushed toward a past that is no longer economically real but still socially powerful.'
    ],
    knownFor: [
      'Victorian morality and double standards',
      'rural labour and changing England',
      'class aspiration',
      'fate, naming and social judgement'
    ],
    studySections: [
      'Phase-by-phase guide',
      'Characters',
      'Key passages',
      'Context',
      'Critical approaches',
      'Adaptations'
    ],
    adaptations: [
      {
        title: 'Tess',
        year: '1979',
        type: 'Film',
        note: 'Roman Polanski’s adaptation is visually expansive and central to the novel’s modern screen history.'
      },
      {
        title: "Tess of the d'Urbervilles",
        year: '2008',
        type: 'Television',
        note: 'BBC adaptation useful for comparing pacing, sympathy and the presentation of Alec and Angel.'
      }
    ],
    sources: [
      {
        label: 'British Library: Thomas Hardy context',
        url: 'https://www.bl.uk/people/thomas-hardy',
        note: 'Biographical and literary context for Hardy.'
      }
    ],
    buyLinks: {
      amazonUk: '#',
      payhip: '#'
    }
  },
  {
    slug: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    authorSlug: 'jane-austen',
    period: 'Romantic & Regency',
    periodSlug: 'romantic-regency',
    category: 'Novel',
    accent: '#4A3A2A',
    shortDescription: 'Austen’s novel of marriage, money, social judgement and comic precision.',
    openingContext: [
      'The interesting way into Pride and Prejudice is not simply romance. It is money, inheritance, social reading and the danger of mistaking performance for character.',
      'Every courtship in the novel is also a negotiation with property, reputation and family pressure.'
    ],
    knownFor: [
      'marriage and money',
      'free indirect style',
      'social judgement',
      'comic structure'
    ],
    studySections: [
      'Chapter guide',
      'Characters',
      'Key passages',
      'Context',
      'Narrative method',
      'Adaptations'
    ],
    adaptations: [
      {
        title: 'Pride and Prejudice',
        year: '1995',
        type: 'Television',
        note: 'The BBC serial remains a key adaptation for classroom comparison and popular reception.'
      },
      {
        title: 'Pride & Prejudice',
        year: '2005',
        type: 'Film',
        note: 'Joe Wright’s film places more emphasis on movement, landscape and emotional immediacy.'
      }
    ],
    sources: [
      {
        label: 'British Library: Jane Austen',
        url: 'https://www.bl.uk/people/jane-austen',
        note: 'Biographical and literary context for Austen.'
      }
    ],
    buyLinks: {
      amazonUk: '#',
      payhip: '#'
    }
  }
];

export const periods = [
  { slug: 'renaissance-early-modern', title: 'Renaissance & Early Modern', description: 'Shakespeare, early modern theatre, print culture and religious-political pressure.' },
  { slug: 'romantic-regency', title: 'Romantic & Regency', description: 'Austen, social comedy, poetic experiment and the long nineteenth century beginning to take shape.' },
  { slug: 'victorian', title: 'Victorian', description: 'Industrial change, empire, class, realism, sensation, science and social judgement.' },
  { slug: 'modern', title: 'Modern', description: 'War, politics, experiment, propaganda, fractured voices and new forms of public life.' }
];

export const authors = [
  { slug: 'william-shakespeare', name: 'William Shakespeare', period: 'Renaissance & Early Modern' },
  { slug: 'george-orwell', name: 'George Orwell', period: 'Modern' },
  { slug: 'thomas-hardy', name: 'Thomas Hardy', period: 'Victorian' },
  { slug: 'jane-austen', name: 'Jane Austen', period: 'Romantic & Regency' }
];
