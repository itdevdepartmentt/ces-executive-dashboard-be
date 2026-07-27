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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QaReconciliationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const ExcelJS = __importStar(require("exceljs"));
let QaReconciliationService = class QaReconciliationService {
    prisma;
    notificationsService;
    constructor(prisma, notificationsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
    }
    async create(createDto, user) {
        const qaFormTapping = await this.prisma.qaFormTapping.findUnique({
            where: { id: createDto.qaFormTappingId },
        });
        if (!qaFormTapping) {
            throw new common_1.NotFoundException('QA Form Tapping not found');
        }
        if (user.role === 'TL' && qaFormTapping.teamLeader !== user.name) {
            throw new common_1.ConflictException('Anda tidak berhak mengajukan rekonsiliasi untuk tim ini.');
        }
        const existingPending = await this.prisma.qaReconciliation.findFirst({
            where: {
                qaFormTappingId: createDto.qaFormTappingId,
                status: 'PENDING',
            },
        });
        if (existingPending) {
            throw new common_1.ConflictException('Rekonsiliasi untuk tiket ini sedang dalam status PENDING.');
        }
        createDto.tlName = user.name;
        createDto.qcName = qaFormTapping.tapper;
        const newRekon = await this.prisma.qaReconciliation.create({
            data: createDto,
        });
        await this.notificationsService.createForUserByName(qaFormTapping.tapper, {
            type: 'QA_REKON_QC',
            title: 'Rekonsiliasi Baru',
            message: `TL ${user.name} mengajukan rekonsiliasi untuk tiket ${qaFormTapping.idTiket}`,
            link: `/quality-assurance/reconciliation`,
        });
        await this.notificationsService.createForRole('TL_QC', {
            type: 'QA_REKON_TL_QC',
            title: 'Rekonsiliasi Baru',
            message: `Rekonsiliasi baru diajukan untuk tiket ${qaFormTapping.idTiket}`,
            link: `/quality-assurance/reconciliation`,
        });
        return newRekon;
    }
    async findAll(user, sortBy, sortOrder = 'desc', search, status, filters) {
        const where = {};
        if (user.role === 'TL') {
            where.tlName = user.name;
        }
        else if (user.role === 'QC') {
            where.qcName = user.name;
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        const rekons = await this.prisma.qaReconciliation.findMany({
            where,
            orderBy: sortBy && sortBy !== 'agentName' && sortBy !== 'idTiket' && sortBy !== 'peak' ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        });
        let resolved = await Promise.all(rekons.map(async (rekon) => {
            const tapping = await this.prisma.qaFormTapping.findUnique({
                where: { id: rekon.qaFormTappingId },
                select: { agent: true, idTiket: true, peak: true },
            });
            return {
                ...rekon,
                agentName: tapping?.agent || '-',
                idTiket: tapping?.idTiket || '-',
                peak: tapping?.peak ? tapping.peak.toString() : null,
            };
        }));
        if (search) {
            const lowerSearch = search.toLowerCase();
            resolved = resolved.filter(r => (r.tlName?.toLowerCase() || '').includes(lowerSearch) ||
                (r.qcName?.toLowerCase() || '').includes(lowerSearch) ||
                (r.reason?.toLowerCase() || '').includes(lowerSearch) ||
                (r.agentName?.toLowerCase() || '').includes(lowerSearch) ||
                (r.idTiket?.toLowerCase() || '').includes(lowerSearch));
        }
        if (filters) {
            try {
                const parsedFilters = JSON.parse(filters);
                Object.entries(parsedFilters).forEach(([key, values]) => {
                    if (Array.isArray(values) && values.length > 0) {
                        resolved = resolved.filter((item) => {
                            const val = item[key];
                            if (val === null || val === undefined)
                                return false;
                            return values.some(v => String(val).toLowerCase() === String(v).toLowerCase());
                        });
                    }
                });
            }
            catch (e) {
                console.error("Failed to parse filters", e);
            }
        }
        if (sortBy === 'agentName' || sortBy === 'idTiket' || sortBy === 'peak') {
            resolved.sort((a, b) => {
                const valA = a[sortBy] || '';
                const valB = b[sortBy] || '';
                if (valA < valB)
                    return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB)
                    return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return resolved;
    }
    async exportData(user, sortBy, sortOrder = 'desc', search, status, filters) {
        const data = await this.findAll(user, sortBy, sortOrder, search, status, filters);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reconciliation');
        if (data.length > 0) {
            worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key: key }));
            data.forEach(item => worksheet.addRow(item));
        }
        else {
            worksheet.columns = [{ header: 'No Data', key: 'no_data' }];
        }
        return Buffer.from(await workbook.xlsx.writeBuffer());
    }
    async findOne(id) {
        const rekon = await this.prisma.qaReconciliation.findUnique({
            where: { id },
        });
        if (!rekon)
            throw new common_1.NotFoundException('Reconciliation not found');
        return rekon;
    }
    async approve(id, user, updateDto) {
        const rekon = await this.findOne(id);
        if (user.role === 'TL' && user.name === rekon.tlName) {
            throw new common_1.ForbiddenException('You cannot approve your own reconciliation request');
        }
        await this.prisma.qaFormTapping.update({
            where: { id: rekon.qaFormTappingId },
            data: {
                scoreValiditas: rekon.proposedScoreValiditas ?? undefined,
                scoreServiceLevel: rekon.proposedScoreServiceLevel ?? undefined,
                scoreKalimat: rekon.proposedScoreKalimat ?? undefined,
                scoreResponTime: rekon.proposedScoreResponTime ?? undefined,
                scoreDokumentasi: rekon.proposedScoreDokumentasi ?? undefined,
            },
        });
        const updatedRekon = await this.prisma.qaReconciliation.update({
            where: { id },
            data: {
                status: 'APPROVED',
                qcResponseNotes: updateDto.qcResponseNotes,
            },
        });
        const formTapping = await this.prisma.qaFormTapping.findUnique({ where: { id: rekon.qaFormTappingId } });
        await this.notificationsService.createForUserByName(rekon.tlName, {
            type: 'QA_REKON_RESULT',
            title: 'Rekonsiliasi Disetujui',
            message: `Rekonsiliasi tiket ${formTapping?.idTiket} telah APPROVED`,
            link: `/quality-assurance/reconciliation`,
        });
        return updatedRekon;
    }
    async reject(id, user, updateDto) {
        const rekon = await this.findOne(id);
        if (user.role === 'TL' && user.name === rekon.tlName) {
            throw new common_1.ForbiddenException('You cannot reject your own reconciliation request');
        }
        const updatedRekon = await this.prisma.qaReconciliation.update({
            where: { id },
            data: {
                status: 'REJECTED',
                qcResponseNotes: updateDto.qcResponseNotes,
            },
        });
        const formTapping = await this.prisma.qaFormTapping.findUnique({ where: { id: rekon.qaFormTappingId } });
        await this.notificationsService.createForUserByName(rekon.tlName, {
            type: 'QA_REKON_RESULT',
            title: 'Rekonsiliasi Ditolak',
            message: `Rekonsiliasi tiket ${formTapping?.idTiket} telah REJECTED`,
            link: `/quality-assurance/reconciliation`,
        });
        return updatedRekon;
    }
    async reply(id, user, message) {
        const rekon = await this.findOne(id);
        const discussions = rekon.discussions || [];
        discussions.push({
            sender: user.role,
            name: user.name,
            message,
            timestamp: new Date().toISOString(),
        });
        return this.prisma.qaReconciliation.update({
            where: { id },
            data: {
                discussions: discussions,
            },
        });
    }
    async remove(id) {
        const rekon = await this.findOne(id);
        return this.prisma.qaReconciliation.delete({
            where: { id: rekon.id },
        });
    }
    async getNotificationSummary(user) {
        const where = { status: 'PENDING' };
        if (user.role === 'QC') {
            where.qcName = user.name;
        }
        else if (user.role === 'TL') {
            where.tlName = user.name;
        }
        const pendingRekon = await this.prisma.qaReconciliation.count({ where });
        let pendingKomitmen = 0;
        if (user.role === 'TL' || user.role === 'ADMIN' || user.role === 'TL_QC') {
            const komitmenWhere = {
                komitmen: { not: null },
                komitmenStatus: 'PENDING',
            };
            if (user.role === 'TL') {
                komitmenWhere.teamLeader = user.name;
            }
            try {
                pendingKomitmen = await this.prisma.qaFormTapping.count({
                    where: komitmenWhere,
                });
            }
            catch (e) {
                pendingKomitmen = 0;
            }
        }
        return {
            pendingRekon,
            pendingKomitmen,
            total: pendingRekon + pendingKomitmen,
        };
    }
};
exports.QaReconciliationService = QaReconciliationService;
exports.QaReconciliationService = QaReconciliationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], QaReconciliationService);
//# sourceMappingURL=qa-reconciliation.service.js.map