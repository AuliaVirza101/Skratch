import { DEFAULTS } from '@skratch/shared';

export const config = {
    port: parseInt(process.env.PORT || '4000', 10),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    roomCleanupIntervalMs: parseInt(
        process.env.ROOM_CLEANUP_INTERVAL_MS || String(DEFAULTS.ROOM_CLEANUP_INTERVAL_MS),
        10
    ),
    roomIdleTtlMs: parseInt(
        process.env.ROOM_IDLE_TTL_MS || String(DEFAULTS.ROOM_IDLE_TTL_MS),
        10
    ),
};
