import * as ExcelJS from 'exceljs';
import * as fs from 'fs';

async function main() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  sheet.addRow(['NO', 'NAMA AGENT', 'GROUPING', 'LOS', 'GENDER', 'TEAM LEADER', 'TAPPER', 'NAMA OCA', 'Jumlah Sample', 'Peak 1', 'Peak 2', 'Peak 3']);
  sheet.addRow(['1', 'Agent A', 'Group A', '', '', 'TL A', 'Tapper A', 'Agent A', '5', '1', '2', '3']);
  
  await workbook.xlsx.writeFile('dummy.xlsx');
  const buffer = fs.readFileSync('dummy.xlsx');

  // mock what parseExcelSettings does
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(buffer as any);
  
  console.log('Success, sheet rows:', wb2.worksheets[0].rowCount);
}

main().catch(console.error);
