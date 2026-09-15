(() => {
  const video = document.querySelector('.hero-video');
  const button = document.querySelector('.film-toggle');
  if (!video || !button) return;

  const label = button.querySelector('.film-toggle-label');
  const icon = button.querySelector('.film-toggle-icon');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let requested = false;
  let attempt = 0;

  function render(state) {
    video.classList.toggle('is-playing', state === 'playing');
    label.textContent = button.dataset[`${state === 'playing' ? 'pause' : state === 'pending' ? 'pending' : 'play'}Label`];
    icon.textContent = state === 'paused' ? '▶' : 'Ⅱ';
  }

  function showStill() {
    requested = false;
    attempt += 1;
    video.pause();
    render('paused');
  }

  async function play() {
    requested = true;
    const currentAttempt = ++attempt;
    render('pending');
    try {
      await video.play();
      // A pause or motion-preference change may arrive while play() is pending.
      if (!requested) video.pause();
    } catch {
      if (currentAttempt === attempt) showStill();
    }
  }

  video.addEventListener('playing', () => {
    if (requested) render('playing');
    else showStill();
  });
  video.addEventListener('pause', () => {
    // A queued pause event can arrive after the visitor has already restarted.
    if (!video.paused) return;
    requested = false;
    attempt += 1;
    render('paused');
  });
  video.addEventListener('error', showStill);
  button.addEventListener('click', () => requested ? showStill() : play());
  reducedMotion.addEventListener('change', event => {
    if (event.matches) showStill();
  });

  render('paused');
  button.hidden = false;
  if (!reducedMotion.matches) play();
})();
