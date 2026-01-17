export declare const ServiceNames: {
    readonly Identity: "identity-service";
};
export type ServiceName = typeof ServiceNames[keyof typeof ServiceNames];
export declare const Registry: {
    readonly Identity: {
        readonly name: "identity-service";
        readonly port: 3000;
        readonly url: "http://identity-service.coolcinema.svc.cluster.local:3000";
        readonly description: "User authentication and profile management";
    };
};
export type RegistryKey = keyof typeof Registry;
