import chalk from "chalk";
import * as child_process from "child_process";
import { ICommand } from "./base.command";
import { RegistryService } from "../services/registry.service";
import { CONFIG } from "../config";

export class HostsCommand implements ICommand {
  constructor(private registryService: RegistryService) {}

  async execute() {
    this.registryService.loadFromLocal();
    const services = this.registryService.getServices() as Record<string, any>;

    const domains = new Set<string>();

    CONFIG.INFRA_DOMAINS.forEach((d) => domains.add(d));

    for (const svc of Object.values(services)) {
      const service = svc as any;
      if (service.ingress) {
        for (const rule of Object.values(
          service.ingress as Record<string, any>,
        )) {
          if (rule.host) {
            domains.add(rule.host);
          }
        }
      }
    }

    const ip = await this.getMinikubeIp();
    const hostsLine = `${ip} ${Array.from(domains).join(" ")}`;

    console.log(chalk.blue("Detected Minikube IP:"), ip);
    console.log(chalk.blue("Domains to map:"));
    domains.forEach((d) => console.log(` - ${d}`));

    console.log("\nRun this command to update /etc/hosts:");

    const marker = "# coolcinema-managed";
    const line = `${hostsLine} ${marker}`;

    const cmd = `sudo sed -i '/${marker}/d' /etc/hosts && echo '${line}' | sudo tee -a /etc/hosts > /dev/null`;

    console.log(chalk.yellow("Executing with sudo:"), cmd);

    try {
      child_process.execSync(cmd, { stdio: "inherit" });
      console.log(chalk.green("✅ /etc/hosts updated successfully!"));
    } catch (e: any) {
      console.error(chalk.red("❌ Failed to update hosts:"), e.message);
      console.log("Try running manually:", cmd);
    }
  }

  private async getMinikubeIp(): Promise<string> {
    try {
      const ip = child_process.execSync("minikube ip").toString().trim();
      return ip || "127.0.0.1";
    } catch (e) {
      return "127.0.0.1";
    }
  }
}
