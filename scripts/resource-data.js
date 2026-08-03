const resources = [
  {
    category: 'shakespeare',
    title: 'Antony and Cleopatra: Key Themes & Critical Contexts',
    titleHtml: '<em>Antony and Cleopatra</em>: Key Themes &amp; Critical Contexts',
    description: 'Why Rome and Egypt cannot be judged by the same standards, and how critics have taken sides over the years.',
    image: '02_antony_and_cleopatra.png',
    url: 'https://antony-and-cleopatra-key-a1i8dw1.gamma.site',
    legacyRoute: '/resources/antony-and-cleopatra/themes-critical-contexts/',
    relatedBooks: ['/books/antony-and-cleopatra/'],
    tags: ['Antony and Cleopatra', 'Critical contexts']
  },
  {
    category: 'shakespeare',
    title: 'Gender, Power & Shakespeare: A Guide to Bhardwaj’s Omkara and Maqbool',
    seoTitle: 'Gender and Power in Omkara and Maqbool',
    titleHtml: 'Gender, Power &amp; Shakespeare',
    description: 'What Bhardwaj keeps, cuts and reinvents when Othello and Macbeth are retold in Hindi cinema.',
    image: '04_gender_power_shakespeare.png',
    url: 'https://gender-power-shakespeare-tumoq6d.gamma.site',
    legacyRoute: '/resources/shakespeare/gender-power-omkara-maqbool/',
    relatedBooks: ['/books/othello/', '/books/macbeth/'],
    tags: ['Omkara and Maqbool', 'Film adaptation']
  },
  {
    category: 'shakespeare',
    title: 'Macbeth: A Quick Study Guide',
    titleHtml: '<em>Macbeth</em>: A Quick Study Guide',
    description: 'A fast route through the murder and the guilt, and the promises that tell Macbeth only what he wants to hear.',
    image: '06_macbeth_study_guide.png',
    url: 'https://macbeth-a-study-guide-wkvonk2.gamma.site',
    legacyRoute: '/resources/macbeth/quick-guide/',
    relatedBooks: ['/books/macbeth/'],
    tags: ['Macbeth', 'Quick guide']
  },
  {
    category: 'shakespeare',
    title: 'Richard II: A Student Study Guide',
    titleHtml: '<em>Richard II</em>: A Student Study Guide',
    description: 'How a king can hold the title and still lose the crown, and what Bolingbroke understands that Richard does not.',
    image: '09_richard_ii_study_guide.png',
    url: 'https://shakespeares-richard-ii-1gbwbfw.gamma.site',
    legacyRoute: '/resources/richard-ii/study-guide/',
    relatedBooks: ['/books/richard-ii/'],
    tags: ['Richard II', 'History play']
  },
  {
    category: 'shakespeare',
    title: 'The Winter’s Tale: A Complete Study Guide',
    titleHtml: '<em>The Winter’s Tale</em>: A Complete Study Guide',
    description: 'From a jealous king’s ruin to a sheep-shearing feast, and the sixteen years of repair in between.',
    image: '10_winters_tale_study_guide.png',
    url: 'https://the-winters-tale-a-compl-rv7mbwm.gamma.site',
    legacyRoute: '/resources/winters-tale/complete-study-guide/',
    tags: ['The Winter’s Tale', 'Complete guide']
  },
  {
    category: 'shakespeare',
    title: 'Macbeth: Summary and Analysis',
    titleHtml: '<em>Macbeth</em>: Summary and Analysis',
    description: 'Scene-by-scene revision first, then the themes, context and quotations you can build an answer on.',
    image: 'Macbeth Summary and Analysis.png',
    url: 'https://act-1-scene-1-2xfguks.gamma.site',
    legacyRoute: '/resources/macbeth/summary-analysis/',
    relatedBooks: ['/books/macbeth/'],
    tags: ['Macbeth', 'Summary']
  },
  {
    category: 'shakespeare',
    title: 'Romeo and Juliet: Summary Guide',
    titleHtml: '<em>Romeo and Juliet</em>: Summary Guide',
    description: 'The plot secured first, then the quotations and context that turn a summary into an argument.',
    image: 'Romeo and Juliet plot, characters etc.png',
    url: 'https://romeo-and-juliet-rvvolvg.gamma.site',
    legacyRoute: '/resources/romeo-and-juliet/summary-guide/',
    relatedBooks: ['/books/romeo-and-juliet/'],
    tags: ['Romeo and Juliet', 'Summary']
  },
  {
    category: 'shakespeare',
    title: 'King Lear: Summary Guide',
    titleHtml: '<em>King Lear</em>: Summary Guide',
    description: 'Two families making the same mistake, tracked scene by scene until neither can recover.',
    image: 'King Lear Summary.png',
    url: 'https://act-1-scene-1-4ydkkxl.gamma.site',
    legacyRoute: '/resources/king-lear/summary-guide/',
    relatedBooks: ['/books/king-lear/'],
    tags: ['King Lear', 'Summary']
  },
  {
    category: 'shakespeare',
    title: 'Shakespeare’s Tragedies: An Overview',
    titleHtml: 'Shakespeare’s Tragedies: An Overview',
    description: 'What the tragedies keep repeating, and the places where each one refuses to follow the pattern.',
    image: 'Shakespeare\'s Tragedies- An overview.png',
    url: 'https://shakespeares-tragedies-a-ve41kt1.gamma.site',
    legacyRoute: '/resources/shakespeare/tragedies-overview/',
    relatedBooks: ['/books/hamlet/', '/books/king-lear/', '/books/macbeth/', '/books/othello/', '/books/romeo-and-juliet/', '/books/titus-andronicus/'],
    tags: ['Shakespeare', 'Tragedy']
  },
  {
    category: 'shakespeare',
    title: 'A Midsummer Night’s Dream: A Study Guide',
    titleHtml: '<em>A Midsummer Night’s Dream</em>: A Study Guide',
    description: 'The lovers, the fairies and the mechanicals, kept apart long enough to see how the play joins them.',
    image: 'A Midsummer Night\'s Dream Study Guide.png',
    url: 'https://a-midsummer-nights-dream-akwphaj.gamma.site',
    legacyRoute: '/resources/midsummer-nights-dream/study-guide/',
    relatedBooks: ['/books/a-midsummer-nights-dream/'],
    tags: ['Midsummer', 'Study guide']
  },
  {
    category: 'poetry',
    title: 'Policing and Community in Linton Kwesi Johnson’s Poetry',
    seoTitle: 'Linton Kwesi Johnson: Policing and Community',
    titleHtml: 'Policing and Community in Linton Kwesi Johnson’s Poetry',
    description: 'How Johnson’s Creole and reggae rhythm carry an argument about policing that standard English would blunt.',
    image: '08_policing_and_community.png',
    url: 'https://policing-and-community-i-cvtjjtz.gamma.site',
    legacyRoute: '/resources/poetry/linton-kwesi-johnson-policing-community/',
    tags: ['Linton Kwesi Johnson', 'Poetry and policing']
  },
  {
    category: 'eighteenth-century',
    title: 'Pamela’s Psyche',
    titleHtml: '<em>Pamela’s</em> Psyche',
    description: 'What Pamela’s letters admit, what they hold back, and why her inner life refuses to stay consistent.',
    image: '07_pamelas_psyche.png',
    url: 'https://pamelas-psyche-a-psychol-n0ybnn5.gamma.site',
    legacyRoute: '/resources/pamela/psychological-analysis/',
    relatedBooks: ['/books/pamela/'],
    tags: ['Pamela', 'Psychological reading']
  },
  {
    category: 'regency',
    title: 'Pride & Prejudice: Key Quotes Revision',
    titleHtml: '<em>Pride &amp; Prejudice</em>: Key Quotes Revision',
    description: 'The quotations worth knowing by heart, each with a short route from the line to an argument.',
    image: 'Pride & Prejudice: Key Quotes Revision.png',
    url: 'https://pride-prejudice-key-quot-62oty5x.gamma.site',
    relatedBooks: ['/books/pride-and-prejudice/'],
    tags: ['Pride and Prejudice', 'Key quotations']
  },
  {
    category: 'victorian',
    title: 'The Picture of Dorian Gray: An Introduction',
    titleHtml: '<em>The Picture of Dorian Gray</em>: An Introduction',
    description: 'Wilde’s aestheticism, Lord Henry’s influence, and the picture that keeps the record Dorian will not.',
    image: '05_picture_of_dorian_gray.png',
    url: 'https://the-picture-of-dorian-gr-half16o.gamma.site',
    legacyRoute: '/resources/dorian-gray/introduction/',
    relatedBooks: ['/books/dorian-gray/'],
    tags: ['Oscar Wilde', 'Introduction']
  },
  {
    category: 'victorian',
    title: 'Frankenstein: Study Guide',
    titleHtml: '<em>Frankenstein</em>: Study Guide',
    description: 'Three narrators, one abandoned creature, and a question about responsibility none of them will answer.',
    image: 'Frankenstein Revision Guide.png',
    url: 'https://frankenstein-by-mary-she-3hxubj1.gamma.site',
    legacyRoute: '/resources/frankenstein/study-guide/',
    relatedBooks: ['/books/frankenstein/'],
    tags: ['Frankenstein', 'Study guide']
  },
  {
    category: 'victorian',
    title: 'A Guide to Great Expectations by Charles Dickens',
    titleHtml: 'A Guide to <em>Great Expectations</em> by Charles Dickens',
    description: 'Pip’s rise traced back to its real source, and what the novel finally makes of being a gentleman.',
    image: 'Guide to Great Expectations.png',
    url: 'https://a-guide-to-great-expecta-w1qdbru.gamma.site',
    legacyRoute: '/resources/great-expectations/study-guide/',
    relatedBooks: ['/books/great-expectations/'],
    tags: ['Great Expectations', 'Study guide']
  },
  {
    category: 'victorian',
    title: 'Dracula by Bram Stoker: A Complete Overview',
    titleHtml: '<em>Dracula</em> by Bram Stoker: A Complete Overview',
    description: 'The novel laid out as its characters assemble it, from journals and letters to the case against the Count.',
    image: 'Dracula Overview.png',
    url: 'https://dracula-by-bram-stoker-a-e8ip7yl.gamma.site',
    legacyRoute: '/resources/dracula/complete-overview/',
    relatedBooks: ['/books/dracula/'],
    tags: ['Dracula', 'Complete overview']
  },
  {
    category: 'victorian',
    title: 'Dracula: Gender Roles',
    titleHtml: '<em>Dracula</em>: Gender Roles',
    description: 'Mina, Lucy and the New Woman: what Stoker’s novel is anxious about, and what it chooses to reward.',
    image: 'Dracula- Gender Roles.png',
    url: 'https://dracula-gender-roles-kywv61d.gamma.site',
    legacyRoute: '/resources/dracula/gender-roles/',
    relatedBooks: ['/books/dracula/'],
    tags: ['Dracula', 'Gender']
  },
  {
    category: 'modern',
    title: 'The Kite Runner: Walkthrough',
    titleHtml: '<em>The Kite Runner</em>: Walkthrough',
    description: 'Amir’s betrayal followed from the alley in Kabul to the long, uncertain business of atonement.',
    image: 'The Kite Runner Overview.png',
    url: 'https://the-kite-runner-study-gu-e8x8o98.gamma.site',
    legacyRoute: '/resources/modern/kite-runner-walkthrough/',
    tags: ['The Kite Runner', 'Walkthrough']
  },
  {
    category: 'modern',
    title: 'The Handmaid’s Tale: Complete Guide',
    titleHtml: '<em>The Handmaid’s Tale</em>: Complete Guide',
    description: 'How Gilead controls language before it controls anything else, and what Offred’s telling holds back.',
    image: 'Handmaid\'s Tale - Complete Guide.png',
    url: 'https://the-handmaids-tale-a-com-093fea1.gamma.site',
    legacyRoute: '/resources/modern/handmaids-tale-guide/',
    tags: ['The Handmaid’s Tale', 'Dystopia']
  },
  {
    category: 'modern',
    title: 'Half of a Yellow Sun: Diaspora, Nation and Exile',
    titleHtml: '<em>Half of a Yellow Sun</em>: Diaspora, Nation and Exile',
    description: 'Biafra told through three witnesses who each see only part of it, and the question of who may write the war.',
    image: 'Half A Yellow Sun- Diaspora.png',
    url: 'https://half-of-a-yellow-sun-dia-waqdk9y.gamma.site',
    legacyRoute: '/resources/modern/half-of-a-yellow-sun-diaspora/',
    tags: ['Half of a Yellow Sun', 'Diaspora']
  },
  {
    category: 'modern',
    title: 'Wide Sargasso Sea: A Study Guide',
    titleHtml: '<em>Wide Sargasso Sea</em>: A Study Guide',
    description: 'A clear route through the novel’s three parts, its shifting voices and the Caribbean it insists on.',
    image: 'Wide-Sargasso-Sea-A-Study-Guide.png',
    url: 'https://wide-sargasso-sea-a-stud-dx76kvz.gamma.site',
    tags: ['Wide Sargasso Sea', 'Study guide']
  },
  {
    category: 'modern',
    title: 'Wide Sargasso Sea & Post-Colonialism',
    titleHtml: '<em>Wide Sargasso Sea</em> &amp; Post-Colonialism',
    description: 'What Rhys gives back to the woman Jane Eyre shut in an attic, and what empire had taken first.',
    image: 'Wide-Sargasso-Sea-and-Post-Colonialism.png',
    url: 'https://wide-sargasso-sea-post-c-3jg03rl.gamma.site',
    tags: ['Wide Sargasso Sea', 'Post-colonialism']
  },
  {
    category: 'modern',
    title: 'Wide Sargasso Sea — Part 2: Rochester, Antoinette, and the Unravelling of a Marriage',
    seoTitle: 'Wide Sargasso Sea Part Two: Marriage and Control',
    titleHtml: '<em>Wide Sargasso Sea</em> — Part 2',
    description: 'A marriage unravelling in two voices, with the narration changing hands as the power does.',
    image: 'Wide-Sargasso-Sea-Part-2-Rochester-Antoinette-and-the-Unraveling-of-a-Marriage.png',
    url: 'https://wide-sargasso-sea-part-2-ahq6zsi.gamma.site',
    tags: ['Wide Sargasso Sea', 'Part 2']
  },
  {
    category: 'modern',
    title: 'Wide Sargasso Sea — Part 3 Summary & Analysis',
    titleHtml: '<em>Wide Sargasso Sea</em> — Part 3 Summary &amp; Analysis',
    description: 'Confinement, dream and fire, as the novel walks deliberately back into Jane Eyre.',
    image: 'Wide-Sargasso-Sea-Part-3-Summary-and-Analysis.png',
    url: 'https://wide-sargasso-sea-part-3-9amlw3i.gamma.site',
    tags: ['Wide Sargasso Sea', 'Part 3']
  },
  {
    category: 'american',
    title: 'A Lost Voice Recovered: Langston Hughes and the Chain Gang',
    seoTitle: 'Langston Hughes and the Lost Chain Gang Essay',
    titleHtml: 'A Lost Voice Recovered',
    description: 'Follow a forgotten Hughes essay from a 1927 encounter with an escaped prisoner to its recovery from the archive.',
    image: '01_a_lost_voice_recovered.png',
    url: 'https://a-lost-voice-recovered-l-u9mgk6h.gamma.site',
    legacyRoute: '/resources/american/langston-hughes-chain-gang-essay/',
    tags: ['Langston Hughes', 'Archival recovery']
  },
  {
    category: 'american',
    title: '“Don’t Turn Back”: Langston Hughes, MLK, and Barack Obama',
    seoTitle: 'Langston Hughes: “Don’t Turn Back”',
    titleHtml: '“Don’t Turn Back”',
    description: 'Trace “Mother to Son” through the speeches of Martin Luther King Jr and Barack Obama.',
    image: '03_dont_turn_back.png',
    url: 'https://dont-turn-back-langston--krngien.gamma.site',
    legacyRoute: '/resources/american/langston-hughes-dont-turn-back/',
    tags: ['Langston Hughes', 'Political speech']
  },
  {
    category: 'american',
    title: 'Moby-Dick: Study Guide',
    titleHtml: '<em>Moby-Dick</em>: Study Guide',
    description: 'The voyage, the whaling trade, and the many different kinds of book Ishmael turns his story into.',
    image: 'moby dick study guide.png',
    url: 'https://moby-dick-study-guide-4w1kshg.gamma.site',
    legacyRoute: '/resources/moby-dick/study-guide/',
    relatedBooks: ['/books/moby-dick/'],
    tags: ['Moby-Dick', 'Study guide']
  },
  {
    category: 'american',
    title: 'Biography of Lee, Harper (1926–2016)',
    titleHtml: 'Biography of Harper Lee (1926–2016)',
    description: 'Meet the writer of To Kill a Mockingbird through her Alabama childhood, New York years and literary career.',
    image: 'Biography of Harper Lee.png',
    url: 'https://biography-of-lee-harper--6zdzg8h.gamma.site',
    tags: ['Harper Lee', 'Biography']
  },
  {
    category: 'american',
    title: 'To Kill a Mockingbird: Character List & Major Themes',
    seoTitle: 'To Kill a Mockingbird: Characters and Themes',
    titleHtml: '<em>To Kill a Mockingbird</em>: Character List &amp; Major Themes',
    description: 'Who everyone is in Maycomb, and how the children’s view of the town changes across the trial.',
    image: 'To Kill a Mockingbird Character List & Major Themes.png',
    url: 'https://to-kill-a-mockingbird-fk96i8f.gamma.site',
    tags: ['To Kill a Mockingbird', 'Characters and themes']
  },
  {
    category: 'american',
    title: 'Turning Point in The Great Gatsby',
    titleHtml: 'Turning Point in <em>The Great Gatsby</em>',
    description: 'The afternoon at the Plaza, and the moment Gatsby’s recovered dream begins to come apart.',
    image: 'Turning-Point-in-The-Great-Gatsby.png',
    url: 'https://turning-point-in-the-gre-hrmddv5.gamma.site',
    tags: ['The Great Gatsby', 'Turning point']
  },
  {
    category: 'american',
    title: 'Biography of F. Scott Fitzgerald',
    titleHtml: 'Biography of F. Scott Fitzgerald',
    description: 'Place Fitzgerald’s life, writing, reputation and Jazz Age career beside the novel for which he is best known.',
    image: 'Biography-of-F-Scott-Fitzgerald.png',
    url: 'https://biography-of-f-scott-fit-mod3wix.gamma.site',
    tags: ['F. Scott Fitzgerald', 'Biography']
  },
  {
    category: 'american',
    title: 'Corruption, the American Dream, Symbolism, and Illusion in The Great Gatsby',
    seoTitle: 'The Great Gatsby: Corruption, Symbols and Illusion',
    titleHtml: 'Corruption, the American Dream, Symbolism, and Illusion in <em>The Great Gatsby</em>',
    description: 'The green light, the ash heaps and the eyes on the billboard, read against what success actually costs.',
    image: 'Corruption-the-American-Dream-Symbolism-and-Illusion-in-The-Great-Gatsby.png',
    url: 'https://corruption-the-american--hhs9alp.gamma.site',
    tags: ['The Great Gatsby', 'Themes and symbols']
  },
  {
    category: 'american',
    title: 'Death of a Character & Important Relationships in The Great Gatsby',
    seoTitle: 'Death and Relationships in The Great Gatsby',
    titleHtml: 'Death of a Character &amp; Important Relationships in <em>The Great Gatsby</em>',
    description: 'One death read backwards through the loyalties, evasions and failures that prepare for it.',
    image: 'Death-of-a-Character-and-Important-Relationships-in-The-Great-Gatsby.png',
    url: 'https://death-of-a-character-imp-cv6a30z.gamma.site',
    tags: ['The Great Gatsby', 'Relationships']
  },
  {
    category: 'american',
    title: 'Great Gatsby Essay Plan: Setting, Symbolism & the American Dream',
    seoTitle: 'The Great Gatsby Essay Plan: Setting and Symbolism',
    titleHtml: '<em>The Great Gatsby</em> Essay Plan',
    description: 'A worked essay plan tying Fitzgerald’s settings and symbols to his argument about the Dream.',
    image: 'Great-Gatsby-Essay-Plan-Setting-Symbolism-and-the-American-Dream.png',
    url: 'https://great-gatsby-essay-plan--vuql20z.gamma.site',
    tags: ['The Great Gatsby', 'Essay plan']
  },
  {
    category: 'american',
    title: 'Admiration for Gatsby in The Great Gatsby',
    titleHtml: 'Admiration for Gatsby in <em>The Great Gatsby</em>',
    description: 'Nick thinks Gatsby worth the whole lot of them. This guide asks whether the novel agrees.',
    image: 'Admiration-for-Gatsby-in-The-Great-Gatsby.png',
    url: 'https://admiration-for-gatsby-in-1vuc0qs.gamma.site',
    tags: ['The Great Gatsby', 'Gatsby']
  },
  {
    category: 'american',
    title: 'Things We Admire About Gatsby',
    titleHtml: 'Things We Admire About Gatsby',
    description: 'A short revision sheet on what is genuinely admirable in Gatsby, and where it shades into illusion.',
    image: 'THINGS-WE-ADMIRE-ABOUT-GATSBY.png',
    url: 'https://things-we-admire-about-g-bga59ap.gamma.site',
    tags: ['The Great Gatsby', 'Character']
  },
  {
    category: 'american',
    title: 'The Great Gatsby: Character Study Guide',
    titleHtml: '<em>The Great Gatsby</em>: Character Study Guide',
    description: 'Each major character set beside the choices that show what they actually value.',
    image: 'The-Great-Gatsby-Character-Study-Guide.png',
    url: 'https://the-great-gatsby-charact-g78fiqf.gamma.site',
    tags: ['The Great Gatsby', 'Characters']
  },
  {
    category: 'american',
    title: 'The Great Gatsby: Corruption, Illusion & the American Dream',
    titleHtml: '<em>The Great Gatsby</em>: Corruption, Illusion &amp; the American Dream',
    description: 'Careless money, invented pasts, and a national promise the novel treats as already broken.',
    image: 'The-Great-Gatsby-Corruption-Illusion-and-the-American-Dream.png',
    url: 'https://the-great-gatsby-corrupt-ozf3n31.gamma.site',
    tags: ['The Great Gatsby', 'American Dream']
  },
  {
    category: 'american',
    title: 'The Great Gatsby: Notes & Critical Reading',
    titleHtml: '<em>The Great Gatsby</em>: Notes &amp; Critical Reading',
    description: 'Close reading of Nick’s narration and Fitzgerald’s imagery, with the critical arguments alongside.',
    image: 'The-Great-Gatsby-Notes-and-Critical-Reading.png',
    url: 'https://the-great-gatsby-notes-c-bfksz4c.gamma.site',
    tags: ['The Great Gatsby', 'Critical reading']
  }
];

function slugify(value) {
  return String(value)
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

for (const resource of resources) {
  resource.route = resource.legacyRoute ||
    '/resources/' + resource.category + '/' + slugify(resource.title) + '/';
}

module.exports = resources;
