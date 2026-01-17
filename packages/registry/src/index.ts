/**
 * AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
 * Run "npm run generate" to update.
 */

export const ServiceNames = {
  Identity: 'identity-service',
  Sales: 'sales-service'
} as const;

export type ServiceName = typeof ServiceNames[keyof typeof ServiceNames];

export const Registry = {
  Identity: {
    name: ServiceNames.Identity,
    port: 3000,
    url: 'http://identity-service.coolcinema.svc.cluster.local:3000',
    description: 'User authentication and profile management'
  },
  Sales: {
    name: ServiceNames.Sales,
    port: 5000,
    url: 'http://sales-service.coolcinema.svc.cluster.local:5000',
    description: ''
  }
} as const;

export type RegistryKey = keyof typeof Registry;
