import { Handler } from "./index";
import { CONFIG } from "../config";

export const GrpcHandler: Handler = {
  async push(ctx, config) {
    const registryData: any = {};

    for (const [key, contract] of Object.entries(config)) {
      // @ts-ignore
      const content = await ctx.readFile(contract.proto);

      const fileName = `${ctx.serviceSlug}_${key}.proto`;
      const remotePath = `${CONFIG.PATHS.CONTRACTS_ROOT}/protos/${fileName}`;

      ctx.uploadFile(remotePath, content);

      registryData[key] = {
        files: [`protos/${fileName}`],
        // @ts-ignore
        port: contract.port,
      };
    }

    return registryData;
  },
};
