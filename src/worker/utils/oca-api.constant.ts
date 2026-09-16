// oca-api.constant.ts
import { Logger } from '@nestjs/common';

const logger = new Logger('OcaApiConfig');

export const OCA_BASE_URL = 'https://webapigw.ocatelkom.co.id';

export const OCA_ENDPOINTS = {
  getList: `${OCA_BASE_URL}/oca-interaction/ticketing/get-list`,
  listActivity: `${OCA_BASE_URL}/oca-interaction/ticketing/list-activity`,
};

/**
 * Kredensial basic auth untuk API Telkom OCA.
 *
 * Dibaca dari environment variable bila tersedia, dengan fallback ke nilai lama
 * supaya deployment yang belum menyetel env tidak ikut berhenti. Setel
 * OCA_API_USERNAME / OCA_API_PASSWORD di production, lalu hapus fallback di
 * bawah — kredensial ini sudah pernah ter-commit ke git dan perlu dirotasi.
 */
export const OCA_AUTH = {
  username: process.env.OCA_API_USERNAME ?? 'tsel-app-connectivity',
  password: process.env.OCA_API_PASSWORD ?? '@tsel198xMu918230pp',
};

if (!process.env.OCA_API_USERNAME || !process.env.OCA_API_PASSWORD) {
  logger.warn(
    'OCA_API_USERNAME/OCA_API_PASSWORD belum diset, memakai kredensial hardcoded dari source code.',
  );
}
