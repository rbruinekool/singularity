"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLogLevel = exports.createLogger = exports.logger = void 0;
var pino_1 = require("pino");
// Determine log level from environment variable, default to 'info'
var getLogLevel = function () {
    var _a;
    var level = (_a = process.env.LOG_LEVEL) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    if (['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(level || '')) {
        return level;
    }
    return 'info'; // default
};
// Create logger with pretty printing for development
exports.logger = (0, pino_1.default)({
    level: getLogLevel(),
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            messageFormat: '{msg}',
        }
    }
});
// Helper function to create context-specific loggers
var createLogger = function (context) {
    return exports.logger.child({ context: context });
};
exports.createLogger = createLogger;
// Helper function to change log level at runtime
var setLogLevel = function (level) {
    exports.logger.level = level;
};
exports.setLogLevel = setLogLevel;
