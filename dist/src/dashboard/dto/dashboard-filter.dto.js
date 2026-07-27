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
exports.PriorityTicketQueryDto = exports.PaginationDto = exports.DashboardFilterDto = exports.PRIORITY_TYPES = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
exports.PRIORITY_TYPES = ['roaming', 'extra', 'vip', 'pareto', 'urgent', 'cc'];
class DashboardFilterDto {
    startDate;
    endDate;
    isFcr;
    fcrType = 'kip';
    categories;
    subCategories;
    detailCategories;
}
exports.DashboardFilterDto = DashboardFilterDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DashboardFilterDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DashboardFilterDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === undefined || value === null || value === '')
            return undefined;
        if (typeof value === 'boolean')
            return value;
        if (typeof value === 'string') {
            if (value.toLowerCase() === 'true')
                return true;
            if (value.toLowerCase() === 'false')
                return false;
        }
        return value;
    }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], DashboardFilterDto.prototype, "isFcr", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['kip', 'realisasi']),
    __metadata("design:type", String)
], DashboardFilterDto.prototype, "fcrType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (Array.isArray(value) ? value : value?.split(',').filter(Boolean) || [])),
    __metadata("design:type", Array)
], DashboardFilterDto.prototype, "categories", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (Array.isArray(value) ? value : value?.split(',').filter(Boolean) || [])),
    __metadata("design:type", Array)
], DashboardFilterDto.prototype, "subCategories", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (Array.isArray(value) ? value : value?.split(',').filter(Boolean) || [])),
    __metadata("design:type", Array)
], DashboardFilterDto.prototype, "detailCategories", void 0);
class PaginationDto extends DashboardFilterDto {
    page = 1;
    limit = 10;
    search;
}
exports.PaginationDto = PaginationDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PaginationDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PaginationDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaginationDto.prototype, "search", void 0);
class PriorityTicketQueryDto extends PaginationDto {
    type;
}
exports.PriorityTicketQueryDto = PriorityTicketQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.PRIORITY_TYPES, {
        message: `type must be one of: ${exports.PRIORITY_TYPES.join(', ')}`,
    }),
    __metadata("design:type", String)
], PriorityTicketQueryDto.prototype, "type", void 0);
//# sourceMappingURL=dashboard-filter.dto.js.map