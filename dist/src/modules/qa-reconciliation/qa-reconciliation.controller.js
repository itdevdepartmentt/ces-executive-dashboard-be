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
exports.QaReconciliationController = void 0;
const common_1 = require("@nestjs/common");
const qa_reconciliation_service_1 = require("./qa-reconciliation.service");
const create_qa_reconciliation_dto_1 = require("./dto/create-qa-reconciliation.dto");
const update_qa_reconciliation_dto_1 = require("./dto/update-qa-reconciliation.dto");
const jwt_auth_guard_1 = require("../../common/guard/jwt-auth.guard");
const roles_guard_1 = require("../../common/guard/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let QaReconciliationController = class QaReconciliationController {
    qaReconciliationService;
    constructor(qaReconciliationService) {
        this.qaReconciliationService = qaReconciliationService;
    }
    create(createDto, req) {
        return this.qaReconciliationService.create(createDto, req.user);
    }
    async exportData(res, sortBy, sortOrder, search, status, filters, req) {
        const buffer = await this.qaReconciliationService.exportData(req.user, sortBy, sortOrder, search, status, filters);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="reconciliation-${new Date().getTime()}.xlsx"`);
        return res.send(buffer);
    }
    findAll(sortBy, sortOrder, search, status, filters, req) {
        return this.qaReconciliationService.findAll(req.user, sortBy, sortOrder, search, status, filters);
    }
    remove(id) {
        return this.qaReconciliationService.remove(id);
    }
    findOne(id) {
        return this.qaReconciliationService.findOne(id);
    }
    approve(id, req, updateDto) {
        return this.qaReconciliationService.approve(id, req.user, updateDto);
    }
    reject(id, req, updateDto) {
        return this.qaReconciliationService.reject(id, req.user, updateDto);
    }
    reply(id, req, message) {
        return this.qaReconciliationService.reply(id, req.user, message);
    }
    getNotificationSummary(req) {
        return this.qaReconciliationService.getNotificationSummary(req.user);
    }
};
exports.QaReconciliationController = QaReconciliationController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('TL'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_qa_reconciliation_dto_1.CreateQaReconciliationDto, Object]),
    __metadata("design:returntype", void 0)
], QaReconciliationController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC', 'TL'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('sortBy')),
    __param(2, (0, common_1.Query)('sortOrder')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('filters')),
    __param(6, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], QaReconciliationController.prototype, "exportData", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC', 'TL'),
    __param(0, (0, common_1.Query)('sortBy')),
    __param(1, (0, common_1.Query)('sortOrder')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('filters')),
    __param(5, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], QaReconciliationController.prototype, "findAll", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('QC', 'TL_QC'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QaReconciliationController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC', 'TL'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QaReconciliationController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, roles_decorator_1.Roles)('QC', 'TL_QC', 'ADMIN', 'TL'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_qa_reconciliation_dto_1.UpdateQaReconciliationDto]),
    __metadata("design:returntype", void 0)
], QaReconciliationController.prototype, "approve", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    (0, roles_decorator_1.Roles)('QC', 'TL_QC', 'ADMIN', 'TL'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_qa_reconciliation_dto_1.UpdateQaReconciliationDto]),
    __metadata("design:returntype", void 0)
], QaReconciliationController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/reply'),
    (0, roles_decorator_1.Roles)('TL', 'QC', 'TL_QC', 'ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)('message')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], QaReconciliationController.prototype, "reply", null);
__decorate([
    (0, common_1.Get)('notifications/summary'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC', 'TL'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaReconciliationController.prototype, "getNotificationSummary", null);
exports.QaReconciliationController = QaReconciliationController = __decorate([
    (0, common_1.Controller)('qa/reconciliation'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [qa_reconciliation_service_1.QaReconciliationService])
], QaReconciliationController);
//# sourceMappingURL=qa-reconciliation.controller.js.map