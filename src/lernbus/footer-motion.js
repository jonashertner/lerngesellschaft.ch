(() => {
  const scene = document.querySelector('.footer-landscape');
  if (!scene || !('IntersectionObserver' in window)) return;
  const motion = matchMedia('(min-width: 64rem) and (prefers-reduced-motion: no-preference)');
  const original = scene.querySelector('picture img');
  const template = scene.querySelector('.footer-motion-template');
  if (!original || !template) return;

  let started = false;
  let preparing = false;
  let layer;
  let deadline;
  let cancelLoad;
  const stop = () => {
    cancelLoad?.();
    scene.classList.remove('is-moving');
    layer?.remove();
    layer = undefined;
    clearTimeout(deadline);
  };
  const observer = new IntersectionObserver(async entries => {
    if (started || preparing || !motion.matches || document.hidden ||
        !entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .7)) return;
    preparing = true;
    try {
      await original.decode();
      if (!motion.matches || document.hidden) return;
      const bounds = scene.getBoundingClientRect();
      if (bounds.top >= innerHeight || bounds.bottom <= 0) return;
      layer = template.content.firstElementChild.cloneNode(true);
      const artwork = layer.querySelector('image');
      const loaded = new Promise((resolve, reject) => {
        const finish = callback => {
          clearTimeout(timeout);
          artwork.removeEventListener('load', onLoad);
          artwork.removeEventListener('error', onError);
          cancelLoad = undefined;
          callback();
        };
        const onLoad = () => finish(resolve);
        const onError = () => finish(reject);
        cancelLoad = onError;
        const timeout = setTimeout(onError, 3000);
        artwork.addEventListener('load', onLoad, { once: true });
        artwork.addEventListener('error', onError, { once: true });
      });
      artwork.setAttribute('href', original.currentSrc || original.src);
      scene.append(layer);
      await loaded;
      const visible = scene.getBoundingClientRect();
      if (!motion.matches || document.hidden || !layer || visible.top >= innerHeight || visible.bottom <= 0) { stop(); return; }
      started = true;
      observer.disconnect();
      layer.querySelector('.footer-child').addEventListener('animationend', stop, { once: true });
      scene.classList.add('is-moving');
      deadline = setTimeout(stop, 4500);
    } catch {
      stop(); // Keep the complete still illustration if enhancement is unavailable.
    } finally {
      preparing = false;
    }
  }, { threshold: .7 });
  observer.observe(scene);
  motion.addEventListener('change', () => {
    if (!motion.matches) stop();
    else if (!started) { observer.unobserve(scene); observer.observe(scene); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (!started) { observer.unobserve(scene); observer.observe(scene); }
  });
})();
