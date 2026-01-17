"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Registry = exports.ServiceNames = void 0;
exports.ServiceNames = {
    Identity: 'identity-service'
};
exports.Registry = {
    Identity: {
        name: exports.ServiceNames.Identity,
        port: 3000,
        url: 'http://identity-service.coolcinema.svc.cluster.local:3000',
        description: 'User authentication and profile management'
    }
};
//# sourceMappingURL=index.js.map