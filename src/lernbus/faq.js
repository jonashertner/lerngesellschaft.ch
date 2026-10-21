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

// Existing links to information moved into a disclosure still reveal that text.
function revealLinkedDisclosure() {
  let id;
  try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
  if (!id) return;
  const target = document.getElementById(id);
  const disclosure = target?.closest('details');
  if (!disclosure || !disclosures.includes(disclosure)) return;
  disclosure.open = true;
  target.scrollIntoView({ block: 'start' });
}
window.addEventListener('hashchange', revealLinkedDisclosure);
revealLinkedDisclosure();
