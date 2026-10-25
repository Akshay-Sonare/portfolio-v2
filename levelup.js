// Rotate playful lines on the Learn card. Stays on the first line for reduced-motion users.
(() => {
  const el = document.getElementById('learn-line');
  const lines = [
    "Bugs dodged. Now learn to write agents that don't make them.",
    'Your agent called. It wants better instructions.',
    'There are no governor limits on learning.',
    'From | to -> in about ten minutes.',
    '75% code coverage is the minimum. Aim higher.',
    'The hedgehog finished the lesson. Your turn.',
  ];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    el.classList.add('fade');
    setTimeout(() => { i = (i + 1) % lines.length; el.textContent = lines[i]; el.classList.remove('fade'); }, 350);
  }, 4000);
})();
