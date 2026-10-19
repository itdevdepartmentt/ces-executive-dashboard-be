/**
 * Tata kolom rekap EBO, disalin persis dari berkas "Rekap Submit Form EBO.xlsx"
 * milik aplikasi lama.
 *
 * Judul dan urutannya sengaja dipertahankan apa adanya — termasuk titik dua di
 * "PROJECT TYPE:" pada sheet PSB — supaya berkas yang diunduh dari CESIA bisa
 * ditukar langsung dengan berkas lama, dan berkas lama bisa diunggah balik.
 */

/** Kolom turunan yang tidak berasal dari satu field. */
export type KolomKhusus = 'timestamp' | 'msisdnRows' | 'msisdnCount' | 'doc';

export interface KolomRekap {
  judul: string;
  /** Field yang dipetakan, bila kolom ini memang sebuah field. */
  field?: string;
  khusus?: KolomKhusus;
  lebar: number;
}

export interface TataRekap {
  sheet: string;
  kolom: KolomRekap[];
}

const PSB: KolomRekap[] = [
  { judul: 'Timestamp', khusus: 'timestamp', lebar: 22 },
  { judul: 'ID Ticket Interaksi', field: 'ticketId', lebar: 20 },
  { judul: 'CORPORATE NAME', field: 'corporateName', lebar: 32 },
  { judul: 'ALAMAT', field: 'alamat', lebar: 38 },
  { judul: 'NOMOR KTP/PASPORT PIC', field: 'nikPassport', lebar: 24 },
  { judul: 'PROJECT ID', field: 'projectId', lebar: 18 },
  { judul: 'DOCUMENT NUMBER', field: 'documentNumber', lebar: 22 },
  { judul: 'LEAD ACCOUNT MANAGER', field: 'leadAccountManager', lebar: 26 },
  { judul: 'SEGMENT', field: 'segment', lebar: 18 },
  { judul: 'JENIS KARTU', field: 'jenisKartu', lebar: 14 },
  { judul: 'UKURAN', field: 'ukuran', lebar: 14 },
  { judul: 'QUANTITY', field: 'quantity', lebar: 10 },
  { judul: 'NAMA PENERIMA', field: 'namaPenerima', lebar: 26 },
  { judul: 'NOMOR HP PENERIMA', field: 'nomorHpPenerima', lebar: 20 },
  { judul: 'ALAMAT PENGIRIMAN', field: 'alamatPengiriman', lebar: 38 },
  { judul: 'PERMINTAAN KARTU', field: 'permintaanKartu', lebar: 18 },
  { judul: 'COLLECTION RATE', field: 'collectionRate', lebar: 16 },
  { judul: 'PROJECT TYPE:', field: 'projectType', lebar: 16 },
  { judul: 'CONTACT TYPE:', field: 'contactType', lebar: 38 },
  { judul: 'Doc', khusus: 'doc', lebar: 40 },
];

/**
 * Tiga kolom terakhir tidak punya judul di berkas lama. Di sini judulnya diisi
 * supaya berkasnya bisa dibaca orang; pembacanya tetap menerima versi lama yang
 * kosong, dicocokkan lewat posisi.
 */
const AKTIVASI: KolomRekap[] = [
  { judul: 'Timestamp', khusus: 'timestamp', lebar: 22 },
  { judul: 'ID Ticket Interaksi', field: 'ticketId', lebar: 20 },
  { judul: 'CORPORATE NAME', field: 'corporateName', lebar: 32 },
  { judul: 'ALAMAT', field: 'alamat', lebar: 38 },
  { judul: 'NOMOR KTP/PASPORT', field: 'nikPassport', lebar: 24 },
  { judul: 'PROJECT ID', field: 'projectId', lebar: 18 },
  { judul: 'QUOTED ID', field: 'quotedId', lebar: 18 },
  { judul: 'DOCUMENT NUMBER', field: 'documentNumber', lebar: 22 },
  { judul: 'LEAD ACCOUNT MANAGER', field: 'leadAccountManager', lebar: 26 },
  { judul: 'SEGMENT', field: 'segment', lebar: 18 },
  { judul: 'BC', field: 'bc', lebar: 14 },
  { judul: 'PRT', field: 'prt', lebar: 14 },
  { judul: 'BASIC SERVICE', field: 'basicService', lebar: 32 },
  { judul: 'EMAIL EBILL', field: 'emailBill', lebar: 28 },
  { judul: 'BILLING PERFORMANCE', field: 'billingPerformance', lebar: 20 },
  {
    judul: 'NO PILOT UNTUK LAYANAN IoT (untuk permintaan SIM PO)',
    field: 'noPilotIot',
    lebar: 30,
  },
  {
    judul: 'ACCOUNT DAN PRICE PLAN LAYANAN IoT',
    field: 'accountPricePlanIot',
    lebar: 30,
  },
  { judul: 'PROJECT TYPE', field: 'projectType', lebar: 16 },
  { judul: 'CONTACT TYPE', field: 'contactType', lebar: 38 },
  { judul: 'DAFTAR MSISDN', khusus: 'msisdnRows', lebar: 60 },
  { judul: 'JUMLAH MSISDN', khusus: 'msisdnCount', lebar: 14 },
  { judul: 'Doc', khusus: 'doc', lebar: 40 },
];

export const REKAP_EBO: Record<string, TataRekap> = {
  'ebo-psb': { sheet: 'PSB', kolom: PSB },
  'ebo-aktivasi': { sheet: 'Aktivasi PSB', kolom: AKTIVASI },
};

/** Field tabel yang diratakan ke satu sel pada sheet Aktivasi. */
export const FIELD_TABEL_AKTIVASI = 'msisdnRows';

/** Status yang dipakai untuk record hasil unggahan rekap lama. */
export const STATUS_IMPOR = 'imported';

/**
 * Judul disamakan dulu sebelum dicocokkan: berkas lama memakai titik dua,
 * spasi ganda, dan huruf besar yang tidak konsisten antar sheet.
 */
export function samakanJudul(judul: string): string {
  return judul
    .replace(/\s+/g, ' ')
    .replace(/:+$/, '')
    .trim()
    .toUpperCase();
}
