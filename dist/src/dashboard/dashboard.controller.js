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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const dashboard_service_1 = require("./dashboard.service");
const dashboard_filter_dto_1 = require("./dto/dashboard-filter.dto");
const oca_omnix_service_1 = require("./oca-omnix.service");
const jwt_auth_guard_1 = require("../common/guard/jwt-auth.guard");
let DashboardController = class DashboardController {
    dashboardService;
    ocaService;
    constructor(dashboardService, ocaService) {
        this.dashboardService = dashboardService;
        this.ocaService = ocaService;
    }
    async getSummaryDashboard(filter) {
        return this.dashboardService.getSummary(filter);
    }
    getSummary(filter) {
        return this.ocaService.getExecutiveSummary(filter);
    }
    getFilterOptions() {
        return this.ocaService.getFilterOptions();
    }
    getChannels(filter) {
        return this.ocaService.getChannelStats(filter);
    }
    getEscalations(filter) {
        return this.ocaService.getEscalationSummary(filter);
    }
    async getVipPareto(filter) {
        const [vip, pareto] = await Promise.all([
            this.ocaService.getSpecialAccountStats(filter, 'VIP'),
            this.ocaService.getSpecialAccountStats(filter, 'PARETO'),
        ]);
        return { vip, pareto };
    }
    getCompanyKips(filter) {
        return this.ocaService.getTopKipPerCompany(filter);
    }
    getProducts(filter) {
        return this.ocaService.getProductBreakdown(filter);
    }
    getEboEscalation(query) {
        return this.ocaService.getEboOrGtmEscalation(query, 'EBO');
    }
    getGtmEscalation(query) {
        return this.ocaService.getEboOrGtmEscalation(query, 'GTM');
    }
    getBillcoEscalation(query) {
        return this.ocaService.getBillcoEscalation(query);
    }
    getItEscalation(query) {
        return this.ocaService.getItEscalation(query);
    }
    getCsatScore(filter) {
        return this.ocaService.getCsatScore(filter);
    }
    getPriority(filter) {
        return this.ocaService.getPriorityData(filter);
    }
    getPriorityTickets(query) {
        return this.ocaService.getPriorityTickets(query);
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('summarycsat'),
    __param(0, (0, common_1.Query)(new common_1.ValidationPipe({ transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_filter_dto_1.DashboardFilterDto]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getSummaryDashboard", null);
__decorate([
    (0, common_1.Get)('summary'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_filter_dto_1.DashboardFilterDto]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('filter-options'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getFilterOptions", null);
__decorate([
    (0, common_1.Get)('channels'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_filter_dto_1.DashboardFilterDto]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getChannels", null);
__decorate([
    (0, common_1.Get)('escalations'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_filter_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getEscalations", null);
__decorate([
    (0, common_1.Get)('vip-pareto'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_filter_dto_1.DashboardFilterDto]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getVipPareto", null);
__decorate([
    (0, common_1.Get)('company-kips'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_filter_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getCompanyKips", null);
__decorate([
    (0, common_1.Get)('products'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_filter_dto_1.DashboardFilterDto]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Get)('ebo-escalation'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_filter_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getEboEscalation", null);
__decorate([
    (0, common_1.Get)('gtm-escalation'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_filter_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getGtmEscalation", null);
__decorate([
    (0, common_1.Get)('billco-escalation'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_filter_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getBillcoEscalation", null);
__decorate([
    (0, common_1.Get)('it-escalation'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_filter_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getItEscalation", null);
__decorate([
    (0, common_1.Get)('csat-score'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_filter_dto_1.DashboardFilterDto]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getCsatScore", null);
__decorate([
    (0, common_1.Get)('priority'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_filter_dto_1.DashboardFilterDto]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getPriority", null);
__decorate([
    (0, common_1.Get)('priority-tickets'),
    __param(0, (0, common_1.Query)(new common_1.ValidationPipe({ transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_filter_dto_1.PriorityTicketQueryDto]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getPriorityTickets", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService,
        oca_omnix_service_1.OcaOmnixService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map