import * as ExcelJS from 'exceljs';
import { FormExportService } from './form-export.service';
import { FormRecordsService } from './form-records.service';
import { EBO_AKTIVASI, EBO_PSB } from './forms.seed';
import { imageDimensions, PSB_EXPORT_NOTE } from './ebo-export-layout';

jest.mock('./form-records.service', () => ({ FormRecordsService: class {} }));

const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=';

async function exportForm(
  seed: typeof EBO_PSB,
  values: Record<string, unknown>,
) {
  const records = {
    findOne: jest.fn().mockResolvedValue({
      refNumber: 'TICKET-01',
      values,
      form: {
        key: seed.key,
        name: seed.name,
        sections: [],
        fields: seed.fields.map((field) => ({ ...field, isActive: true })),
      },
    }),
  } as unknown as FormRecordsService;
  const result = await new FormExportService(records).exportRecord('record-1');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(result.buffer as unknown as ExcelJS.Buffer);
  return { ...result, workbook };
}

describe('EBO export compatibility', () => {
  it('matches the PSB template, preserves identifiers and zero, and formats percentages', async () => {
    const { workbook, fileName } = await exportForm(EBO_PSB, {
      corporateName: 'PT Contoh',
      ticketId: 'TICKET-01',
      quantity: 0,
      nomorHpPenerima: '08123456789',
      collectionRate: '97,50%',
    });
    expect(fileName).toBe('Form PSB - PT Contoh.xlsx');
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Form PSB',
      'Capture Permintaan PIC',
      'Capture Collrate',
    ]);
    const sheet = workbook.getWorksheet('Form PSB')!;
    expect(sheet.columnCount).toBe(2);
    expect(sheet.getCell('A1').value).toBe('DESCRIPTION');
    expect(sheet.getCell('B1').value).toBe('DATA');
    expect(sheet.getCell('A13').value).toBe('NAMA PENERIMA *');
    expect(sheet.getCell('B12').value).toBe(0);
    expect(sheet.getCell('B14').value).toBe('08123456789');
    expect(sheet.getCell('B17').value).toBe(0.975);
    expect(sheet.getCell('B17').numFmt).toBe('0.00%');
    expect(sheet.getCell('A21').value).toBe(PSB_EXPORT_NOTE);
    expect(sheet.getCell('B21').isMerged).toBe(true);
    expect(sheet.getColumn(1).width).toBe(37.63);
    expect(sheet.getRow(1).getCell(1).fill).toMatchObject({
      fgColor: { argb: 'FFB4C7E7' },
    });
  });

  it('keeps activation MSISDN rows in the main worksheet, including leading zeroes', async () => {
    const { workbook, fileName } = await exportForm(EBO_AKTIVASI, {
      corporateName: 'PT Aktivasi',
      billingPerformance: '100%',
      msisdnRows: [
        {
          msisdn: '08123456789',
          nama: 'PIC Contoh',
          pricePlan: 'HALO',
          clsDomestic: '0',
          clsRoaming: '0',
          fitur: '-',
        },
      ],
    });
    expect(fileName).toBe('Form Aktivasi Kartu Baru - PT Aktivasi.xlsx');
    const sheet = workbook.getWorksheet('Aktivasi PSB')!;
    expect(sheet.getCell('B15').value).toBe(1);
    expect(sheet.getCell('B15').numFmt).toBe('0%');
    expect(sheet.getCell('A20').value).toBe('MSISDN');
    expect(sheet.getCell('F20').value).toBe('FITUR');
    expect(sheet.getCell('A21').value).toBe('08123456789');
    expect(sheet.getCell('B21').value).toBe('PIC Contoh');
    expect(sheet.getCell('A23').value).toEqual(
      expect.stringMatching(/^NOTES:/),
    );
    expect(workbook.getWorksheet('Daftar MSISDN')).toBeUndefined();
  });

  it('embeds captures without stretching them or overlapping the next capture', async () => {
    const { workbook } = await exportForm(EBO_PSB, {
      corporateName: 'PT Bukti',
      capturePermintaanPic: [
        `data:image/png;base64,${PNG}`,
        `data:image/png;base64,${PNG}`,
      ],
    });
    const sheet = workbook.getWorksheet('Capture Permintaan PIC')!;
    expect(sheet.getCell('A3').value).toBe('Capture 1');
    const images = sheet.getImages();
    expect(images).toHaveLength(2);
    expect(images[0].range).toMatchObject({ ext: { width: 1, height: 1 } });
    expect(images[1].range.tl.row).toBeGreaterThan(images[0].range.tl.row + 1);
  });

  it('reads intrinsic dimensions and rejects truncated image headers', () => {
    expect(imageDimensions(Buffer.from(PNG, 'base64'))).toEqual({
      width: 1,
      height: 1,
    });
    expect(imageDimensions(Buffer.from([0xff, 0xd8, 0xff]))).toBeUndefined();
  });
});
