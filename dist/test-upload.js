"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const ExcelJS = __importStar(require("exceljs"));
const fs = __importStar(require("fs"));
async function main() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sheet1');
    sheet.addRow(['NO', 'NAMA AGENT', 'GROUPING', 'LOS', 'GENDER', 'TEAM LEADER', 'TAPPER', 'NAMA OCA', 'Jumlah Sample', 'Peak 1', 'Peak 2', 'Peak 3']);
    sheet.addRow(['1', 'Agent A', 'Group A', '', '', 'TL A', 'Tapper A', 'Agent A', '5', '1', '2', '3']);
    await workbook.xlsx.writeFile('dummy.xlsx');
    const buffer = fs.readFileSync('dummy.xlsx');
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(buffer);
    console.log('Success, sheet rows:', wb2.worksheets[0].rowCount);
}
main().catch(console.error);
//# sourceMappingURL=test-upload.js.map