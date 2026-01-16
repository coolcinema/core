export declare const ServiceRegistry: {
    readonly Identity: {
        readonly name: "identity-service";
        readonly port: 5000;
        readonly envOverride: "IDENTITY_URL";
    };
    readonly Sales: {
        readonly name: "sales-service";
        readonly port: 5001;
        readonly envOverride: "SALES_URL";
    };
};
