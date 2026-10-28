const collections = {
  ancient: {
    collection: 'Ancient & Epic',
    collectionHref: '/ancient-epic/',
    collectionFile: 'ancient-epic/index.html'
  },
  renaissance: {
    collection: 'Renaissance & Early Modern',
    collectionHref: '/renaissance-early-modern/',
    collectionFile: 'renaissance-early-modern/index.html'
  },
  shakespeare: {
    collection: 'Shakespeare',
    collectionHref: '/shakespeare/',
    collectionFile: 'shakespeare/index.html'
  },
  restoration: {
    collection: 'Restoration & Enlightenment',
    collectionHref: '/restoration-enlightenment/',
    collectionFile: 'restoration-enlightenment/index.html'
  },
  romantic: {
    collection: 'Romantic & Regency',
    collectionHref: '/romantic-regency/',
    collectionFile: 'romantic-regency/index.html'
  },
  victorian: {
    collection: 'Victorian',
    collectionHref: '/victorian/',
    collectionFile: 'victorian/index.html'
  },
  american: {
    collection: 'American Classics',
    collectionHref: '/american/',
    collectionFile: 'american/index.html'
  },
  modern: {
    collection: 'Modern Classics',
    collectionHref: '/modern/',
    collectionFile: 'modern/index.html'
  }
};

function inCollection(key, book) {
  return Object.assign({}, collections[key], book);
}

const editionUpdateBooks = [
  inCollection('victorian', {
    slug: 'a-victorian-christmas',
    title: 'A Victorian Christmas',
    author: 'Astor Library',
    image: 'A Victorian Christmas Main Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/a-victorian-christmas',
    label: 'Cultural history',
    deck: 'Henry Cole had the first Christmas card printed in 1843, the year of A Christmas Carol, and in 1848 the Illustrated London News showed the royal family round a decorated tree. This is a history of how the Victorians made the Christmas that is still kept, with three pieces by Dickens printed complete.',
    editionIncludes: [
      'The Christmas tree and its royal associations',
      'The first commercial Christmas card and the rise of cheaper post',
      'Tom Smith, the Christmas cracker and Victorian consumer culture',
      'Christmas literature, workhouses, servants, charity, food and music'
    ],
    facts: [
      { label: 'Before Victoria', text: 'Kissing boughs, Twelfth Night, wassailing and New Year gifts were already changing before 1837.' },
      { label: 'New networks', text: 'Cheaper postage, railways and mass publishing made Christmas more visible and more widely shared.' },
      { label: 'Domestic focus', text: 'The period increasingly presented Christmas as a family-centred celebration organised around the home.' },
      { label: 'Dickens in full', text: 'Three Christmas pieces by Charles Dickens are reproduced, including A Christmas Tree and A Child’s Dream of a Star.' }
    ],
    overview: [
      'People often talk about the British Christmas as a set of ancient traditions. This book traces where they came from, and shows that many began with nineteenth-century changes in transport, print, shopping and family life.',
      'The history begins before Victoria’s accession with customs already becoming less common: kissing boughs, Twelfth Night celebrations, New Year gift-giving, wassailing and seasonal charity. It then follows the rapid Victorian reshaping of the festival through cheaper postage, railway travel, mass publishing and a growing consumer culture.',
      'Individual chapters examine the Christmas tree, the first commercial card, Tom Smith and the cracker, goose clubs and dinner, familiar carols, urban and rural celebration, servants below stairs and Christmas inside the workhouse. Christmas charity is set beside the New Poor Law and the workhouse.',
      'Literature is part of this social history. The book reproduces three Dickens pieces and discusses A Christmas Carol, The Chimes, Trollope’s Christmas at Thompson Hall and Gabriel Grub in The Pickwick Papers, as well as the Victorian Christmas number and ghost-story tradition.'
    ],
    editorial: [
      'The book puts objects, laws, work and writing into one chronology. Familiar things have histories of their own, and their meanings changed as the royal household, the factories and ordinary homes took them up.',
      'A single custom can be followed through the century, or the whole period read through, as Christmas became more domestic, more commercial and more public.'
    ],
    topics: [
      { title: 'Tradition and invention', body: 'The book distinguishes older seasonal customs from nineteenth-century practices that quickly acquired the authority of tradition.' },
      { title: 'Home and labour', body: 'Family celebration is read beside the work performed by servants, traders, postal workers and people living under the Poor Law.' },
      { title: 'Print and imagination', body: 'Cards, periodicals, carols and ghost stories helped make Christmas a shared national image as well as a private celebration.' }
    ]
  }),
  inCollection('victorian', {
    slug: 'jane-eyre',
    title: 'Jane Eyre',
    author: 'Charlotte Brontë',
    image: 'Jane Eyre Main Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/jane-eyre',
    label: 'Novel · 1847',
    deck: 'Jane Eyre is an orphan at Gateshead, shut in the red room by her aunt, and then a pupil at Lowood, a charity school where the girls go hungry. At eighteen she becomes governess at Thornfield Hall, where Mr Rochester lives and where she hears laughter from the third storey. Charlotte Brontë published the novel in 1847 as Currer Bell.',
    editionIncludes: [
      'Original introduction and critical essays',
      'Chapter summaries and historical context boxes',
      'Character studies, themes and key-passage analysis',
      'Chronology, glossary, bibliography and reception history'
    ],
    facts: [
      { label: 'October 1847', text: 'The novel first appeared as Jane Eyre: An Autobiography.' },
      { label: 'Currer Bell', text: 'Brontë published the first edition under her masculine pseudonym.' },
      { label: 'Complete text', text: 'The Astor edition is unabridged and does not modernise Brontë’s spelling or characteristic punctuation.' },
      { label: 'Added documents', text: 'Brontë’s Preface to the second edition and Note to the third are included.' }
    ],
    overview: [
      'Jane begins as an orphan dependent on the Reed family at Gateshead. Punished for resisting her bullying cousin and treated as an unwelcome burden, she is sent to Lowood School, where deprivation, disease and harsh discipline shape the principles that govern her adult life.',
      'As a governess at Thornfield Hall, Jane meets Edward Fairfax Rochester. Their attachment offers a home and equality she has never possessed, but a concealed truth about Rochester’s existing marriage makes their wedding impossible. Jane leaves Thornfield with almost nothing, because staying would mean living with Rochester as his mistress.',
      'Her later life with the Rivers family, an unexpected inheritance and St John Rivers’s proposal present different forms of dependence. Again and again Jane has to decide how much of herself to give up for love, duty, respectability or safety.',
      'The supporting material follows the Gothic inheritance of Thornfield, Victorian class and the governess, marriage and property law, madness and confinement, Jamaica and empire, religion, gender and the novel’s direct address to its reader.'
    ],
    editorial: [
      'Brontë’s chapter divisions, paragraphing, spelling and punctuation are kept. The historical notes come in boxes after each chapter, so Jane’s narration runs on without footnotes.',
      'The edition also covers the Bell pseudonyms, the novel’s sources, the main critical readings, its reception, and the later lives of Jane, Rochester, Bertha Mason, St John Rivers and Helen Burns in other books.'
    ],
    topics: [
      { title: 'Independence and equality', body: 'Jane refuses relationships that require her to become dependent, concealed or spiritually subordinate.' },
      { title: 'Gothic and domestic space', body: 'Gateshead, Lowood, Thornfield and Moor House each make questions of belonging and authority material.' },
      { title: 'Voice and judgement', body: 'The adult narrator shapes childhood memory and repeatedly addresses the reader while insisting on Jane’s right to interpret her own life.' }
    ]
  }),
  inCollection('victorian', {
    slug: 'the-haunted-man-and-the-ghosts-bargain',
    title: 'The Haunted Man and the Ghost’s Bargain',
    author: 'Charles Dickens',
    image: "The Haunted Man and the Ghost's Bargain Main Cover.png",
    purchaseUrl: 'https://astorlibrary.com/go/the-haunted-man-and-the-ghosts-bargain',
    label: 'Christmas book · 1848',
    deck: 'Redlaw, a chemist and lecturer, is visited by a phantom that looks exactly like him and offers to take away his painful memories. He accepts, and finds that he now passes the same forgetting to everyone he meets. It was the last of Dickens’s five Christmas books, published in December 1848.',
    editionIncludes: [
      'Original introduction and historical context',
      'Chapter summaries and contextual annotations',
      'Glossary, character guide and critical commentary',
      'An essay on stage history and Pepper’s Ghost'
    ],
    facts: [
      { label: '19 December 1848', text: 'Dickens published The Haunted Man as his fifth and final Christmas book.' },
      { label: 'Three parts', text: 'The Gift Bestowed, The Gift Diffused and The Gift Reversed retain the original structure.' },
      { label: 'A contagious bargain', text: 'Redlaw’s loss of painful memory passes to people around him.' },
      { label: 'Pepper’s Ghost', text: 'In 1862 John Henry Pepper used a scene from the story for the illusion that took his name.' }
    ],
    overview: [
      'Redlaw, a solitary chemistry teacher, is haunted by memories of neglect, lost love and his sister’s death. On Christmas Eve a phantom in his own likeness offers what he believes he wants: the power to forget every sorrow, wrong and trouble he has known.',
      'The bargain carries a second gift. The same loss of memory passes to those Redlaw meets. Pain disappears, but gratitude, tenderness and fellow-feeling disappear with it. Dickens makes suffering neither desirable nor easily redeeming; its moral value lies in what people learn to recognise in one another.',
      'Milly Swidger provides the counterexample. Her grief has made her kinder. A neglected child remains immune because he possesses no loving memories to lose, making absence itself a terrible form of protection.',
      'The concluding stage-history essay follows Dickens’s permission for Pepper to use a scene from the book in the optical illusion later called Pepper’s Ghost. Pepper recorded that the scene ran for fifteen months.'
    ],
    editorial: [
      'Dickens’s spelling, capitals and paragraphing are kept; quotation marks and dashes are made consistent and obvious misprints corrected. The notes come outside the story, and unfamiliar words are gathered in a glossary.',
      'The material after each chapter explains Victorian chemistry, poverty, ragged schools and Christmas customs, and the story’s structure, characters, criticism and reception.'
    ],
    topics: [
      { title: 'Memory and sympathy', body: 'The bargain is an experiment: what happens to a man’s feelings when his painful memories are taken away?' },
      { title: 'Knowledge and experiment', body: 'Redlaw is a chemist, and the phantom’s gift works like an experiment that gets out of the laboratory.' },
      { title: 'Stage afterlife', body: 'Pepper’s Ghost joins literary history to Victorian science, theatre and optical entertainment.' }
    ]
  }),
  inCollection('modern', {
    slug: 'mrs-dalloway',
    title: 'Mrs Dalloway',
    author: 'Virginia Woolf',
    image: 'Mrs Dalloway Main Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/mrs-dalloway',
    label: 'Novel · 1925',
    deck: 'On a Wednesday in June 1923, Clarissa Dalloway walks through Westminster to buy flowers for the party she is giving that evening. In Regent’s Park, Septimus Warren Smith, who fought in the war and hears the dead talking, waits with his Italian wife for an appointment with a Harley Street doctor. The two never meet.',
    editionIncludes: [
      'Original introduction and contextual essays',
      'Explanatory footnotes throughout the novel',
      'Restored section breaks and guided reading parts',
      'Character, passage and critical commentary'
    ],
    facts: [
      { label: 'June 1923', text: 'The novel’s action unfolds over a single day in post-war London.' },
      { label: 'Two paths', text: 'Clarissa and Septimus never meet, but the city, clocks and the party connect their stories.' },
      { label: 'Twelve breaks', text: 'Woolf’s original white-space divisions are restored, including one lost in a 1942 resetting.' },
      { label: 'Sixteen parts', text: 'The Astor edition adds four clearly marked reading divisions within Woolf’s exceptionally long ninth section.' }
    ],
    overview: [
      'Clarissa walks through Westminster and St James’s to buy flowers, remembering Peter Walsh, Sally Seton and the choices that produced her present life with Richard Dalloway. The party gathers private memory, social performance and public London into one evening.',
      'Elsewhere in the same city, Septimus Warren Smith suffers hallucinations after returning from the First World War unable to grieve the death of his officer and friend Evans. His doctors tell him he has lost his sense of proportion and prescribe rest in the country, away from Rezia.',
      'Motor cars, aeroplanes, bells, crowds and the repeated striking of clocks move the narrative from one consciousness to another. When news of Septimus reaches Clarissa’s party, the separate stories become different responses to life, death, isolation and survival.',
      'The edition explains historical and literary references while preserving the punctuation that carries Woolf’s rhythms and transitions between minds.'
    ],
    editorial: [
      'The reading text follows the first American setting of 1925 as preserved in a later Harcourt impression, with the erroneous Richard corrected to Peter near the close. Woolf’s twelve original section breaks are restored.',
      'The text is divided into sixteen numbered parts as places to stop. The contents page shows which breaks are Woolf’s and which four were added, each at a point where a clock strikes.'
    ],
    topics: [
      { title: 'Time and consciousness', body: 'Public clocks measure the day while memory opens private histories within a single moment.' },
      { title: 'War and medicine', body: 'Septimus’s story records trauma and exposes the authority, distance and coercion of his doctors.' },
      { title: 'Privacy and society', body: 'Clarissa’s party is a social performance, and it also brings separate lives together for an evening.' }
    ]
  }),
  inCollection('romantic', {
    slug: 'the-rime-of-the-ancient-mariner',
    title: 'The Rime of the Ancient Mariner',
    author: 'Samuel Taylor Coleridge',
    image: 'Rime of the Ancient Mariner Main Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/the-rime-of-the-ancient-mariner',
    label: 'Poem · 1798 / 1834 text',
    deck: 'An old sailor stops one of three guests on the way to a wedding and makes him listen to the story of how he shot an albatross, and what happened to his ship afterwards. Coleridge published the poem in Lyrical Ballads in 1798 and added the prose gloss in the margin for the version of 1817.',
    editionIncludes: [
      'Complete 1834 text, Coleridge’s final lifetime version',
      'The full marginal gloss first added in 1817',
      'Continuous line numbers and same-page commentary',
      'Introductions to composition, sources, verse and revision'
    ],
    facts: [
      { label: '1798', text: 'The poem first appeared in Lyrical Ballads.' },
      { label: '1817', text: 'Coleridge added the antiquarian marginal gloss.' },
      { label: '1834', text: 'This edition follows the last version Coleridge saw through the press.' },
      { label: '625 lines', text: 'All seven parts are continuously numbered for reference.' }
    ],
    overview: [
      'An Ancient Mariner stops a wedding guest and describes a voyage southwards beyond the equator into mist, snow and ice. When an albatross appears through the fog, the crew welcomes and feeds it. Without explaining why, the Mariner shoots the bird.',
      'The ship escapes the ice but becomes trapped beneath a burning sun. The dead bird is hung around the Mariner’s neck, and a spectral vessel arrives carrying Death and Life-in-Death. He survives the loss of the crew and watches their bodies rise to work the ship.',
      'His return does not end the punishment. At unpredictable moments he must find another person and tell the story. The poem therefore presents narration itself as burden, penance and uncertain contact.',
      'Coleridge’s later marginal gloss tries to explain the crime and the supernatural powers pursuing the ship. Its confident statements do not always agree with the verse, creating a second interpretive voice on the same page.'
    ],
    editorial: [
      'Notes at the foot of the page explain unfamiliar words and nautical and historical references, and record the main changes between the printings made in Coleridge’s lifetime.',
      'The introduction covers Coleridge’s work with William and Dorothy Wordsworth, voyage narratives and ballad sources, the 1798 publication, the gloss, the unusual verse form and the long history of revision.'
    ],
    topics: [
      { title: 'Crime without motive', body: 'The unexplained killing makes guilt and interpretation more difficult than a simple moral fable would allow.' },
      { title: 'Verse and gloss', body: 'Poem and commentary occupy the page together but do not always tell exactly the same story.' },
      { title: 'Compelled narration', body: 'The Mariner survives by telling his story again and again, as a punishment and as a way of reaching other people.' }
    ]
  }),
  inCollection('romantic', {
    slug: 'the-sorrows-of-young-werther',
    title: 'The Sorrows of Young Werther',
    author: 'Johann Wolfgang von Goethe',
    image: 'The Sorrows of Young Werther Main Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/the-sorrows-of-young-werther',
    label: 'Novel · 1774 / 1787',
    deck: 'Werther writes to his friend Wilhelm about Lotte, whom he meets at a country dance already knowing that she is engaged to Albert. Goethe was twenty-four when he wrote the novel in 1774, and it made him famous across Europe.',
    editionIncludes: [
      'Original explanatory notes throughout',
      'Chapter summaries and historical context',
      'Biography, chronology and literary background',
      'Glossary, sources and reception history'
    ],
    facts: [
      { label: '1774', text: 'The anonymous first edition became an immediate European sensation.' },
      { label: '1787', text: 'Goethe substantially revised the novel and expanded its closing narrative.' },
      { label: 'Eighty-eight', text: 'The dated letters and fragments remain in sequence but are grouped into thirty editorial chapters.' },
      { label: '1854', text: 'The English reading text is R. Dillon Boylan’s translation of the later version.' }
    ],
    overview: [
      'Werther retreats to the countryside and finds temporary peace in nature, drawing and Homer. He falls in love with Charlotte, the eldest daughter of a widowed official, who cares for her younger siblings and is already promised to Albert.',
      'Told mostly through letters to Wilhelm, the novel stays close to Werther’s intense and increasingly unreliable view of things. Love becomes fixation, admiration becomes despair, and a period in government service fails to loosen the attachment.',
      'Goethe drew on events from 1772: his own love for Charlotte Buff, who was engaged to Johann Christian Kestner, and the death of Karl Wilhelm Jerusalem with pistols borrowed from Kestner. Details from both experiences entered the fiction.',
      'Near the end, a fictional editor takes over to reconstruct events Werther can no longer narrate. That formal change makes the limits of his letters newly visible.'
    ],
    editorial: [
      'The edition keeps the dates and order of the eighty-eight letters and fragments, and groups them into thirty chapters for reference. Footnotes explain literature, vocabulary, history and eighteenth-century culture.',
      'Supporting material covers the two versions, epistolary form, Homer, Ossian, Klopstock, Sturm und Drang, class convention, censorship, imitation, the disputed Werther effect and the international afterlife of the book.'
    ],
    topics: [
      { title: 'Feeling and perspective', body: 'The letters make Werther’s intensity immediate while limiting what the reader can know beyond his interpretation.' },
      { title: 'Life and fiction', body: 'Goethe combined events from his own life with the suicide of a young man he had known.' },
      { title: 'A European phenomenon', body: 'Translation, imitation, fashion, criticism and censorship made Werther a cultural event as well as a novel.' }
    ]
  }),
  inCollection('restoration', {
    slug: 'robinson-crusoe',
    title: 'Robinson Crusoe',
    author: 'Daniel Defoe',
    image: 'Robinson Crusoe.png',
    purchaseUrl: 'https://astorlibrary.com/go/robinson-crusoe',
    label: 'Novel · 1719',
    deck: 'Robinson Crusoe goes to sea against his father’s advice, is taken by pirates, becomes a planter in Brazil and in 1659 is shipwrecked alone on an island near the mouth of the Orinoco. He stays twenty-eight years. Defoe published the book in 1719 as Crusoe’s own story, with no author’s name.',
    editionIncludes: [
      'Original introduction and critical commentary',
      'Explanatory footnotes and chapter-end notes',
      'Chapter summaries and historical context',
      'Glossary, chronology and critical perspectives'
    ],
    facts: [
      { label: '1719', text: 'The first edition appeared without the twenty-chapter division used by this reading text.' },
      { label: 'September 1659', text: 'Crusoe dates the shipwreck that leaves him alone on the island.' },
      { label: 'Twenty-eight years', text: 'He transforms the island through salvage, building, agriculture, pottery and livestock.' },
      { label: 'Complete novel', text: 'The Astor edition is unabridged and principally follows the first edition.' }
    ],
    overview: [
      'Born in York, Crusoe rejects his father’s advice to remain in the middle station. Voyages bring storms, enslavement at Salé, escape down the African coast and prosperity as a plantation owner in Brazil.',
      'The shipwreck follows an expedition intended to obtain enslaved Africans from the Guinea coast. Alone, Crusoe salvages weapons and tools, builds a fortified dwelling, keeps a journal, grows barley and rice, makes pottery and reads survival through Providence and repentance.',
      'The discovery of a human footprint destroys his constructed security. Rescuing the man he names Friday ends isolation but creates a relationship organised around language, Christianity, service and colonial authority. A mutinied English ship later gives Crusoe the chance to present himself as governor.',
      'The edition places the survival narrative inside maritime travel, Atlantic commerce, slavery, colonial expansion and the development of the English novel.'
    ],
    editorial: [
      'Spelling and punctuation are modernised where the sense needs it, but Defoe’s long sentences and dated journal entries are kept. Defoe did not divide the book into chapters; the familiar twenty were added by later editors.',
      'Footnotes explain nautical and archaic words, and each chapter is followed by a recap and a note on its context. Longer sections cover Defoe, Alexander Selkirk, Providence, property, Friday, realism, criticism and adaptation.'
    ],
    topics: [
      { title: 'Labour and property', body: 'Crusoe converts survival into possession and repeatedly treats work as a claim to rule the space around him.' },
      { title: 'Providence and narrative', body: 'Journal, memory and religious interpretation compete to explain why events occur and what survival means.' },
      { title: 'Colonial authority', body: 'The language used for Friday and the island links the private adventure to slavery, conversion and empire.' }
    ]
  }),
  inCollection('renaissance', {
    slug: 'selected-poems-of-john-skelton',
    title: 'Selected Poems of John Skelton',
    author: 'John Skelton',
    image: 'Skelton Main Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/selected-poems-of-john-skelton',
    label: 'Early Tudor poetry',
    deck: 'John Skelton, priest and tutor to the young Henry VIII, wrote in short, tumbling rhymed lines that are still called Skeltonics. The fourteen poems here run from his elegy on the Earl of Northumberland to ‘Philip Sparrow’, a schoolgirl’s lament for her pet bird, and his attacks on Cardinal Wolsey. The text is Alexander Dyce’s of 1843, and every cut is marked.',
    editionIncludes: [
      'Original footnotes and poem-by-poem headnotes',
      'Historical and literary context throughout',
      'Original spelling with line numbers for reference',
      'Critical essays, glossary and reader’s companion'
    ],
    facts: [
      { label: 'Fourteen works', text: 'The selection spans elegy, lyric, devotion, satire, portraiture and Skeltonic verse.' },
      { label: '1843 text', text: 'The reading text follows Alexander Dyce’s Poetical Works of John Skelton.' },
      { label: 'Original spelling', text: 'Spelling is preserved, with u/v and i/j regularised and yogh and thorn transliterated.' },
      { label: 'Five extracts', text: 'Longer poems are cut only at declared section or stanza boundaries.' }
    ],
    overview: [
      'Skelton was a poet, priest, royal tutor and satirist at the early Tudor court. His short, heavily rhymed lines became so recognisable that they are now called Skeltonics, but the selection also shows his command of formal elegy, devotional writing and longer courtly structures.',
      'The volume includes On the Death of King Edward the Fourth, Upon the Dolorous Death of the Earl of Northumberland, Upon a Dead Man’s Head, Womanhood, Wanton, Ye Want, Mannerly Margery Milk and Ale, The Bowge of Court, Philip Sparrow, The Tunning of Elinour Rumming, Speak, Parrot, Colin Clout and Why Come Ye Not to Court?, with lyrics from The Garland of Laurel.',
      'Philip Sparrow, Speak, Parrot, Colin Clout, Why Come Ye Not to Court? and the Garland lyrics are presented as clearly identified extracts. The headnotes state every cut and keep selection from masquerading as completeness.'
    ],
    editorial: [
      'Dyce’s textual apparatus is removed and line numbers are added. The original spelling is kept, because so much of Skelton’s voice is in it, and a glossary and footnotes explain it.',
      'The critical material covers Skelton’s life, Henry VIII, Cardinal Wolsey, the Tudor court, religious and political satire, the short rhyming Skeltonic line, and the poems’ reception.'
    ],
    topics: [
      { title: 'The Skeltonic line', body: 'Short lines and accumulating rhyme create speed, insistence, interruption and comic or satirical pressure.' },
      { title: 'Court and danger', body: 'Praise, patronage and attack are written within a world where proximity to political power could both enable and endanger a poet.' },
      { title: 'Selection and text', body: 'Headnotes identify extracts and editorial choices so that readers can distinguish the historical text from this volume’s design.' }
    ]
  }),
  inCollection('ancient', {
    slug: 'the-iliad',
    title: 'The Iliad',
    author: 'Homer, translated by Samuel Butler',
    image: 'The Iliad.png',
    purchaseUrl: 'https://astorlibrary.com/go/the-iliad',
    label: 'Epic · Butler translation, 1898',
    deck: 'In the tenth year of the Trojan War, Agamemnon takes the captive woman Briseis from Achilles, and Achilles stays out of the fighting until Hector kills his friend Patroclus. The poem ends with Priam coming to Achilles by night to ransom his son’s body. Astor uses Samuel Butler’s prose translation of 1898.',
    editionIncludes: [
      'Samuel Butler’s complete 1898 prose translation',
      'Footnotes on vocabulary, names and Homeric terms',
      'Summaries and context boxes for all twenty-four books',
      'Critical essays, character studies and thematic analysis',
      'Glossary, bibliography and teaching pathways'
    ],
    facts: [
      { label: 'Twenty-four books', text: 'The poem’s inherited division is retained throughout the edition.' },
      { label: 'A short span', text: 'The Iliad covers a few weeks in the last year of the Trojan War.' },
      { label: '1898', text: 'Samuel Butler published the complete prose translation used here.' },
      { label: 'Roman names', text: 'Notes explain Butler’s Victorian vocabulary and his use of Roman names for Greek gods and heroes.' }
    ],
    overview: [
      'The poem begins with the quarrel between Achilles and Agamemnon. When Achilles withdraws from the battle, the Greeks start losing, and the poem shows what a code of honour costs when a man’s whole identity depends on public recognition.',
      'Hector’s defence of Troy, Patroclus’s decision to enter battle and Achilles’ return after his friend’s death move the poem from anger towards catastrophic revenge. The ending does not celebrate the city’s fall; it pauses over Priam’s appeal and the funeral of Hector.',
      'Butler’s prose prioritises clarity and narrative movement. The notes explain unfamiliar language, the social and religious world of the poem and the terminology of Homeric warfare without requiring readers to know ancient Greek.'
    ],
    editorial: [
      'Each book of the poem has a summary and a note on its context. Longer essays introduce Homer, Samuel Butler’s translation, oral poetry, the Homeric question, the history that may lie behind Troy, and how the poem came down to us.',
      'Character studies and critical essays follow honour, glory, death, fate, the gods, the speeches, the similes and the fighting, and what later readers have made of Achilles, Hector, Priam and the war.'
    ],
    topics: [
      { title: 'Anger and honour', body: 'Achilles’ withdrawal makes the demands of heroic status visible through the suffering that follows.' },
      { title: 'Mortality and glory', body: 'The heroes want lasting fame, and the poem never forgets that their bodies can be broken and that their families will grieve.' },
      { title: 'A human ending', body: 'Priam comes to Achilles in the enemy camp, and the poem ends with a funeral.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'shakespeares-sonnets',
    title: 'Shakespeare’s Sonnets',
    author: 'William Shakespeare',
    image: "Shakespeare's Sonnets Main Cover.png",
    purchaseUrl: 'https://astorlibrary.com/go/shakespeares-sonnets',
    label: 'Poetry · 1609',
    deck: 'All 154 sonnets, in the order Thomas Thorpe printed them in 1609. Each page holds one complete poem, with a short headnote and notes underneath, so the argument can be followed without a second book open.',
    editionIncludes: [
      'All 154 sonnets in the 1609 order',
      'One complete sonnet on each page',
      'A clear headnote introducing every poem',
      'Same-page explanations and an index of first lines'
    ],
    facts: [
      { label: '154 poems', text: 'The complete sequence follows the order of the 1609 quarto.' },
      { label: 'Sonnets 1–17', text: 'The opening group urges a beautiful young man to marry and preserve beauty through children.' },
      { label: 'Sonnets 127–152', text: 'The later sequence turns towards a dark-haired woman and a relationship marked by desire and self-reproach.' },
      { label: 'Two final myths', text: 'Sonnets 153 and 154 retell a classical story about Cupid and a healing spring.' }
    ],
    overview: [
      'From Sonnet 18, poetry becomes another defence against age and death. The central sequence follows an unequal relationship through admiration, absence, jealousy, betrayal, forgiveness and rivalry with another poet.',
      'The poems examine love, beauty, mortality, rank, desire and the claim that verse may outlast the people it represents. Even the best-known sonnets are parts of a sequence that changes as it goes.',
      'One sonnet appears complete on every page. A short headnote explains the direction of its argument; notes at the foot of that page define difficult words, clarify passages and identify real textual uncertainty.'
    ],
    editorial: [
      'The introduction covers Shakespeare’s life, the 1609 quarto, Thomas Thorpe’s dedication to Mr W. H., the probable dating of the poems, the development of the English sonnet and Shakespeare’s formal choices.',
      'Each sonnet is printed whole on the page, with line numbers and a note beside it, and there is an index of first lines.'
    ],
    topics: [
      { title: 'Sequence and change', body: 'The meaning of a single sonnet shifts when it is read beside the arguments, absences and betrayals surrounding it.' },
      { title: 'Time and verse', body: 'Repeated promises of poetic survival are tested by ageing, loss and the material history of print.' },
      { title: 'Address and uncertainty', body: 'The poems create powerful speakers and addressees without supplying a secure biography for every relationship.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'the-rape-of-lucrece-and-venus-and-adonis',
    title: 'The Rape of Lucrece and Venus and Adonis',
    author: 'William Shakespeare',
    image: 'The Rape of Lucrece and Venus and Adonis Main Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/the-rape-of-lucrece-and-venus-and-adonis',
    label: 'Two narrative poems · 1593–94',
    deck: 'Shakespeare’s two long poems, written while plague had closed the London theatres in 1592–94 and both dedicated to the young Earl of Southampton. In Venus and Adonis the goddess tries to seduce a boy who only wants to go hunting; in Lucrece a Roman wife is raped by the king’s son. Both are here complete, with notes on the same page.',
    editionIncludes: [
      'Complete texts of both narrative poems',
      'Line-by-line notes printed on the same page',
      'Line numbers, introductions and a full glossary',
      'Themes, contexts, close readings and teaching pathways'
    ],
    facts: [
      { label: '1593', text: 'Venus and Adonis established Shakespeare’s named reputation in print.' },
      { label: '1594', text: 'The Rape of Lucrece was the graver labour promised in the earlier dedication.' },
      { label: 'Complete pair', text: 'Both poems appear without abridgement in one volume.' },
      { label: 'Modern spelling', text: 'Spelling and punctuation are modernised while wording, stanza forms and rhyme schemes remain.' }
    ],
    overview: [
      'In Venus and Adonis, the goddess of love pursues a young hunter who repeatedly refuses her. Shakespeare moves between erotic comedy, rhetorical display, physical coercion and the grief that follows Adonis’s fatal hunt.',
      'The Rape of Lucrece follows Tarquin’s assault and its aftermath through power, shame, testimony and the language by which Lucrece tries to understand a crime committed against her. Her public naming of Tarquin and death become the catalyst for the overthrow of the Roman monarchy.',
      'Shakespeare dedicated both poems to the Earl of Southampton, and the dedication of Venus and Adonis (1593) promises him “some graver labour”, which Lucrece (1594) supplied. Each is about a desire that will not listen to reason, and about trying to possess another person through words and description. Each ends in death and transformation, but Venus and Adonis ends with a flower and Lucrece with the fall of the Roman kings.',
      'Every difficult word, image and allusion is explained on the same page as the relevant line, allowing the poetry and commentary to remain in continuous relation.'
    ],
    editorial: [
      'The text is based on the quartos of 1593 and 1594. Spelling and punctuation are modernised; Shakespeare’s wording, stanzas and rhymes are not changed.',
      'Introductions and essays cover the classical sources, the language and style of the poems, their critics and their reception. A long glossary explains words that recur.'
    ],
    topics: [
      { title: 'Desire and refusal', body: 'The poems place persuasion beside resistance and expose the danger of treating another person as an object to be possessed.' },
      { title: 'Violence and testimony', body: 'Lucrece’s struggle to speak shows how social codes can transfer the burden of a crime onto its victim.' },
      { title: 'Print and reputation', body: 'The two dedications and early quartos belong to the period when Shakespeare first established his literary name in print.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'edward-iii',
    title: 'Edward III',
    author: 'William Shakespeare and a collaborator',
    image: 'Edward III Main Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/edward-iii',
    label: 'Shakespeare Apocrypha · Volume I',
    range: 'apocrypha',
    volume: 'I',
    deck: 'Edward III was printed without an author’s name in 1596 and left out of collected Shakespeare until the 1990s. The scenes in which the king tries to seduce the Countess of Salisbury are now generally given to Shakespeare. Who wrote the rest is still argued over.',
    editionIncludes: ['Complete play edited from the 1596 quarto', 'Scene summaries before every scene', 'Explanatory notes at the foot of each page', 'Introductions to authorship, sources and performance'],
    facts: [
      { label: '1596 quarto', text: 'The play was printed anonymously and did not enter the First Folio.' },
      { label: 'Two movements', text: 'The Countess of Salisbury episode gives way to campaigns at Crécy, Calais and Poitiers.' },
      { label: 'Shared authorship', text: 'Modern scholarship generally accepts a Shakespeare contribution without agreeing on the collaborator.' },
      { label: 'Volume I', text: 'The first volume in the Astor Shakespeare Apocrypha sequence.' }
    ],
    overview: [
      'Edward asserts a claim to the French crown, but a Scottish invasion first takes him north to relieve the Countess of Salisbury at Roxborough Castle. After driving away the Scots, he becomes consumed by desire for the Countess, commissions poetry in her praise and even orders her father to support his suit.',
      'The Countess appeals to marriage, conscience and kingship, forcing Edward to confront whether a ruler capable of commanding a country can command himself. The later French campaigns test discipline in public warfare as the Black Prince faces battle and the expectations passed from father to son.',
      'The romantic and military halves are sharply different, yet both ask what mastery means. Private appetite and public command place different pressures on the king’s ability to govern himself.'
    ],
    editorial: [
      'The complete text of the first quarto, in modernised spelling and punctuation. Each scene opens with a short summary, and the notes are at the foot of the page.',
      'Introductions cover the authorship question, possible collaboration, chronicle and novella sources, early Shakespearean verse, textual history and modern revival.'
    ],
    topics: [
      { title: 'Kingship and self-command', body: 'The Countess episode measures political authority against the king’s ability to restrain private desire.' },
      { title: 'Father and prince', body: 'The battle scenes are about how honour is earned, and how far a father should keep his heir out of danger.' },
      { title: 'A disputed canon', body: 'The play’s changing attribution reveals how evidence, style and collaboration complicate the boundary of Shakespeare’s works.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'arden-of-faversham',
    title: 'Arden of Faversham',
    author: 'Anonymous; partly attributed to Shakespeare or Thomas Kyd',
    image: 'Arden of Faversham Main Coverr.png',
    purchaseUrl: 'https://astorlibrary.com/go/arden-of-faversham',
    label: 'Shakespeare Apocrypha · Volume II',
    range: 'apocrypha',
    volume: 'II',
    deck: 'In February 1551 Thomas Arden of Faversham was murdered in his own house by men his wife, Alice, had hired. Holinshed’s Chronicles told the story, and an anonymous play printed in 1592 put it on stage. Some scholars find Shakespeare in the scene where Alice quarrels with her lover, Mosbie; the introduction sets out the cases for him, for Thomas Kyd and for several hands.',
    editionIncludes: ['Modernised text of the 1592 first quarto', 'Scene summaries before each scene', 'Line numbers and same-page explanatory notes', 'Introductions to authorship, sources and performance'],
    facts: [
      { label: '1551 crime', text: 'The plot transforms the murder of Thomas Arden at Faversham into domestic tragedy.' },
      { label: '1592 quarto', text: 'The anonymous first printing was followed by quartos in 1599 and 1633.' },
      { label: 'Repeated failure', text: 'Poison, ambush and hired killers repeatedly fail before the murder succeeds at home.' },
      { label: 'Volume II', text: 'The second Astor Shakespeare Apocrypha volume.' }
    ],
    overview: [
      'Alice Arden is in love with Mosbie and plots the death of her husband Thomas. The conspiracy expands through the servant Michael, Clarke the painter, the dispossessed Greene and the hired killers Black Will and Shakebag.',
      'Attempts fail through detected poison, interruption, locked doors, misfiring weapons and fog. Suspense repeatedly collides with black comedy while each escape can look like providential warning.',
      'Alice directs the conspiracy but moves between determination, fear, repentance and renewed commitment. Her quarrel with Mosbie is the psychological centre of the play and a central passage in the authorship debate.'
    ],
    editorial: [
      'The edition follows the first quarto in modernised spelling and punctuation, with scene summaries, line numbering and notes on the same page.',
      'The introduction examines the historical murder, Holinshed, the three quartos, domestic tragedy, performance and the competing attribution evidence for Shakespeare, Kyd and other hands.'
    ],
    topics: [
      { title: 'Crime at home', body: 'Domestic tragedy relocates catastrophic action from the court or battlefield to an ordinary household.' },
      { title: 'Providence and accident', body: 'The repeated failures can look comic, practical or morally deserved, and the play leaves the balance open.' },
      { title: 'Attribution and evidence', body: 'The quarrel scene has become a test case for the possibilities and limits of stylistic authorship study.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'locrine',
    title: 'Locrine',
    author: 'Anonymous; attributed variously to Greene, Peele and others',
    image: 'Locrine Main Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/locrine',
    label: 'Shakespeare Apocrypha · Volume III',
    range: 'apocrypha',
    volume: 'III',
    deck: 'Locrine, eldest son of Brutus, the legendary founder of Britain, defeats the invading Huns and then falls for Estrild, the captive wife of their king, Humber. The play was printed in 1595 as ‘overseen and corrected’ by W. S., which was enough to get it into the Third Folio of Shakespeare in 1664. Nobody knows who wrote it.',
    editionIncludes: ['Complete modern-spelling text of the 1595 quarto', 'Scene summaries and line-numbered text', 'Same-page explanatory notes', 'Introductions to authorship, sources and performance'],
    facts: [
      { label: '1595 quarto', text: 'The title page said the play was overseen and corrected by W. S.' },
      { label: '1664', text: 'The initials helped bring Locrine into the enlarged Third Folio.' },
      { label: 'Five dumb shows', text: 'Ate introduces each act with emblematic classical action.' },
      { label: 'Volume III', text: 'The third Astor Shakespeare Apocrypha volume.' }
    ],
    overview: [
      'Brutus divides Britain among his sons Locrine, Camber and Albanact. An invasion by Humber destroys Albanact, and the surviving brothers defeat the invaders and capture Humber’s wife Estrild.',
      'Locrine, already married to Gwendoline, hides Estrild underground for seven years. After Gwendoline’s father dies, he repudiates his wife and publicly declares Estrild queen. Gwendoline raises a Cornish army, and civil war carries the legendary history towards the naming of the River Severn.',
      'The royal tragedy runs beside the comic career of Strumbo, a boasting cobbler who writes love letters, avoids battle and survives by pretending to be dead. Five dumb shows connect the play to Senecan and emblematic traditions.'
    ],
    editorial: [
      'The complete play appears in modern spelling with line numbers, summaries and same-page commentary.',
      'The introduction sets the old claim that Shakespeare wrote the play against the evidence now available, and discusses the initials W. S., Charles Tilney, the cases made for Greene and Peele, the sources, the signs of revision and the play’s few performances.'
    ],
    topics: [
      { title: 'Legendary Britain', body: 'Dynastic division, invasion and civil war make the story of Britain’s founding a story of broken settlements.' },
      { title: 'Dumb show and tragedy', body: 'Ate’s classical emblems forecast ruin and frame the action through inherited dramatic forms.' },
      { title: 'Initials and attribution', body: 'Two letters on a title page became the basis for centuries of inclusion, doubt and rejection.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'sir-thomas-more',
    title: 'Sir Thomas More',
    author: 'Anthony Munday and collaborators, including an attributed Shakespeare addition',
    image: 'Sir Thomas More Main Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/sir-thomas-more',
    label: 'Shakespeare Apocrypha · Volume IV',
    range: 'apocrypha',
    volume: 'IV',
    deck: 'The only literary manuscript that may be in Shakespeare’s handwriting is three pages of this play, the scene in which More talks down the London rioters of 1517, who want foreigners driven out. The rest was written by Anthony Munday and others, revised by several hands and marked for cuts by the Master of the Revels. Astor prints the whole surviving play with its additions.',
    editionIncludes: ['The complete play and surviving additions', 'The scene preserved in the hand attributed to Shakespeare', 'Scene summaries and line-numbered text', 'Explanatory notes on the relevant page'],
    facts: [
      { label: 'Working manuscript', text: 'The play survives through composition, revision, censorship and recopying by several hands.' },
      { label: 'Hand D', text: 'Three pages of the Ill May Day scene are widely attributed to Shakespeare’s handwriting.' },
      { label: 'Six hands', text: 'Munday, Chettle, Heywood, Dekker, Shakespeare and a theatrical scribe have been associated with the document.' },
      { label: 'Volume IV', text: 'The fourth Astor Shakespeare Apocrypha volume.' }
    ],
    overview: [
      'The play follows More from Sheriff of London to Lord Chancellor, imprisonment and execution. Its opening dramatises the Ill May Day rising of 1517, when hostility towards foreign residents develops into armed revolt.',
      'More asks the citizens to imagine strangers driven from their homes and then to imagine themselves denied refuge abroad. The surviving version of this speech is written by Hand D, the hand most scholars accept as Shakespeare’s.',
      'Later scenes present wit, scholarship, hospitality and conscience before More refuses articles required by the king. Arrest and execution turn the play from civic comedy towards tragedy.'
    ],
    editorial: [
      'The modernised text includes the additions, the damaged passages and the unfinished material, so the manuscript can be seen as the working document it was.',
      'Introductions cover the six hands, Hand D, Edmund Tilney’s censorship, the historical More, sources, verse and prose, textual problems and modern performance.'
    ],
    topics: [
      { title: 'Strangers and civic order', body: 'In the Ill May Day scene More stops a riot by asking the rioters to imagine themselves as foreigners.' },
      { title: 'Conscience and office', body: 'More’s rise and fall show how far public service can answer to private conscience.' },
      { title: 'The manuscript', body: 'Revision, censorship and multiple hands make the physical document part of the play’s meaning.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'thomas-lord-cromwell',
    title: 'Thomas Lord Cromwell',
    author: 'Anonymous',
    image: 'Thomas Lord Cromwell Main Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/thomas-lord-cromwell',
    label: 'Shakespeare Apocrypha · Volume V',
    range: 'apocrypha',
    volume: 'V',
    deck: 'Thomas Cromwell, a blacksmith’s son from Putney, travels through Europe, serves Cardinal Wolsey, rises to be Henry VIII’s chief minister and is executed in 1540. The play was printed in 1602 as by ‘W. S.’, which later got it into the Shakespeare apocrypha.',
    editionIncludes: ['The complete play in modernised spelling', 'Scene summaries and line-numbered text', 'Explanatory notes on the relevant page', 'Introductions to authorship, history and performance'],
    facts: [
      { label: '1602 quarto', text: 'The title page used the attribution W. S. and named the Lord Chamberlain’s Men.' },
      { label: '1613 quarto', text: 'A second printing named the company as the King’s Men.' },
      { label: 'Moral history', text: 'The drama reshapes biography around advancement, gratitude and unstable fortune.' },
      { label: 'Volume V', text: 'The fifth Astor Shakespeare Apocrypha volume.' }
    ],
    overview: [
      'Young Cromwell will not accept the limits of his birth, and goes after learning, travel and advancement. Service with English merchants at Antwerp begins a European journey that eventually leads through Wolsey’s household into royal government.',
      'As his influence grows, Cromwell repays earlier generosity: Friskiball, an innkeeper and the Banister family receive help in return for help once given. Debts and gifts become the play’s measure of character.',
      'Gardiner arranges false testimony, and Cromwell is condemned without trial. The royal reprieve arrives too late. The play changes offices, leaves things out and alters events to make Cromwell’s career a model rise and fall.'
    ],
    editorial: [
      'The complete play is modernised and supplied with scene summaries, lineation and same-page commentary.',
      'The introduction separates what the play invents from what happened to Cromwell, and covers the quartos, the disputed authorship, religion, trade, the sources and performance.'
    ],
    topics: [
      { title: 'Fortune and advancement', body: 'Cromwell travels through Europe and rises at court, and his merit carries him only so far.' },
      { title: 'Debt and gratitude', body: 'Money, hospitality and repayment provide the moral structure that official history cannot.' },
      { title: 'History reshaped', body: 'The invented conspiracy and reprieve show the difference between a chronicle drama and a reliable biography.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'the-london-prodigal',
    title: 'The London Prodigal',
    author: 'Anonymous',
    image: 'The London Prodigal Main Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/the-london-prodigal',
    label: 'Shakespeare Apocrypha · Volume VI',
    range: 'apocrypha',
    volume: 'VI',
    deck: 'Young Flowerdale wastes his money and lies his way into a rich marriage, while his father, thought to be dead, watches him disguised as a servant. The play was printed in 1605 with William Shakespeare’s name on the title page. It is not now thought to be his.',
    editionIncludes: ['The complete text of the 1605 quarto', 'Scene summaries and line-numbered text', 'Explanatory notes on the relevant page', 'Introductions to authorship, context and performance'],
    facts: [
      { label: '1605 quarto', text: 'The title page named Shakespeare and claimed performance by the King’s Men.' },
      { label: 'City comedy', text: 'Bonds, sureties, wills, bills and arrest give the Prodigal Son story a London economy.' },
      { label: 'Disputed author', text: 'Dekker, Jonson, Marston, Wilkins, Heywood and others have been proposed without settlement.' },
      { label: 'Volume VI', text: 'The sixth Astor Shakespeare Apocrypha volume.' }
    ],
    overview: [
      'A merchant returns from Venice disguised as Kester and lets his son Flowerdale believe him dead. He watches the young man lie about cargoes, gamble, borrow and exploit friends who stand surety for him.',
      'Flowerdale invents wealth to marry Luce but is arrested for debt at the church door. Luce refuses to abandon him, yet he takes her money and rejects her. Disguised as the Dutch servant Tanikin, she follows his descent towards robbery and disgrace.',
      'The biblical Prodigal Son becomes a commercial London story in which ruin is measured through credit, forged documents and the arrival of officers.'
    ],
    editorial: [
      'The complete 1605 text is modernised, with summaries, line numbers and explanatory notes on the page.',
      'The introduction covers attribution, the performance claim, Jacobean London, the prodigal tradition, dialect, Luce and the patient-wife tradition, verse, prose and textual problems.'
    ],
    topics: [
      { title: 'Credit and identity', body: 'Flowerdale manufactures status through claims that remain believable only while other people underwrite them.' },
      { title: 'Marriage and patience', body: 'Luce’s loyalty keeps the possibility of reform visible while exposing the unequal demands placed upon a wife.' },
      { title: 'A name on the title page', body: 'The credible company claim and rejected author claim show why performance and authorship evidence must be separated.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'the-puritan',
    title: 'The Puritan',
    author: 'Thomas Middleton',
    image: 'The Puritan Main Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/the-puritan',
    label: 'Shakespeare Apocrypha · Volume VII',
    range: 'apocrypha',
    volume: 'VII',
    deck: 'A rich widow in Watling Street swears she will never marry again, and a crew of penniless London tricksters set out to change her mind and marry her daughters. The play was printed in 1607 as by ‘W. S.’ and ended up in the Shakespeare apocrypha; it is now generally given to Thomas Middleton. The spelling is modernised.',
    editionIncludes: ['Complete modern-spelling text of the 1607 quarto', 'Scene summaries and line-numbered text', 'Same-page notes on language, satire and London life', 'Introductions to authorship, context and performance'],
    facts: [
      { label: '1607 quarto', text: 'The Stationers’ Register and title page used the initials W. S.' },
      { label: 'Middleton', text: 'Modern scholarship generally attributes the play to Thomas Middleton.' },
      { label: 'Watling Street', text: 'Recognisable London streets, parishes and the Marshalsea prison ground the frauds.' },
      { label: 'Volume VII', text: 'The seventh Astor Shakespeare Apocrypha volume.' }
    ],
    overview: [
      'A wealthy widow vows never to remarry, her elder daughter Frances follows, and the younger Moll privately decides to find a husband quickly. The expelled scholar Pyeboard overhears and designs a profitable fraud with Skirmish, Captain Idle and Corporal Oath.',
      'A stolen chain, false prophecy, staged quarrel, sleeping draught and counterfeit conjuring allow the men to appear useful, desirable and supernatural. The widow chooses Idle and Frances chooses Pyeboard before exposure at the church door overturns the expected ending.',
      'The comedy depends on performance and the precise geography of London while targeting wealth, gullibility, pretended piety and the precarious lives of those who survive by invention.'
    ],
    editorial: [
      'The modern-spelling text includes summaries, line numbers and notes on satire, language and London life.',
      'The introduction covers the W. S. claim, Middleton attribution, Children of Paul’s, Jacobean city comedy, Puritan representation, structure, prose, verse and performance.'
    ],
    topics: [
      { title: 'Fraud as theatre', body: 'Prophecy, death and conjuring succeed because the conspirators understand how an audience completes a performance.' },
      { title: 'London on stage', body: 'Named streets and institutions make social mobility, credit and confinement part of the joke.' },
      { title: 'From Shakespeare to Middleton', body: 'The history of attribution shows how initials, folio inclusion and stylistic evidence produce different canons.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'a-yorkshire-tragedy',
    title: 'A Yorkshire Tragedy',
    author: 'Thomas Middleton',
    image: 'A Yorkshire Tragedy Main Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/a-yorkshire-tragedy',
    label: 'Shakespeare Apocrypha · Volume VIII',
    range: 'apocrypha',
    volume: 'VIII',
    deck: 'In April 1605 Walter Calverley, a Yorkshire gentleman deep in debt, killed two of his young sons and stabbed his wife. A ten-scene play about the murders was acted by the King’s Men and printed in 1608 with Shakespeare’s name on the title page. Most scholars now give it to Thomas Middleton.',
    editionIncludes: ['The complete text of the 1608 quarto', 'Summaries of all ten scenes', 'Line numbers and same-page explanatory notes', 'Introductions to authorship, context and performance'],
    facts: [
      { label: '1605 case', text: 'Walter Calverley killed two sons, wounded his wife and was stopped before reaching a third child.' },
      { label: '1608 quarto', text: 'The title page named Shakespeare and performance by the King’s Men at the Globe.' },
      { label: 'Four plays in one', text: 'The surviving tragedy may have formed one part of a programme of four short plays.' },
      { label: 'Volume VIII', text: 'The final current volume in the Astor Shakespeare Apocrypha sequence.' }
    ],
    overview: [
      'An unnamed gentleman has squandered land and money through gambling. His wife conceals his cruelty, protects the household and secures him a court position, but he reads help as humiliation and control.',
      'He murders his eldest son, attacks another child and wounds his wife before riding towards the third. A fall from his horse leads to capture and a return past the house where he finally confronts the bodies and the logic of his violence collapses.',
      'The play’s speed comes from its compressed form and proximity to the real case. No one has a personal name, so a notorious crime is reduced to its parts: Husband, Wife, children, debt and inheritance.'
    ],
    editorial: [
      'The edition follows the 1608 quarto in its original spelling, correcting obvious errors and saying where the reading is uncertain. Verse and prose are kept distinct, with notes on the page.',
      'The introduction covers the Calverley case, title-page attribution, Middleton’s claim, Globe performance, debt, landed inheritance, domestic tragedy and the missing companion plays.'
    ],
    topics: [
      { title: 'Debt and family', body: 'Economic ruin becomes an excuse for violence against the very people the Husband claims to protect from poverty.' },
      { title: 'Compression', body: 'Ten short scenes allow almost no relief, giving choice and consequence a relentless proximity.' },
      { title: 'True crime and drama', body: 'The play transforms recent reportage while apparently ending before the historical murderer’s punishment.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'hamlet-expanded-scholarly-edition',
    title: 'Hamlet — Expanded Scholarly Edition',
    shortTitle: 'Hamlet',
    author: 'William Shakespeare',
    image: 'Hamlet Scholarly Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/hamlet-expanded-scholarly-edition',
    label: 'Expanded Scholarly Edition',
    range: 'expanded',
    counterpart: '/books/hamlet/',
    deck: 'Hamlet survives in three early texts, the quartos of 1603 and 1604–5 and the 1623 Folio, and they differ by hundreds of lines. This larger Astor edition prints a conflated text with commentary on the same page, followed by long sections on the three texts, the criticism and four centuries of performance.',
    editionIncludes: ['Complete conflated modern-spelling text', 'Scene summaries and line-numbered text', 'Same-page notes and full commentary', 'Critical essays, glossary and performance history'],
    facts: [
      { label: 'Three early texts', text: 'The First Quarto, Second Quarto and First Folio preserve significantly different versions of the play.' },
      { label: 'Conflated text', text: 'The edition principally follows Q2 while incorporating important Folio readings and passages.' },
      { label: 'Seven soliloquies', text: 'Extended analysis follows the sequence, dramatic situation and changing purpose of Hamlet’s major soliloquies.' },
      { label: 'Paired choice', text: 'This expanded edition sits beside the standard Astor Hamlet.' }
    ],
    overview: [
      'Hamlet returns to Denmark after his father’s death and finds Claudius on the throne and married to Gertrude. A Ghost resembling the dead king claims that Claudius murdered him and commands revenge.',
      'Hamlet adopts an antic disposition, tests the court and uses travelling actors to stage a murder resembling the Ghost’s account. Claudius’s reaction appears to confirm guilt, but action continues to produce uncertainty, accidental killing and wider revenge.',
      'By Hamlet’s return from England, Ophelia is dead, Laertes seeks vengeance and Claudius has prepared a poisoned fencing match. A son’s grief for his father becomes a question of evidence, spying, acting and who should be king.'
    ],
    editorial: [
      'The main textual disputes are pointed out where they occur. Line numbers restart in each scene, and summaries and footnotes deal with difficult language and staging on the page where they come up.',
      'Extended essays cover Shakespeare, sources, Denmark, Elizabethan politics, ghosts and Purgatory, the Reformation, delay, Hamlet’s age, Claudius, Gertrude, Ophelia, language, criticism, theatre and cinema.'
    ],
    topics: [
      { title: 'Evidence and action', body: 'Ghost, play, confession and intercepted documents never make knowledge independent of interpretation.' },
      { title: 'Text and version', body: 'The differences between Quarto and Folio are treated as a central part of the play’s history.' },
      { title: 'Four centuries on stage', body: 'Performance history records how actors, theatres and films make fresh choices about motive, age, politics and ending.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'king-lear-expanded-scholarly-edition',
    title: 'King Lear — Expanded Scholarly Edition',
    shortTitle: 'King Lear',
    author: 'William Shakespeare',
    image: 'King Lear Scholarly Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/king-lear-expanded-scholarly-edition',
    label: 'Expanded Scholarly Edition',
    range: 'expanded',
    counterpart: '/books/king-lear/',
    deck: 'King Lear exists in two versions, the 1608 Quarto and the 1623 Folio, and many scholars think Shakespeare revised the play between them. This larger edition prints a conflated text with full commentary and explains the differences, with chapters on the double plot, the politics of the time and the play on stage.',
    editionIncludes: ['Complete modern-spelling conflated text', 'Scene summaries and line-numbered text', 'Same-page notes and full commentary', 'Critical essays, glossary and performance history'],
    facts: [
      { label: '1608 Quarto', text: 'The first printed text contains hundreds of lines absent from the Folio.' },
      { label: '1623 Folio', text: 'The Folio contains important material absent from the Quarto and may preserve revision.' },
      { label: 'Double plot', text: 'The Gloucester family story meets and intensifies the tragedy of Lear and his daughters.' },
      { label: 'Paired choice', text: 'The expanded edition remains an additional choice beside the standard Astor Lear.' }
    ],
    overview: [
      'Lear divides Britain according to public declarations of love. Goneril and Regan provide the performance he expects; Cordelia refuses and is disinherited. Having surrendered territory and authority, Lear attempts to retain the title, household and obedience of a king.',
      'Gloucester is deceived by Edmund into rejecting Edgar. The two family tragedies meet in the storm, civil war, the blinding and madness, and the play puts authority, inheritance, nature and justice through all of them.',
      'The Quarto and Folio are substantially different works as well as witnesses to a shared play. This edition follows the received conflated tradition while identifying important version-specific material.'
    ],
    editorial: [
      'The complete text in modern spelling, with line numbers by scene, summaries and notes on the page. Passages found only in the Quarto or only in the Folio are marked.',
      'Forty key passages sit within essays on a divided Britain, revision, Lear, Edmund, Edgar, the Fool, the three daughters, madness, blindness, social justice, dramatic form, criticism and performance.'
    ],
    topics: [
      { title: 'Authority', body: 'Lear discovers that title and command cannot be retained unchanged after territory and power are given away.' },
      { title: 'Two texts', body: 'The possibility of Shakespearean revision changes how editors and theatres understand the play’s shape.' },
      { title: 'Sight and justice', body: 'Physical blindness and moral recognition do not produce a simple providential order.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'a-midsummer-nights-dream-expanded-scholarly-edition',
    title: 'A Midsummer Night’s Dream — Expanded Scholarly Edition',
    shortTitle: 'A Midsummer Night’s Dream',
    author: 'William Shakespeare',
    image: "Midsummer Night's Dream Scholarly Cover.png",
    purchaseUrl: 'https://astorlibrary.com/go/a-midsummer-nights-dream-expanded-scholarly-edition',
    label: 'Expanded Scholarly Edition',
    range: 'expanded',
    counterpart: '/books/a-midsummer-nights-dream/',
    deck: 'The larger of Astor’s two editions of the Dream. The commentary runs on the same page as the play, and the introduction covers the 1600 Quarto and the 1623 Folio, Elizabethan fairy lore, marriage law, the mechanicals, and the play on stage and screen.',
    editionIncludes: ['Complete modern-spelling text of the play', 'Scene summaries and line-numbered text', 'Same-page explanatory notes and commentary', 'Critical essays, key passages and performance history'],
    facts: [
      { label: '1600 first quarto', text: 'The edition principally follows the authoritative first quarto and records second-quarto evidence.' },
      { label: '1623 Folio', text: 'Important Folio readings and later editorial choices are explained.' },
      { label: 'Philostrate retained', text: 'In the final act Philostrate keeps his lines; the Folio gives them to Egeus.' },
      { label: 'Paired choice', text: 'The expanded volume appears beside the standard Astor edition.' }
    ],
    overview: [
      'Hermia is ordered to marry Demetrius or face death or permanent chastity. Her escape with Lysander draws Demetrius and Helena into a wood already disturbed by Oberon and Titania’s dispute over a changeling child.',
      'Puck misapplies the flower that causes love at first sight, while Bottom receives an ass’s head and becomes the enchanted Titania’s beloved. The confusion joins desire, coercion, theatre and metamorphosis before dawn rearranges the lovers.',
      'Back in Athens, the mechanicals perform Pyramus and Thisbe. Their play within the play gives the court a chance to show how badly it can behave as an audience, and puts amateur theatre at the centre of the comedy.'
    ],
    editorial: [
      'The complete text in modern spelling, with scene summaries, line numbers by scene and footnotes. Differences between the Quarto and the Folio are recorded in the notes, not in the text.',
      'Essays cover Athens, the English wood, seasonal custom, fairies, folklore, marriage law, paternal authority, lovers, rulers, mechanicals, the changeling, verse, music, criticism, theatre, film and ballet.'
    ],
    topics: [
      { title: 'Desire and control', body: 'Law, magic and theatrical direction repeatedly attempt to organise attachments that remain unstable.' },
      { title: 'Fairy disturbance', body: 'The quarrel over the changeling links private possession to weather, season and ecological disorder.' },
      { title: 'Watching a play', body: 'Pyramus and Thisbe makes the Athenian court, and the audience, responsible for how performance is received.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'othello-expanded-scholarly-edition',
    title: 'Othello — Expanded Scholarly Edition',
    shortTitle: 'Othello',
    author: 'William Shakespeare',
    image: 'Othello Scholarly Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/othello-expanded-scholarly-edition',
    label: 'Expanded Scholarly Edition',
    range: 'expanded',
    counterpart: '/books/othello/',
    deck: 'The larger Astor Othello. The commentary sits on the same page as the text, and the introduction covers the Quarto and Folio, Venice and Cyprus, race in Shakespeare’s London, the play’s double time scheme and its stage history.',
    editionIncludes: ['Extended critical introduction', 'Scene summaries and line-numbered text', 'Same-page notes and full commentary', 'Glossary, criticism and performance history'],
    facts: [
      { label: '1622 Quarto', text: 'The first printed text differs significantly from the Folio published the following year.' },
      { label: '1623 Folio', text: 'The expanded introduction explains variant language, cuts and additions.' },
      { label: 'Double time', text: 'The play creates both a rapid dramatic sequence and suggestions of a longer marriage and campaign.' },
      { label: 'Paired choice', text: 'The standard and expanded Astor Othello editions remain distinct.' }
    ],
    overview: [
      'Othello secretly marries Desdemona and answers Brabantio’s accusation of witchcraft before the Venetian Senate. The state sends the couple to Cyprus, where a Turkish fleet is destroyed by storm before battle.',
      'With the public war removed, Iago conducts a private campaign. He gets Cassio dismissed, makes Desdemona’s pleading for Cassio look like adultery, and builds false evidence from a stolen handkerchief, overheard talk and well-timed silence.',
      'The play contracts from republic to island to bedroom, asking how trust is dismantled through suggestion, prejudice and the desire for certainty.'
    ],
    editorial: [
      'Each scene begins with a summary, and line numbers restart in each scene. The notes on the page give the plain meaning first, then any textual or critical question.',
      'The extended introduction covers source, Quarto and Folio, Venice, Cyprus, Ottoman conflict, race and blackness, Iago’s motives, Desdemona, Emilia, Bianca, imagery, double time, key passages, criticism and stage and screen history.'
    ],
    topics: [
      { title: 'Manufactured proof', body: 'Iago converts ordinary contact and a displaced object into evidence by controlling what Othello expects to see.' },
      { title: 'Race and service', body: 'Othello’s authority in Venice depends on military value while prejudice remains available to redefine him.' },
      { title: 'Text and performance', body: 'Quarto and Folio choices alter speech, pace and the distribution of sympathy in production.' }
    ]
  }),
  inCollection('shakespeare', {
    slug: 'macbeth-expanded-scholarly-edition',
    title: 'Macbeth — Expanded Scholarly Edition',
    shortTitle: 'Macbeth',
    author: 'William Shakespeare',
    image: 'Macbeth Scholarly Cover.png',
    purchaseUrl: 'https://astorlibrary.com/go/macbeth-expanded-scholarly-edition',
    label: 'Expanded Scholarly Edition',
    range: 'expanded',
    counterpart: '/books/macbeth/',
    deck: 'Macbeth survives only in the 1623 Folio, probably in a version adapted by Thomas Middleton, whose songs for the witches are called for in the stage directions. The larger Astor edition has commentary on the same page as the text and essays on the Folio, Middleton, James I, witchcraft, equivocation and the play on stage.',
    editionIncludes: ['Complete modern-spelling text of the play', 'Scene summaries and line-numbered text', 'Same-page explanatory notes and commentary', 'Critical essays, key passages and performance history'],
    facts: [
      { label: '1623 Folio', text: 'The First Folio supplies the only authoritative early printed text.' },
      { label: 'Middleton question', text: 'Possible later contributions, especially around Hecate and song, are examined.' },
      { label: 'Compressed action', text: 'The play’s unusual speed makes political change and psychological consequence arrive almost together.' },
      { label: 'Paired choice', text: 'The expanded edition sits beside the standard Astor Macbeth.' }
    ],
    overview: [
      'Three witches greet Macbeth as future king. When the first prediction comes true, Lady Macbeth and Macbeth plan to murder Duncan while he is a guest in their castle.',
      'The crown cannot contain the crime. Macbeth orders Banquo’s death, attacks Macduff’s family and returns to the witches for assurances he interprets as guarantees. Lady Macbeth, once resolute, walks in her sleep and relives the violence she believed could be washed away.',
      'Birnam Wood and Macduff fulfil the prophecies through meanings Macbeth refused to hear. The tragedy makes equivocation effective because a listener chooses the interpretation that protects desire.'
    ],
    editorial: [
      'The Folio text in modern spelling, with scene summaries, line numbers by scene and commentary. Textual problems and the passages that may be Middleton’s are marked.',
      'Forty key passages join essays on Holinshed, James I, the historical Macbeth, witchcraft, prophecy, moral responsibility, marriage, masculinity, children, succession, language, chronology, criticism, theatre and film.'
    ],
    topics: [
      { title: 'Prophecy and choice', body: 'Prediction becomes tragedy through the actions taken to secure and interpret it.' },
      { title: 'Marriage and murder', body: 'Macbeth and Lady Macbeth share language and purpose before guilt and secrecy divide their responses.' },
      { title: 'Equivocal text', body: 'Folio evidence, possible adaptation and Middleton’s disputed role remain part of the edition’s scholarly account.' }
    ]
  })
];

const formatReleaseBooks = require('./format-release-data').books;
const knownTitles = new Set(editionUpdateBooks.map(book => book.title));
const knownSlugs = new Set(editionUpdateBooks.map(book => book.slug));

module.exports = editionUpdateBooks.concat(formatReleaseBooks.filter(book => {
  return !knownTitles.has(book.title) && !knownSlugs.has(book.slug);
}));
