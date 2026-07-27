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
const qa_productivity_service_1 = require("./qa-productivity.service");
const jwt_auth_guard_1 = require("../../common/guard/jwt-auth.guard");
let QaProductivityController = class QaProductivityController {
    qaProductivityService;
    constructor(qaProductivityService) {
        this.qaProductivityService = qaProductivityService;
    }
    async getSettings() {
        return this.qaProductivityService.getSettings();
    }
    async updateSettings(body) {
        return this.qaProductivityService.updateSettings(body);
    }
    async getDashboardData(month, year, date) {
        const filterMonth = month ? parseInt(month) : new Date().getMonth() + 1;
        const filterYear = year ? parseInt(year) : new Date().getFullYear();
        const filterDate = date || new Date().toISOString().split('T')[0];
        return this.qaProductivityService.getDashboardData(filterMonth, filterYear, filterDate);
    }
};
exports.QaProductivityController = QaProductivityController;
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QaProductivityController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Post)('settings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], QaProductivityController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Query)('month')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], QaProductivityController.prototype, "getDashboardData", null);
exports.QaProductivityController = QaProductivityController = __decorate([
    (0, common_1.Controller)('qa/productivity'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [qa_productivity_service_1.QaProductivityService])
], QaProductivityController);
//# sourceMappingURL=qa-productivity.controller.js.map