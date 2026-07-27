"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QaModule = void 0;
const common_1 = require("@nestjs/common");
const qa_controller_1 = require("./qa.controller");
const qa_service_1 = require("./qa.service");
const qa_productivity_controller_1 = require("./qa-productivity.controller");
const qa_productivity_service_1 = require("./qa-productivity.service");
const prisma_module_1 = require("../../../prisma/prisma.module");
const notifications_module_1 = require("../notifications/notifications.module");
let QaModule = class QaModule {
};
exports.QaModule = QaModule;
exports.QaModule = QaModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, notifications_module_1.NotificationsModule],
        controllers: [qa_controller_1.QaController, qa_productivity_controller_1.QaProductivityController],
        providers: [qa_service_1.QaService, qa_productivity_service_1.QaProductivityService],
        exports: [qa_service_1.QaService, qa_productivity_service_1.QaProductivityService],
    })
], QaModule);
//# sourceMappingURL=qa.module.js.map