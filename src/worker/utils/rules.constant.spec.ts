import { calculateFcrStatus, MIN_MSISDN_MASSAL } from './rules.constant';

/** Baris minimal yang lolos semua syarat selain MSISDN. */
const barisBersih = (jumlahMsisdn: number | string) => ({
  'ID Remedy_NO': '-',
  'Eskalasi/ID Remedy_IT/AO/EMS': '-',
  'Jumlah MSISDN': jumlahMsisdn,
});

describe('FCR: batas jumlah MSISDN', () => {
  it('menghitung 1 sampai 5 MSISDN sebagai FCR', () => {
    for (const jumlah of [1, 2, 3, 4, 5]) {
      expect(calculateFcrStatus(barisBersih(jumlah))).toBe(true);
    }
  });

  it('menghitung 6 ke atas sebagai massal, bukan FCR', () => {
    for (const jumlah of [6, 7, 10, 50]) {
      expect(calculateFcrStatus(barisBersih(jumlah))).toBe(false);
    }
  });

  it('menaruh ambang massal tepat di 6', () => {
    // Menjaga agar batasnya tidak bergeser tanpa sengaja saat diubah nanti.
    expect(MIN_MSISDN_MASSAL).toBe(6);
  });

  it('memperlakukan MSISDN kosong sebagai nol, jadi tetap FCR', () => {
    for (const kosong of ['', '-', undefined, null]) {
      expect(calculateFcrStatus(barisBersih(kosong as never))).toBe(true);
    }
  });

  it('membaca angka yang tersimpan sebagai teks', () => {
    expect(calculateFcrStatus(barisBersih('5'))).toBe(true);
    expect(calculateFcrStatus(barisBersih('6'))).toBe(false);
  });
});

describe('FCR: syarat eskalasi', () => {
  it('bukan FCR bila ID Remedy terisi, walau MSISDN sedikit', () => {
    expect(
      calculateFcrStatus({ ...barisBersih(1), 'ID Remedy_NO': 'INC123' }),
    ).toBe(false);
  });

  it('bukan FCR bila kolom eskalasi terisi', () => {
    expect(
      calculateFcrStatus({
        ...barisBersih(1),
        'Eskalasi/ID Remedy_IT/AO/EMS': 'INC999',
      }),
    ).toBe(false);
  });

  it('menganggap strip dan spasi sebagai kosong', () => {
    expect(
      calculateFcrStatus({
        'ID Remedy_NO': '   ',
        'Eskalasi/ID Remedy_IT/AO/EMS': '-',
        'Jumlah MSISDN': 3,
      }),
    ).toBe(true);
  });
});
