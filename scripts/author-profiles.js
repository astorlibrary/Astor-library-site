module.exports = [
  {
    name: 'Arthur Conan Doyle',
    href: '/authors/arthur-conan-doyle/',
    birthDate: '1859-05-22',
    deathDate: '1930-07-07',
    description: 'Arthur Conan Doyle (1859–1930) was a doctor in Southsea, waiting for patients, when he wrote the first Sherlock Holmes novel, A Study in Scarlet (1887).'
  },
  {
    name: 'Bram Stoker',
    href: '/authors/bram-stoker/',
    birthDate: '1847-11-08',
    deathDate: '1912-04-20',
    description: 'Bram Stoker (1847–1912) was a Dublin civil servant, then business manager of Henry Irving’s Lyceum Theatre in London, a job he held while writing Dracula (1897).'
  },
  {
    name: 'Charles Dickens',
    href: '/authors/charles-dickens/',
    birthDate: '1812-02-07',
    deathDate: '1870-06-09',
    description: 'Charles Dickens (1812–1870) was sent to work in a blacking warehouse at twelve and became the most popular novelist of his age.'
  },
  {
    name: 'Christopher Marlowe',
    href: '/authors/christopher-marlowe/',
    birthDate: '1564',
    deathDate: '1593-05-30',
    description: 'Christopher Marlowe (1564–1593), a Canterbury shoemaker’s son and Cambridge scholar, wrote Tamburlaine and Doctor Faustus and was killed at Deptford at twenty-nine.'
  },
  {
    name: 'Frederick Douglass',
    href: '/authors/frederick-douglass/',
    birthDate: '1818',
    deathDate: '1895-02-20',
    description: 'Frederick Douglass (1818–1895) escaped from slavery in Maryland in 1838 and published his Narrative in 1845, while he was still legally a fugitive.'
  },
  {
    name: 'George Orwell',
    href: '/authors/george-orwell/',
    birthDate: '1903-06-25',
    deathDate: '1950-01-21',
    description: 'George Orwell (1903–1950), born Eric Blair in India, fought in the Spanish Civil War and wrote Animal Farm (1945), a fable of the Russian Revolution.'
  },
  {
    name: 'H. G. Wells',
    href: '/authors/h-g-wells/',
    birthDate: '1866-09-21',
    deathDate: '1946-08-13',
    description: 'H. G. Wells (1866–1946), a draper’s apprentice who studied biology under T. H. Huxley, set The War of the Worlds (1898) in the Surrey towns he knew.'
  },
  {
    name: 'Harriet Beecher Stowe',
    href: '/authors/harriet-beecher-stowe/',
    birthDate: '1811-06-14',
    deathDate: '1896-07-01',
    description: 'Harriet Beecher Stowe (1811–1896), a Connecticut minister’s daughter, wrote Uncle Tom’s Cabin (1852) in answer to the Fugitive Slave Act of 1850.'
  },
  {
    name: 'Herman Melville',
    href: '/authors/herman-melville/',
    birthDate: '1819-08-01',
    deathDate: '1891-09-28',
    description: 'Herman Melville (1819–1891) sailed on a whaler in 1841, deserted in the Marquesas, and drew on the voyage for Moby-Dick (1851).'
  },
  {
    name: 'Jane Austen',
    href: '/authors/jane-austen/',
    birthDate: '1775-12-16',
    deathDate: '1817-07-18',
    description: 'Jane Austen (1775–1817), a Hampshire rector’s daughter, published four novels anonymously in her lifetime, among them Sense and Sensibility and Pride and Prejudice.'
  },
  {
    name: 'John Milton',
    href: '/authors/john-milton/',
    birthDate: '1608-12-09',
    deathDate: '1674-11-08',
    description: 'John Milton (1608–1674) defended the execution of Charles I, went blind in the early 1650s and dictated Paradise Lost, published in 1667.'
  },
  {
    name: 'John Webster',
    href: '/authors/john-webster/',
    birthDate: '1580',
    deathDate: '1634',
    description: 'John Webster (c.1580–c.1634), a London coachmaker’s son, wrote The Duchess of Malfi, first staged about 1613 and printed in 1623.'
  },
  {
    name: 'Mark Twain',
    href: '/authors/mark-twain/',
    birthDate: '1835-11-30',
    deathDate: '1910-04-21',
    description: 'Mark Twain (1835–1910), Samuel Clemens of Hannibal, Missouri, was a Mississippi river pilot before he was a writer; Astor publishes four of his novels.'
  },
  {
    name: 'Mary Shelley',
    href: '/authors/mary-shelley/',
    birthDate: '1797-08-30',
    deathDate: '1851-02-01',
    description: 'Mary Shelley (1797–1851), daughter of Mary Wollstonecraft and William Godwin, began Frankenstein at the Villa Diodati in 1816, when she was eighteen.'
  },
  {
    name: 'Nathaniel Hawthorne',
    href: '/authors/nathaniel-hawthorne/',
    birthDate: '1804-07-04',
    deathDate: '1864-05-19',
    description: 'Nathaniel Hawthorne (1804–1864), born in Salem and descended from one of its witch-trial judges, published The Scarlet Letter in 1850.'
  },
  {
    name: 'Oscar Wilde',
    href: '/authors/oscar-wilde/',
    birthDate: '1854-10-16',
    deathDate: '1900-11-30',
    description: 'Oscar Wilde (1854–1900), the Dublin-born wit, published The Picture of Dorian Gray in 1890 and saw The Importance of Being Earnest open in 1895.'
  },
  {
    name: 'Robert Louis Stevenson',
    href: '/authors/robert-louis-stevenson/',
    birthDate: '1850-11-13',
    deathDate: '1894-12-03',
    description: 'Robert Louis Stevenson (1850–1894), the son of an Edinburgh lighthouse engineer, wrote Strange Case of Dr Jekyll and Mr Hyde (1886) and died in Samoa.'
  },
  {
    name: 'Thomas Hardy',
    href: '/authors/thomas-hardy/',
    birthDate: '1840-06-02',
    deathDate: '1928-01-11',
    description: 'Thomas Hardy (1840–1928), a Dorset stonemason’s son and trained architect, published Tess of the d’Urbervilles in 1891 and later gave up novels for poetry.'
  },
  {
    name: 'William Shakespeare',
    href: '/shakespeare/',
    birthDate: '1564',
    deathDate: '1616-04-23',
    description: 'Shakespeare’s plays, Sonnets and narrative poems in Astor editions, with the standard, expanded scholarly and specialist editions listed separately.'
  }
];

// Catalogue profiles identify writers and link every represented work. They use
// the shared catalogue layout rather than pretending to be full biographies.
module.exports.push(
  { name: 'Henry James', href: '/authors/henry-james/', birthDate: '1843', deathDate: '1916', profileType: 'catalogue', description: 'Henry James (1843–1916), the New York-born novelist who settled in London, published The Turn of the Screw in 1898.' },
  { name: 'Henrik Ibsen', href: '/authors/henrik-ibsen/', birthDate: '1828', deathDate: '1906', profileType: 'catalogue', description: 'Henrik Ibsen (1828–1906) wrote A Doll’s House (1879) in Italy, during twenty-seven years away from Norway; Astor uses R. Farquharson Sharp’s translation.' },
  { name: 'L. M. Montgomery', href: '/authors/l-m-montgomery/', birthDate: '1874', deathDate: '1942', profileType: 'catalogue', description: 'L. M. Montgomery (1874–1942) grew up in Cavendish, Prince Edward Island, the model for Avonlea in Anne of Green Gables (1908); The Blue Castle followed in 1926.' },
  { name: 'William Hope Hodgson', href: '/authors/william-hope-hodgson/', birthDate: '1877', deathDate: '1918', profileType: 'catalogue', description: 'William Hope Hodgson (1877–1918), sailor, physical-culture teacher and ghost-story writer, created the occult detective Carnacki and was killed at Ypres in 1918.' },
  { name: 'Samuel Taylor Coleridge', href: '/authors/samuel-taylor-coleridge/', birthDate: '1772', deathDate: '1834', profileType: 'catalogue', description: 'Samuel Taylor Coleridge (1772–1834) wrote The Rime of the Ancient Mariner for Lyrical Ballads (1798), the book he made with Wordsworth.' },
  { name: 'William Wordsworth', href: '/authors/william-wordsworth/', birthDate: '1770', deathDate: '1850', profileType: 'catalogue', description: 'William Wordsworth (1770–1850) wrote most of Lyrical Ballads (1798), the book he made with Coleridge, and the Preface of 1800 that explained it.' },
  { name: 'M. R. James', href: '/authors/m-r-james/', birthDate: '1862', deathDate: '1936', profileType: 'catalogue', description: 'M. R. James (1862–1936), medieval scholar and Provost of Eton, wrote his ghost stories to read aloud to friends at Christmas.' },
  { name: 'Edgar Allan Poe', href: '/authors/edgar-allan-poe/', birthDate: '1809', deathDate: '1849', profileType: 'catalogue', description: 'Edgar Allan Poe (1809–1849), orphaned at two and dead at forty, wrote the first detective story and some of the best-known tales of terror in English.' },
  { name: 'T. E. Lawrence', href: '/authors/t-e-lawrence/', birthDate: '1888', deathDate: '1935', profileType: 'catalogue', description: 'T. E. Lawrence (1888–1935), the archaeologist who fought with the Arab Revolt, printed Seven Pillars of Wisdom privately for subscribers in 1926.' },
  { name: 'Kate Chopin', href: '/authors/kate-chopin/', birthDate: '1850', deathDate: '1904', profileType: 'catalogue', description: 'Kate Chopin (1850–1904), a St Louis widow who began writing at the end of her thirties, published The Awakening in 1899 to hostile reviews.' },
  { name: 'George Grossmith', href: '/authors/george-grossmith/', birthDate: '1847', deathDate: '1912', profileType: 'catalogue', description: 'George Grossmith (1847–1912), the comic star of Gilbert and Sullivan’s Savoy operas, wrote The Diary of a Nobody with his brother Weedon.' },
  { name: 'Weedon Grossmith', href: '/authors/weedon-grossmith/', birthDate: '1854', deathDate: '1919', profileType: 'catalogue', description: 'Weedon Grossmith (1854–1919), painter and comic actor, wrote The Diary of a Nobody with his brother George and drew its illustrations.' },
  { name: 'Jack London', href: '/authors/jack-london/', birthDate: '1876', deathDate: '1916', profileType: 'catalogue', description: 'Jack London (1876–1916) joined the Klondike gold rush in 1897 and wrote The Call of the Wild and White Fang out of what he saw there.' },
  { name: 'Wilkie Collins', href: '/authors/wilkie-collins/', birthDate: '1824', deathDate: '1889', profileType: 'catalogue', description: 'Wilkie Collins (1824–1889), Dickens’s friend and collaborator, wrote The Woman in White (1860) and The Moonstone (1868).' },
  { name: 'Stephen Crane', href: '/authors/stephen-crane/', birthDate: '1871', deathDate: '1900', profileType: 'catalogue', description: 'Stephen Crane (1871–1900) wrote The Red Badge of Courage before he had seen a battle, and survived the shipwreck behind “The Open Boat”.' },
  { name: 'E. Nesbit', href: '/authors/e-nesbit/', birthDate: '1858', deathDate: '1924', profileType: 'catalogue', description: 'E. Nesbit (1858–1924), one of the founders of the Fabian Society, wrote The Railway Children (1906) and ghost stories for adults.' },
  { name: 'Algernon Blackwood', href: '/authors/algernon-blackwood/', birthDate: '1869', deathDate: '1951', profileType: 'catalogue', description: 'Algernon Blackwood (1869–1951) drew The Willows from a canoe trip down the Danube and The Wendigo from hunting trips in the Canadian woods.' },
  { name: 'Jerome K. Jerome', href: '/authors/jerome-k-jerome/', birthDate: '1859', deathDate: '1927', profileType: 'catalogue', description: 'Jerome K. Jerome (1859–1927), a former railway clerk and actor, wrote Three Men in a Boat (1889) from his own trips on the Thames.' }
);


// New book pages keep their writers discoverable without adding biographies.
module.exports.push(
  { name: 'Fyodor Dostoevsky', href: '/authors/fyodor-dostoevsky/', birthDate: '1821', deathDate: '1881', profileType: 'catalogue', description: 'Fyodor Dostoevsky (1821–1881) survived a mock execution and Siberian hard labour; Astor publishes three of his works in Constance Garnett’s translations.' },
  { name: 'Sheridan Le Fanu', href: '/authors/sheridan-le-fanu/', birthDate: '1814', deathDate: '1873', profileType: 'catalogue', description: 'Sheridan Le Fanu (1814–1873), the Dublin editor and recluse, published the vampire story Carmilla in 1872, twenty-five years before Dracula.' },
  { name: 'Thomas Paine', href: '/authors/thomas-paine/', birthDate: '1737', deathDate: '1809', profileType: 'catalogue', description: 'Thomas Paine (1737–1809), a former excise officer from Norfolk, wrote Common Sense (1776), the pamphlet that made the case for American independence.' },
  { name: 'Leo Tolstoy', href: '/authors/leo-tolstoy/', birthDate: '1828', deathDate: '1910', profileType: 'catalogue', description: 'Leo Tolstoy (1828–1910) wrote The Death of Ivan Ilyich (1886) after the religious crisis that followed War and Peace and Anna Karenina.' },
  { name: 'E. F. Benson', href: '/authors/e-f-benson/', birthDate: '1867', deathDate: '1940', profileType: 'catalogue', description: 'E. F. Benson (1867–1940), the archbishop’s son best known for Mapp and Lucia, wrote ghost stories throughout his long career.' },
  { name: 'Joseph Conrad', href: '/authors/joseph-conrad/', birthDate: '1857', deathDate: '1924', profileType: 'catalogue', description: 'Joseph Conrad (1857–1924), a Polish-born master mariner who wrote in his third language, took Heart of Darkness from his own voyage up the Congo.' },
  { name: 'Alexander Pope', href: '/authors/alexander-pope/', birthDate: '1688', deathDate: '1744', profileType: 'catalogue', description: 'Alexander Pope (1688–1744), barred as a Catholic from university and public life, made his name with An Essay on Criticism and The Rape of the Lock.' },
  { name: 'Nikolai Gogol', href: '/authors/nikolai-gogol/', birthDate: '1809', deathDate: '1852', profileType: 'catalogue', description: 'Nikolai Gogol (1809–1852), the Ukrainian-born satirist of St Petersburg’s clerks, published “The Overcoat” in 1842.' },
  { name: 'William Blake', href: '/authors/william-blake/', birthDate: '1757', deathDate: '1827', profileType: 'catalogue', description: 'William Blake (1757–1827), engraver, poet and painter, printed and hand-coloured Songs of Innocence and of Experience himself.' }
);


// Explicit memberships avoid splitting a personal name or treating a translator,
// an uncertain attribution or the words “and others” as another author.
module.exports.bookContributors = {
  '/books/lyrical-ballads/': ['William Wordsworth', 'Samuel Taylor Coleridge'],
  '/books/the-diary-of-a-nobody/': ['George Grossmith', 'Weedon Grossmith'],
  '/books/american-christmas-stories/': ['Bret Harte', 'Kate Douglas Wiggin', 'William Dean Howells', 'Willa Cather', 'Paul Laurence Dunbar', 'L. Frank Baum', 'Owen Wister', 'O. Henry', 'Clement Clarke Moore'],
  '/books/american-ghost-stories/': ['F. Marion Crawford', 'Ambrose Bierce', 'Ellen Glasgow', 'Elia Wilkinson Peattie', 'Emma Frances Dawson', 'Mary E. Wilkins Freeman', 'Edward Lucas White', 'Edith Wharton', 'Madeline Yale Wynne', 'Olivia Howard Dunbar'],
  '/books/sleepy-hollow-and-other-stories/': ['Washington Irving', 'Nathaniel Hawthorne', 'Edgar Allan Poe', 'Ambrose Bierce', 'Charlotte Perkins Gilman', 'Mary E. Wilkins Freeman', 'H. P. Lovecraft'],
  '/books/victorian-ghost-stories/': ['Elizabeth Gaskell', 'Edward Bulwer-Lytton', 'Mary Elizabeth Braddon', 'Amelia B. Edwards', 'Charles Dickens', 'Margaret Oliphant', 'E. Nesbit', 'Bram Stoker', 'Thomas Hood', 'Dante Gabriel Rossetti', 'Christina Rossetti']
};
module.exports.contributorNotes = {
  '/books/american-christmas-stories/': { 'Clement Clarke Moore': 'Includes A Visit from St. Nicholas, attributed to Clement Clarke Moore.' }
};
module.exports.authorNamesForBook = function authorNamesForBook(book) {
  return module.exports.bookContributors[book.href] || [book.author || book.authorText];
};
