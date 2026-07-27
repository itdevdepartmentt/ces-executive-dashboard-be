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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSummary(filter) {
        const where = this.buildDateFilter(filter);
        const aggregations = await this.prisma.dailyCsatStat.aggregate({
            where,
            _sum: {
                totalSurvey: true,
                totalDijawab: true,
                totalJawaban45: true,
            },
        });
        const totalDijawab = aggregations._sum.totalDijawab || 0;
        const totalJawaban45 = aggregations._sum.totalJawaban45 || 0;
        const reCalculatedCsat = totalDijawab > 0
            ? (totalJawaban45 / totalDijawab) * 100
            : 0;
        const scoreAgg = await this.prisma.rawCsat.aggregate({
            where: {
                createdAt: this.buildRawDateFilter(filter),
                numeric: { not: null }
            },
            _avg: { numeric: true }
        });
        return {
            totalSurvey: aggregations._sum.totalSurvey || 0,
            totalDijawab: totalDijawab,
            totalJawaban45: totalJawaban45,
            persenCsat: parseFloat(reCalculatedCsat.toFixed(2)),
            scoreCsat: parseFloat((scoreAgg._avg.numeric || 0).toFixed(2))
        };
    }
    buildDateFilter(filter) {
        const { startDate, endDate } = filter;
        if (startDate && !endDate) {
            return {
                date: {
                    equals: new Date(startDate)
                }
            };
        }
        if (startDate && endDate) {
            return {
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            };
        }
        return {};
    }
    buildRawDateFilter(filter) {
        const { startDate, endDate } = filter;
        if (startDate && !endDate) {
            const start = new Date(startDate);
            const end = new Date(startDate);
            end.setHours(23, 59, 59, 999);
            return {
                gte: start,
                lte: end
            };
        }
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return {
                gte: start,
                lte: end
            };
        }
        return undefined;
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map