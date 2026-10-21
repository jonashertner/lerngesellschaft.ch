// Print the complete information, then restore the reader's chosen open state.
const disclosures = [...document.querySelectorAll('.faq-item, .content-disclosure, .tariff-guide')];
let closedBeforePrint = null;
window.addEventListener('beforeprint', () => {
  if (closedBeforePrint !== null) return;
  closedBeforePrint = disclosures.filter(disclosure => !disclosure.open);
  closedBeforePrint.forEach(disclosure => { disclosure.open = true; });
});
window.addEventListener('afterprint', () => {
  closedBeforePrint?.forEach(disclosure => { disclosure.open = false; });
  closedBeforePrint = null;
});
