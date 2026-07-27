const ExcelJS = require('exceljs');
const { QaProductivityService } = require('./dist/modules/qa/qa-productivity.service.js');
const fs = require('fs');

async function main() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  sheet.addRow(['NO', 'NAMA AGENT', 'GROUPING', 'LOS', 'GENDER', 'TEAM LEADER', 'TAPPER', 'NAMA OCA', 'Jumlah Sample', 'Peak 1', 'Peak 2', 'Peak 3']);
  sheet.addRow(['1', 'Agent A', 'Group A', '', '', 'TL A', 'Tapper A', 'Agent A', '5', '1', '2', '3']);
  
  await workbook.xlsx.writeFile('dummy.xlsx');

  const buffer = fs.readFileSync('dummy.xlsx');
  
  // mock service
  const service = new QaProductivityService({});
  try {
    const res = await service.parseExcelSettings({ buffer });
    console.log('Success:', res);
  } catch (err) {
    console.error('Error:', err);
  }
}

main().catch(console.error);
