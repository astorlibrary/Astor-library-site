// The find box on the list of study guides. Typing narrows the list to the
// books whose title or writer contains every word typed; Enter opens the guide
// when only one is left. With nothing matching, the box offers the whole-site
// search, which is also where the form goes when scripts do not run.

function fold(text) {
  return String(text || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’‘']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function start() {
  const form = document.querySelector('[data-guides-find]');
  if (!form) return;
  const input = form.querySelector('input');
  const status = form.querySelector('[data-guides-find-status]');
  const items = [...document.querySelectorAll('.guides-list li[data-find]')];
  // The set texts are listed again in their collections; while a search is
  // typed they step aside, so a book is found once.
  const setGroup = document.querySelector('[data-guides-set]');
  const groups = [...document.querySelectorAll('.guides-group')].filter(group => group !== setGroup);
  const text = new Map(items.map(item => [item, ' ' + fold(item.dataset.find) + ' ']));

  function shown() {
    return items.filter(item => !item.hidden);
  }

  function apply() {
    const words = fold(input.value).split(' ').filter(Boolean);
    for (const item of items) item.hidden = !words.every(word => text.get(item).includes(' ' + word) || (word.length > 3 && text.get(item).includes(word)));
    for (const group of groups) group.hidden = !group.querySelector('li[data-find]:not([hidden])');
    if (setGroup) setGroup.hidden = words.length > 0;
    status.textContent = '';
    if (!words.length) return;
    const count = shown().length;
    if (count) {
      status.append(count === 1 ? 'One guide. Press Enter to open it.' : count + ' guides.');
      return;
    }
    const link = document.createElement('a');
    link.href = '/explore/?q=' + encodeURIComponent(input.value.trim());
    link.textContent = 'Search the whole site for “' + input.value.trim() + '”';
    status.append('No guide has that title or writer. ', link, '.');
  }

  input.addEventListener('input', apply);
  form.addEventListener('submit', event => {
    const left = shown();
    if (!fold(input.value)) { event.preventDefault(); return; }
    if (left.length === 1) {
      event.preventDefault();
      window.location.href = left[0].querySelector('a').href;
    } else if (left.length > 1) {
      event.preventDefault();
      left[0].querySelector('a').focus();
    }
  });
  if (input.value) apply();
}

start();
