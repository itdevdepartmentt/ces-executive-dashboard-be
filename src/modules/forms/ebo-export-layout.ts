export const PSB_EXPORT_FIELDS = [
  ['ticketId', 'ID Ticket Interaksi'],
  ['corporateName', 'CORPORATE NAME'],
  ['alamat', 'ALAMAT'],
  ['nikPassport', 'NOMOR KTP/PASPORT PIC'],
  ['projectId', 'PROJECT ID'],
  ['documentNumber', 'DOCUMENT NUMBER'],
  ['leadAccountManager', 'LEAD ACCOUNT MANAGER'],
  ['segment', 'SEGMENT'],
  ['jenisKartu', 'JENIS KARTU'],
  ['ukuran', 'UKURAN'],
  ['quantity', 'QUANTITY'],
  ['namaPenerima', 'NAMA PENERIMA'],
  ['nomorHpPenerima', 'NOMOR HP PENERIMA'],
  ['alamatPengiriman', 'ALAMAT PENGIRIMAN'],
  ['permintaanKartu', 'PERMINTAAN KARTU'],
  ['collectionRate', 'COLLECTION RATE'],
  ['projectType', 'PROJECT TYPE'],
  ['contactType', 'CONTACT TYPE'],
] as const;

export const ACTIVATION_EXPORT_FIELDS = [
  ['ticketId', 'ID Ticket Interaksi'],
  ['corporateName', 'CORPORATE NAME'],
  ['alamat', 'ALAMAT'],
  ['nikPassport', 'NOMOR KTP/PASPORT'],
  ['projectId', 'PROJECT ID'],
  ['quotedId', 'QUOTED ID'],
  ['documentNumber', 'DOCUMENT NUMBER'],
  ['leadAccountManager', 'LEAD ACCOUNT MANAGER'],
  ['segment', 'SEGMENT'],
  ['bc', 'BC'],
  ['prt', 'PRT'],
  ['basicService', 'BASIC SERVICE'],
  ['emailBill', 'EMAIL BILL'],
  ['billingPerformance', 'BILLING PERFORMANCE'],
  ['noPilotIot', 'NO PILOT UNTUK LAYANAN IoT'],
  ['accountPricePlanIot', 'ACCOUNT DAN PRICE PLAN LAYANAN IoT'],
  ['projectType', 'PROJECT TYPE'],
  ['contactType', 'CONTACT TYPE'],
] as const;

export const PSB_EXPORT_NOTE =
  '*Mohon periksa kembali alamat dan nomor penerima (PIC), pastikan sudah sesuai. Dan mohon informasikan Resi, Jasa Kirim dan waktu pengiriman kartu.';
export const ACTIVATION_EXPORT_NOTE =
  'NOTES: jika Cek status nomor xx available, mohon dibantu cek apakah nomor tersebut available PSB baru/available sebelumnya pernah digunakan (recycle). Jika bisa diaktivasi di corp sesuai dengan permintaan ini mohon dibantu.';

/** Intrinsic dimensions keep screenshots readable without stretching them. */
export function imageDimensions(
  buffer: Buffer,
): { width: number; height: number } | undefined {
  if (
    buffer.length >= 24 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (
    buffer.length >= 10 &&
    ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))
  ) {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  if (buffer.length < 4 || buffer.readUInt16BE(0) !== 0xffd8) return undefined;
  let offset = 2;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset++] !== 0xff) return undefined;
    while (buffer[offset] === 0xff) offset++;
    const marker = buffer[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    if (
      [
        0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
        0xcf,
      ].includes(marker) &&
      length >= 7
    ) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }
    offset += length;
  }
  return undefined;
}
