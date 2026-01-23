/**
 * AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
 * Run "npm run generate" to update.
 */

export const ServiceNames = {
  Cheatsheet: 'cheatsheet-service',
  IdentityService: 'identity-service'
} as const;

export type ServiceName = typeof ServiceNames[keyof typeof ServiceNames];

export const Registry = {
  Cheatsheet: {
    name: ServiceNames.Cheatsheet,
    port: 5000,
    url: 'cheatsheet-service.coolcinema.svc.cluster.local:5000',
    description: ''
  },
  IdentityService: {
    name: ServiceNames.IdentityService,
    port: 5000,
    url: 'identity-service.coolcinema.svc.cluster.local:5000',
    description: ''
  }
} as const;

export type RegistryKey = keyof typeof Registry;
