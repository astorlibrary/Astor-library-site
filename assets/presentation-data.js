// Add future exported-slide presentations here. The folder contains 1.png,
// 2.png, 3.png and so on; `folder` must end in a slash.
export const DEFAULT_PRESENTATION_PREVIEW_SLIDES = 3;

const presentationRecords = {
  'charles-dickens-christmas': {
    title: 'Charles Dickens and Christmas',
    folder: '/assets/presentations/charles-dickens-christmas/',
    backdrop: '/assets/presentation-backdrops/charles-dickens-christmas.webp',
    slideCount: 18
  },
  'antony-and-cleopatra': {
    title: 'Antony and Cleopatra: Key Themes & Critical Contexts',
    folder: '/assets/presentations/antony-and-cleopatra/',
    backdrop: '/assets/presentation-backdrops/antony-and-cleopatra.webp',
    slideCount: 13
  },
  'dorian-gray': {
    title: 'The Picture of Dorian Gray: An Introduction',
    folder: '/assets/presentations/dorian-gray/',
    backdrop: '/assets/presentation-backdrops/dorian-gray.webp',
    slideCount: 18
  },
  'dont-turn-back': {
    title: '“Don’t Turn Back”: Langston Hughes, MLK, and Barack Obama',
    folder: '/assets/presentations/dont-turn-back/',
    backdrop: '/assets/presentation-backdrops/dont-turn-back.webp',
    slideCount: 16
  },
  'dracula-overview': {
    title: 'Dracula by Bram Stoker: A Complete Overview',
    folder: '/assets/presentations/dracula-overview/',
    backdrop: '/assets/presentation-backdrops/dracula-overview.webp',
    slideCount: 18
  },
  'frankenstein': {
    title: 'Frankenstein: Study Guide',
    folder: '/assets/presentations/frankenstein/',
    backdrop: '/assets/presentation-backdrops/frankenstein.webp',
    slideCount: 22
  },
  'great-expectations': {
    title: 'A Guide to Great Expectations by Charles Dickens',
    folder: '/assets/presentations/great-expectations/',
    backdrop: '/assets/presentation-backdrops/great-expectations.webp',
    slideCount: 21
  },
  'ghost-stories': {
    title: 'Ghost Stories: A Window into Human Belief',
    folder: '/assets/presentations/ghost-stories/',
    backdrop: '/assets/presentation-backdrops/ghost-stories.webp',
    slideCount: 15
  },
  'great-gatsby-corruption-illusion': {
    title: 'The Great Gatsby: Corruption, Illusion & the American Dream',
    folder: '/assets/presentations/great-gatsby-corruption-illusion/',
    backdrop: '/assets/presentation-backdrops/great-gatsby-corruption-illusion.webp',
    slideCount: 9
  },
  'half-of-a-yellow-sun': {
    title: 'Half of a Yellow Sun: Diaspora, Nation and Exile',
    folder: '/assets/presentations/half-of-a-yellow-sun/',
    backdrop: '/assets/presentation-backdrops/half-of-a-yellow-sun.webp',
    slideCount: 14
  },
  'handmaids-tale': {
    title: 'The Handmaid’s Tale: Complete Guide',
    folder: '/assets/presentations/handmaids-tale/',
    backdrop: '/assets/presentation-backdrops/handmaids-tale.webp',
    slideCount: 18
  },
  'kite-runner': {
    title: 'The Kite Runner: Walkthrough',
    folder: '/assets/presentations/kite-runner/',
    backdrop: '/assets/presentation-backdrops/kite-runner.webp',
    slideCount: 58
  },
  'lost-voice-recovered': {
    title: 'A Lost Voice Recovered: Langston Hughes and the Chain Gang',
    folder: '/assets/presentations/lost-voice-recovered/',
    backdrop: '/assets/presentation-backdrops/lost-voice-recovered.webp',
    slideCount: 9
  },
  'literature-shaped-halloween': {
    title: 'How Literature Shaped Halloween',
    folder: '/assets/presentations/literature-shaped-halloween/',
    backdrop: '/assets/presentation-backdrops/literature-shaped-halloween.webp',
    slideCount: 10
  },
  'macbeth-quick-guide': {
    title: 'Macbeth: A Quick Study Guide',
    folder: '/assets/presentations/macbeth-quick-guide/',
    backdrop: '/assets/presentation-backdrops/macbeth-quick-guide.webp',
    slideCount: 10
  },
  'macbeth-summary-analysis': {
    title: 'Macbeth: Summary and Analysis',
    folder: '/assets/presentations/macbeth-summary-analysis/',
    backdrop: '/assets/presentation-backdrops/macbeth-summary-analysis.webp',
    slideCount: 20
  },
  'midsummer-nights-dream': {
    title: 'A Midsummer Night’s Dream: A Study Guide',
    folder: '/assets/presentations/midsummer-nights-dream/',
    backdrop: '/assets/presentation-backdrops/midsummer-nights-dream.webp',
    slideCount: 21
  },
  'moby-dick': {
    title: 'Moby-Dick: Study Guide',
    folder: '/assets/presentations/moby-dick/',
    backdrop: '/assets/presentation-backdrops/moby-dick.webp',
    slideCount: 16
  },
  'odyssey-homer-vs-nolan': {
    title: 'The Odyssey 2026: Homer vs. Nolan',
    folder: '/assets/presentations/odyssey-homer-vs-nolan/',
    backdrop: '/assets/presentation-backdrops/odyssey-homer-vs-nolan.webp',
    slideCount: 10
  },
  'pamelas-psyche': {
    title: 'Pamela’s Psyche',
    folder: '/assets/presentations/pamelas-psyche/',
    backdrop: '/assets/presentation-backdrops/pamelas-psyche.webp',
    slideCount: 20
  },
  'policing-and-community': {
    title: 'Policing and Community in Linton Kwesi Johnson’s Poetry',
    folder: '/assets/presentations/policing-and-community/',
    backdrop: '/assets/presentation-backdrops/policing-and-community.webp',
    slideCount: 16
  },
  'richard-ii': {
    title: 'Richard II: A Student Study Guide',
    folder: '/assets/presentations/richard-ii/',
    backdrop: '/assets/presentation-backdrops/richard-ii.webp',
    slideCount: 20
  },
  'romeo-and-juliet': {
    title: 'Romeo and Juliet: Summary Guide',
    folder: '/assets/presentations/romeo-and-juliet/',
    backdrop: '/assets/presentations/romeo-and-juliet/backdrop.webp',
    slideCount: 20
  },
  'shakespeares-tragedies': {
    title: 'Shakespeare’s Tragedies: An Overview',
    folder: '/assets/presentations/shakespeares-tragedies/',
    backdrop: '/assets/presentation-backdrops/shakespeares-tragedies.webp',
    slideCount: 21
  },
  'winters-tale': {
    title: 'The Winter’s Tale: A Complete Study Guide',
    folder: '/assets/presentations/winters-tale/',
    backdrop: '/assets/presentation-backdrops/winters-tale.webp',
    slideCount: 42
  },
  'victorian-christmas-traditions': {
    title: 'Victorian Christmas Traditions',
    folder: '/assets/presentations/victorian-christmas-traditions/',
    backdrop: '/assets/presentation-backdrops/victorian-christmas-traditions.webp',
    slideCount: 13
  },
  'biography-f-scott-fitzgerald': { title: 'Biography of F. Scott Fitzgerald', folder: '/assets/presentations/biography-f-scott-fitzgerald/', backdrop: '/assets/presentation-backdrops/fitzgerald-gatsby.jpg', slideCount: 16 },
  'great-gatsby-notes-critical-reading': { title: 'The Great Gatsby: Notes & Critical Reading', folder: '/assets/presentations/great-gatsby-notes-critical-reading/', backdrop: '/assets/presentation-backdrops/fitzgerald-gatsby.jpg', slideCount: 16 },
  'great-gatsby-character-study': { title: 'The Great Gatsby: Character Study Guide', folder: '/assets/presentations/great-gatsby-character-study/', backdrop: '/assets/presentation-backdrops/fitzgerald-gatsby.jpg', slideCount: 14 },
  'turning-point-great-gatsby': { title: 'Turning Point in The Great Gatsby', folder: '/assets/presentations/turning-point-great-gatsby/', backdrop: '/assets/presentation-backdrops/fitzgerald-gatsby.jpg', slideCount: 9 },
  'biography-harper-lee': { title: 'Biography of Harper Lee', folder: '/assets/presentations/biography-harper-lee/', backdrop: '/assets/presentation-backdrops/harper-lee-mockingbird.jpg', slideCount: 10 },
  'gatsby-corruption-symbolism-illusion': { title: 'Corruption, Symbolism & Illusion in The Great Gatsby', folder: '/assets/presentations/gatsby-corruption-symbolism-illusion/', backdrop: '/assets/presentation-backdrops/fitzgerald-gatsby.jpg', slideCount: 8 },
  'to-kill-a-mockingbird-characters': { title: 'To Kill a Mockingbird: Character List & Major Themes', folder: '/assets/presentations/to-kill-a-mockingbird-characters/', backdrop: '/assets/presentation-backdrops/harper-lee-mockingbird.jpg', slideCount: 21 },
  'gatsby-death-relationships': { title: 'Death of a Character & Important Relationships in The Great Gatsby', folder: '/assets/presentations/gatsby-death-relationships/', backdrop: '/assets/presentation-backdrops/fitzgerald-gatsby.jpg', slideCount: 9 },
  'gatsby-essay-plan': { title: 'Great Gatsby Essay Plan', folder: '/assets/presentations/gatsby-essay-plan/', backdrop: '/assets/presentation-backdrops/fitzgerald-gatsby.jpg', slideCount: 8 },
  'admiration-for-gatsby': { title: 'Admiration for Gatsby in The Great Gatsby', folder: '/assets/presentations/admiration-for-gatsby/', backdrop: '/assets/presentation-backdrops/fitzgerald-gatsby.jpg', slideCount: 9 },
  'things-we-admire-gatsby': { title: 'Things We Admire About Gatsby', folder: '/assets/presentations/things-we-admire-gatsby/', backdrop: '/assets/presentation-backdrops/fitzgerald-gatsby.jpg', slideCount: 11 },
  'great-gatsby-corruption-illusion-v2': { title: 'The Great Gatsby: Corruption, Illusion & the American Dream', folder: '/assets/presentations/great-gatsby-corruption-illusion-v2/', backdrop: '/assets/presentation-backdrops/fitzgerald-gatsby.jpg', slideCount: 9 },
  'wide-sargasso-sea-study-guide': { title: 'Wide Sargasso Sea: A Study Guide', folder: '/assets/presentations/wide-sargasso-sea-study-guide/', backdrop: '/assets/presentation-backdrops/wide-sargasso-sea.jpg', slideCount: 21 },
  'wide-sargasso-sea-part-3': { title: 'Wide Sargasso Sea — Part 3 Summary & Analysis', folder: '/assets/presentations/wide-sargasso-sea-part-3/', backdrop: '/assets/presentation-backdrops/wide-sargasso-sea.jpg', slideCount: 14 },
  'king-lear-summary-analysis': { title: 'King Lear: Summary Guide', folder: '/assets/presentations/king-lear-summary-analysis/', backdrop: '/assets/presentation-backdrops/king-lear.jpg', slideCount: 18 },
  'gender-power-omkara-maqbool': { title: 'Gender, Power & Shakespeare: Omkara and Maqbool', folder: '/assets/presentations/gender-power-omkara-maqbool/', backdrop: '/assets/presentation-backdrops/omkara-maqbool.jpg', slideCount: 12 },
  'pride-prejudice-key-quotes': { title: 'Pride and Prejudice: Key Quotes Revision', folder: '/assets/presentations/pride-prejudice-key-quotes/', backdrop: '/assets/presentation-backdrops/pride-prejudice.jpg', slideCount: 10 },
  'dracula-gender-roles': { title: 'Dracula: Gender Roles', folder: '/assets/presentations/dracula-gender-roles/', backdrop: '/assets/presentation-backdrops/dracula-gender.jpg', slideCount: 16 },
  'pope-lock-and-criticism': {
    title: 'Alexander Pope: The Rape of the Lock and An Essay on Criticism',
    folder: '/assets/presentations/pope-lock-and-criticism/',
    backdrop: '/assets/presentation-backdrops/pamelas-psyche.webp',
    slideCount: 17
  },
  'blackwood-the-willows': {
    title: 'Algernon Blackwood: The Willows (1907)',
    folder: '/assets/presentations/blackwood-the-willows/',
    backdrop: '/assets/presentation-backdrops/midsummer-nights-dream.webp',
    slideCount: 11
  },
  'arden-of-faversham-1592': {
    title: 'Arden of Faversham (1592)',
    folder: '/assets/presentations/arden-of-faversham-1592/',
    backdrop: '/assets/presentation-backdrops/shakespeares-tragedies.webp',
    slideCount: 15
  },
  'dracula-1897-origins': {
    title: 'Bram Stoker: Dracula (1897), Notes and Origins',
    folder: '/assets/presentations/dracula-1897-origins/',
    backdrop: '/assets/presentation-backdrops/dracula-overview.webp',
    slideCount: 13
  },
  'ancient-mariner-versions-and-gloss': {
    title: 'The Rime of the Ancient Mariner: Versions and Gloss',
    folder: '/assets/presentations/ancient-mariner-versions-and-gloss/',
    backdrop: '/assets/presentation-backdrops/moby-dick.webp',
    slideCount: 14
  },
  'gogol-overcoat-the-mantle': {
    title: 'Gogol: The Overcoat and The Mantle',
    folder: '/assets/presentations/gogol-overcoat-the-mantle/',
    backdrop: '/assets/presentation-backdrops/ghost-stories.webp',
    slideCount: 15
  },
  'hamlet-three-texts': {
    title: 'Hamlet: Three Texts',
    folder: '/assets/presentations/hamlet-three-texts/',
    backdrop: '/assets/presentation-backdrops/richard-ii.webp',
    slideCount: 11
  },
  'moby-dick-1851-publication': {
    title: 'Moby-Dick (1851): Publication and Revival',
    folder: '/assets/presentations/moby-dick-1851-publication/',
    backdrop: '/assets/presentation-backdrops/moby-dick.webp',
    slideCount: 13
  },
  'iliad-samuel-butler': {
    title: 'The Iliad in Samuel Butler’s Prose',
    folder: '/assets/presentations/iliad-samuel-butler/',
    backdrop: '/assets/presentation-backdrops/odyssey-homer-vs-nolan.webp',
    slideCount: 13
  },
  'white-fang-1906': {
    title: 'Jack London: White Fang (1906)',
    folder: '/assets/presentations/white-fang-1906/',
    backdrop: '/assets/presentation-backdrops/frankenstein.webp',
    slideCount: 10
  },
  'paradise-lost-publication-and-form': {
    title: 'Paradise Lost: Publication and Form',
    folder: '/assets/presentations/paradise-lost-publication-and-form/',
    backdrop: '/assets/presentation-backdrops/ghost-stories.webp',
    slideCount: 13
  },
  'duchess-of-malfi-1623': {
    title: 'The Duchess of Malfi (1623): Print and Performance',
    folder: '/assets/presentations/duchess-of-malfi-1623/',
    backdrop: '/assets/presentation-backdrops/dorian-gray.webp',
    slideCount: 14
  },
  'king-lear-two-texts': {
    title: 'King Lear: Two Plays, One Title',
    folder: '/assets/presentations/king-lear-two-texts/',
    backdrop: '/assets/presentation-backdrops/king-lear.jpg',
    slideCount: 13
  },
  'macbeth-folio-and-middleton': {
    title: 'Macbeth: The Folio Text and Middleton’s Hand',
    folder: '/assets/presentations/macbeth-folio-and-middleton/',
    backdrop: '/assets/presentation-backdrops/macbeth-quick-guide.webp',
    slideCount: 10
  },
  'puddnhead-wilson-1894': {
    title: 'Mark Twain: Pudd’nhead Wilson (1894)',
    folder: '/assets/presentations/puddnhead-wilson-1894/',
    backdrop: '/assets/presentation-backdrops/harper-lee-mockingbird.jpg',
    slideCount: 13
  },
  'othello-two-texts': {
    title: 'Othello: Two Texts and the Words the Law Removed',
    folder: '/assets/presentations/othello-two-texts/',
    backdrop: '/assets/presentation-backdrops/richard-ii.webp',
    slideCount: 9
  },
  'sir-thomas-more-manuscript': {
    title: 'Sir Thomas More: The Censored Manuscript',
    folder: '/assets/presentations/sir-thomas-more-manuscript/',
    backdrop: '/assets/presentation-backdrops/shakespeares-tragedies.webp',
    slideCount: 13
  },
  'moonstone-1868': {
    title: 'Wilkie Collins: The Moonstone (1868)',
    folder: '/assets/presentations/moonstone-1868/',
    backdrop: '/assets/presentation-backdrops/dorian-gray.webp',
    slideCount: 14
  }
};

export const presentations = Object.freeze(Object.fromEntries(
  Object.entries(presentationRecords).map(([slug, presentation]) => [
    slug,
    Object.freeze({
      ...presentation,
      slug,
      previewSlides: presentation.previewSlides ?? DEFAULT_PRESENTATION_PREVIEW_SLIDES
    })
  ])
));

export function getPresentation(slug) {
  return typeof slug === 'string' ? presentations[slug] || null : null;
}
