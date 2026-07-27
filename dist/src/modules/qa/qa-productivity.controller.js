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
exports.QaProductivityController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const qa_productivity_service_1 = require("./qa-productivity.service");
const jwt_auth_guard_1 = require("../../common/guard/jwt-auth.guard");
const roles_guard_1 = require("../../common/guard/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let QaProductivityController = class QaProductivityController {
    qaProductivityService;
    constructor(qaProductivityService) {
        this.qaProductivityService = qaProductivityService;
    }
    getDashboard(month, year, date, req) {
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        return this.qaProductivityService.getDashboard(m, y, date, req.user);
    }
    getSettings() {
        return this.qaProductivityService.getSettings();
    }
    saveSettings(body) {
        return this.qaProductivityService.saveSettings(body);
    }
    bulkDeleteSettings(body) {
        return this.qaProductivityService.bulkDeleteSettings(body.agentNames, body.type);
    }
    parseExcel(file) {
        return this.qaProductivityService.parseExcelSettings(file);
    }
};
exports.QaProductivityController = QaProductivityController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC'),
    __param(0, (0, common_1.Query)('month')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('date')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], QaProductivityController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('settings'),
    (0, roles_decorator_1.Roles)('ADMIN', 'TL_QC'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], QaProductivityController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Post)('settings'),
    (0, roles_decorator_1.Roles)('ADMIN', 'TL_QC'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaProductivityController.prototype, "saveSettings", null);
__decorate([
    (0, common_1.Post)('settings/bulk-delete'),
    (0, roles_decorator_1.Roles)('ADMIN', 'TL_QC'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaProductivityController.prototype, "bulkDeleteSettings", null);
__decorate([
    (0, common_1.Post)('settings/parse-excel'),
    (0, roles_decorator_1.Roles)('ADMIN', 'TL_QC'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaProductivityController.prototype, "parseExcel", null);
exports.QaProductivityController = QaProductivityController = __decorate([
    (0, common_1.Controller)('qa/productivity'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [qa_productivity_service_1.QaProductivityService])
], QaProductivityController);
//# sourceMappingURL=qa-productivity.controller.js.map