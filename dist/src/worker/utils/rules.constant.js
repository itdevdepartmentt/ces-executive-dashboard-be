"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TICKET_RULES_OMNIX = exports.TICKET_RULES = void 0;
exports.calculateSlaStatus = calculateSlaStatus;
exports.calculateFcrStatus = calculateFcrStatus;
exports.determineEskalasi = determineEskalasi;
const date_fns_1 = require("date-fns");
const excel_utils_helper_1 = require("../excel-utils.helper");
const createRegex = (slashSeparatedString) => {
    const pattern = slashSeparatedString
        .split('/')
        .map((s) => s.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
    return new RegExp(pattern, 'i');
};
exports.TICKET_RULES = [
    {
        status: 'EMS',
        column: 'Customer Email',
        prop: 'customerEmail',
        check: (val) => val === 'ems@telkomsel.co.id',
    },
    {
        status: 'RPA',
        column: 'Customer Email',
        prop: 'customerEmail',
        check: (val) => val === 'rpa_ces@telkomsel.co.id',
    },
    {
        status: 'HIA',
        column: 'Ticket Subject',
        prop: 'ticketSubject',
        check: (val) => val === 'UAT HIA',
    },
    {
        status: 'Double',
        column: 'Department',
        prop: 'department',
        check: (val) => val === 'Tiket Take Out',
    },
    {
        status: 'Double',
        column: 'Sub Category',
        prop: 'subCategory',
        check: (val) => /leads/i.test(val || ''),
    },
    {
        status: 'Double',
        column: 'Ticket Subject',
        prop: 'ticketSubject',
        check: (val) => /ctp/i.test(val || ''),
    },
    {
        status: 'Double',
        column: 'Assignee',
        prop: 'assignee',
        check: (val) => val === 'Tiket Take Out',
    },
    {
        status: 'Double',
        column: 'Description',
        prop: 'description',
        regex: createRegex('out of topic / double ticket / dobel ticket / double tiket / dobel tiket / balikan ems / balasan ems'),
        check: function (val) {
            return this.regex.test(val || '');
        },
    },
    {
        status: 'Double',
        column: 'Description',
        prop: 'description',
        regex: createRegex('spam'),
        check: function (val) {
            const normalized = (val || '').trim();
            return this.regex.test(normalized) && normalized.length < 200;
        },
    },
    {
        status: 'Double',
        column: 'Detail Category',
        prop: 'detailCategory',
        regex: createRegex('I12-Status ticket / I12-Ticket ID / I11-Interaksi terputus / I12-Out Of Topic / Out Of Topic'),
        check: function (val) {
            return this.regex.test(val || '');
        },
    },
    {
        status: 'RPA',
        column: 'Description',
        prop: 'description',
        check: (val) => (val || '').trim() === 'RPA',
    },
];
exports.TICKET_RULES_OMNIX = [
    {
        status: 'Double',
        column: 'feedback',
        regex: createRegex('tes / test'),
        check: function (val) {
            return this.regex.test(val || '');
        },
    },
    {
        status: 'Double',
        column: 'subCategory',
        regex: createRegex('Out Of Topic / Pelanggan iseng'),
        check: function (val) {
            return this.regex.test(val || '');
        },
    },
    {
        status: 'Double',
        column: 'customerName',
        check: (val) => /\+6281385534422|~G|Achie dewi|dayat|EPER Agent|faisal|INDRA GUNAWAN\/INFOMEDIA|Insan|Sandi'7|R-Nie|SANDI\/INFOMEDIA|Farid Kurniawan|Gusti Infomedia Nusatara|Dara Muthia Herda|cestsel247/i.test(val || ''),
    },
    {
        status: 'Double',
        column: 'channelName',
        check: (val) => /FB Comment|IG Comment|Manual/i.test(val || ''),
    },
    {
        status: 'Double',
        column: 'subject',
        check: (val) => /tes|test/i.test(val || ''),
    },
    {
        status: 'Double',
        column: 'remark',
        check: (val) => /tes|test/i.test(val || ''),
    }
];
const SLA_LIMITS = {
    CONNECTIVITY: 3 * 60 * 60 * 1000,
    SOLUTION: 6 * 60 * 60 * 1000,
};
function calculateSlaStatus(row) {
    const type = row['product'] || '';
    const createdRaw = row['ticketCreated'];
    const resolutionRaw = row['resolveTime'];
    if (!resolutionRaw || resolutionRaw === '-') {
        return false;
    }
    const safeParse = (value) => {
        if (value instanceof Date)
            return value;
        if (typeof value === 'string' && !isNaN(Date.parse(value))) {
            return new Date(value);
        }
        return excel_utils_helper_1.ExcelUtils.parseExcelDate(value);
    };
    const createdDate = safeParse(createdRaw);
    const resolutionDate = safeParse(resolutionRaw);
    if (!createdDate ||
        !resolutionDate ||
        !(0, date_fns_1.isValid)(createdDate) ||
        !(0, date_fns_1.isValid)(resolutionDate)) {
        console.warn(`SLA Calc Failed: Invalid Date. RawCreated: ${createdRaw}, RawRes: ${resolutionRaw}`);
        return false;
    }
    const durationMs = (0, date_fns_1.differenceInMilliseconds)(resolutionDate, createdDate);
    if (type.toLowerCase() === 'connectivity') {
        return durationMs <= 10800000;
    }
    if (type.toLowerCase() === 'solution') {
        return durationMs <= 21600000;
    }
    return false;
}
function calculateFcrStatus(row) {
    const idRemedy = (row['ID Remedy_NO'] || '').toString().trim();
    const eskalasiId = (row['Eskalasi/ID Remedy_IT/AO/EMS'] || '')
        .toString()
        .trim();
    const msisdnCount = parseInt(row['Jumlah MSISDN']) || 0;
    const isIdRemedyEmpty = idRemedy === '' || idRemedy === '-';
    const isEskalasiEmpty = eskalasiId === '' || eskalasiId === '-';
    if (isIdRemedyEmpty && isEskalasiEmpty && msisdnCount < 10) {
        return true;
    }
    return false;
}
function determineEskalasi(row) {
    const idRemedyNo = (row['ID Remedy_NO'] || '').toString().trim();
    const eskalasiColumn = (row['Eskalasi/ID Remedy_IT/AO/EMS'] || '')
        .toString()
        .trim();
    if (idRemedyNo.includes('INC')) {
        return 'NO';
    }
    if (eskalasiColumn.includes('INC')) {
        return 'IT';
    }
    if (eskalasiColumn.includes('EBO')) {
        return 'EBO';
    }
    if (eskalasiColumn.includes('GTM')) {
        return 'GTM';
    }
    if (eskalasiColumn.includes('Billco')) {
        return 'Billco';
    }
    return '';
}
//# sourceMappingURL=rules.constant.js.map