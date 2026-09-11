const resources = [
  {
    category: 'shakespeare',
    title: 'Antony and Cleopatra: Key Themes & Critical Contexts',
    titleHtml: '<em>Antony and Cleopatra</em>: Key Themes &amp; Critical Contexts',
    description: 'Explore Rome and Egypt, love and empire, gender, performance and the play’s changing critical contexts.',
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
    description: 'Compare Bhardwaj’s film adaptations with Othello and Macbeth through gender, objects, bodies and power.',
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
    description: 'Follow prophecy, ambition, royal murder, guilt and the equivocal promises that turn confidence into a trap.',
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
    description: 'Study deposition, divine kingship, succession and the political performances of Richard and Bolingbroke.',
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
    description: 'Move from jealousy and tyranny to pastoral, time and the difficult work of reconciliation.',
    image: '10_winters_tale_study_guide.png',
    url: '/presentations/?presentation=winters-tale',
    legacyRoute: '/resources/winters-tale/complete-study-guide/',
    tags: ['The Winter’s Tale', 'Complete guide']
  },
  {
    category: 'shakespeare',
    title: 'Macbeth: Summary and Analysis',
    titleHtml: '<em>Macbeth</em>: Summary and Analysis',
    description: 'Revise the plot and characters, then develop thematic, contextual and quotation-led analysis.',
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
    description: 'Review the plot and characters, connect themes to context and secure useful quotations.',
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
    description: 'Follow the double plot through power, family, sight, madness, suffering and judgement.',
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
    description: 'Compare the structures, character types and dramatic concerns that recur across Shakespeare’s tragedies.',
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
    description: 'Explore plot, characters, love, transformation, dreams, fairies, staging, adaptations and Puck’s epilogue.',
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
    description: 'Read Jamaican Creole, rhythm and performance beside accounts of policing, resistance and Black British community.',
    image: '08_policing_and_community.png',
    url: '/presentations/?presentation=policing-and-community',
    legacyRoute: '/resources/poetry/linton-kwesi-johnson-policing-community/',
    tags: ['Linton Kwesi Johnson', 'Poetry and policing']
  },
  {
    category: 'eighteenth-century',
    title: 'Pamela’s Psyche',
    titleHtml: '<em>Pamela’s</em> Psyche',
    description: 'Read Richardson’s epistolary novel through fear, hesitation, class, gender and the heroine’s contradictory inner life.',
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
    description: 'Revise key quotations from Austen’s novel with concise routes into character, relationships, class and judgement.',
    image: 'Pride & Prejudice: Key Quotes Revision.png',
    url: '/presentations/?presentation=pride-prejudice-key-quotes',
    relatedBooks: ['/books/pride-and-prejudice/'],
    tags: ['Pride and Prejudice', 'Key quotations']
  },
  {
    category: 'victorian',
    title: 'The Picture of Dorian Gray: An Introduction',
    titleHtml: '<em>The Picture of Dorian Gray</em>: An Introduction',
    description: 'Explore art, influence, secrecy, aestheticism, corruption and the portrait as a hidden record.',
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
    description: 'Study creation, responsibility, narrative frames, isolation, knowledge and the novel’s competing voices.',
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
    description: 'Follow Pip’s expectations through class, crime, memory, generosity and the novel’s changing ideas of gentility.',
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
    description: 'Follow the plot, documents, characters, contexts and forms of evidence assembled against the Count.',
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
    description: 'Examine desire, conduct, the New Woman, masculinity and late-Victorian anxiety in Stoker’s novel.',
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
    description: 'Explore how Dickens and A Christmas Carol helped reinvent Christmas through literary history, charity, family and seasonal tradition.',
    image: 'A Dickens Christmas.png',
    url: 'https://charles-dickens-christma-no08my6.gamma.site/',
    relatedBooks: ['/books/a-christmas-carol/', '/books/the-chimes/', '/books/cricket-on-the-hearth/', '/books/the-haunted-man-and-the-ghosts-bargain/', '/books/dickens-at-christmas/'],
    tags: ['Charles Dickens', 'Christmas']
  },
  {
    category: 'victorian',
    title: 'Ghost Stories in Literature: A Window into Human Belief',
    titleHtml: 'Ghost Stories in Literature: A Window into Human Belief',
    description: 'Explore what stories about the dead reveal about belief, memory, the supernatural and the living cultures that tell them.',
    image: 'Literature and Ghost Stories.png',
    url: 'https://ghost-stories-a-window-i-5hwf1y6.gamma.site/',
    relatedBooks: ['/books/victorian-ghost-stories/', '/books/the-yellow-wallpaper-and-the-giant-wistaria/', '/books/sleepy-hollow-and-other-stories/', '/books/the-haunted-man-and-the-ghosts-bargain/', '/books/dracula/', '/books/frankenstein/'],
    tags: ['Ghost stories', 'Supernatural belief']
  },
  {
    category: 'victorian',
    title: 'Christmas Traditions',
    titleHtml: 'Christmas Traditions',
    description: 'Trace the Victorian customs, rituals and influences that shaped the modern Christmas, from domestic celebration to seasonal literature.',
    image: 'A Victorian Christmas.png',
    url: 'https://victorian-christmas-trad-ebopxnl.gamma.site/',
    relatedBooks: ['/books/a-victorian-christmas/', '/books/a-christmas-carol/', '/books/cricket-on-the-hearth/', '/books/dickens-at-christmas/'],
    tags: ['Victorian Christmas', 'Cultural history']
  },
  {
    category: 'victorian',
    title: 'How Literature Shaped Halloween',
    titleHtml: 'How Literature Shaped Halloween',
    description: 'Trace the dark literary thread from ancient Celtic ritual through ghost stories and Gothic masterpieces to the modern Halloween.',
    image: 'How Literature Shaped Halloween.png',
    url: 'https://how-literature-shaped-ha-ai2opsd.gamma.site/',
    relatedBooks: ['/books/sleepy-hollow-and-other-stories/', '/books/victorian-ghost-stories/', '/books/frankenstein/', '/books/dracula/', '/books/jekyll-and-hyde/', '/books/dorian-gray/'],
    tags: ['Halloween', 'Gothic literature']
  },
  {
    category: 'modern',
    title: 'The Kite Runner: Walkthrough',
    titleHtml: '<em>The Kite Runner</em>: Walkthrough',
    description: 'Follow the novel through friendship, betrayal, exile, memory, guilt and the difficult possibility of atonement.',
    image: 'The Kite Runner Overview.png',
    url: '/presentations/?presentation=kite-runner',
    legacyRoute: '/resources/modern/kite-runner-walkthrough/',
    tags: ['The Kite Runner', 'Walkthrough']
  },
  {
    category: 'modern',
    title: 'The Handmaid’s Tale: Complete Guide',
    titleHtml: '<em>The Handmaid’s Tale</em>: Complete Guide',
    description: 'Examine Gilead through power, gender, memory, language, religion, resistance and Offred’s narration.',
    image: 'Handmaid\'s Tale - Complete Guide.png',
    url: '/presentations/?presentation=handmaids-tale',
    legacyRoute: '/resources/modern/handmaids-tale-guide/',
    tags: ['The Handmaid’s Tale', 'Dystopia']
  },
  {
    category: 'modern',
    title: 'Half of a Yellow Sun: Diaspora, Nation and Exile',
    titleHtml: '<em>Half of a Yellow Sun</em>: Diaspora, Nation and Exile',
    description: 'Study diaspora, Biafran history, narrative form and the limits of Richard, Olanna and Ugwu as witnesses.',
    image: 'Half A Yellow Sun- Diaspora.png',
    url: '/presentations/?presentation=half-of-a-yellow-sun',
    legacyRoute: '/resources/modern/half-of-a-yellow-sun-diaspora/',
    tags: ['Half of a Yellow Sun', 'Diaspora']
  },
  {
    category: 'modern',
    title: 'Wide Sargasso Sea: A Study Guide',
    titleHtml: '<em>Wide Sargasso Sea</em>: A Study Guide',
    description: 'A clear route through Rhys’s novel, its three-part structure, principal voices, settings and central concerns.',
    image: 'Wide-Sargasso-Sea-A-Study-Guide.png',
    url: '/presentations/?presentation=wide-sargasso-sea-study-guide',
    tags: ['Wide Sargasso Sea', 'Study guide']
  },
  {
    category: 'modern',
    title: 'Wide Sargasso Sea & Post-Colonialism',
    titleHtml: '<em>Wide Sargasso Sea</em> &amp; Post-Colonialism',
    description: 'Read Rhys’s novel through empire, emancipation, race, language, displacement and contested identity.',
    image: 'Wide-Sargasso-Sea-and-Post-Colonialism.png',
    url: '/presentations/?presentation=wide-sargasso-sea-study-guide',
    tags: ['Wide Sargasso Sea', 'Post-colonialism']
  },
  {
    category: 'modern',
    title: 'Wide Sargasso Sea — Part 2: Rochester, Antoinette, and the Unravelling of a Marriage',
    seoTitle: 'Wide Sargasso Sea Part Two: Marriage and Control',
    titleHtml: '<em>Wide Sargasso Sea</em> — Part 2',
    description: 'Follow Rochester and Antoinette through the shifting narration, mistrust and power that unravel their marriage.',
    image: 'Wide-Sargasso-Sea-Part-2-Rochester-Antoinette-and-the-Unraveling-of-a-Marriage.png',
    url: '/presentations/?presentation=wide-sargasso-sea-study-guide',
    tags: ['Wide Sargasso Sea', 'Part 2']
  },
  {
    category: 'modern',
    title: 'Wide Sargasso Sea — Part 3 Summary & Analysis',
    titleHtml: '<em>Wide Sargasso Sea</em> — Part 3 Summary &amp; Analysis',
    description: 'Read the final section through confinement, memory, dream, fire and its return to Jane Eyre.',
    image: 'Wide-Sargasso-Sea-Part-3-Summary-and-Analysis.png',
    url: '/presentations/?presentation=wide-sargasso-sea-part-3',
    tags: ['Wide Sargasso Sea', 'Part 3']
  },
  {
    category: 'american',
    title: 'A Lost Voice Recovered: Langston Hughes and the Chain Gang',
    seoTitle: 'Langston Hughes and the Lost Chain Gang Essay',
    titleHtml: 'A Lost Voice Recovered',
    description: 'Follow a forgotten Hughes essay from a 1927 encounter with an escaped prisoner to its recovery from the archive.',
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
    description: 'Trace “Mother to Son” through the speeches of Martin Luther King Jr and Barack Obama.',
    image: '03_dont_turn_back.png',
    url: '/presentations/?presentation=dont-turn-back',
    legacyRoute: '/resources/american/langston-hughes-dont-turn-back/',
    tags: ['Langston Hughes', 'Political speech']
  },
  {
    category: 'american',
    title: 'Moby-Dick: Study Guide',
    titleHtml: '<em>Moby-Dick</em>: Study Guide',
    description: 'Follow the voyage, characters, whaling history and the changing forms through which Ishmael tells the story.',
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
    description: 'Meet the writer of To Kill a Mockingbird through her Alabama childhood, New York years and literary career.',
    image: 'Biography of Harper Lee.png',
    url: '/presentations/?presentation=biography-harper-lee',
    tags: ['Harper Lee', 'Biography']
  },
  {
    category: 'american',
    title: 'To Kill a Mockingbird: Character List & Major Themes',
    seoTitle: 'To Kill a Mockingbird: Characters and Themes',
    titleHtml: '<em>To Kill a Mockingbird</em>: Character List &amp; Major Themes',
    description: 'Keep the novel’s principal characters clear and connect them to justice, prejudice, childhood and moral courage.',
    image: 'To Kill a Mockingbird Character List & Major Themes.png',
    url: '/presentations/?presentation=to-kill-a-mockingbird-characters',
    tags: ['To Kill a Mockingbird', 'Characters and themes']
  },
  {
    category: 'american',
    title: 'Turning Point in The Great Gatsby',
    titleHtml: 'Turning Point in <em>The Great Gatsby</em>',
    description: 'Examine the scene and decisions that turn Gatsby’s recovered dream towards exposure and collapse.',
    image: 'Turning-Point-in-The-Great-Gatsby.png',
    url: '/presentations/?presentation=turning-point-great-gatsby',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'Turning point']
  },
  {
    category: 'american',
    title: 'Biography of F. Scott Fitzgerald',
    titleHtml: 'Biography of F. Scott Fitzgerald',
    description: 'Place Fitzgerald’s life, writing, reputation and Jazz Age career beside the novel for which he is best known.',
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
    description: 'Connect the novel’s social corruption and illusions to its recurring symbols and broken versions of success.',
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
    description: 'Study a crucial death through the relationships, loyalties and failures that prepare for it.',
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
    description: 'Build an essay that connects setting and symbolism to Fitzgerald’s treatment of the American Dream.',
    image: 'Great-Gatsby-Essay-Plan-Setting-Symbolism-and-the-American-Dream.png',
    url: '/presentations/?presentation=gatsby-essay-plan',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'Essay plan']
  },
  {
    category: 'american',
    title: 'Admiration for Gatsby in The Great Gatsby',
    titleHtml: 'Admiration for Gatsby in <em>The Great Gatsby</em>',
    description: 'Test Nick’s admiration against Gatsby’s hope, reinvention, deception and moral choices.',
    image: 'Admiration-for-Gatsby-in-The-Great-Gatsby.png',
    url: '/presentations/?presentation=admiration-for-gatsby',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'Gatsby']
  },
  {
    category: 'american',
    title: 'Things We Admire About Gatsby',
    titleHtml: 'Things We Admire About Gatsby',
    description: 'A focused revision resource on Gatsby’s hope, loyalty, imagination and capacity for self-creation.',
    image: 'THINGS-WE-ADMIRE-ABOUT-GATSBY.png',
    url: '/presentations/?presentation=things-we-admire-gatsby',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'Character']
  },
  {
    category: 'american',
    title: 'The Great Gatsby: Character Study Guide',
    titleHtml: '<em>The Great Gatsby</em>: Character Study Guide',
    description: 'Review the novel’s central characters, their relationships and the values revealed by their choices.',
    image: 'The-Great-Gatsby-Character-Study-Guide.png',
    url: '/presentations/?presentation=great-gatsby-character-study',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'Characters']
  },
  {
    category: 'american',
    title: 'The Great Gatsby: Corruption, Illusion & the American Dream',
    titleHtml: '<em>The Great Gatsby</em>: Corruption, Illusion &amp; the American Dream',
    description: 'Read the novel’s wealth, carelessness and self-invention as a critique of national promise.',
    image: 'The-Great-Gatsby-Corruption-Illusion-and-the-American-Dream.png',
    url: '/presentations/?presentation=great-gatsby-corruption-illusion-v2',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'American Dream']
  },
  {
    category: 'american',
    title: 'The Great Gatsby: Notes & Critical Reading',
    titleHtml: '<em>The Great Gatsby</em>: Notes &amp; Critical Reading',
    description: 'Develop close reading of Fitzgerald’s narration, imagery, structure and critical interpretations.',
    image: 'The-Great-Gatsby-Notes-and-Critical-Reading.png',
    url: '/presentations/?presentation=great-gatsby-notes-critical-reading',
    relatedBooks: ['/books/the-great-gatsby/'],
    tags: ['The Great Gatsby', 'Critical reading']
  },
  {
    "category": "poetry",
    "title": "Alexander Pope: The Rape of the Lock and An Essay on Criticism",
    "titleHtml": "Alexander Pope: The Rape of the Lock and An Essay on Criticism",
    "description": "Explore Pope’s two poems through their versions, reception, poetic machinery and close reading.",
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
    "description": "Read The Willows through its landscape, narrative technique, weird fiction and reception.",
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
    "description": "Explore the murder records, domestic tragedy, characters and authorship questions behind Arden of Faversham.",
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
    "description": "Explore Dracula’s composition through Whitby, Stoker’s reading and notes, narrative form and publication history.",
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
    "description": "Follow Coleridge’s poem through its revisions, marginal gloss, verse form and reception.",
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
    "description": "Read Gogol’s story through rank, money, naming, translation and the problem of its ending.",
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
    "description": "Compare Q1, Q2 and F1 through their differences, the rediscovery of Q1 and debates about textual authority.",
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
    "description": "Follow Moby-Dick’s British and American publication, missing Epilogue, sources, reception and revival.",
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
    "description": "Explore Butler’s translation choices alongside the Iliad’s scope, composition and transmission.",
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
    "description": "Explore White Fang through London’s northern experience, animal perspective and the nature-fakers controversy.",
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
    "description": "Explore Paradise Lost through Milton’s circumstances, manuscript, publishing contract, revisions and verse.",
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
    "description": "Explore Webster’s play through its title page, historical sources, cast list, indoor staging and tragic structure.",
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
    "description": "Compare King Lear’s early texts, editorial conflation, source changes and the stage afterlife of its ending.",
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
    "description": "Examine Macbeth’s Folio text, dating evidence, possible Middleton contributions, sources and royal context.",
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
    "description": "Explore Pudd’nhead Wilson’s composition, racial classifications, fingerprints, courtroom and unsettled justice.",
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
    "description": "Compare Othello’s quarto and Folio texts through variant words, oaths, censorship, sources and performances.",
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
    "description": "Explore the Sir Thomas More manuscript through its hands, censorship, riot scenes and attribution evidence.",
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
    "description": "Explore The Moonstone through its composition, narrators, historical prologue, detection and reception.",
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
