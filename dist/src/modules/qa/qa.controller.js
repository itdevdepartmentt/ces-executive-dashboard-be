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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QaController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const qa_service_1 = require("./qa.service");
const jwt_auth_guard_1 = require("../../common/guard/jwt-auth.guard");
const roles_guard_1 = require("../../common/guard/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let QaController = class QaController {
    qaService;
    constructor(qaService) {
        this.qaService = qaService;
    }
    create(createData) {
        return this.qaService.createFormTapping(createData);
    }
    testTickets() {
        return this.qaService.getPendingTickets(1, 10);
    }
    getTickets(page, limit, search, filters, sortBy, sortOrder, req) {
        const parsedPage = page ? parseInt(page, 10) : 1;
        const parsedLimit = limit ? parseInt(limit, 10) : 10;
        return this.qaService.getPendingTickets(parsedPage, parsedLimit, search, filters, req.user, sortBy, sortOrder);
    }
    async exportTickets(res, search, filters, sortBy, sortOrder, req) {
        const buffer = await this.qaService.exportPendingTickets(search, filters, req.user, sortBy, sortOrder);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="pending-tickets-${new Date().getTime()}.xlsx"`);
        return res.send(buffer);
    }
    getTicketFilterOptions(req) {
        return this.qaService.getTicketFilterOptions(req.user);
    }
    getTicketById(id) {
        return this.qaService.getPendingTicketById(id);
    }
    uploadTickets(file) {
        return this.qaService.uploadTickets(file);
    }
    syncTicketsFromOca(body) {
        return this.qaService.syncTicketsFromOca(body.startDate, body.endDate);
    }
    removeTicket(id) {
        return this.qaService.deletePendingTicket(id);
    }
    getAllFormTapping(page, limit, search, filters, sortBy, sortOrder, req) {
        const parsedPage = page ? parseInt(page, 10) : 1;
        const parsedLimit = limit ? parseInt(limit, 10) : 10;
        return this.qaService.getAllFormTapping(parsedPage, parsedLimit, search, filters, req.user, sortBy, sortOrder);
    }
    getQaScoreDashboard(year, month, agent, peak, teamLeader, req) {
        return this.qaService.getQaScoreDashboard(year, month, agent, peak, req.user, teamLeader);
    }
    getDetailTapping(page, limit, year, month, agent, peak, teamLeader, search, filters, sortBy, sortOrder, req) {
        const parsedPage = page ? parseInt(page, 10) : 1;
        const parsedLimit = limit ? parseInt(limit, 10) : 100;
        return this.qaService.getDetailTapping(parsedPage, parsedLimit, year, month, agent, peak, search, filters, sortBy, sortOrder, req.user, teamLeader);
    }
    getDetailTappingFilterOptions(req) {
        return this.qaService.getDetailTappingFilterOptions(req.user);
    }
    getHistoryFilterOptions(req) {
        return this.qaService.getHistoryFilterOptions(req.user);
    }
    async exportAllFormTapping(res, search, filters, sortBy, sortOrder, req) {
        const buffer = await this.qaService.exportAllFormTapping(search, filters, req?.user, sortBy, sortOrder);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="form-tapping-${new Date().getTime()}.xlsx"`);
        return res.send(buffer);
    }
    findOne(id) {
        return this.qaService.getFormTappingById(id);
    }
    update(id, updateData) {
        return this.qaService.updateFormTapping(id, updateData);
    }
    updateKomitmen(id, komitmen, req) {
        return this.qaService.updateKomitmen(id, komitmen, req.user);
    }
    approveKomitmen(id, req) {
        return this.qaService.approveKomitmen(id, req.user);
    }
    rejectKomitmen(id, req) {
        return this.qaService.rejectKomitmen(id, req.user);
    }
    remove(id) {
        return this.qaService.deleteFormTapping(id);
    }
};
exports.QaController = QaController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('test-tickets'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], QaController.prototype, "testTickets", null);
__decorate([
    (0, common_1.Get)('tickets'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC', 'TL'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('filters')),
    __param(4, (0, common_1.Query)('sortBy')),
    __param(5, (0, common_1.Query)('sortOrder')),
    __param(6, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "getTickets", null);
__decorate([
    (0, common_1.Get)('tickets/export'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC', 'TL'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('filters')),
    __param(3, (0, common_1.Query)('sortBy')),
    __param(4, (0, common_1.Query)('sortOrder')),
    __param(5, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], QaController.prototype, "exportTickets", null);
__decorate([
    (0, common_1.Get)('tickets/options'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC', 'TL'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "getTicketFilterOptions", null);
__decorate([
    (0, common_1.Get)('tickets/:id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC', 'TL'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "getTicketById", null);
__decorate([
    (0, common_1.Post)('tickets/upload'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC', 'TL'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "uploadTickets", null);
__decorate([
    (0, common_1.Post)('tickets/sync-oca'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "syncTicketsFromOca", null);
__decorate([
    (0, common_1.Delete)('tickets/:id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "removeTicket", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL', 'TL_QC'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('filters')),
    __param(4, (0, common_1.Query)('sortBy')),
    __param(5, (0, common_1.Query)('sortOrder')),
    __param(6, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "getAllFormTapping", null);
__decorate([
    (0, common_1.Get)('qa-score'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL', 'TL_QC', 'USER'),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('agent')),
    __param(3, (0, common_1.Query)('peak')),
    __param(4, (0, common_1.Query)('teamLeader')),
    __param(5, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "getQaScoreDashboard", null);
__decorate([
    (0, common_1.Get)('detail-tapping'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL', 'TL_QC', 'USER'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Query)('month')),
    __param(4, (0, common_1.Query)('agent')),
    __param(5, (0, common_1.Query)('peak')),
    __param(6, (0, common_1.Query)('teamLeader')),
    __param(7, (0, common_1.Query)('search')),
    __param(8, (0, common_1.Query)('filters')),
    __param(9, (0, common_1.Query)('sortBy')),
    __param(10, (0, common_1.Query)('sortOrder')),
    __param(11, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "getDetailTapping", null);
__decorate([
    (0, common_1.Get)('detail-tapping/options'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL', 'TL_QC', 'USER'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "getDetailTappingFilterOptions", null);
__decorate([
    (0, common_1.Get)('options'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL', 'TL_QC'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "getHistoryFilterOptions", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL', 'TL_QC'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('filters')),
    __param(3, (0, common_1.Query)('sortBy')),
    __param(4, (0, common_1.Query)('sortOrder')),
    __param(5, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], QaController.prototype, "exportAllFormTapping", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL', 'TL_QC'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/komitmen'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL', 'TL_QC', 'USER'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('komitmen')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "updateKomitmen", null);
__decorate([
    (0, common_1.Patch)(':id/komitmen/approve'),
    (0, roles_decorator_1.Roles)('ADMIN', 'TL'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "approveKomitmen", null);
__decorate([
    (0, common_1.Patch)(':id/komitmen/reject'),
    (0, roles_decorator_1.Roles)('ADMIN', 'TL'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "rejectKomitmen", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "remove", null);
exports.QaController = QaController = __decorate([
    (0, common_1.Controller)('qa/form-tapping'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [qa_service_1.QaService])
], QaController);
//# sourceMappingURL=qa.controller.js.map