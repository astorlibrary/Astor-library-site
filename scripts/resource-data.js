const resources = [
  {
    category: 'shakespeare',
    title: 'Antony and Cleopatra: Key Themes & Critical Contexts',
    titleHtml: '<em>Antony and Cleopatra</em>: Key Themes &amp; Critical Contexts',
    description: 'Thirteen slides on the play’s politics: Rome against Egypt, what Shakespeare took from North’s Plutarch, and how the criticism has shifted since.',
    image: '02_antony_and_cleopatra.png',
    url: '/presentations/?presentation=antony-and-cleopatra',
    legacyRoute: '/resources/antony-and-cleopatra/themes-critical-contexts/',
    relatedBooks: ['/books/antony-and-cleopatra/'],
    tags: ['Antony and Cleopatra', 'Critical contexts']
  },
  {
    category: 'shakespeare',
    title: 'Gender, Power & Shakespeare: A Guide to Bhardwaj’s Omkara and Maqbool',
    seoTitle: 'Gender and Power in Omkara and Maqbool',
    titleHtml: 'Gender, Power &amp; Shakespeare',
    description: 'Twelve slides setting Bhardwaj’s two films beside Othello and Macbeth, from Indu and Emilia to Nimmi’s version of Lady Macbeth.',
    image: '04_gender_power_shakespeare.png',
    url: '/presentations/?presentation=gender-power-omkara-maqbool',
    legacyRoute: '/resources/shakespeare/gender-power-omkara-maqbool/',
    relatedBooks: ['/books/othello/', '/books/macbeth/'],
    tags: ['Omkara and Maqbool', 'Film adaptation']
  },
  {
    category: 'shakespeare',
    title: 'Macbeth: A Quick Study Guide',
    titleHtml: '<em>Macbeth</em>: A Quick Study Guide',
    description: 'Equivocation in the opening scene, James I and the Gunpowder Plot, ambition before and after the murder, and the sleeplessness that follows. Ten slides.',
    image: '06_macbeth_study_guide.png',
    url: '/presentations/?presentation=macbeth-quick-guide',
    legacyRoute: '/resources/macbeth/quick-guide/',
    relatedBooks: ['/books/macbeth/'],
    tags: ['Macbeth', 'Quick guide']
  },
  {
    category: 'shakespeare',
    title: 'Richard II: A Student Study Guide',
    titleHtml: '<em>Richard II</em>: A Student Study Guide',
    description: 'The reign, and what Shakespeare did to it: divine kingship, inheritance and deposition, with Richard and Bolingbroke as rival performers. Twenty slides.',
    image: '09_richard_ii_study_guide.png',
    url: '/presentations/?presentation=richard-ii',
    legacyRoute: '/resources/richard-ii/study-guide/',
    relatedBooks: ['/books/richard-ii/'],
    tags: ['Richard II', 'History play']
  },
  {
    category: 'shakespeare',
    title: 'The Winter’s Tale: A Complete Study Guide',
    titleHtml: '<em>The Winter’s Tale</em>: A Complete Study Guide',
    description: 'Forty-two slides: act-by-act summaries, the principal characters, what Shakespeare changed in Greene’s Pandosto, and the move from Sicilia to Bohemia.',
    image: '10_winters_tale_study_guide.png',
    url: '/presentations/?presentation=winters-tale',
    legacyRoute: '/resources/winters-tale/complete-study-guide/',
    tags: ['The Winter’s Tale', 'Complete guide']
  },
  {
    category: 'shakespeare',
    title: 'Macbeth: Summary and Analysis',
    titleHtml: '<em>Macbeth</em>: Summary and Analysis',
    description: 'The plot and characters first, then the themes, context and quotations an essay actually needs. Twenty slides.',
    image: 'Macbeth Summary and Analysis.png',
    url: '/presentations/?presentation=macbeth-summary-analysis',
    legacyRoute: '/resources/macbeth/summary-analysis/',
    relatedBooks: ['/books/macbeth/'],
    tags: ['Macbeth', 'Summary']
  },
  {
    category: 'shakespeare',
    title: 'Romeo and Juliet: Summary Guide',
    titleHtml: '<em>Romeo and Juliet</em>: Summary Guide',
    description: 'The plot, the characters, the feud that frames them, and the quotations worth knowing by heart. Twenty slides.',
    image: 'Romeo and Juliet plot, characters etc.png',
    url: '/presentations/?presentation=romeo-and-juliet',
    legacyRoute: '/resources/romeo-and-juliet/summary-guide/',
    relatedBooks: ['/books/romeo-and-juliet/'],
    tags: ['Romeo and Juliet', 'Summary']
  },
  {
    category: 'shakespeare',
    title: 'King Lear: Summary Guide',
    titleHtml: '<em>King Lear</em>: Summary Guide',
    description: 'Both plots followed side by side — Lear’s daughters, Gloucester’s sons — through power, sight, madness and judgement. Eighteen slides.',
    image: 'King Lear Summary.png',
    url: '/presentations/?presentation=king-lear-summary-analysis',
    legacyRoute: '/resources/king-lear/summary-guide/',
    relatedBooks: ['/books/king-lear/'],
    tags: ['King Lear', 'Summary']
  },
  {
    category: 'shakespeare',
    title: 'Shakespeare’s Tragedies: An Overview',
    titleHtml: 'Shakespeare’s Tragedies: An Overview',
    description: 'Twenty-one slides on what the tragedies have in common: the shape of the plots, the recurring roles, and where each play breaks the pattern.',
    image: 'Shakespeare\'s Tragedies- An overview.png',
    url: '/presentations/?presentation=shakespeares-tragedies',
    legacyRoute: '/resources/shakespeare/tragedies-overview/',
    relatedBooks: ['/books/hamlet/', '/books/king-lear/', '/books/macbeth/', '/books/othello/', '/books/romeo-and-juliet/', '/books/titus-andronicus/'],
    tags: ['Shakespeare', 'Tragedy']
  },
  {
    category: 'shakespeare',
    title: 'A Midsummer Night’s Dream: A Study Guide',
    titleHtml: '<em>A Midsummer Night’s Dream</em>: A Study Guide',
    description: 'Four plots and how they meet: the lovers, the fairies, the mechanicals, and Puck’s epilogue. Twenty-one slides.',
    image: 'A Midsummer Night\'s Dream Study Guide.png',
    url: '/presentations/?presentation=midsummer-nights-dream',
    legacyRoute: '/resources/midsummer-nights-dream/study-guide/',
    relatedBooks: ['/books/a-midsummer-nights-dream/'],
    tags: ['Midsummer', 'Study guide']
  },
  {
    category: 'poetry',
    title: 'Policing and Community in Linton Kwesi Johnson’s Poetry',
    seoTitle: 'Linton Kwesi Johnson: Policing and Community',
    titleHtml: 'Policing and Community in Linton Kwesi Johnson’s Poetry',
    description: 'Sixteen slides on Johnson’s dub poetry: Jamaican Creole on the page, rhythm written for performance, and the policing his first audience knew at first hand.',
    image: '08_policing_and_community.png',
    url: '/presentations/?presentation=policing-and-community',
    legacyRoute: '/resources/poetry/linton-kwesi-johnson-policing-community/',
    tags: ['Linton Kwesi Johnson', 'Poetry and policing']
  },
  {
    category: 'eighteenth-century',
    title: 'Pamela’s Psyche',
    titleHtml: '<em>Pamela’s</em> Psyche',
    description: 'Richardson’s letters read as a record of a mind changing: Pamela’s fear, her resistance, and the power Mr B holds over both. Twenty slides.',
    image: '07_pamelas_psyche.png',
    url: '/presentations/?presentation=pamelas-psyche',
    legacyRoute: '/resources/pamela/psychological-analysis/',
    relatedBooks: ['/books/pamela/'],
    tags: ['Pamela', 'Psychological reading']
  },
  {
    category: 'regency',
    title: 'Pride & Prejudice: Key Quotes Revision',
    titleHtml: '<em>Pride &amp; Prejudice</em>: Key Quotes Revision',
    description: 'Quotations worth learning, each with a short route into character, class or judgement. Ten slides.',
    image: 'Pride & Prejudice: Key Quotes Revision.png',
    url: '/presentations/?presentation=pride-prejudice-key-quotes',
    relatedBooks: ['/books/pride-and-prejudice/'],
    tags: ['Pride and Prejudice', 'Key quotations']
  },
  {
    category: 'victorian',
    title: 'The Picture of Dorian Gray: An Introduction',
    titleHtml: '<em>The Picture of Dorian Gray</em>: An Introduction',
    description: 'Eighteen slides: Wilde’s career and downfall, a route through the plot, and the shifting triangle of Dorian, Basil and Lord Henry.',
    image: '05_picture_of_dorian_gray.png',
    url: '/presentations/?presentation=dorian-gray',
    legacyRoute: '/resources/dorian-gray/introduction/',
    relatedBooks: ['/books/dorian-gray/'],
    tags: ['Oscar Wilde', 'Introduction']
  },
  {
    category: 'victorian',
    title: 'Frankenstein: Study Guide',
    titleHtml: '<em>Frankenstein</em>: Study Guide',
    description: 'Three narrators, a creature who educates himself, and the responsibility Victor never takes. Twenty-two slides.',
    image: 'Frankenstein Revision Guide.png',
    url: '/presentations/?presentation=frankenstein',
    legacyRoute: '/resources/frankenstein/study-guide/',
    relatedBooks: ['/books/frankenstein/'],
    tags: ['Frankenstein', 'Study guide']
  },
  {
    category: 'victorian',
    title: 'A Guide to Great Expectations by Charles Dickens',
    titleHtml: 'A Guide to <em>Great Expectations</em> by Charles Dickens',
    description: 'Pip from the forge to London: the money, the convict, Miss Havisham, and what gentility costs him. Twenty-one slides.',
    image: 'Guide to Great Expectations.png',
    url: '/presentations/?presentation=great-expectations',
    legacyRoute: '/resources/great-expectations/study-guide/',
    relatedBooks: ['/books/great-expectations/'],
    tags: ['Great Expectations', 'Study guide']
  },
  {
    category: 'victorian',
    title: 'Dracula by Bram Stoker: A Complete Overview',
    titleHtml: '<em>Dracula</em> by Bram Stoker: A Complete Overview',
    description: 'The novel’s documents and the people assembling them, from Transylvania to Whitby to the pursuit home. Eighteen slides.',
    image: 'Dracula Overview.png',
    url: '/presentations/?presentation=dracula-overview',
    legacyRoute: '/resources/dracula/complete-overview/',
    relatedBooks: ['/books/dracula/'],
    tags: ['Dracula', 'Complete overview']
  },
  {
    category: 'victorian',
    title: 'Dracula: Gender Roles',
    titleHtml: '<em>Dracula</em>: Gender Roles',
    description: 'Lucy, Mina and the New Woman: conduct, desire, and what late-Victorian readers were anxious about. Sixteen slides.',
    image: 'Dracula- Gender Roles.png',
    url: '/presentations/?presentation=dracula-gender-roles',
    legacyRoute: '/resources/dracula/gender-roles/',
    relatedBooks: ['/books/dracula/'],
    tags: ['Dracula', 'Gender']
  },
  {
    category: 'victorian',
    title: 'A Charles Dickens Christmas',
    titleHtml: 'A Charles Dickens Christmas',
    description: 'How Dickens and A Christmas Carol reshaped the English Christmas: charity, family, and the trade that grew up around the book.',
    image: 'A Dickens Christmas.png',
    url: 'https://charles-dickens-christma-no08my6.gamma.site/',
    relatedBooks: ['/books/a-christmas-carol/', '/books/the-chimes/', '/books/cricket-on-the-hearth/', '/books/the-haunted-man-and-the-ghosts-bargain/', '/books/dickens-at-christmas/'],
    tags: ['Charles Dickens', 'Christmas']
  },
  {
    category: 'victorian',
    title: 'Ghost Stories in Literature: A Window into Human Belief',
    titleHtml: 'Ghost Stories in Literature: A Window into Human Belief',
    description: 'What ghost stories reveal about the people telling them — burial, mourning, the returning dead, and the beliefs under the conventions.',
    image: 'Literature and Ghost Stories.png',
    url: 'https://ghost-stories-a-window-i-5hwf1y6.gamma.site/',
    relatedBooks: ['/books/victorian-ghost-stories/', '/books/the-yellow-wallpaper-and-the-giant-wistaria/', '/books/sleepy-hollow-and-other-stories/', '/books/the-haunted-man-and-the-ghosts-bargain/', '/books/dracula/', '/books/frankenstein/'],
    tags: ['Ghost stories', 'Supernatural belief']
  },
  {
    category: 'victorian',
    title: 'Christmas Traditions',
    titleHtml: 'Christmas Traditions',
    description: 'Where the Victorian Christmas came from: the customs, the household rituals, and the writing that fixed them in place.',
    image: 'A Victorian Christmas.png',
    url: 'https://victorian-christmas-trad-ebopxnl.gamma.site/',
    relatedBooks: ['/books/a-victorian-christmas/', '/books/a-christmas-carol/', '/books/cricket-on-the-hearth/', '/books/dickens-at-christmas/'],
    tags: ['Victorian Christmas', 'Cultural history']
  },
  {
    category: 'victorian',
    title: 'How Literature Shaped Halloween',
    titleHtml: 'How Literature Shaped Halloween',
    description: 'Halloween’s route from Celtic ritual through ghost stories to the modern night, traced through the writing at each stage.',
    image: 'How Literature Shaped Halloween.png',
    url: 'https://how-literature-shaped-ha-ai2opsd.gamma.site/',
    relatedBooks: ['/books/sleepy-hollow-and-other-stories/', '/books/victorian-ghost-stories/', '/books/frankenstein/', '/books/dracula/', '/books/jekyll-and-hyde/', '/books/dorian-gray/'],
    tags: ['Halloween', 'Gothic literature']
  },
  {
    category: 'modern',
    title: 'The Kite Runner: Walkthrough',
    titleHtml: '<em>The Kite Runner</em>: Walkthrough',
    description: 'Amir and Hassan, the betrayal in the alley, the years in America, and what the return costs. Fifty-eight slides across the whole novel.',
    image: 'The Kite Runner Overview.png',
    url: '/presentations/?presentation=kite-runner',
    legacyRoute: '/resources/modern/kite-runner-walkthrough/',
    tags: ['The Kite Runner', 'Walkthrough']
  },
  {
    category: 'modern',
    title: 'The Handmaid’s Tale: Complete Guide',
    titleHtml: '<em>The Handmaid’s Tale</em>: Complete Guide',
    description: 'How Gilead uses language and religion, what Offred can and cannot tell you, and where resistance shows. Eighteen slides.',
    image: 'Handmaid\'s Tale - Complete Guide.png',
    url: '/presentations/?presentation=handmaids-tale',
    legacyRoute: '/resources/modern/handmaids-tale-guide/',
    tags: ['The Handmaid’s Tale', 'Dystopia']
  },
  {
    category: 'modern',
    title: 'Half of a Yellow Sun: Diaspora, Nation and Exile',
    titleHtml: '<em>Half of a Yellow Sun</em>: Diaspora, Nation and Exile',
    description: 'Fourteen slides on Biafra and the three witnesses — Richard, Olanna and Ugwu — and the limits of what each of them can see.',
    image: 'Half A Yellow Sun- Diaspora.png',
    url: '/presentations/?presentation=half-of-a-yellow-sun',
    legacyRoute: '/resources/modern/half-of-a-yellow-sun-diaspora/',
    tags: ['Half of a Yellow Sun', 'Diaspora']
  },
  {
    category: 'modern',
    title: 'Wide Sargasso Sea: A Study Guide',
    titleHtml: '<em>Wide Sargasso Sea</em>: A Study Guide',
    description: 'The novel’s three parts, the voices in each, the settings, and the marriage at the centre of it. Twenty-one slides.',
    image: 'Wide-Sargasso-Sea-A-Study-Guide.png',
    url: '/presentations/?presentation=wide-sargasso-sea-study-guide',
    tags: ['Wide Sargasso Sea', 'Study guide']
  },
  {
    category: 'modern',
    title: 'Wide Sargasso Sea & Post-Colonialism',
    titleHtml: '<em>Wide Sargasso Sea</em> &amp; Post-Colonialism',
    description: 'Twenty-one slides on empire, emancipation and language in Rhys’s novel, and the identity Antoinette is not allowed to keep.',
    image: 'Wide-Sargasso-Sea-and-Post-Colonialism.png',
    url: '/presentations/?presentation=wide-sargasso-sea-study-guide',
    tags: ['Wide Sargasso Sea', 'Post-colonialism']
  },
  {
    category: 'modern',
    title: 'Wide Sargasso Sea — Part 2: Rochester, Antoinette, and the Unravelling of a Marriage',
    seoTitle: 'Wide Sargasso Sea Part Two: Marriage and Control',
    titleHtml: '<em>Wide Sargasso Sea</em> — Part 2',
    description: 'Twenty-one slides on the second part alone: the narration changing hands, and the mistrust that takes the marriage apart.',
    image: 'Wide-Sargasso-Sea-Part-2-Rochester-Antoinette-and-the-Unraveling-of-a-Marriage.png',
    url: '/presentations/?presentation=wide-sargasso-sea-study-guide',
    tags: ['Wide Sargasso Sea', 'Part 2']
  },
  {
    category: 'modern',
    title: 'Wide Sargasso Sea — Part 3 Summary & Analysis',
    titleHtml: '<em>Wide Sargasso Sea</em> — Part 3 Summary &amp; Analysis',
    description: 'The attic, the dream, the fire, and the return to Jane Eyre: the final part in fourteen slides.',
    image: 'Wide-Sargasso-Sea-Part-3-Summary-and-Analysis.png',
    url: '/presentations/?presentation=wide-sargasso-sea-part-3',
    tags: ['Wide Sargasso Sea', 'Part 3']
  },
  {
    category: 'american',
    title: 'A Lost Voice Recovered: Langston Hughes and the Chain Gang',
    seoTitle: 'Langston Hughes and the Lost Chain Gang Essay',
    titleHtml: 'A Lost Voice Recovered',
    description: 'Nine slides on a Hughes foreword that vanished from English print: the prisoner’s testimony behind it, and its rediscovery in an archive.',
    image: '01_a_lost_voice_recovered.png',
    url: '/presentations/?presentation=lost-voice-recovered',
    legacyRoute: '/resources/american/langston-hughes-chain-gang-essay/',
    tags: ['Langston Hughes', 'Archival recovery']
  },
  {
    category: 'american',
    title: '“Don’t Turn Back”: Langston Hughes, MLK, and Barack Obama',
    seoTitle: 'Langston Hughes: “Don’t Turn Back”',
    titleHtml: '“Don’t Turn Back”',
    description: 'Sixteen slides tracing ‘Mother to Son’ into King’s public language — more than a dozen uses, including ‘I Have a Dream’ — and on into Obama’s.',
    image: '03_dont_turn_back.png',
    url: '/presentations/?presentation=dont-turn-back',
    legacyRoute: '/resources/american/langston-hughes-dont-turn-back/',
    tags: ['Langston Hughes', 'Political speech']
  },
  {
    category: 'american',
    title: 'Moby-Dick: Study Guide',
    titleHtml: '<em>Moby-Dick</em>: Study Guide',
    description: 'Ahab, Ishmael, and the whaling business that pays for the voyage, with the book’s changes of form set out. Sixteen slides.',
    image: 'moby dick study guide.png',
    url: '/presentations/?presentation=moby-dick',
    legacyRoute: '/resources/moby-dick/study-guide/',
    relatedBooks: ['/books/moby-dick/'],
    tags: ['Moby-Dick', 'Study guide']
  },
  {
    category: 'american',
    title: 'Biography of Harper Lee (1926–2016)',
    titleHtml: 'Biography of Harper Lee (1926–2016)',
    description: 'Monroeville, the years with Capote, the writing of Mockingbird, and the long silence afterwards. Ten slides.',
    image: 'Biography of Harper Lee.png',
    url: '/presentations/?presentation=biography-harper-lee',
    tags: ['Harper Lee', 'Biography']
  },
  {
    category: 'american',
    title: 'To Kill a Mockingbird: Character List & Major Themes',
    seoTitle: 'To Kill a Mockingbird: Characters and Themes',
    titleHtml: '<em>To Kill a Mockingbird</em>: Character List &amp; Major Themes',
    description: 'Who everybody is in Maycomb, and the themes the trial brings to the surface. Twenty-one slides.',
    image: 'To Kill a Mockingbird Character List & Major Themes.png',
    url: '/presentations/?presentation=to-kill-a-mockingbird-characters',
    tags: ['To Kill a Mockingbird', 'Characters and themes']
  },
  {
    category: 'american',
    title: 'Turning Point in The Great Gatsby',
    titleHtml: 'Turning Point in <em>The Great Gatsby</em>',
    description: 'The Plaza Hotel scene and what it settles: the confrontation, the drive home, and everything that follows. Nine slides.',
    image: 'Turning-Point-in-The-Great-Gatsby.png',
    url: '/presentations/?presentation=turning-point-great-gatsby',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'Turning point']
  },
  {
    category: 'american',
    title: 'Biography of F. Scott Fitzgerald',
    titleHtml: 'Biography of F. Scott Fitzgerald',
    description: 'Princeton, Zelda, the money, and the decade that produced Gatsby. Sixteen slides.',
    image: 'Biography-of-F-Scott-Fitzgerald.png',
    url: '/presentations/?presentation=biography-f-scott-fitzgerald',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['F. Scott Fitzgerald', 'Biography']
  },
  {
    category: 'american',
    title: 'Corruption, the American Dream, Symbolism, and Illusion in The Great Gatsby',
    seoTitle: 'The Great Gatsby: Corruption, Symbols and Illusion',
    titleHtml: 'Corruption, the American Dream, Symbolism, and Illusion in <em>The Great Gatsby</em>',
    description: 'Eight slides on the novel’s symbols — the green light, the eyes, the valley of ashes — and the dream they undercut.',
    image: 'Corruption-the-American-Dream-Symbolism-and-Illusion-in-The-Great-Gatsby.png',
    url: '/presentations/?presentation=gatsby-corruption-symbolism-illusion',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'Themes and symbols']
  },
  {
    category: 'american',
    title: 'Death of a Character & Important Relationships in The Great Gatsby',
    seoTitle: 'Death and Relationships in The Great Gatsby',
    titleHtml: 'Death of a Character &amp; Important Relationships in <em>The Great Gatsby</em>',
    description: 'Nine slides on the deaths in the novel and the relationships they expose, from Myrtle’s to Gatsby’s own.',
    image: 'Death-of-a-Character-and-Important-Relationships-in-The-Great-Gatsby.png',
    url: '/presentations/?presentation=gatsby-death-relationships',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'Relationships']
  },
  {
    category: 'american',
    title: 'Great Gatsby Essay Plan: Setting, Symbolism & the American Dream',
    seoTitle: 'The Great Gatsby Essay Plan: Setting and Symbolism',
    titleHtml: '<em>The Great Gatsby</em> Essay Plan',
    description: 'Eight slides building a single essay on setting, symbolism and the American Dream, with the structure and the evidence to use.',
    image: 'Great-Gatsby-Essay-Plan-Setting-Symbolism-and-the-American-Dream.png',
    url: '/presentations/?presentation=gatsby-essay-plan',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'Essay plan']
  },
  {
    category: 'american',
    title: 'Admiration for Gatsby in The Great Gatsby',
    titleHtml: 'Admiration for Gatsby in <em>The Great Gatsby</em>',
    description: 'Nine slides on what Nick admires in Gatsby, and why he tells you so before he has told you anything else.',
    image: 'Admiration-for-Gatsby-in-The-Great-Gatsby.png',
    url: '/presentations/?presentation=admiration-for-gatsby',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'Gatsby']
  },
  {
    category: 'american',
    title: 'Things We Admire About Gatsby',
    titleHtml: 'Things We Admire About Gatsby',
    description: 'Eleven slides on Gatsby’s hope, his invention of himself and his generosity, and what the novel does with each of them.',
    image: 'THINGS-WE-ADMIRE-ABOUT-GATSBY.png',
    url: '/presentations/?presentation=things-we-admire-gatsby',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'Character']
  },
  {
    category: 'american',
    title: 'The Great Gatsby: Character Study Guide',
    titleHtml: '<em>The Great Gatsby</em>: Character Study Guide',
    description: 'Nick as narrator, Daisy, Tom, Jordan and Gatsby, and what each of them is protecting. Fourteen slides.',
    image: 'The-Great-Gatsby-Character-Study-Guide.png',
    url: '/presentations/?presentation=great-gatsby-character-study',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'Characters']
  },
  {
    category: 'american',
    title: 'The Great Gatsby: Corruption, Illusion & the American Dream',
    titleHtml: '<em>The Great Gatsby</em>: Corruption, Illusion &amp; the American Dream',
    description: 'Nine slides on money, class and illusion in the novel, and the question of who pays for that summer.',
    image: 'The-Great-Gatsby-Corruption-Illusion-and-the-American-Dream.png',
    url: '/presentations/?presentation=great-gatsby-corruption-illusion-v2',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'American Dream']
  },
  {
    category: 'american',
    title: 'The Great Gatsby: Notes & Critical Reading',
    titleHtml: '<em>The Great Gatsby</em>: Notes &amp; Critical Reading',
    description: 'Sixteen slides of notes and criticism: how the novel has been read since 1925, and where the readings disagree.',
    image: 'The-Great-Gatsby-Notes-and-Critical-Reading.png',
    url: '/presentations/?presentation=great-gatsby-notes-critical-reading',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'Critical reading']
  },
  {
    "category": "poetry",
    "title": "Alexander Pope: The Rape of the Lock and An Essay on Criticism",
    "titleHtml": "Alexander Pope: The Rape of the Lock and An Essay on Criticism",
    "description": "The structure and reception of An Essay on Criticism, and the real family quarrel behind The Rape of the Lock. Seventeen slides.",
    "image": "pope-lock-and-criticism-cover.png",
    "url": "/presentations/?presentation=pope-lock-and-criticism",
    "legacyRoute": "/resources/poetry/pope-lock-and-criticism/",
    "relatedBooks": [],
    "tags": [
      "Alexander Pope",
      "Text and publication"
    ]
  },
  {
    "category": "modern",
    "title": "Algernon Blackwood: The Willows (1907)",
    "titleHtml": "Algernon Blackwood: The Willows (1907)",
    "description": "The Danube setting, the story’s narrative method, and Blackwood’s place in weird fiction. Eleven slides.",
    "image": "blackwood-the-willows-cover.png",
    "url": "/presentations/?presentation=blackwood-the-willows",
    "legacyRoute": "/resources/modern/blackwood-the-willows/",
    "relatedBooks": [],
    "tags": [
      "Algernon Blackwood",
      "Text and publication"
    ]
  },
  {
    "category": "renaissance-early-modern",
    "title": "Arden of Faversham (1592)",
    "titleHtml": "Arden of Faversham (1592)",
    "description": "A real killing and the play made from it: Holinshed’s account, petty treason, and Alice Arden’s hired men. Fifteen slides.",
    "image": "arden-of-faversham-1592-cover.png",
    "url": "/presentations/?presentation=arden-of-faversham-1592",
    "legacyRoute": "/resources/renaissance-early-modern/arden-of-faversham-1592/",
    "relatedBooks": [
      "/books/arden-of-faversham/"
    ],
    "tags": [
      "Arden of Faversham (1592)",
      "Text and publication"
    ]
  },
  {
    "category": "victorian",
    "title": "Bram Stoker: Dracula (1897), Notes and Origins",
    "titleHtml": "Bram Stoker: Dracula (1897), Notes and Origins",
    "description": "Stoker’s working notes: Whitby, his documented reading, the Demeter, and what he did not take from Vlad the Impaler. Thirteen slides.",
    "image": "dracula-1897-origins-cover.png",
    "url": "/presentations/?presentation=dracula-1897-origins",
    "legacyRoute": "/resources/victorian/dracula-1897-origins/",
    "relatedBooks": [
      "/books/dracula/"
    ],
    "tags": [
      "Bram Stoker",
      "Text and publication"
    ]
  },
  {
    "category": "poetry",
    "title": "The Rime of the Ancient Mariner: Versions and Gloss",
    "titleHtml": "The Rime of the Ancient Mariner: Versions and Gloss",
    "description": "Fourteen slides on the poem’s revisions: the 1798 spelling, the marginal gloss added in 1817, and the Burnet epigraph.",
    "image": "ancient-mariner-versions-and-gloss-cover.png",
    "url": "/presentations/?presentation=ancient-mariner-versions-and-gloss",
    "legacyRoute": "/resources/poetry/ancient-mariner-versions-and-gloss/",
    "relatedBooks": [
      "/books/the-rime-of-the-ancient-mariner/"
    ],
    "tags": [
      "The Rime of the Ancient Mariner",
      "Text and publication"
    ]
  },
  {
    "category": "victorian",
    "title": "Gogol: The Overcoat and The Mantle",
    "titleHtml": "Gogol: The Overcoat and The Mantle",
    "description": "Fifteen slides on Akaky Akakievich: the Table of Ranks, the cost of the coat, the Person of Consequence, and the ending.",
    "image": "gogol-overcoat-the-mantle-cover.png",
    "url": "/presentations/?presentation=gogol-overcoat-the-mantle",
    "legacyRoute": "/resources/victorian/gogol-overcoat-the-mantle/",
    "relatedBooks": [],
    "tags": [
      "Gogol",
      "Text and publication"
    ]
  },
  {
    "category": "shakespeare",
    "title": "Hamlet: Three Texts",
    "titleHtml": "Hamlet: Three Texts",
    "description": "Q1, Q2 and the Folio: where they differ, and what an editor has to decide before printing a single line. Eleven slides.",
    "image": "hamlet-three-texts-cover.png",
    "url": "/presentations/?presentation=hamlet-three-texts",
    "legacyRoute": "/resources/shakespeare/hamlet-three-texts/",
    "relatedBooks": [
      "/books/hamlet/",
      "/books/hamlet-expanded-scholarly-edition/"
    ],
    "tags": [
      "Hamlet",
      "Text and publication"
    ]
  },
  {
    "category": "american",
    "title": "Moby-Dick (1851): Publication and Revival",
    "titleHtml": "Moby-Dick (1851): Publication and Revival",
    "description": "Thirteen slides on the two first editions, the missing epilogue, the hyphen in the title, and the reviews that followed.",
    "image": "moby-dick-1851-publication-cover.png",
    "url": "/presentations/?presentation=moby-dick-1851-publication",
    "legacyRoute": "/resources/american/moby-dick-1851-publication/",
    "relatedBooks": [
      "/books/moby-dick/"
    ],
    "tags": [
      "Moby-Dick (1851)",
      "Text and publication"
    ]
  },
  {
    "category": "ancient-epic",
    "title": "The Iliad in Samuel Butler’s Prose",
    "titleHtml": "The Iliad in Samuel Butler’s Prose",
    "description": "Butler’s base text, his plain English, his Roman names, and what the poem leaves out. Thirteen slides.",
    "image": "iliad-samuel-butler-cover.png",
    "url": "/presentations/?presentation=iliad-samuel-butler",
    "legacyRoute": "/resources/ancient-epic/iliad-samuel-butler/",
    "relatedBooks": [
      "/books/the-iliad/"
    ],
    "tags": [
      "The Iliad in Samuel Butler’s Prose",
      "Text and publication"
    ]
  },
  {
    "category": "american",
    "title": "Jack London: White Fang (1906)",
    "titleHtml": "Jack London: White Fang (1906)",
    "description": "Ten slides on London’s North, on writing from inside an animal’s head, and on the nature-fakers row that followed.",
    "image": "white-fang-1906-cover.png",
    "url": "/presentations/?presentation=white-fang-1906",
    "legacyRoute": "/resources/american/white-fang-1906/",
    "relatedBooks": [],
    "tags": [
      "Jack London",
      "Text and publication"
    ]
  },
  {
    "category": "poetry",
    "title": "Paradise Lost: Publication and Form",
    "titleHtml": "Paradise Lost: Publication and Form",
    "description": "Milton’s blindness, the surviving manuscript and the publishing contract, and the move from ten books to twelve. Thirteen slides.",
    "image": "paradise-lost-publication-and-form-cover.png",
    "url": "/presentations/?presentation=paradise-lost-publication-and-form",
    "legacyRoute": "/resources/poetry/paradise-lost-publication-and-form/",
    "relatedBooks": [
      "/books/paradise-lost/"
    ],
    "tags": [
      "Paradise Lost",
      "Text and publication"
    ]
  },
  {
    "category": "renaissance-early-modern",
    "title": "The Duchess of Malfi (1623): Print and Performance",
    "titleHtml": "The Duchess of Malfi (1623): Print and Performance",
    "description": "Fourteen slides on the 1623 quarto: its title-page claims, the historical Duchess, the cast list, and the indoor stage.",
    "image": "duchess-of-malfi-1623-cover.png",
    "url": "/presentations/?presentation=duchess-of-malfi-1623",
    "legacyRoute": "/resources/renaissance-early-modern/duchess-of-malfi-1623/",
    "relatedBooks": [
      "/books/the-duchess-of-malfi/"
    ],
    "tags": [
      "The Duchess of Malfi (1623)",
      "Text and publication"
    ]
  },
  {
    "category": "shakespeare",
    "title": "King Lear: Two Plays, One Title",
    "titleHtml": "King Lear: Two Plays, One Title",
    "description": "The Quarto and the Folio: what differs, what conflation costs, and the case for printing them separately. Thirteen slides.",
    "image": "king-lear-two-texts-cover.png",
    "url": "/presentations/?presentation=king-lear-two-texts",
    "legacyRoute": "/resources/shakespeare/king-lear-two-texts/",
    "relatedBooks": [
      "/books/king-lear/",
      "/books/king-lear-expanded-scholarly-edition/"
    ],
    "tags": [
      "King Lear",
      "Text and publication"
    ]
  },
  {
    "category": "shakespeare",
    "title": "Macbeth: The Folio Text and Middleton’s Hand",
    "titleHtml": "Macbeth: The Folio Text and Middleton’s Hand",
    "description": "Ten slides on the only surviving text: the evidence for dating, Middleton’s additions, and Simon Forman’s account of a performance.",
    "image": "macbeth-folio-and-middleton-cover.png",
    "url": "/presentations/?presentation=macbeth-folio-and-middleton",
    "legacyRoute": "/resources/shakespeare/macbeth-folio-and-middleton/",
    "relatedBooks": [
      "/books/macbeth/",
      "/books/macbeth-expanded-scholarly-edition/"
    ],
    "tags": [
      "Macbeth",
      "Text and publication"
    ]
  },
  {
    "category": "american",
    "title": "Mark Twain: Pudd’nhead Wilson (1894)",
    "titleHtml": "Mark Twain: Pudd’nhead Wilson (1894)",
    "description": "The novel’s origins, Roxy and the arithmetic of racial fractions, and the fingerprints that settle the case. Thirteen slides.",
    "image": "puddnhead-wilson-1894-cover.png",
    "url": "/presentations/?presentation=puddnhead-wilson-1894",
    "legacyRoute": "/resources/american/puddnhead-wilson-1894/",
    "relatedBooks": [],
    "tags": [
      "Mark Twain",
      "Text and publication"
    ]
  },
  {
    "category": "shakespeare",
    "title": "Othello: Two Texts and the Words the Law Removed",
    "titleHtml": "Othello: Two Texts and the Words the Law Removed",
    "description": "Nine slides on the Quarto and Folio Othello: the oaths the 1606 act took out, a disputed reading, and Cinthio’s source.",
    "image": "othello-two-texts-cover.png",
    "url": "/presentations/?presentation=othello-two-texts",
    "legacyRoute": "/resources/shakespeare/othello-two-texts/",
    "relatedBooks": [
      "/books/othello/",
      "/books/othello-expanded-scholarly-edition/"
    ],
    "tags": [
      "Othello",
      "Text and publication"
    ]
  },
  {
    "category": "renaissance-early-modern",
    "title": "Sir Thomas More: The Censored Manuscript",
    "titleHtml": "Sir Thomas More: The Censored Manuscript",
    "description": "Thirteen slides on the manuscript as an object: the different hands, the censor’s marks, and the evidence for Hand D.",
    "image": "sir-thomas-more-manuscript-cover.png",
    "url": "/presentations/?presentation=sir-thomas-more-manuscript",
    "legacyRoute": "/resources/renaissance-early-modern/sir-thomas-more-manuscript/",
    "relatedBooks": [
      "/books/sir-thomas-more/"
    ],
    "tags": [
      "Sir Thomas More",
      "Text and publication"
    ]
  },
  {
    "category": "victorian",
    "title": "Wilkie Collins: The Moonstone (1868)",
    "titleHtml": "Wilkie Collins: The Moonstone (1868)",
    "description": "How the novel is built: the narrators, the historical prologue, Sergeant Cuff and the Shivering Sand. Fourteen slides.",
    "image": "moonstone-1868-cover.png",
    "url": "/presentations/?presentation=moonstone-1868",
    "legacyRoute": "/resources/victorian/moonstone-1868/",
    "relatedBooks": [
      "/books/the-moonstone/"
    ],
    "tags": [
      "Wilkie Collins",
      "Text and publication"
    ]
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
