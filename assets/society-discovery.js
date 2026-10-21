(() => {
  const button = document.querySelector('#next-question');
  const heading = document.querySelector('#curiosity-question');
  const data = document.querySelector('#curiosity-questions');
  if (!button || !heading || !data) return;
  let questions;
  try { questions = JSON.parse(data.textContent); } catch { return; }
  if (!Array.isArray(questions) || questions.length < 2 || questions.some(q => typeof q !== 'string')) return;
  let index = 0;
  button.hidden = false;
  button.addEventListener('click', () => {
    index = (index + 1) % questions.length;
    // Strings are authored in the local build; no user or remote HTML is accepted.
    heading.innerHTML = questions[index];
    button.closest('section').dataset.question = String(index);
  });
})();

// Content remains visible without scripting. Animate each section only once.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      if (!document.documentElement.classList.contains('motion-paused')) entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.14 });
  document.querySelectorAll('.idea-grid,.programmes-heading,.featured-programme,.future-programme,.association-grid').forEach(el => observer.observe(el));
})();
