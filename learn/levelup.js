// Level up: the homepage card that links to the Learn section. It lives here, with the
// lessons, so everything Learn-related is in one folder. The homepage only has an empty
// <section id="learn"> for it to fill.
(() => {
  const root = document.getElementById('learn');
  if (!root) return;

  const lines = [
    "Bugs dodged. Now learn to write agents that don't make them.",
    'Your agent called. It wants better instructions.',
    'There are no governor limits on learning.',
    'From | to -> in about ten minutes.',
    '75% code coverage is the minimum. Aim higher.',
    'The hedgehog finished the lesson. Your turn.',
  ];

  root.innerHTML = `
    <div class="wrap">
      <div class="sec-head"><h2>Level up</h2></div>
      <a class="learn-card" href="learn/">
        <div class="learn-text">
          <span class="label">Learn · hands-on Salesforce lessons</span>
          <p class="learn-line" aria-live="polite"></p>
          <p class="learn-sub">Four short lessons on Salesforce AI: <b>Agent Script</b>, <b>Apex actions</b>, <b>prompt templates</b> and the <b>Trust Layer</b>. Read real code, click through it, and test yourself.</p>
        </div>
        <span class="btn primary learn-go">Go to Learn <span aria-hidden="true">→</span></span>
      </a>
    </div>`;

  // Rotate the headline. Stays on the first line for reduced-motion users.
  const el = root.querySelector('.learn-line');
  el.textContent = lines[0];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    el.classList.add('fade');
    setTimeout(() => { i = (i + 1) % lines.length; el.textContent = lines[i]; el.classList.remove('fade'); }, 350);
  }, 4000);
})();
