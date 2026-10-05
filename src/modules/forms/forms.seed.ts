import { FormFieldType } from '@prisma/client';

export interface SeedField {
  key: string;
  label: string;
  type: FormFieldType;
  section?: string;
  required?: boolean;
  helpText?: string;
  options?: { value: string; label: string }[];
  columns?: { key: string; label: string; type?: FormFieldType }[];
}

export interface SeedForm {
  key: string;
  name: string;
  description?: string;
  sections: { key: string; label: string }[];
  fields: SeedField[];
}

const opt = (...values: string[]) =>
  values.map((value) => ({ value, label: value }));

const PROJECT_TYPE = opt('HUMAN', 'NON HUMAN');
const CONTACT_TYPE = opt(
  'SINGLE MSISDN - 1 CONTACT (HUMAN)',
  'MANY MSISDN - 1 CONTACT (NON HUMAN)',
);

/** Field bersama antara form PSB dan Aktivasi. */
const identitasKorporat: SeedField[] = [
  { key: 'ticketId', label: 'ID Ticket Interaksi', type: 'TEXT', required: true },
  {
    key: 'corporateName',
    label: 'Corporate Name',
    type: 'TEXT',
    required: true,
    helpText: 'Copy paste dari corp id',
  },
  {
    key: 'alamat',
    label: 'Alamat',
    type: 'TEXTAREA',
    required: true,
    helpText: 'Copy paste dari corp id',
  },
];

export const EBO_PSB: SeedForm = {
  key: 'ebo-psb',
  name: 'Form PSB — Corporate Card Request',
  description:
    'Permintaan pasang baru kartu korporat. Dipindahkan dari Apps Script EBO Project.',
  sections: [
    { key: 'data', label: 'Data Permintaan' },
    { key: 'pengiriman', label: 'Data Pengiriman' },
    { key: 'bukti', label: 'Bukti Pendukung' },
  ],
  fields: [
    ...identitasKorporat.map((f) => ({ ...f, section: 'data' })),
    {
      key: 'nikPassport',
      label: 'Nomor KTP/Paspor PIC',
      type: 'TEXT',
      section: 'data',
      required: true,
      helpText: 'Bisa menggunakan KTP PIC yang mengajukan',
    },
    { key: 'projectId', label: 'Project ID', type: 'TEXT', section: 'data', required: true },
    {
      key: 'documentNumber',
      label: 'Document Number',
      type: 'TEXT',
      section: 'data',
      required: true,
    },
    {
      key: 'leadAccountManager',
      label: 'Lead Account Manager',
      type: 'TEXT',
      section: 'data',
      required: true,
    },
    { key: 'segment', label: 'Segment', type: 'TEXT', section: 'data', required: true },
    {
      key: 'jenisKartu',
      label: 'Jenis Kartu',
      type: 'SELECT',
      section: 'data',
      required: true,
      options: opt('GSM', 'IOT'),
    },
    { key: 'ukuran', label: 'Ukuran', type: 'TEXT', section: 'data', required: true },
    { key: 'quantity', label: 'Quantity', type: 'NUMBER', section: 'data', required: true },
    {
      key: 'permintaanKartu',
      label: 'Permintaan Kartu',
      type: 'SELECT',
      section: 'data',
      required: true,
      options: opt('PSB'),
    },
    {
      key: 'collectionRate',
      label: 'Collection Rate',
      type: 'TEXT',
      section: 'data',
      required: true,
      helpText: 'Kurang dari 97.50% harus minta approval Billco',
    },
    {
      key: 'projectType',
      label: 'Project Type',
      type: 'SELECT',
      section: 'data',
      required: true,
      options: PROJECT_TYPE,
    },
    {
      key: 'contactType',
      label: 'Contact Type',
      type: 'SELECT',
      section: 'data',
      required: true,
      options: CONTACT_TYPE,
    },

    {
      key: 'namaPenerima',
      label: 'Nama Penerima',
      type: 'TEXT',
      section: 'pengiriman',
      required: true,
    },
    {
      key: 'nomorHpPenerima',
      label: 'Nomor HP Penerima',
      type: 'TEXT',
      section: 'pengiriman',
      required: true,
    },
    {
      key: 'alamatPengiriman',
      label: 'Alamat Pengiriman',
      type: 'TEXTAREA',
      section: 'pengiriman',
      required: true,
    },

    {
      key: 'capturePermintaanPic',
      label: 'Capture Permintaan PIC',
      type: 'FILE',
      section: 'bukti',
      required: true,
      helpText: 'Minimal satu lampiran',
    },
    {
      key: 'captureCollrate',
      label: 'Capture Collrate',
      type: 'FILE',
      section: 'bukti',
      required: true,
      helpText: 'Minimal satu lampiran',
    },
  ],
};

export const EBO_AKTIVASI: SeedForm = {
  key: 'ebo-aktivasi',
  name: 'Form Aktivasi Kartu Baru',
  description:
    'Permintaan aktivasi kartu korporat beserta daftar MSISDN. Dipindahkan dari Apps Script EBO Project.',
  sections: [
    { key: 'data', label: 'Data Permintaan' },
    { key: 'layanan', label: 'Layanan & Billing' },
    { key: 'msisdn', label: 'Daftar MSISDN' },
    { key: 'bukti', label: 'Bukti Pendukung' },
  ],
  fields: [
    ...identitasKorporat.map((f) => ({ ...f, section: 'data' })),
    {
      key: 'nikPassport',
      label: 'Nomor KTP/Paspor',
      type: 'TEXT',
      section: 'data',
      required: true,
      helpText: 'Bisa menggunakan KTP PIC yang mengajukan',
    },
    { key: 'projectId', label: 'Project ID', type: 'TEXT', section: 'data', required: true },
    { key: 'quotedId', label: 'Quoted ID', type: 'TEXT', section: 'data', required: true },
    {
      key: 'documentNumber',
      label: 'Document Number',
      type: 'TEXT',
      section: 'data',
      required: true,
    },
    {
      key: 'leadAccountManager',
      label: 'Lead Account Manager',
      type: 'TEXT',
      section: 'data',
      required: true,
    },
    { key: 'segment', label: 'Segment', type: 'TEXT', section: 'data', required: true },
    {
      key: 'bc',
      label: 'BC',
      type: 'TEXT',
      section: 'data',
      required: true,
      helpText: 'Copy paste dari project id',
    },
    {
      key: 'prt',
      label: 'PRT',
      type: 'TEXT',
      section: 'data',
      required: true,
      helpText: 'Copy paste dari project id',
    },
    {
      key: 'projectType',
      label: 'Project Type',
      type: 'SELECT',
      section: 'data',
      required: true,
      options: PROJECT_TYPE,
    },
    {
      key: 'contactType',
      label: 'Contact Type',
      type: 'SELECT',
      section: 'data',
      required: true,
      options: CONTACT_TYPE,
    },

    {
      key: 'basicService',
      label: 'Basic Service',
      type: 'SELECT',
      section: 'layanan',
      required: true,
      options: opt('HALO ENTERPRISE', 'MU 45K', 'MU 0'),
    },
    {
      key: 'emailBill',
      label: 'Email Bill',
      type: 'TEXT',
      section: 'layanan',
      required: true,
      helpText: 'Bisa menggunakan email PIC yang mengajukan',
    },
    {
      key: 'billingPerformance',
      label: 'Billing Performance',
      type: 'TEXT',
      section: 'layanan',
      required: true,
      helpText: '97.50% — kurang dari itu harus minta approval Billco',
    },
    {
      key: 'noPilotIot',
      label: 'No Pilot untuk Layanan IoT',
      type: 'TEXT',
      section: 'layanan',
      required: true,
      helpText: 'Untuk permintaan SIM PO',
    },
    {
      key: 'accountPricePlanIot',
      label: 'Account dan Price Plan Layanan IoT',
      type: 'TEXT',
      section: 'layanan',
      required: true,
    },

    {
      key: 'msisdnRows',
      label: 'Daftar MSISDN',
      type: 'TABLE',
      section: 'msisdn',
      required: true,
      helpText: 'Minimal satu baris, semua kolom wajib diisi',
      columns: [
        { key: 'msisdn', label: 'MSISDN', type: 'TEXT' },
        { key: 'nama', label: 'Nama', type: 'TEXT' },
        { key: 'pricePlan', label: 'Price Plan', type: 'TEXT' },
        { key: 'clsDomestic', label: 'CLS Domestic', type: 'TEXT' },
        { key: 'clsRoaming', label: 'CLS Roaming', type: 'TEXT' },
        { key: 'fitur', label: 'Fitur', type: 'TEXT' },
      ],
    },

    {
      key: 'capturePermintaanPic',
      label: 'Capture Permintaan PIC',
      type: 'FILE',
      section: 'bukti',
      required: true,
      helpText: 'Minimal satu lampiran',
    },
    {
      key: 'captureCollrate',
      label: 'Capture Collrate',
      type: 'FILE',
      section: 'bukti',
      required: true,
      helpText: 'Minimal satu lampiran',
    },
  ],
};

/**
 * Atribut tambahan untuk Mass Process. Sengaja dibiarkan kosong: kolom inti
 * tiket sudah jadi kolom asli di MassTicket demi kecepatan query, sedangkan
 * form ini wadah bagi field tambahan yang ditentukan admin lewat UI.
 */
export const MASS_TICKET: SeedForm = {
  key: 'mass-ticket',
  name: 'Atribut Tambahan Tiket Mass Process',
  description:
    'Field tambahan yang bisa dikelola admin. Nilainya tersimpan di MassTicket.customValues.',
  sections: [{ key: 'tambahan', label: 'Field Tambahan' }],
  fields: [],
};

export const SEED_FORMS: SeedForm[] = [EBO_PSB, EBO_AKTIVASI, MASS_TICKET];

/** 11 langkah baku dari APP.PROCESS_STEPS pada Apps Script Mass Project. */
export const SEED_PROCESS_STEPS = [
  'Set CLS Rp 1',
  'Remove Offer Existing',
  'Change Ownership',
  'Profiling (check)',
  'Add Offer/Fitur',
  'Modify CLS final',
  'Profiling (final)',
  'Konfirmasi Pelanggan',
  'Koordinasi IT',
  'Koordinasi AM',
  'Koordinasi Billco',
];
