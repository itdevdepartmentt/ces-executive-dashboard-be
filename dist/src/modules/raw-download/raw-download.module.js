"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawDownloadModule = void 0;
const common_1 = require("@nestjs/common");
const raw_download_controller_1 = require("./raw-download.controller");
const raw_download_service_1 = require("./raw-download.service");
let RawDownloadModule = class RawDownloadModule {
};
exports.RawDownloadModule = RawDownloadModule;
exports.RawDownloadModule = RawDownloadModule = __decorate([
    (0, common_1.Module)({
        controllers: [raw_download_controller_1.RawDownloadController],
        providers: [raw_download_service_1.RawDownloadService],
    })
], RawDownloadModule);
//# sourceMappingURL=raw-download.module.js.map