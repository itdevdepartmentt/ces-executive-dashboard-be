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
exports.LookupManagementController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const lookup_management_service_1 = require("./lookup-management.service");
const lookup_management_dto_1 = require("./dto/lookup-management.dto");
const jwt_auth_guard_1 = require("../../common/guard/jwt-auth.guard");
const roles_guard_1 = require("../../common/guard/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let LookupManagementController = class LookupManagementController {
    service;
    constructor(service) {
        this.service = service;
    }
    uploadLookupCsv(lookupType, file) {
        return this.service.bulkUploadFromCsv(lookupType, file);
    }
    findAllAccountMappings(query) {
        return this.service.findAllAccountMappings(query);
    }
    createAccountMapping(dto) {
        return this.service.createAccountMapping(dto);
    }
    updateAccountMapping(id, dto) {
        return this.service.updateAccountMapping(id, dto);
    }
    deleteAccountMapping(id) {
        return this.service.deleteAccountMapping(id);
    }
    deleteAllAccountMappings() {
        return this.service.deleteAllAccountMappings();
    }
    findAllLookupKIP(query) {
        return this.service.findAllLookupKIP(query);
    }
    createLookupKIP(dto) {
        return this.service.createLookupKIP(dto);
    }
    updateLookupKIP(id, dto) {
        return this.service.updateLookupKIP(id, dto);
    }
    deleteLookupKIP(id) {
        return this.service.deleteLookupKIP(id);
    }
    deleteAllLookupKIP() {
        return this.service.deleteAllLookupKIP();
    }
    findAllLookupAgent(query) {
        return this.service.findAllLookupAgent(query);
    }
    createLookupAgent(dto) {
        return this.service.createLookupAgent(dto);
    }
    updateLookupAgent(id, dto) {
        return this.service.updateLookupAgent(id, dto);
    }
    deleteLookupAgent(id) {
        return this.service.deleteLookupAgent(id);
    }
    deleteAllLookupAgent() {
        return this.service.deleteAllLookupAgent();
    }
};
exports.LookupManagementController = LookupManagementController;
__decorate([
    (0, common_1.Post)(':lookupType/upload-csv'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: (_req, file, cb) => {
            const isCsvMime = file.mimetype === 'text/csv' ||
                file.mimetype === 'application/csv' ||
                file.mimetype === 'application/vnd.ms-excel';
            const isCsvExt = file.originalname?.toLowerCase().endsWith('.csv');
            if (!isCsvMime && !isCsvExt) {
                return cb(new common_1.BadRequestException('Only CSV files are allowed for bulk upload'), false);
            }
            return cb(null, true);
        },
    })),
    __param(0, (0, common_1.Param)('lookupType')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "uploadLookupCsv", null);
__decorate([
    (0, common_1.Get)('account-mapping'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [lookup_management_dto_1.QueryLookupDto]),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "findAllAccountMappings", null);
__decorate([
    (0, common_1.Post)('account-mapping'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [lookup_management_dto_1.CreateAccountMappingDto]),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "createAccountMapping", null);
__decorate([
    (0, common_1.Patch)('account-mapping/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, lookup_management_dto_1.UpdateAccountMappingDto]),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "updateAccountMapping", null);
__decorate([
    (0, common_1.Delete)('account-mapping/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "deleteAccountMapping", null);
__decorate([
    (0, common_1.Delete)('account-mapping'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "deleteAllAccountMappings", null);
__decorate([
    (0, common_1.Get)('lookup-kip'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [lookup_management_dto_1.QueryLookupDto]),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "findAllLookupKIP", null);
__decorate([
    (0, common_1.Post)('lookup-kip'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [lookup_management_dto_1.CreateLookupKIPDto]),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "createLookupKIP", null);
__decorate([
    (0, common_1.Patch)('lookup-kip/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, lookup_management_dto_1.UpdateLookupKIPDto]),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "updateLookupKIP", null);
__decorate([
    (0, common_1.Delete)('lookup-kip/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "deleteLookupKIP", null);
__decorate([
    (0, common_1.Delete)('lookup-kip'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "deleteAllLookupKIP", null);
__decorate([
    (0, common_1.Get)('lookup-agent'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [lookup_management_dto_1.QueryLookupDto]),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "findAllLookupAgent", null);
__decorate([
    (0, common_1.Post)('lookup-agent'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [lookup_management_dto_1.CreateLookupAgentDto]),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "createLookupAgent", null);
__decorate([
    (0, common_1.Patch)('lookup-agent/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, lookup_management_dto_1.UpdateLookupAgentDto]),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "updateLookupAgent", null);
__decorate([
    (0, common_1.Delete)('lookup-agent/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "deleteLookupAgent", null);
__decorate([
    (0, common_1.Delete)('lookup-agent'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupManagementController.prototype, "deleteAllLookupAgent", null);
exports.LookupManagementController = LookupManagementController = __decorate([
    (0, common_1.Controller)('lookup-management'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'QC', 'TL_QC', 'TL'),
    __metadata("design:paramtypes", [lookup_management_service_1.LookupManagementService])
], LookupManagementController);
//# sourceMappingURL=lookup-management.controller.js.map