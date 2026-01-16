export const ServiceRegistry = {
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
} as const;
