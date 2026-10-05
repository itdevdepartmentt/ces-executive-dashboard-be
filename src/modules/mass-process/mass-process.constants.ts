/**
 * Daftar konfirmasi yang menjadi sumber deteksi bottleneck.
 *
 * Di Apps Script, detectBottleneck_() membaca kolom seperti
 * "Validation Customer Confirmation" dan "Profiling Billco Approval" — padahal
 * kolom itu tidak pernah ada di outputHeaders_() maupun ditulis ke sheet.
 * Akibatnya delapan dari sembilan pemeriksaan selalu bernilai undefined dan
 * kolom Bottleneck praktis hanya bisa berisi "Validation NOK".
 *
 * Di sini konfirmasi disimpan terstruktur di MassTicket.confirmations sebagai
 * { key: { status, notes } }, dan daftar di bawah ini yang menentukan urutan
 * prioritas sekaligus label yang ditampilkan.
 */
export const CONFIRMATION_DEFS = [
  { key: 'validationCustomerConfirmation', label: 'Customer Confirmation', stage: 'Validation' },
  { key: 'validationAmCoordination', label: 'AM Coordination', stage: 'Validation' },
  { key: 'validationPrimeApproval', label: 'Prime Approval', stage: 'Validation' },
  { key: 'profilingCustomerConfirmation', label: 'Customer Confirmation', stage: 'Profiling' },
  { key: 'profilingAmCoordination', label: 'AM Coordination', stage: 'Profiling' },
  { key: 'profilingBillcoApproval', label: 'Billco Approval', stage: 'Profiling' },
  { key: 'deviceBundlingConfirmation', label: 'Device Bundling Confirmation', stage: 'Profiling' },
  { key: 'parentNumberConfirmation', label: 'Parent Number Confirmation', stage: 'Profiling' },
] as const;

export type ConfirmationKey = (typeof CONFIRMATION_DEFS)[number]['key'];

export const CONFIRMATION_KEYS = CONFIRMATION_DEFS.map((c) => c.key);

export const STATUS_IN_PROGRESS = 'In Progress';
export const STATUS_DONE = 'Done';
export const STATUS_OK = 'OK';
export const STATUS_NOK = 'NOK';

/** Ambang bucket ageing, sama dengan Apps Script. */
export function ageingBucket(days: number): string {
  if (days >= 15) return '>14 Days';
  if (days >= 8) return '8-14 Days';
  if (days >= 4) return '4-7 Days';
  if (days >= 2) return '2-3 Days';
  return '0-1 Day';
}
