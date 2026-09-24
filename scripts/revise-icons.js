// Line drawings for the Revise pages, one per quiz and tool, drawn in the same
// 24x24 box and stroke weight as the book motifs in book-motifs.js. The build
// copies them into assets/revise-index.json so the browser reads one file.

module.exports = {
  'who-said-it': "<path d='M4.5 5.5h15a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H10l-4.2 3.4v-3.4H4.5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z'/><path d='M8.6 9.2c-.9.3-1.4 1-1.4 1.9v1.4h1.9v-1.8H7.6'/><path d='M13.4 9.2c-.9.3-1.4 1-1.4 1.9v1.4h1.9v-1.8h-1.5'/>",
  'fill-the-line': "<path d='M3.5 8h7'/><path d='M3.5 12.5h3.2'/><path d='M13.8 12.5h6.7'/><path d='M3.5 17h12'/><rect x='7.9' y='10.4' width='4.7' height='4.2' rx='.4'/><path d='M13.8 8h6.7'/>",
  'theme-match': "<circle cx='7' cy='7.5' r='2.6'/><circle cx='17' cy='16.5' r='2.6'/><path d='M9.2 9.1c2.4 1.6 3.6 3.2 5.6 5.8'/><circle cx='17' cy='7.5' r='1.2'/><circle cx='7' cy='16.5' r='1.2'/>",
  'technique-spotter': "<circle cx='10.3' cy='10.3' r='5.6'/><path d='m14.4 14.4 5.4 5.4'/><path d='M7.6 11.1c.7-1.5 1.6-1.5 2.3 0s1.6 1.5 2.3 0'/>",
  'character-identification': "<circle cx='12' cy='8.2' r='3.9'/><path d='M4.8 20.2c.6-4.1 3.5-6.7 7.2-6.7s6.6 2.6 7.2 6.7'/>",
  'order-the-plot': "<path d='M9.5 6.5h10.5'/><path d='M9.5 12h10.5'/><path d='M9.5 17.5h10.5'/><path d='M4.4 5.4 5.6 5v3.2'/><path d='M4.3 11c.4-.5 1.9-.6 1.9.4 0 .8-1.9 1.4-1.9 2.4h2'/><path d='M4.4 16.1c.5-.4 1.8-.4 1.8.4 0 .5-.5.7-1 .7.6 0 1.1.3 1.1.9 0 .9-1.5 1-2 .5'/>",
  'mixed-round': "<path d='M4 7.5h3.3c2.4 0 3.6 1.2 4.7 3.2l1.3 2.4c1.1 2 2.3 3.4 4.7 3.4H20'/><path d='M4 16.5h3.3c1.6 0 2.7-.6 3.5-1.7'/><path d='M13.2 9.2c.8-1.1 1.9-1.7 3.5-1.7H20'/><path d='m17.8 5.3 2.2 2.2-2.2 2.2'/><path d='m17.8 14.3 2.2 2.2-2.2 2.2'/>",
  'which-book': "<path d='M12 6.8c-1.9-1.3-4.6-1.8-7.8-1.5v12.4c3.2-.3 5.9.2 7.8 1.5'/><path d='M12 6.8c1.9-1.3 4.6-1.8 7.8-1.5v12.4c-3.2-.3-5.9.2-7.8 1.5'/><path d='M12 6.8v12.4'/>",
  'context-sprint': "<path d='M7.2 3.8h9.6'/><path d='M7.2 20.2h9.6'/><path d='M8.3 3.8c0 3.6 3.7 4.9 3.7 8.2s-3.7 4.6-3.7 8.2'/><path d='M15.7 3.8c0 3.6-3.7 4.9-3.7 8.2s3.7 4.6 3.7 8.2'/><path d='M9.6 18.3c.9-1.2 1.5-1.6 2.4-1.6s1.5.4 2.4 1.6'/>",
  'opening-lines': "<path d='M5.2 8.2c-.9.3-1.5 1.1-1.5 2v1.6h2.1V9.8H4.2'/><path d='M10 8.2c-.9.3-1.5 1.1-1.5 2v1.6h2.1V9.8H9'/><path d='M13.4 10.8h7'/><path d='M3.7 15.8h16.7'/><path d='M3.7 19.4h10.8'/>",
  'flashcards': "<rect x='3.5' y='7.2' width='13' height='12.3' rx='1'/><path d='M7.5 7.2V5.5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v10.3a1 1 0 0 1-1 1h-3'/><path d='M6.6 11.6h6.8'/><path d='M6.6 14.8h4.6'/>",
  'essay-forge': "<path d='M9.5 4.5h7.8'/><path d='M13.6 4.5v15'/><path d='M17.1 4.5v15'/><path d='M13.6 4.5H9.9a3.6 3.6 0 0 0 0 7.2h3.7'/>",
  'defend-the-reading': "<path d='M12 4.2v15.6'/><path d='M8.2 19.8h7.6'/><path d='M4.6 7.3h14.8'/><path d='M12 5.8 4.6 7.3'/><path d='m6.2 7.3-2.6 6c.4 1.1 1.4 1.7 2.6 1.7s2.2-.6 2.6-1.7Z'/><path d='m17.8 7.3-2.6 6c.4 1.1 1.4 1.7 2.6 1.7s2.2-.6 2.6-1.7Z'/>",
  'today': "<circle cx='12' cy='12' r='3.6'/><path d='M12 3.4v2.2M12 18.4v2.2M3.4 12h2.2M18.4 12h2.2M5.9 5.9l1.6 1.6M16.5 16.5l1.6 1.6M5.9 18.1l1.6-1.6M16.5 7.5l1.6-1.6'/>"
};
