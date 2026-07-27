"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateOcaFcrRealisasi = calculateOcaFcrRealisasi;
function calculateOcaFcrRealisasi(data) {
    const eskalasiAm = (data.eskalasiAm || '').trim().toLowerCase();
    const desc = (data.description || '').trim().toLowerCase();
    const idRemedyNo = (data.idRemedyNo || '').trim().toLowerCase();
    const reasonOsl = (data.reasonOsl || '').trim();
    const msisdnStr = (data.msisdn || '').trim().toLowerCase();
    const kipL3 = `${(data.subCategory || '').trim()}${(data.detailCategory || '').trim()}`.toLowerCase();
    const kipBillco = [
        'loading payment',
        'p31-pause/stop collection',
        'transfer balance',
        'p45-adjustment pajak',
        'adjustment',
        'rekap rk harian',
        'permintaan bookpayment',
        'komplain orbitsudah bayar tagihan, namun status order masih wait for pay',
        'permintaan e-bill/tagihanpermintaan billing iot',
        'permintaan e-bill/tagihanpermintaan billing oskpi',
        'permintaan e-bill/tagihanadjustment pajak',
        'permintaan e-bill/tagihanperubahan billing cycle [bc]',
        'permintaan e-bill/tagihanperubahan payment responsibility type [prt]',
        'permintaan e-bill/tagihanpause/stop collection',
        'permintaan e-bill/tagihantransfer balance',
        'permintaan e-bill/tagihanloading payment',
        'permintaan e-bill/tagihanadjustment',
        'komplain e-bill/tagihanketidaksesuaian tagihan di tcops',
        'komplain e-bill/tagihankendala pembayaran',
        'permintaan mecpembuatan create invoice',
        'sudah bayar tagihan, namun status order masih wait for payment',
        'permintaan billing iot',
        'permintaan billing oskpi',
        'adjustment pajak',
        'perubahan billing cycle [bc]',
        'perubahan payment responsibility type [prt]',
        'pause/stop collection',
        'ketidaksesuaian tagihan di tcops'
    ];
    const kipAm = [
        'add/remove nomor tcops',
        'i42-perubahan payment responsibility type [prt]',
        'i42-perubahan billing cycle [bc]',
        'k19-kendala keamanan data pribadi',
        'k19-laporan kebocoran data pribadi',
        'k59-gagal/error migrasi post to pre',
        'p32-migrasi kartu prabayar ke halo corporate',
        'p32-pasang baru',
        'p32-pengiriman device',
        'p33-peningkatan kapasitas jaringan',
        'p41-isi ulang pulsa',
        'p44-amandemen kontrak',
        'p44-penambahan kontrak',
        'p44-perpanjangan kontrak',
        'p59-permintaan migrasi post to pre'
    ];
    if (kipBillco.some(k => kipL3.includes(k))) {
        return { isFcrRealisasi: false, eskalasiRealisasiTarget: 'Billco Segment' };
    }
    if (kipAm.some(k => kipL3.includes(k))) {
        return { isFcrRealisasi: false, eskalasiRealisasiTarget: 'AM' };
    }
    let isMassal = false;
    if (msisdnStr.includes('massal') || msisdnStr.includes('masal')) {
        isMassal = true;
    }
    else {
        const numericValue = parseInt(msisdnStr.replace(/[^\d]/g, ''), 10);
        if (!isNaN(numericValue) && numericValue > 10) {
            isMassal = true;
        }
    }
    if (isMassal) {
        return { isFcrRealisasi: false, eskalasiRealisasiTarget: 'Massal' };
    }
    const itRegex = /inc0000\d+/i;
    if (itRegex.test(eskalasiAm) || itRegex.test(desc)) {
        return { isFcrRealisasi: false, eskalasiRealisasiTarget: 'IT' };
    }
    if (itRegex.test(idRemedyNo) || reasonOsl === 'Eskalasi NO') {
        return { isFcrRealisasi: false, eskalasiRealisasiTarget: 'NO' };
    }
    const aoRegex = /req0000\d+/i;
    if (aoRegex.test(eskalasiAm) || aoRegex.test(desc)) {
        return { isFcrRealisasi: false, eskalasiRealisasiTarget: 'AO' };
    }
    const eboRegex = /\b(ems|ebo|a1|a2|a3|a4)\b/i;
    if (eboRegex.test(eskalasiAm)) {
        return { isFcrRealisasi: false, eskalasiRealisasiTarget: 'EBO' };
    }
    const amRegexAmCol = /\bam\b/i;
    const amRegexDesc = /am kosong|amkosong|konfirmasi am|koordinasi am|konfirmasi as|koordinasi as|koordinasi dengan as|koordinasi ke as|koordinasi ke am|koordinasi am\/as|kordinasi am|koord as|koordinasi dengan am|koord am|pks exp|nodin/i;
    if (amRegexAmCol.test(eskalasiAm) ||
        amRegexDesc.test(desc) ||
        reasonOsl === 'Konfirmasi AM/AS') {
        return { isFcrRealisasi: false, eskalasiRealisasiTarget: 'AM' };
    }
    const billcoRegex = /billco|bilco|billlco/i;
    if (billcoRegex.test(eskalasiAm) ||
        reasonOsl === 'Approval Billco' ||
        reasonOsl === 'Konfirmasi Billco') {
        return { isFcrRealisasi: false, eskalasiRealisasiTarget: 'Billco Segment' };
    }
    const cmRegex = /\b(cm|koordinasi cm|konfirmasi cm|kordinasi cm|koord cm)\b/i;
    if (cmRegex.test(eskalasiAm) || cmRegex.test(desc)) {
        return { isFcrRealisasi: false, eskalasiRealisasiTarget: 'CM' };
    }
    const partnerRegex = /\b(cho|partner|patner|petner|upoint|finnet|e care|melon|finet|ecare|pertner)\b/i;
    if (reasonOsl !== 'P45-Kirim ulang tagihan' && partnerRegex.test(eskalasiAm)) {
        return { isFcrRealisasi: false, eskalasiRealisasiTarget: 'Partner' };
    }
    const ownerRegex = /product owner|owner|it mevo|mevo/i;
    if (ownerRegex.test(eskalasiAm) || desc.includes('mas ari')) {
        return { isFcrRealisasi: false, eskalasiRealisasiTarget: 'Product Owner' };
    }
    if (reasonOsl === 'Gangguan Aplikasi') {
        return { isFcrRealisasi: false, eskalasiRealisasiTarget: 'Gangguan Aplikasi' };
    }
    const originTicketRegex = /origin ticket|tiket origin/i;
    if ((data.countInboundMessage > 1 && !data.inSla) ||
        originTicketRegex.test(desc)) {
        return { isFcrRealisasi: false, eskalasiRealisasiTarget: 'Konfirmasi Pelanggan' };
    }
    return { isFcrRealisasi: true, eskalasiRealisasiTarget: null };
}
//# sourceMappingURL=fcr-realisasi.utils.js.map