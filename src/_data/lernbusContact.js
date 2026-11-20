// Public form endpoint; the recipient is configured and verified in Formspree.
const hirzbrunnen = 'Quartiertreffpunkt Hirzbrunnen';
const monday = {
  date: '2027-01-04',
  dateDe: 'Montag, 4. Januar 2027',
  dateEn: 'Monday, 4 January 2027'
};

export default {
  endpoint: 'https://formspree.io/f/maeyrgjk',
  recipient: 'info@lernbus.ch',
  provider: 'Formspree',
  reservations: [
    {
      id: 'kindergarten_hirzbrunnen',
      program: 'Zwischenhalt Kindergarten',
      location: hirzbrunnen,
      ...monday,
      time: '9.30–12.00'
    },
    {
      id: 'mittag_hirzbrunnen',
      program: 'Zwischenhalt Mittag',
      location: hirzbrunnen,
      ...monday,
      time: '12.15–14.00'
    },
    {
      id: 'kindergarten_iselin',
      program: 'Zwischenhalt Kindergarten',
      location: 'Quartierzentrum Iselin',
      date: '2027-01-07',
      dateDe: 'Donnerstag, 7. Januar 2027',
      dateEn: 'Thursday, 7 January 2027',
      time: '9.00–11.30'
    }
  ]
};
