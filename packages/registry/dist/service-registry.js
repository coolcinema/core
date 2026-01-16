"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRegistry = void 0;
exports.ServiceRegistry = {
    Identity: {
        name: "identity-service",
        port: 5000,
        envOverride: "IDENTITY_URL",
    },
    Sales: {
        name: "sales-service",
        port: 5001,
        envOverride: "SALES_URL",
    },
};
//# sourceMappingURL=service-registry.js.map