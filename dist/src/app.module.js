"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("../prisma/prisma.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const auth_module_1 = require("./modules/auth/auth.module");
const schedule_1 = require("@nestjs/schedule");
const axios_1 = require("@nestjs/axios");
const scheduler_module_1 = require("./scheduler/scheduler.module");
const incident_module_1 = require("./modules/incident/incident.module");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const news_module_1 = require("./modules/news/news.module");
const lookup_management_module_1 = require("./modules/lookup-management/lookup-management.module");
const raw_download_module_1 = require("./modules/raw-download/raw-download.module");
const users_module_1 = require("./modules/users/users.module");
const qa_module_1 = require("./modules/qa/qa.module");
const cache_manager_1 = require("@nestjs/cache-manager");
const keyv_1 = __importDefault(require("keyv"));
const redis_1 = require("@keyv/redis");
const qa_reconciliation_module_1 = require("./modules/qa-reconciliation/qa-reconciliation.module");
const qa_productivity_module_1 = require("./modules/qa-productivity/qa-productivity.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            cache_manager_1.CacheModule.registerAsync({
                isGlobal: true,
                useFactory: () => {
                    const redisUrl = process.env.REDIS_URL;
                    if (redisUrl) {
                        return {
                            stores: [(0, redis_1.createKeyv)(redisUrl)],
                            ttl: 60_000,
                        };
                    }
                    return {
                        stores: [new keyv_1.default()],
                        ttl: 60_000,
                    };
                },
            }),
            axios_1.HttpModule,
            auth_module_1.AuthModule,
            prisma_module_1.PrismaModule,
            dashboard_module_1.DashboardModule,
            scheduler_module_1.SchedulerModule,
            incident_module_1.IncidentModule,
            news_module_1.NewsModule,
            lookup_management_module_1.LookupManagementModule,
            raw_download_module_1.RawDownloadModule,
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(process.cwd(), 'uploads'),
                serveRoot: '/uploads',
                serveStaticOptions: {
                    setHeaders: (res) => {
                        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                    },
                },
            }),
            users_module_1.UsersModule,
            qa_module_1.QaModule,
            qa_reconciliation_module_1.QaReconciliationModule,
            qa_productivity_module_1.QaProductivityModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map