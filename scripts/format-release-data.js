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

const books = [
  inCollection('victorian', {
    slug: 'victorian-ghost-stories',
    title: 'Victorian Ghost Stories',
    author: 'Elizabeth Gaskell, Charles Dickens and others',
    image: 'Victorian Ghost Stories Main Cover.png',
    purchaseUrl: 'https://mybook.to/SzGnyfD',
    label: 'Annotated collection · 1844 to the century’s end',
    deck: 'Eight complete stories, four poems and documentary material follow the Victorian supernatural from haunted houses and phantom coaches to séances, railway disasters and psychical research.',
    editionIncludes: [
      'Eight complete stories and four complete poems',
      'Explanatory notes and historical context',
      'A Victorian ghost-story chronology',
      'Documents on spiritualism and psychical research'
    ],
    facts: [
      { label: 'Eight stories', text: 'The collection runs from The Old Nurse’s Story to The Judge’s House.' },
      { label: 'Four poems', text: 'Complete poems sit beside the prose rather than appearing only as extracts.' },
      { label: '1844 onwards', text: 'The chronology follows the Victorian supernatural to the end of the nineteenth century.' },
      { label: 'Documentary context', text: 'Spiritualism and psychical research are represented through historical documents.' }
    ],
    overview: [
      'Victorian Ghost Stories follows the supernatural across the second half of the nineteenth century. Haunted rooms, uncanny journeys and disturbed domestic spaces are placed beside the historical conditions in which Victorian readers encountered them.',
      'The eight complete stories are The Old Nurse’s Story, The Haunted and the Haunters, The Cold Embrace, The Phantom Coach, The Signal-Man, The Open Door, Man-Size in Marble and The Judge’s House.',
      'Four complete poems extend the collection beyond short fiction. Together, the poetry and prose show how apparitions, warnings, haunted houses, railway danger and the return of the dead moved between literary forms.',
      'A chronology and documentary material on spiritualism and psychical research place the stories beside changing efforts to investigate, report and explain supernatural experience.'
    ],
    editorial: [
      'Explanatory notes identify unfamiliar references and supply historical context without interrupting the complete literary texts.',
      'The collection keeps fiction, poetry and documents distinct while allowing readers to compare literary ghosts with contemporary discussion of séances and psychical inquiry.'
    ],
    topics: [
      { title: 'Haunted places', body: 'Houses, roads and railway lines turn familiar Victorian spaces into sites of uncertainty and danger.' },
      { title: 'Seeing and believing', body: 'The stories test testimony and perception while the documents show how supernatural claims were discussed outside fiction.' },
      { title: 'A changing tradition', body: 'The chronology makes it possible to follow the ghost story across more than half a century of Victorian publishing.' }
    ]
  }),
  inCollection('american', {
    slug: 'the-yellow-wallpaper-and-the-giant-wistaria',
    title: 'The Yellow Wall-Paper and The Giant Wistaria',
    author: 'Charlotte Perkins Gilman',
    image: 'The Yellow Paper and The Giant Wistaria Main Cover.png',
    purchaseUrl: 'https://mybook.to/J4dveV',
    label: 'Two stories · 1891–92',
    deck: 'Gilman’s two stories appeared seven months apart in The New England Magazine; this edition restores their shared publication world while recording important differences among surviving texts.',
    editionIncludes: [
      'Explanatory footnotes',
      'Historical and biographical context',
      'Publication and reception history',
      'Textual variants and evidence-based notes'
    ],
    facts: [
      { label: 'Seven months apart', text: 'The two stories appeared close together in 1891–92.' },
      { label: 'Shared periodical', text: 'Both were published in The New England Magazine.' },
      { label: 'Textual evidence', text: 'The edition records important differences between surviving versions.' },
      { label: 'Claims checked', text: 'Frequently repeated statements about The Yellow Wall-Paper are examined against evidence.' }
    ],
    overview: [
      'The Yellow Wall-Paper and The Giant Wistaria were published only seven months apart in The New England Magazine in 1891–92. Reading them together restores a connection created by their original periodical setting.',
      'The edition places both stories in Gilman’s historical and biographical world. Concise material explains the rest cure, marriage law and the practical organisation of domestic life.',
      'Victorian wallpaper is treated as a material object and a historical reference, not merely as a modern critical symbol detached from the story’s setting.',
      'Publication history and textual notes record significant differences among surviving versions and separate documented evidence from claims that have acquired authority through repetition.'
    ],
    editorial: [
      'Footnotes clarify period language and references, while longer sections provide biographical, legal, medical and domestic context for the two stories.',
      'Variant readings and reception claims are stated with their evidential limits so that readers can distinguish textual history from later anecdote.'
    ],
    topics: [
      { title: 'Domestic authority', body: 'Marriage, medical advice and the organisation of the home shape how each story’s events can be read.' },
      { title: 'Periodical publication', body: 'Their appearance in the same magazine within seven months gives the paired edition a precise historical basis.' },
      { title: 'Text and repetition', body: 'Variant texts and frequently repeated claims show how a story’s public history can change after publication.' }
    ]
  }),
  inCollection('restoration', {
    slug: 'oroonoko',
    title: 'Oroonoko',
    author: 'Aphra Behn',
    image: 'Oroonoko Main Cover.png',
    purchaseUrl: 'https://mybook.to/LYA4Ds',
    label: 'Novel · 1688',
    deck: 'Behn’s narrative follows an African prince betrayed by an English slave-trading captain, transported to Surinam and repeatedly denied the freedom promised to him and Imoinda.',
    editionIncludes: [
      'Original explanatory notes throughout',
      'Story summaries and historical context',
      'Essays on Surinam, slavery and Coramantien',
      'Chronology, glossary and documented sources'
    ],
    facts: [
      { label: '1688', text: 'Oroonoko was first published in this year.' },
      { label: 'First-edition basis', text: 'Substantive wording is retained while spelling, punctuation and capitalisation are modernised.' },
      { label: 'Fourteen parts', text: 'Editorial divisions make Behn’s continuous narrative easier to navigate.' },
      { label: 'Evidence tested', text: 'The supporting material examines the disputed evidence for Behn’s visit to Surinam.' }
    ],
    overview: [
      'Published in 1688, Oroonoko tells the story of an African prince betrayed by an English slave-trading captain and transported to the colony of Surinam.',
      'Oroonoko is reunited with Imoinda, but repeated promises of freedom are not honoured. When Imoinda becomes pregnant, he leads a rising against the plantation regime.',
      'The rebellion begins a sequence of betrayal and violence that ends in one of Restoration fiction’s most disturbing conclusions.',
      'The edition follows the first edition in substantive wording while modernising spelling, punctuation and capitalisation. Fourteen editorial parts provide reference points in the otherwise continuous narrative.'
    ],
    editorial: [
      'Original notes and summaries support the modernised reading text while documenting every broader historical account through a chronology, glossary and sources.',
      'Essays examine Behn’s disputed Surinam visit, real colonists named in the book, Willoughbyland, seventeenth-century slave trading, Coramantien and the work’s later theatrical and literary history.'
    ],
    topics: [
      { title: 'Promise and betrayal', body: 'Commercial and colonial authority repeatedly makes promises of freedom that it has the power to break.' },
      { title: 'Narrative and evidence', body: 'The edition distinguishes the story’s claim to witnessed history from the disputed record of Behn’s life.' },
      { title: 'Surinam and Coramantien', body: 'The geographical contexts connect the narrative to English colonisation and Atlantic slave trading.' }
    ]
  }),
  inCollection('modern', {
    slug: 'michael-robartes-and-the-dancer',
    title: 'Michael Robartes and the Dancer',
    author: 'W. B. Yeats',
    image: 'Michael Robartes Main Cover.png',
    purchaseUrl: 'https://mybook.to/1sCoD',
    label: 'Poetry collection · 1921',
    deck: 'Yeats’s fifteen-poem collection is presented in its Cuala Press form, including Easter, 1916 and The Second Coming, with later alterations recorded rather than silently substituted.',
    editionIncludes: [
      'Original explanatory notes throughout',
      'Poem summaries and historical context',
      'Chronology, recurring terms and further reading',
      'A table of first-edition and later readings'
    ],
    facts: [
      { label: 'Fifteen poems', text: 'The collection includes Easter, 1916, The Second Coming and A Prayer for My Daughter.' },
      { label: 'Cuala Press', text: 'It was printed in 1920 and published in 1921.' },
      { label: 'Four hundred copies', text: 'The original Cuala edition was limited to this number.' },
      { label: 'Original readings', text: 'The Cuala wording is retained where Yeats later revised the poems.' }
    ],
    overview: [
      'Printed by the Cuala Press in 1920 and published in 1921, Michael Robartes and the Dancer contains fifteen poems from a decisive period in Yeats’s work.',
      'The collection includes Easter, 1916, The Second Coming, The Rose Tree, On a Political Prisoner and A Prayer for My Daughter.',
      'The original Cuala edition was limited to four hundred copies. The National Library of Ireland confirms both the size of the printing and the All Souls’ Day 1920 colophon.',
      'This edition follows the Cuala text without modernising spelling or punctuation. Yeats’s Preface and two Notes are preserved, while a table records significant readings that he later changed.'
    ],
    editorial: [
      'Line numbers, summaries and explanatory notes accompany the poems while keeping the Cuala Press wording intact, including early readings in The Second Coming.',
      'Historical material covers the Easter Rising, Irish politics, Yeats’s marriage and automatic writing, Michael Robartes, A Vision, Ballylee and the making of the collection.'
    ],
    topics: [
      { title: 'Poems in their first book', body: 'The edition restores readings later altered by Yeats and records their subsequent history openly.' },
      { title: 'Ireland and revolution', body: 'The Easter Rising and its political aftermath provide necessary contexts for several poems.' },
      { title: 'Private systems', body: 'Marriage, automatic writing, Michael Robartes and A Vision connect personal history to Yeats’s developing symbolic thought.' }
    ]
  }),
  inCollection('romantic', {
    slug: 'lyrical-ballads',
    title: 'Lyrical Ballads',
    author: 'William Wordsworth and Samuel Taylor Coleridge',
    image: 'Lyrical Ballads Main Cover.png',
    purchaseUrl: 'https://mybook.to/k5ZCt',
    label: 'Selected poetry · 1798 / 1800',
    deck: 'Thirty-six poems from the 1798 and 1800 editions preserve the forms in which Wordsworth and Coleridge first published them, including the original Rime of the Ancyent Marinere.',
    editionIncludes: [
      'Thirty-six poems selected from the 1798 and 1800 editions',
      'Original explanatory notes and poem summaries',
      'Historical, biographical and publication context',
      'Chronology, glossary and documented sources'
    ],
    facts: [
      { label: '1798', text: 'Lyrical Ballads was first published anonymously.' },
      { label: 'Thirty-six poems', text: 'The Astor edition draws from the 1798 and 1800 contents.' },
      { label: 'Original Rime', text: 'Coleridge’s 1798 spelling of the Ancyent Marinere is preserved.' },
      { label: 'Selected edition', text: 'The volume does not claim to reproduce the complete contents of both early editions.' }
    ],
    overview: [
      'First published anonymously in 1798, Lyrical Ballads brought Wordsworth and Coleridge together at a decisive moment in English Romantic poetry.',
      'The selection includes Coleridge’s original 1798 Rime of the Ancyent Marinere alongside Wordsworth’s We Are Seven, The Thorn, The Idiot Boy and Tintern Abbey.',
      'The Lucy poems, Nutting, The Old Cumberland Beggar and Michael represent the enlarged 1800 edition. Each work appears in the form in which it first entered Lyrical Ballads.',
      'Original notes and summaries trace unfamiliar words, people, books, landscapes and events, while supporting essays explain the collaboration, publication, reception and later history of the poems.'
    ],
    editorial: [
      'Spelling, punctuation and capitalisation are retained from the relevant 1798 or 1800 text rather than replaced by the poets’ later revisions.',
      'The introduction and apparatus state clearly that this is a thirty-six-poem selection, with documented sources and historical context for the two early editions.'
    ],
    topics: [
      { title: 'First forms', body: 'Reading the poems as they appeared in 1798 or 1800 reveals decisions obscured by later familiar revisions.' },
      { title: 'Two poets', body: 'The selection makes the collaboration visible while preserving the different forms and subjects brought by Coleridge and Wordsworth.' },
      { title: 'Place and encounter', body: 'Landscapes, speakers and meetings with other lives carry many of the collection’s formal experiments.' }
    ]
  }),
  inCollection('american', {
    slug: 'ethan-frome',
    title: 'Ethan Frome',
    author: 'Edith Wharton',
    image: 'Ethan Frome Main Cover.png',
    purchaseUrl: 'https://mybook.to/MN2KL',
    label: 'Novel · 1911',
    deck: 'An engineer reconstructs the history behind Ethan Frome’s injuries, returning twenty-four years to a failing Starkfield farm, a constricted marriage and Mattie Silver’s arrival.',
    editionIncludes: [
      'Original explanatory footnotes throughout',
      'Chapter summaries and researched historical context',
      'Essays on New England life, work, marriage and medicine',
      'Glossary, chronology, sources and reception history'
    ],
    facts: [
      { label: '1911', text: 'The edition follows the first Scribner book text.' },
      { label: 'Twenty-four years', text: 'The engineer’s reconstruction returns to Ethan’s life at twenty-eight.' },
      { label: 'Earlier Hiver', text: 'The novel grew from a French exercise Wharton had written before it.' },
      { label: 'Lenox, 1904', text: 'A serious coasting accident is documented, but Wharton did not claim it as her source.' }
    ],
    overview: [
      'An unnamed engineer arrives in Starkfield and becomes interested in Ethan Frome, a scarred and crippled man whose appearance suggests a history villagers do not fully explain.',
      'The reconstructed story returns twenty-four years. At twenty-eight, Ethan lives on a failing farm with his older wife Zeena, in a marriage shaped by resentment and persistent lack of money.',
      'Zeena’s young cousin Mattie Silver brings companionship, but affection does not remove the mortgages, dependence and absence of another secure home that make leaving almost impossible.',
      'First published in 1911, the novel grew from Wharton’s earlier French exercise Hiver and her knowledge of the Berkshires. Its sledding climax has a documented connection with a 1904 Lenox accident, though Wharton did not identify that accident as her source.'
    ],
    editorial: [
      'The 1911 Scribner text is followed with spelling, punctuation and phonetic Starkfield speech preserved; only evident typographical errors are silently corrected.',
      'Notes and essays explain rural work and debt, Berkshire geography, winter transport, patent medicines, healthcare, marriage, divorce, obligation, adaptations and reception.'
    ],
    topics: [
      { title: 'No practical exit', body: 'Farm debt, work, marriage and dependence give material force to the novel’s emotional confinement.' },
      { title: 'A reconstructed past', body: 'The engineer’s account reaches Ethan through partial testimony rather than direct access to a settled history.' },
      { title: 'Starkfield winter', body: 'Roads, weather, farms and declining mills make place an active pressure on every available choice.' }
    ]
  }),
  inCollection('victorian', {
    slug: 'dickens-at-christmas',
    title: 'Dickens at Christmas',
    author: 'Charles Dickens',
    image: 'Dickens at Christmas Main Cover.png',
    purchaseUrl: 'https://mybook.to/mUpuk0',
    label: 'Four Christmas books · 1843–48',
    deck: 'Four complete Dickens Christmas books bring A Christmas Carol together with The Chimes, The Cricket on the Hearth and The Haunted Man and the Ghost’s Bargain.',
    editionIncludes: [
      'Four complete and unabridged Dickens Christmas books',
      'An original introduction and individual book headnotes',
      'Chapter summaries and historical context',
      'Notes, glossary, chronology and further reading'
    ],
    facts: [
      { label: '1843–48', text: 'Dickens published five short Christmas books during these years.' },
      { label: 'Four books', text: 'This collection reprints four of the five complete and unabridged.' },
      { label: 'Begins with Scrooge', text: 'A Christmas Carol opens the volume.' },
      { label: 'Ends with memory', text: 'The Haunted Man closes it with Redlaw’s bargain to forget sorrow.' }
    ],
    overview: [
      'Between 1843 and 1848, Dickens published five short books for the Christmas market. This collection brings together four of them as complete, unabridged texts.',
      'A Christmas Carol follows Scrooge through memory, present responsibility and a possible future; The Chimes shows Trotty Veck the consequences of treating poverty as moral failure.',
      'The Cricket on the Hearth turns on marriage, trust, misunderstanding and reconciliation around the Peerybingle household.',
      'The Haunted Man and the Ghost’s Bargain gives Redlaw the power to forget sorrow, only for the loss of painful memory to destroy sympathy for other people.'
    ],
    editorial: [
      'An original introduction and individual headnotes establish the publication setting of each book before the complete literary text begins.',
      'Chapter summaries, notes and historical context allow readers to compare how four different supernatural and domestic plots return to poverty, family, memory and social responsibility.'
    ],
    topics: [
      { title: 'Four Christmas forms', body: 'The volume makes it possible to compare structures and supernatural devices across Dickens’s short seasonal books.' },
      { title: 'Poverty and judgement', body: 'A Christmas Carol and The Chimes ask how respectable opinion turns material hardship into moral accusation.' },
      { title: 'Memory and sympathy', body: 'Recollection supports change in Scrooge’s story and becomes the explicit subject of Redlaw’s bargain.' }
    ]
  }),
  inCollection('renaissance', {
    slug: 'charles-i-selected-writings',
    title: 'Charles I: Selected Writings',
    author: 'Charles I and contemporaries',
    image: 'Charles I selected Writings Main Cover.png',
    purchaseUrl: 'https://mybook.to/KLGFCM',
    label: 'Primary documents · 1620s–1649',
    deck: 'Seventeen documents trace the disputed reign of Charles I from the conflicts of the 1620s to trial and execution, with authorship and provenance stated for each selection.',
    editionIncludes: [
      'Seventeen primary documents from the reign',
      'Original notes and historical context',
      'Chronology, people guide and source notes',
      'Clear authorship and provenance for every document'
    ],
    facts: [
      { label: 'Seventeen documents', text: 'The selection reaches from private letters to the scaffold speech.' },
      { label: '1620s–1649', text: 'The sequence follows conflict through the king’s execution.' },
      { label: 'Naseby papers', text: 'Confidential instructions captured after the battle are included.' },
      { label: 'Disputed authorship', text: 'A final section examines the attribution of Eikon Basilike.' }
    ],
    overview: [
      'Charles I: Selected Writings presents a documentary history of a contested reign from the disputes of the 1620s to the king’s execution in 1649.',
      'The seventeen selections include private letters to Henrietta Maria, two royal answers to the Petition of Right and the Declaration of Sports.',
      'Later documents include the Answer to the Nineteen Propositions, instructions captured at Naseby, exchanges from the High Court of Justice, the death warrant and the scaffold speech.',
      'A final section considers the disputed authorship of Eikon Basilike rather than treating the book as securely Charles’s own composition.'
    ],
    editorial: [
      'Each document is identified as personal writing, a formal text drafted for the king, reported speech or doubtful attribution, with provenance stated openly.',
      'Notes explain people, places, law, Parliament, religion and seventeenth-century terminology while retaining the wording of the historical sources.'
    ],
    topics: [
      { title: 'Royal voice and drafting', body: 'The edition distinguishes what Charles wrote personally from official texts composed in his name.' },
      { title: 'Crown and Parliament', body: 'The sequence records constitutional and religious conflict through the documents produced by it.' },
      { title: 'Trial and memory', body: 'Court exchanges, execution papers and Eikon Basilike show the struggle to define Charles at the end of the reign.' }
    ]
  }),
  inCollection('modern', {
    slug: 'anne-of-green-gables',
    title: 'Anne of Green Gables',
    author: 'L. M. Montgomery',
    image: 'Anne of Green Gables Main Cover.png',
    purchaseUrl: 'https://mybook.to/rcbWae',
    label: 'Novel · 1908',
    deck: 'Eleven-year-old Anne Shirley is sent by mistake to Matthew and Marilla Cuthbert at Green Gables in Montgomery’s Prince Edward Island novel.',
    editionIncludes: [
      'Explanatory footnotes throughout',
      'Chapter summaries and historical context',
      'Original essays on Prince Edward Island and the 1890s',
      'Chronology and publication history'
    ],
    facts: [
      { label: '1908', text: 'Anne of Green Gables was first published in this year.' },
      { label: 'Eleven years old', text: 'Anne arrives at Green Gables after being sent to the Cuthberts by mistake.' },
      { label: 'First-edition text', text: 'American spelling, contractions, dialect and punctuation are retained.' },
      { label: 'Every chapter', text: 'A Story So Far summary is followed by a historical Context section.' }
    ],
    overview: [
      'Anne of Green Gables follows eleven-year-old Anne Shirley after she is mistakenly sent to Matthew and Marilla Cuthbert at their Prince Edward Island farm.',
      'The edition follows the first-edition text. Montgomery’s American spelling, contractions, dialect and punctuation remain, with only evident typographical errors corrected.',
      'Footnotes identify quotations, unfamiliar words, people and historical references. Each chapter ends with a concise Story So Far and a Context section.',
      'Original essays examine Montgomery’s life, the writing and publication of the novel, Prince Edward Island, farming, schooling, religion, women’s opportunities, orphan children and domestic labour.'
    ],
    editorial: [
      'The first-edition language is not silently converted to later or British usage. Notes identify references while retaining Montgomery’s spelling, speech and punctuation.',
      'Chapter support keeps recap separate from historical explanation, allowing the narrative to continue while giving readers practical routes into its 1890s setting.'
    ],
    topics: [
      { title: 'Arrival by mistake', body: 'Anne’s place at Green Gables begins in error and develops through changing family expectations.' },
      { title: 'Prince Edward Island', body: 'Farm, school, church and domestic work give Avonlea a precise social and historical setting.' },
      { title: 'Language retained', body: 'Dialect, contractions and first-edition spelling preserve the voices and print history of the novel.' }
    ]
  }),
  inCollection('victorian', {
    slug: 'alices-adventures-in-wonderland',
    title: 'Alice’s Adventures in Wonderland',
    author: 'Lewis Carroll',
    image: "Alice's Adventures in Wonderland Main Cover.png",
    purchaseUrl: 'https://mybook.to/dWqdpw',
    label: 'Novel · 1865',
    deck: 'Carroll’s final revised text is supported by notes on Victorian language, customs, poems and references, together with the Oxford and manuscript history behind Wonderland.',
    editionIncludes: [
      'Explanatory footnotes throughout',
      'Chapter recaps and Victorian context',
      'Original essays on Carroll and the book’s history',
      'Comparisons with Alice’s Adventures Under Ground'
    ],
    facts: [
      { label: '1865', text: 'Alice’s Adventures in Wonderland was first published in this year.' },
      { label: 'Final revised text', text: 'The edition follows Carroll’s last revised wording.' },
      { label: 'Earlier manuscript', text: 'Comparisons show how Alice’s Adventures Under Ground developed into the published book.' },
      { label: 'Tenniel and Oxford', text: 'The illustrations and the book’s university background receive dedicated historical context.' }
    ],
    overview: [
      'First published in 1865, Alice’s Adventures in Wonderland became one of the defining works of children’s fantasy.',
      'This edition follows Carroll’s final revised text rather than silently combining different states of the book.',
      'Explanatory notes identify Victorian language, customs, poems and references whose original familiarity can no longer be assumed.',
      'Original essays follow the unusual publication history, Oxford setting, John Tenniel’s illustrations and Alice’s Adventures Under Ground, the earlier manuscript from which the published novel developed.'
    ],
    editorial: [
      'Chapter recaps and footnotes support the sequence of Wonderland without replacing Carroll’s language or the final revised text.',
      'Manuscript comparisons and publication history allow readers to see the book as a work that changed between Under Ground and its familiar printed form.'
    ],
    topics: [
      { title: 'Language and recognition', body: 'Notes recover poems, phrases and customs that Carroll’s first readers could identify more readily.' },
      { title: 'Manuscript to book', body: 'Comparison with Under Ground makes revision and expansion visible.' },
      { title: 'Words and pictures', body: 'Tenniel’s illustrations belong to the publication history through which Wonderland reached its readers.' }
    ]
  }),
  inCollection('victorian', {
    slug: 'a-victorian-bonfire-night',
    title: 'A Victorian Bonfire Night',
    author: 'James Orchard Halliwell, Douglas Jerrold and others',
    image: 'A Victorian Bonfire Night Main Cover.png',
    purchaseUrl: 'https://mybook.to/KiZHRv',
    label: 'Annotated cultural history',
    deck: 'Victorian fiction, essays, folklore and newspaper reporting trace the Fifth of November as statutory Protestant observance gave way to children’s customs, bonfire societies and public entertainment.',
    editionIncludes: [
      'Original historical notes and context throughout',
      'A Bonfire Night chronology and glossary',
      'Victorian fiction, essays, folklore and newspaper reporting',
      'Source notes on fireworks, riots, food and popular custom'
    ],
    facts: [
      { label: 'Nineteenth century', text: 'The collection follows the changing Fifth of November across the Victorian period.' },
      { label: '1859', text: 'The edition explains the repeal of the 1606 statutory observance.' },
      { label: 'Mixed sources', text: 'Fiction, essays, folklore and an 1888 newspaper survey are included.' },
      { label: 'Regional customs', text: 'Lewes, Guildford, food, policing and carnival traditions receive documented treatment.' }
    ],
    overview: [
      'A Victorian Bonfire Night traces the Fifth of November through the nineteenth century, as statutory Protestant observance increasingly gave way to children’s customs, organised bonfire societies, commercial fireworks and public entertainment.',
      'The primary texts include James Orchard Halliwell’s Fifth of November rhyme, Douglas Jerrold’s recollections, four chapters from William Harrison Ainsworth’s Guy Fawkes, Francis Edward Paget’s The Bonfire and Robert Chambers’s account of Guy Fawkes’s Day.',
      'T. F. Thiselton-Dyer’s regional customs, Thomas Hardy’s Egdon Heath bonfire chapter from The Return of the Native and an 1888 provincial newspaper survey extend the record across genre and place.',
      'Original chapters examine the Plot, legislation and repeal, pope-burning, the Guy, fuel gathering, firework manufacture, the Papal Aggression, disturbances, parkin, bonfire toffee, policing and regional carnival.'
    ],
    editorial: [
      'Notes and source statements distinguish reprinted Victorian writing from the original editorial chapters that connect it to law, manufacture, food and public order.',
      'The chronology and glossary make it possible to follow continuity and change without presenting the nineteenth-century festival as one uniform national custom.'
    ],
    topics: [
      { title: 'Observance and entertainment', body: 'Religious commemoration changes as children’s customs, fireworks and organised public celebration become more prominent.' },
      { title: 'Regional Bonfire Night', body: 'Local customs and disturbances show that the Fifth of November did not develop identically across Britain.' },
      { title: 'Fire, food and regulation', body: 'Manufacture, policing, parkin and bonfire toffee connect spectacle to work, law and local economy.' }
    ]
  }),
  inCollection('modern', {
    slug: 'a-room-of-ones-own',
    title: 'A Room of One’s Own',
    author: 'Virginia Woolf',
    image: "A Room of One's Own Main COver.png",
    purchaseUrl: 'https://mybook.to/tCPKV5l',
    label: 'Essay · 1929',
    deck: 'Woolf asks what material conditions a woman needs in order to write, moving through Oxbridge, Fernham, the British Museum and literary history by way of fact, fiction and speculation.',
    editionIncludes: [
      'Original explanatory notes throughout',
      'Chapter summaries and historical context',
      'Essays on education, money, law and publishing',
      'Glossary, chronology and documented sources'
    ],
    facts: [
      { label: 'October 1928', text: 'The book grew from papers delivered to women students at Newnham and Girton Colleges, Cambridge.' },
      { label: 'Six parts', text: 'Woolf develops the argument through a deliberately mixed form.' },
      { label: 'Five hundred a year', text: 'Independent income and private space become practical conditions of intellectual freedom.' },
      { label: 'Notes distinguished', text: 'Woolf’s own notes remain separate from the additional editorial annotations.' }
    ],
    overview: [
      'A Room of One’s Own asks what conditions are necessary for a woman to write. It grew from papers Woolf delivered to women students at Cambridge in October 1928.',
      'An unnamed narrator moves through the invented Oxbridge, the women’s college of Fernham, the British Museum and English literary history. Fact, fiction, biography and speculation are deliberately combined.',
      'The argument joins intellectual freedom to material circumstances: independent income and private space. It considers women’s exclusion from universities, libraries, property, earnings and much of the historical record.',
      'Woolf invents Judith Shakespeare and turns to Aphra Behn, Austen, the Brontës, George Eliot and contemporary women novelists before ending with the androgynous mind and an appeal to her student audience to write.'
    ],
    editorial: [
      'Woolf’s spelling, punctuation and italics are preserved, and her original notes are visibly distinguished from the new editorial apparatus. Chapter-end summaries and contextual notes support each of the essay’s six parts.',
      'Notes and essays identify people, books, laws, institutions, money and period practices while separating historical references from figures and places Woolf invents or combines. Supporting material follows the Newnham and Girton lectures, composition and publication through the Hogarth Press, women’s access to university, marriage, property, employment and voting rights, and the significance of Woolf’s five hundred a year.'
    ],
    topics: [
      { title: 'Material freedom', body: 'Money, rooms, education and legal rights determine who has time, privacy and authority to write.' },
      { title: 'Fact mixed with fiction', body: 'The unnamed narrator and invented figures allow Woolf to test the limits of conventional academic argument.' },
      { title: 'Women in literary history', body: 'Libraries, historical records and publishing structures shape which lives and works can be recovered.' }
    ]
  })
];

const hardbacks = [
  {
    href: '/books/a-victorian-bonfire-night/',
    slug: 'a-victorian-bonfire-night',
    title: 'A Victorian Bonfire Night',
    author: 'James Orchard Halliwell, Douglas Jerrold and others',
    collection: 'Victorian',
    collectionHref: '/victorian/',
    image: 'Victorian Bonfire Night Hardcover.png',
    purchaseUrl: 'https://mybook.to/uF2n4LW',
    paperbackImage: 'A Victorian Bonfire Night Main Cover.png',
    paperbackPurchaseUrl: 'https://mybook.to/KiZHRv',
    deck: 'Victorian writing, folklore, reporting and original historical chapters trace the changing Fifth of November.',
    editorial: 'The hardback contains the same annotated collection and documented historical apparatus as the paperback in a casebound format.'
  },
  {
    href: '/books/the-odyssey/',
    slug: 'the-odyssey',
    title: 'The Odyssey',
    author: 'Homer, translated by Samuel Butler',
    collection: 'Ancient & Epic',
    collectionHref: '/ancient-epic/',
    image: 'The Odyssey Hardcover.png',
    purchaseUrl: 'https://mybook.to/rwDKnWr',
    paperbackImage: 'The Odyssey.png',
    paperbackPurchaseUrl: 'https://mybook.to/uAMn',
    deck: 'Odysseus’s return to Ithaca is presented in Samuel Butler’s complete prose translation with book-by-book reading support.',
    editorial: 'The hardback and paperback provide the same complete translation, summaries, explanatory notes and historical context.'
  },
  {
    href: '/books/the-iliad/',
    slug: 'the-iliad',
    title: 'The Iliad',
    author: 'Homer, translated by Samuel Butler',
    collection: 'Ancient & Epic',
    collectionHref: '/ancient-epic/',
    image: 'The Iliad Hardcover.png',
    purchaseUrl: 'https://mybook.to/VHZtnd',
    paperbackImage: 'The Iliad.png',
    paperbackPurchaseUrl: 'https://mybook.to/qXcAI7T',
    deck: 'Homer’s epic of Achilles’ anger is presented in Samuel Butler’s complete prose translation with support for all twenty-four books.',
    editorial: 'The hardback and paperback contain the same complete text, summaries, annotations and contextual material.'
  },
  {
    href: '/books/the-aeneid/',
    slug: 'the-aeneid',
    title: 'The Aeneid',
    author: 'Virgil, translated by John Dryden',
    collection: 'Ancient & Epic',
    collectionHref: '/ancient-epic/',
    image: 'The Aeneid Hardcover.png',
    purchaseUrl: 'https://mybook.to/rdk9fx',
    paperbackImage: 'The Aeneid.png',
    paperbackPurchaseUrl: 'https://mybook.to/ZdOQoGv',
    deck: 'Aeneas’s journey from Troy to Italy appears in John Dryden’s complete verse translation with notes on epic, history and Rome.',
    editorial: 'The hardback is a casebound format of the Astor edition available alongside the existing paperback.'
  },
  {
    href: '/books/sleepy-hollow-and-other-stories/',
    slug: 'sleepy-hollow-and-other-stories',
    title: 'Sleepy Hollow and Other American Halloween Stories',
    author: 'Washington Irving, Edgar Allan Poe and others',
    collection: 'American Classics',
    collectionHref: '/american/',
    image: 'Sleepy Hollow and other American Halloween Stories Hardcover.png',
    purchaseUrl: 'https://mybook.to/MPDvt5',
    paperbackImage: 'Sleepy Hollow Main Cover.png',
    paperbackPurchaseUrl: 'https://mybook.to/mlEu80z',
    deck: 'Twelve complete American supernatural stories are joined by notes, publication history and a history of their later Halloween associations.',
    editorial: 'The hardback and paperback contain the same twelve-story annotated collection, chronology, glossary and historical material.'
  },
  {
    href: '/books/shakespeares-sonnets/',
    slug: 'shakespeares-sonnets',
    title: 'Shakespeare’s Sonnets',
    author: 'William Shakespeare',
    collection: 'Shakespeare',
    collectionHref: '/shakespeare/',
    image: "Shakespeare's Sonnets Hardback.png",
    purchaseUrl: 'https://mybook.to/bVlnW',
    paperbackImage: "Shakespeare's Sonnets Main Cover.png",
    paperbackPurchaseUrl: 'https://mybook.to/EPIxTc',
    deck: 'All 154 sonnets appear in the 1609 order with a headnote and same-page explanation for every poem.',
    editorial: 'The hardback offers the same complete sonnet sequence and page-by-page reading support as the paperback.'
  },
  {
    href: '/books/dorian-gray/',
    slug: 'dorian-gray',
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    collection: 'Victorian',
    collectionHref: '/victorian/',
    image: 'Picture of Dorian Gray Hardcover.png',
    purchaseUrl: 'https://mybook.to/QmZR',
    paperbackImage: 'Picture of Dorian Gray.png',
    paperbackPurchaseUrl: 'https://mybook.to/zizDNb',
    deck: 'Wilde’s novel of beauty, influence and concealed corruption is available as a casebound Astor edition.',
    editorial: 'The hardback is presented as a format choice beside the existing Astor paperback edition.'
  },
  {
    href: '/books/the-great-gatsby/',
    slug: 'the-great-gatsby',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    collection: 'American Classics',
    collectionHref: '/american/',
    image: 'Great Gatsby Hardcover.png',
    purchaseUrl: 'https://mybook.to/YjArgN',
    paperbackImage: 'The Great Gatsby Main Cover.png',
    paperbackPurchaseUrl: 'https://mybook.to/wj3s',
    deck: 'Fitzgerald’s first-edition text is accompanied by footnotes, chapter recaps and historical context for New York and 1922.',
    editorial: 'The hardback and paperback contain the same annotated text, chapter support, chronology and publication history.'
  },
  {
    href: '/books/dickens-at-christmas/',
    slug: 'dickens-at-christmas',
    title: 'Dickens at Christmas',
    author: 'Charles Dickens',
    collection: 'Victorian',
    collectionHref: '/victorian/',
    image: 'Dickens at Christmas Hardcover.png',
    purchaseUrl: 'https://mybook.to/8V5r',
    paperbackImage: 'Dickens at Christmas Main Cover.png',
    paperbackPurchaseUrl: 'https://mybook.to/mUpuk0',
    deck: 'Four complete Christmas books bring Scrooge, Trotty Veck, the Peerybingles and Redlaw into one annotated volume.',
    editorial: 'The hardback and paperback contain the same four unabridged texts with headnotes, summaries, notes and historical context.'
  },
  {
    href: '/books/a-victorian-christmas/',
    slug: 'a-victorian-christmas',
    title: 'A Victorian Christmas',
    author: 'Astor Library',
    collection: 'Victorian',
    collectionHref: '/victorian/',
    image: 'A Victorian Christmas Hardcover.png',
    purchaseUrl: 'https://mybook.to/Urvaf2',
    paperbackImage: 'A Victorian Christmas Main Cover.png',
    paperbackPurchaseUrl: 'https://mybook.to/NUduL',
    deck: 'The nineteenth-century histories of trees, cards, crackers, food, carols, charity and Christmas literature are brought into one documented account.',
    editorial: 'The hardback is a casebound format of the existing Astor cultural history, with the same chapters, primary texts and historical apparatus.'
  }
];

const remainingBooks = [
  inCollection('victorian', {
    slug: 'the-woman-in-white',
    title: 'The Woman in White',
    author: 'Wilkie Collins',
    image: 'The Woman in White Main Cover.png',
    purchaseUrl: 'https://mybook.to/OepTu',
    label: 'Novel · 1859–60 / 1861 text',
    deck: 'Walter Hartright investigates a mysterious woman, a hidden identity and a conspiracy involving marriage, inheritance and power in Collins’s multiple-narrator novel.',
    editionIncludes: [
      'Explanatory footnotes throughout',
      'Historical context and original essays',
      'Publication history and textual notes',
      'Victorian law, property and asylum background'
    ],
    facts: [
      { label: '1859–60', text: 'The Woman in White was first published in serial form.' },
      { label: '1861 text', text: 'This edition follows Collins’s revised text.' },
      { label: 'Many witnesses', text: 'The investigation is assembled through a famous multiple-narrator structure.' },
      { label: 'Law and confinement', text: 'Marriage, property, identity and asylum history are central to the contextual material.' }
    ],
    overview: [
      'Walter Hartright’s encounter with a mysterious woman begins an investigation into concealed identity and a conspiracy organised through marriage, inheritance and unequal power.',
      'The story moves through the testimonies of people connected to the case. Its multiple narrators make evidence, memory and self-interest part of the novel’s method rather than a neutral frame around the plot.',
      'First published in 1859–60, the novel was subsequently revised by Collins. This edition follows the revised 1861 text and records relevant publication and textual history.',
      'Notes and essays explain Victorian society, law, language and institutions, including the property rules and asylum practices behind the novel’s central conflicts.'
    ],
    editorial: [
      'The revised 1861 text remains central, with concise footnotes supplying information a nineteenth-century reader might have recognised without explanation.',
      'Original essays connect the serial publication and multiple-narrator design to the legal, social and institutional pressures on which the conspiracy depends.'
    ],
    topics: [
      { title: 'Evidence and narration', body: 'Each witness controls part of the record, making the form of testimony inseparable from the investigation.' },
      { title: 'Marriage and property', body: 'Legal identity and financial control give the conspiracy its practical means.' },
      { title: 'Institutions and power', body: 'The asylum and the law can preserve a false identity when authority accepts the wrong account.' }
    ]
  }),
  inCollection('modern', {
    slug: 'the-wind-in-the-willows',
    title: 'The Wind in the Willows',
    author: 'Kenneth Grahame',
    image: 'The Wind in the Willows - Main Cover.png',
    purchaseUrl: 'https://mybook.to/wYAk',
    label: 'Novel · 1908',
    deck: 'Mole, Rat, Badger and Toad move between riverbank picnics, the Wild Wood, motor-car disasters and the battle for Toad Hall in Grahame’s Edwardian classic.',
    editionIncludes: [
      'Explanatory footnotes throughout',
      'Chapter summaries and historical context',
      'Original essays on Grahame and the book’s history',
      'Edwardian background to river, road and railway life'
    ],
    facts: [
      { label: '1908', text: 'The Wind in the Willows was first published in the Edwardian period.' },
      { label: 'Four friends', text: 'Mole, Rat, Badger and Toad lead the book’s connected adventures.' },
      { label: 'Text preserved', text: 'Grahame’s spelling and punctuation are retained.' },
      { label: 'Changing transport', text: 'Road, rail and river life receive specific historical explanation.' }
    ],
    overview: [
      'The Wind in the Willows follows Mole, Rat, Badger and Toad through riverbank picnics, the Wild Wood, motor-car disasters and the eventual battle for Toad Hall.',
      'The book’s movement between home, river, road and railway belongs to the changing transport world of 1908. Toad’s enthusiasms are therefore placed in an Edwardian material setting as well as a comic one.',
      'This edition preserves Grahame’s spelling and punctuation. Footnotes explain unfamiliar language, money, transport, law and institutions without modernising the literary text.',
      'Chapter recaps support the sequence of events, while original essays introduce Grahame, the book’s publication history and the Edwardian background to its landscapes and machines.'
    ],
    editorial: [
      'Explanatory material sits around a text whose original spelling and punctuation remain intact. Notes are directed towards details that have become less familiar since 1908.',
      'Chapter summaries and contextual essays connect the friends’ adventures to the practical histories of river travel, roads, motor cars, railways, money and law.'
    ],
    topics: [
      { title: 'Home and wandering', body: 'The riverbank and Toad Hall provide centres of belonging against repeated departures and returns.' },
      { title: 'Old roads and new machines', body: 'Boats, carts, trains and motor cars place the story inside a changing transport culture.' },
      { title: 'Friendship and correction', body: 'Mole, Rat and Badger repeatedly try to contain the consequences of Toad’s enthusiasms.' }
    ]
  }),
  inCollection('victorian', {
    slug: 'the-moonstone',
    title: 'The Moonstone',
    author: 'Wilkie Collins',
    image: 'The Moonstone Main Cover.png',
    purchaseUrl: 'https://mybook.to/49eJP',
    label: 'Novel · 1868',
    deck: 'The disappearance of a priceless diamond is investigated through the testimonies of people connected to the case in Collins’s Victorian detective novel.',
    editionIncludes: [
      'Explanatory footnotes throughout',
      'Historical context and original essays',
      'Publication history and reception',
      'A glossary of Victorian terms and references'
    ],
    facts: [
      { label: '1868', text: 'The Moonstone was first published in this year.' },
      { label: 'Many accounts', text: 'The disappearance is reconstructed through connected testimonies.' },
      { label: 'Text preserved', text: 'Collins’s text is retained while unfamiliar references are annotated.' },
      { label: 'A real history', text: 'The edition examines the history behind the diamond at the centre of the novel.' }
    ],
    overview: [
      'The Moonstone begins with the disappearance of a priceless diamond and follows the investigation through the accounts of people connected to the household and the case.',
      'The testimonies make interpretation part of the plot. Each narrator contributes information through a distinct voice, position and understanding of events.',
      'This edition preserves Collins’s text while explaining unfamiliar language, historical references, British India and the practices of Victorian policing.',
      'Original essays examine the novel’s serial publication, sources, reception and place in the development of detective fiction, together with the real history behind its famous diamond.'
    ],
    editorial: [
      'Footnotes and a glossary clarify terms and references without flattening the differences among the novel’s narrating voices.',
      'Historical sections connect the domestic investigation to British India, policing, serial reading and the emerging conventions of detective fiction.'
    ],
    topics: [
      { title: 'Testimony and character', body: 'The solution develops through accounts whose voices reveal the witnesses as well as the evidence.' },
      { title: 'Empire and possession', body: 'The diamond’s history links an English household to British India and contested ownership.' },
      { title: 'Making detective fiction', body: 'Investigation, clues and competing explanations are read beside the novel’s publication history and reception.' }
    ]
  }),
  inCollection('modern', {
    slug: 'the-metamorphosis',
    title: 'The Metamorphosis',
    author: 'Franz Kafka, translated by Ian Johnston',
    image: 'The Metamorphosis Main Cover.png',
    purchaseUrl: 'https://mybook.to/evF1',
    label: 'Novella · 1915',
    deck: 'Gregor Samsa wakes transformed into what Ian Johnston calls a “monstrous verminous bug”, yet his first fear concerns work, debt and the employer whose authority reaches into the family home.',
    editionIncludes: [
      'Original explanatory footnotes throughout',
      'Historical and biographical context',
      'Essays on work, family, Prague and social insurance',
      'Glossary, chronology and translation history'
    ],
    facts: [
      { label: 'Twenty-one days', text: 'Kafka wrote Die Verwandlung in 1912.' },
      { label: '1915', text: 'The work was first published three years after it was written.' },
      { label: 'Ian Johnston', text: 'The edition uses his student translation, released into the public domain in January 1999.' },
      { label: 'Sixteen corrections', text: 'Evident typographical errors were checked against Kafka’s German and corrected.' }
    ],
    overview: [
      'Gregor Samsa wakes from uneasy dreams and finds that he has been transformed into what Ian Johnston translates as a “monstrous verminous bug”. His immediate concern is missing work as a commercial traveller.',
      'Gregor supports his parents and younger sister through a job he despises because the family is indebted to his employer. When he misses his train, a senior representative of the firm comes to the flat to investigate.',
      'As Gregor is confined to his room, the household’s economic structure changes. His father returns to work, his mother takes in sewing, Grete becomes a shop assistant, servants leave and three paying lodgers arrive.',
      'Written in twenty-one days in 1912 and first published in 1915, Die Verwandlung is the longest work of fiction Kafka completed and published during his lifetime.'
    ],
    editorial: [
      'Ian Johnston’s translation, prepared for students at Malaspina University-College and released into the public domain in January 1999, is retained apart from sixteen evident typographical errors checked against Kafka’s German. Notes explain Gregor’s position in the commercial world, the authority of the Prokurist, Austro-Hungarian money, domestic servants, compulsory sickness insurance, trains and trams, and the German vocabulary behind Johnston’s English.',
      'Supporting essays examine German-speaking Prague, work and bureaucracy, the Samsa household, illness and disability, publication, Kafka’s instruction that Gregor’s transformed body must not appear on the original cover, and the translation history of ungeheueres Ungeziefer.'
    ],
    topics: [
      { title: 'Work before wonder', body: 'Gregor responds to transformation through timetables, debt and the disciplinary reach of his employer.' },
      { title: 'A household economy', body: 'The family’s roles and judgements change as Gregor moves from sole provider to financial burden.' },
      { title: 'A translated creature', body: 'The German phrase behind Gregor’s new body has produced a difficult and revealing English translation history.' }
    ]
  }),
  inCollection('american', {
    slug: 'the-great-gatsby',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    image: 'The Great Gatsby Main Cover.png',
    purchaseUrl: 'https://mybook.to/wj3s',
    label: 'Novel · 1925',
    deck: 'Set during the summer of 1922 between Long Island’s Gold Coast and Prohibition-era New York, Fitzgerald’s novel is presented in its first-edition text with notes and chapter support.',
    editionIncludes: [
      'Explanatory footnotes throughout',
      'Chapter-by-chapter summaries and historical context',
      'Original essays on New York and the 1920s',
      'A Fitzgerald chronology and publication history'
    ],
    facts: [
      { label: '10 April 1925', text: 'The Great Gatsby was first published on this date.' },
      { label: 'Summer 1922', text: 'The action moves between Long Island and New York during Prohibition.' },
      { label: 'First-edition text', text: 'Spelling and punctuation are preserved, with only evident typographical errors corrected.' },
      { label: 'After every chapter', text: 'The Story So Far is followed by historical Context directly connected to the chapter.' }
    ],
    overview: [
      'First published on 10 April 1925, The Great Gatsby is set during the summer of 1922 between Long Island’s Gold Coast and Prohibition-era New York.',
      'The edition follows the public-domain text of the first edition. Fitzgerald’s spelling and punctuation remain in place, with intervention limited to evident typographical errors.',
      'Footnotes identify words, places, prices, brands, songs, laws and people that Fitzgerald’s first readers would have recognised. Chapter-end Story So Far and Context sections support sequence and setting.',
      'Original essays examine Fitzgerald’s life and the novel’s reception alongside New York, the Gold Coast, the valley of ashes, Prohibition, organised crime, money, motoring, advertising, immigration, race and women’s lives in 1922.'
    ],
    editorial: [
      'The first-edition wording, spelling and punctuation are preserved. Notes explain historically specific details without replacing Fitzgerald’s text with modern equivalents.',
      'Chapter support separates narrative recap from contextual history, while introductory material traces composition, first reception, later revival and continuing reputation.'
    ],
    topics: [
      { title: 'Place and division', body: 'The Gold Coast, New York and the valley of ashes organise social distance as well as geography.' },
      { title: 'Money in 1922', body: 'Prices, brands, advertising, motoring and Prohibition give material form to the novel’s social world.' },
      { title: 'First reception and revival', body: 'The publication history follows the distance between the novel’s initial response and its later reputation.' }
    ]
  }),
  inCollection('modern', {
    slug: 'the-doves-nest-and-other-stories',
    title: 'The Doves’ Nest and Other Stories',
    author: 'Katherine Mansfield',
    image: "The Doves' Nest and Other Stories Main COver.png",
    purchaseUrl: 'https://mybook.to/qUG2t',
    label: 'Stories and fragments · 1923',
    deck: 'Six completed stories and four significant unfinished pieces from Mansfield’s posthumous 1923 collection are presented with notes on their status, publication and final context.',
    editionIncludes: [
      'Ten selected stories and fragments from the 1923 collection',
      'Original explanatory notes and historical context',
      'Biography, chronology and publication history',
      'A glossary and documented sources'
    ],
    facts: [
      { label: 'Ten works', text: 'The selection contains six complete stories and four unfinished pieces.' },
      { label: '1923', text: 'The original collection appeared shortly after Mansfield’s death.' },
      { label: 'Final writing', text: 'Several works were written during the last eighteen months of Mansfield’s life, while she was seriously ill with tuberculosis.' },
      { label: 'A selection', text: 'This edition contains ten of the original collection’s twenty-one items.' }
    ],
    overview: [
      'The Doves’ Nest and Other Stories appeared shortly after Katherine Mansfield’s death in 1923, bringing completed stories together with work she left unfinished.',
      'This edition contains all six completed stories from the original collection: The Doll’s House, Honeymoon, A Cup of Tea, Taking the Veil, The Fly and The Canary.',
      'It also includes four significant unfinished pieces: A Married Man’s Story, The Doves’ Nest, Six Years After and Weak Heart. Their fragmentary status is identified rather than concealed.',
      'The selection moves between New Zealand childhood, European domestic life, marriage, class, bereavement and illness, with context on Mansfield’s final years and John Middleton Murry’s assembly of the posthumous book.'
    ],
    editorial: [
      'The editorial material states which works Mansfield completed and which survive only as fragments. It does not present the ten-item selection as a complete reprint of the 1923 contents.',
      'Notes, chronology and publication history connect the stories to Wellington and Karori, domestic service, money, the First World War, Leslie Mansfield and contemporary treatment of tuberculosis.'
    ],
    topics: [
      { title: 'Completion and fragment', body: 'The volume preserves the formal difference between stories Mansfield finished and writing left incomplete at her death.' },
      { title: 'Childhood and class', body: 'New Zealand settings and domestic service bring social division into closely observed rooms and encounters.' },
      { title: 'A posthumous book', body: 'Murry’s role as husband and literary executor is part of the history through which these works reached readers.' }
    ]
  }),
  inCollection('victorian', {
    slug: 'the-chimes',
    title: 'The Chimes',
    author: 'Charles Dickens',
    image: 'The Chimes Main Cover.png',
    purchaseUrl: 'https://mybook.to/7iJP',
    label: 'Christmas book · 1844',
    deck: 'Dickens’s supernatural Christmas story follows Trotty Veck as respectable arguments about poverty teach him to despise his own class, before the bells show where those beliefs can lead.',
    editionIncludes: [
      'Original explanatory notes throughout',
      'Chapter summaries and historical context',
      'Character, theme and critical commentary',
      'Glossary, chronology and bibliography'
    ],
    facts: [
      { label: '16 December 1844', text: 'The Chimes was first published on this date.' },
      { label: 'Second Christmas book', text: 'It followed A Christmas Carol.' },
      { label: 'Four quarters', text: 'Dickens’s own divisions take their names from a clock’s quarter chimes.' },
      { label: 'Complete text', text: 'Spelling, punctuation, capitalisation and dialect forms are preserved.' }
    ],
    overview: [
      'Toby “Trotty” Veck is an elderly ticket-porter who waits for work outside a London church. Poor but good-natured, he begins to accept the claim that people like him are born bad.',
      'Mr Filer uses statistics against the poor, Alderman Cute proposes punishment as social policy and Sir Joseph Bowley presents dependence on wealthy patrons as benevolence. By nightfall, Trotty has lost faith in himself and his class.',
      'The bells call him into the church tower and show a possible future in which those arguments govern ordinary lives. Meg, Richard, Lilian and Will Fern bear the consequences.',
      'First published on 16 December 1844, The Chimes was Dickens’s second Christmas book. Its four divisions—First Quarter through Fourth Quarter—are Dickens’s own.'
    ],
    editorial: [
      'The complete story retains Dickens’s spelling, punctuation, capitalisation and dialect. Footnotes and chapter-end material explain the Poor Law, political economy, poverty, needlework, suicide law and reform debate.',
      'Longer supporting material follows the Genoa composition, four-part structure, characters, language, key passages, reception, theatrical adaptations and political arguments of the 1840s.'
    ],
    topics: [
      { title: 'Who defines poverty?', body: 'Statistics, law and paternal benevolence all claim authority over lives they do not adequately understand.' },
      { title: 'A possible future', body: 'The supernatural vision tests the social consequences of ideas Trotty has been taught to accept.' },
      { title: 'The quarters', body: 'Clock time gives the book its four-part structure and turns the chimes into an organising voice.' }
    ]
  }),
  inCollection('american', {
    slug: 'sleepy-hollow-and-other-stories',
    title: 'Sleepy Hollow and Other American Halloween Stories',
    author: 'Washington Irving, Edgar Allan Poe and others',
    image: 'Sleepy Hollow Main Cover.png',
    purchaseUrl: 'https://mybook.to/mlEu80z',
    label: 'Annotated collection · twelve stories',
    deck: 'Twelve complete American stories are placed back in their original settings and then followed into the later Halloween tradition that gathered ghosts, witches, haunted houses and black cats around October.',
    editionIncludes: [
      'Twelve complete classic American stories',
      'Original story notes and historical context',
      'A Halloween chronology and glossary',
      'Publication history and anachronism guides'
    ],
    facts: [
      { label: 'Twelve stories', text: 'The collection runs from Washington Irving to H. P. Lovecraft.' },
      { label: 'Not written for Halloween', text: 'The stories acquired their holiday associations after publication.' },
      { label: 'Seven writers', text: 'Irving, Hawthorne, Poe, Bierce, Gilman, Freeman and Lovecraft are represented.' },
      { label: 'A developing holiday', text: 'The introduction follows jack-o’-lanterns, commercial decoration and the emergence of trick-or-treating.' }
    ],
    overview: [
      'None of the twelve stories was originally written for Halloween. Their place in the holiday developed later as ghosts, witches, haunted houses, black cats and supernatural storytelling became part of American October.',
      'Washington Irving is represented by The Legend of Sleepy Hollow and The Devil and Tom Walker; Nathaniel Hawthorne by Young Goodman Brown and The Minister’s Black Veil.',
      'The collection also includes Poe’s The Fall of the House of Usher, The Black Cat and The Tell-Tale Heart; Bierce’s The Boarded Window and The Damned Thing; Gilman’s The Yellow Wall-Paper; Freeman’s The Shadows on the Wall; and Lovecraft’s The Outsider.',
      'Story notes return each work to its original publication setting, while the introduction and chronology explain how American Halloween customs developed during the nineteenth and early twentieth centuries.'
    ],
    editorial: [
      'Publication history and anachronism guides distinguish what belongs to each story’s first context from Halloween associations created later.',
      'The glossary, chronology and historical notes support the complete texts while documenting the holiday customs through which they entered an American Halloween canon.'
    ],
    topics: [
      { title: 'Stories before Halloween', body: 'The volume separates original literary purpose from the later seasonal tradition that adopted these works.' },
      { title: 'An American supernatural line', body: 'Seven writers show continuities and changes across a long history of American short fiction.' },
      { title: 'Making a holiday canon', body: 'Custom, publishing and repetition explain how certain images and stories became attached to October.' }
    ]
  }),
];

books.push(...remainingBooks);

module.exports = { books, hardbacks };
