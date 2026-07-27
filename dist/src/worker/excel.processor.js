"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ExcelProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const prisma_service_1 = require("../../prisma/prisma.service");
const csat_upload_service_1 = require("./services/csat-upload.service");
const call_upload_service_1 = require("./services/call-upload.service");
const omnix_upload_service_1 = require("./services/omnix-upload.service");
const oca_upload_service_1 = require("./services/oca-upload.service");
const fs = __importStar(require("fs"));
const common_1 = require("@nestjs/common");
const avaya_upload_service_1 = require("./services/avaya-upload.service");
let ExcelProcessor = ExcelProcessor_1 = class ExcelProcessor extends bullmq_1.WorkerHost {
    prisma;
    csatUploadService;
    callUploadService;
    omnixUploadService;
    ocaUploadService;
    avayaUploadService;
    logger = new common_1.Logger(ExcelProcessor_1.name);
    constructor(prisma, csatUploadService, callUploadService, omnixUploadService, ocaUploadService, avayaUploadService) {
        super();
        this.prisma = prisma;
        this.csatUploadService = csatUploadService;
        this.callUploadService = callUploadService;
        this.omnixUploadService = omnixUploadService;
        this.ocaUploadService = ocaUploadService;
        this.avayaUploadService = avayaUploadService;
    }
    async process(job) {
        const filePath = job.data.path;
        this.logger.log(`Processing ${job.name} with id: ${job.id}`);
        try {
            switch (job.name) {
                case 'process-csat-report':
                    return await this.csatUploadService.process(job);
                case 'process-omnix-report':
                    return await this.omnixUploadService.process(job);
                case 'process-call-report':
                    return await this.callUploadService.process(job);
                case 'process-oca-report':
                    return await this.ocaUploadService.process(job);
                case 'process-avaya-report':
                    return await this.avayaUploadService.process(job);
                default:
                    throw new Error(`Unknown job name: ${job.name}`);
            }
        }
        catch (error) {
            console.error(`Error processing job ${job.id} (${job.name}):`, error);
            throw error;
        }
        finally {
            await this.removeFile(filePath);
        }
    }
    async removeFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
            }
        }
        catch (err) {
            console.error(`Failed to delete file ${filePath}:`, err);
        }
    }
};
exports.ExcelProcessor = ExcelProcessor;
exports.ExcelProcessor = ExcelProcessor = ExcelProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('excel-queue'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        csat_upload_service_1.CsatUploadService,
        call_upload_service_1.CallUploadService,
        omnix_upload_service_1.OmnixUploadService,
        oca_upload_service_1.OcaUploadService,
        avaya_upload_service_1.AvayaUploadService])
], ExcelProcessor);
//# sourceMappingURL=excel.processor.js.map