export interface ServiceManifest {
  version: string;
  service: {
    name: string;
    slug: string;
    repository: string;
    description: string;
    port: number;
    language: string;
  };
  contracts?: {
    proto?: string;
  };
}
