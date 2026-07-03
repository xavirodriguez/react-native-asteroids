"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseConfigSchema = void 0;
const zod_1 = require("zod");
/**
 * Base configuration schema for all games.
 */
exports.BaseConfigSchema = zod_1.z.object({
    KEYS: zod_1.z.object({
        PAUSE: zod_1.z.string(),
        RESTART: zod_1.z.string()
    }).optional(),
    ENEMY_SFX_ENABLED: zod_1.z.boolean().optional()
});
