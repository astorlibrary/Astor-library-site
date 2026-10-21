// Astor Library: a watch over the study pages' start-up.
//
// The Revise pages are drawn by module scripts. If one cannot load or run (a
// blocked request, a browser without a feature the code uses) the page would
// sit empty, or on its "Finding your book…" line, with no word of what
// happened. This notes the first error and, if the page's mount is still empty
// once the page has loaded, says what went wrong and offers a fresh start. It is a
// classic script, loaded before the modules, so it runs even when they fail.
(function () {
  var problems = [];
  function note(text) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    // Cross-origin scripts (the analytics beacon) report only "Script error.".
    if (!text || /^Script error\.?$/i.test(text) || problems.length >= 3) return;
    problems.push(text.slice(0, 240));
  }
  window.addEventListener('error', function (event) {
    var target = event.target;
    if (target && target !== window && target.tagName) {
      if (target.tagName === 'SCRIPT' && target.src && target.src.indexOf(location.origin) === 0) {
        note('Could not load ' + target.src.slice(location.origin.length));
      }
      return;
    }
    note(event.message || (event.error && event.error.message));
  }, true);
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    note(reason && (reason.message || reason));
  });

  var MOUNTS = '#rv-hub, #astor-game, #astor-flashcards, #astor-essay-forge, #astor-defend, #astor-daily-game';
  // A mount that is still empty, or still holds only its loading line.
  function stuck() {
    var mount = document.querySelector(MOUNTS);
    if (!mount) return null;
    var children = mount.children;
    if (!children.length && !mount.textContent.trim()) return mount;
    if (children.length === 1 && children[0].classList.contains('rv-loading')) return mount;
    return null;
  }

  function check(last) {
    var waiting = stuck();
    if (!waiting) return;
    if (!problems.length && !last) { setTimeout(function () { check(true); }, 25000); return; }
    var box = document.createElement('div');
    box.className = 'rv-empty rx-load-failed';
    var message = document.createElement('p');
    message.textContent = problems.length ? 'This page didn’t start properly.' : 'This page is taking longer than usual to start.';
    box.appendChild(message);
    if (problems.length) {
      var why = document.createElement('p');
      why.className = 'rx-load-why';
      why.textContent = 'Reason: ' + problems[0];
      box.appendChild(why);
    }
    var again = document.createElement('button');
    again.type = 'button';
    again.className = 'rx-button is-primary';
    again.textContent = 'Try again';
    again.addEventListener('click', function () { location.reload(); });
    box.appendChild(again);
    while (waiting.firstChild) waiting.removeChild(waiting.firstChild);
    waiting.appendChild(box);
  }
  window.addEventListener('load', function () { setTimeout(function () { check(false); }, 2500); });
})();
