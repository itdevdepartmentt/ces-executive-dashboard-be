"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawDownloadController = void 0;
const common_1 = require("@nestjs/common");
const express_1 = __importDefault(require("express"));
const jwt_auth_guard_1 = require("../../common/guard/jwt-auth.guard");
const roles_guard_1 = require("../../common/guard/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const raw_download_service_1 = require("./raw-download.service");
let RawDownloadController = class RawDownloadController {
    service;
    constructor(service) {
        this.service = service;
    }
    async downloadRawOmnix(res, startDate, endDate) {
        return this.sendExcelFile(res, 'omnix', { startDate, endDate });
    }
    async downloadRawOca(res, startDate, endDate) {
        return this.sendExcelFile(res, 'oca', { startDate, endDate });
    }
    async downloadRawCall(res, startDate, endDate) {
        return this.sendExcelFile(res, 'call', { startDate, endDate });
    }
    async downloadNewsLog(res, startDate, endDate) {
        return this.sendExcelFile(res, 'news-log', { startDate, endDate });
    }
    async sendExcelFile(res, type, dateRange) {
        const buffer = await this.service.generateWorkbookBuffer(type, dateRange);
        const filename = this.service.getFileName(type);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(buffer);
    }
};
exports.RawDownloadController = RawDownloadController;
__decorate([
    (0, common_1.Get)('omnix'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RawDownloadController.prototype, "downloadRawOmnix", null);
__decorate([
    (0, common_1.Get)('oca'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RawDownloadController.prototype, "downloadRawOca", null);
__decorate([
    (0, common_1.Get)('call'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RawDownloadController.prototype, "downloadRawCall", null);
__decorate([
    (0, common_1.Get)('news-log'),
    (0, roles_decorator_1.Roles)('QC', 'TL_QC', 'ADMIN'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RawDownloadController.prototype, "downloadNewsLog", null);
exports.RawDownloadController = RawDownloadController = __decorate([
    (0, common_1.Controller)('raw-download'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC', 'TL'),
    __metadata("design:paramtypes", [raw_download_service_1.RawDownloadService])
], RawDownloadController);
//# sourceMappingURL=raw-download.controller.js.map