"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDateKey = void 0;
const getDateKey = () => new Date().toISOString().split('T')[0];
exports.getDateKey = getDateKey;
