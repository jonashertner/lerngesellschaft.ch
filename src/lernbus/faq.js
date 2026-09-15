// Include every answer in print, then restore the reader's chosen open state.
const questions = [...document.querySelectorAll('.faq-item')];
let closedBeforePrint = null;
window.addEventListener('beforeprint', () => {
  if (closedBeforePrint !== null) return;
  closedBeforePrint = questions.filter(question => !question.open);
  closedBeforePrint.forEach(question => { question.open = true; });
});
window.addEventListener('afterprint', () => {
  closedBeforePrint?.forEach(question => { question.open = false; });
  closedBeforePrint = null;
});
