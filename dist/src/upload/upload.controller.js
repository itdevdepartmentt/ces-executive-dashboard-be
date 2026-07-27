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
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const multer_1 = require("multer");
let UploadController = class UploadController {
    excelQueue;
    constructor(excelQueue) {
        this.excelQueue = excelQueue;
    }
    async uploadExcel(file) {
        const job = await this.excelQueue.add('process-csat-report', {
            path: file.path,
            filename: file.originalname,
        });
        return {
            message: 'File CSAT report received. Processing started.',
            jobId: job.id,
        };
    }
    async uploadOmnixReport(file) {
        const job = await this.excelQueue.add('process-omnix-report', {
            path: file.path,
            filename: file.originalname,
        });
        return {
            message: 'File Omnix report received. Processing started.',
            jobId: job.id,
        };
    }
    async uploadCallReport(file) {
        const job = await this.excelQueue.add('process-call-report', {
            path: file.path,
            filename: file.originalname,
        });
        return {
            message: 'File Call report received. Processing started.',
            jobId: job.id,
            filename: file.filename,
        };
    }
    async uploadAvayaReport(file) {
        const job = await this.excelQueue.add('process-avaya-report', {
            path: file.path,
            filename: file.originalname,
        });
        return {
            message: 'File Call report received. Processing started.',
            jobId: job.id,
            filename: file.filename,
        };
    }
    async uploadOcaReport(file) {
        const job = await this.excelQueue.add('process-oca-report', {
            path: file.path,
            filename: file.originalname,
        });
        return {
            message: 'File OCA report received. Processing started.',
            jobId: job.id,
        };
    }
    async getJobStatus(jobId) {
        const job = await this.excelQueue.getJob(jobId);
        if (!job) {
            throw new common_1.NotFoundException(`Job ${jobId} not found`);
        }
        const isCompleted = await job.isCompleted();
        const isFailed = await job.isFailed();
        if (isCompleted) {
            return {
                status: 'completed',
                result: job.returnvalue,
            };
        }
        if (isFailed) {
            return {
                status: 'failed',
                error: job.failedReason,
            };
        }
        return {
            status: 'active',
            progress: job.progress,
        };
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('csat-report'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({ destination: './uploads' }),
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadExcel", null);
__decorate([
    (0, common_1.Post)('omnix-report'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({ destination: './uploads' }),
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadOmnixReport", null);
__decorate([
    (0, common_1.Post)('call-report'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({ destination: './uploads' }),
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadCallReport", null);
__decorate([
    (0, common_1.Post)('avaya-report'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({ destination: './uploads' }),
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadAvayaReport", null);
__decorate([
    (0, common_1.Post)('oca-report'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({ destination: './uploads' }),
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadOcaReport", null);
__decorate([
    (0, common_1.Get)('status/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "getJobStatus", null);
exports.UploadController = UploadController = __decorate([
    (0, common_1.Controller)('upload'),
    __param(0, (0, bullmq_1.InjectQueue)('excel-queue')),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], UploadController);
//# sourceMappingURL=upload.controller.js.map