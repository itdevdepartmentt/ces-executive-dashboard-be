"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = require("path");
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bodyParser: true,
    });
    app.use(require('express').json({ limit: '50mb' }));
    app.use(require('express').urlencoded({ extended: true, limit: '50mb' }));
    const frontendOrigins = (process.env.FRONTEND_URL ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'"],
                fontSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'blob:', ...frontendOrigins],
                scriptSrc: ["'self'"],
                frameAncestors: ["'self'", ...frontendOrigins],
            },
        },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
    }));
    app.setGlobalPrefix('api');
    app.enableCors({
        origin: frontendOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Content-Disposition'],
    });
    app.use((0, cookie_parser_1.default)());
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), {
        prefix: '/api/uploads/',
    });
    await app.listen(process.env.PORT ?? 3000);
    const server = app.getHttpServer();
    server.on('connection', (socket) => {
        socket.on('error', (err) => {
            if (err.code === 'ECONNRESET') {
                return;
            }
            console.error('Socket error:', err);
        });
    });
}
bootstrap();
//# sourceMappingURL=main.js.map