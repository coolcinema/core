import chalk from "chalk";
import * as child_process from "child_process";
import { ICommand } from "./base.command";
import { RegistryService } from "../services/registry.service";
import { CONFIG } from "../config";

export class HostsCommand implements ICommand {
  constructor(private registryService: RegistryService) {}

  async execute() {
    this.registryService.loadFromLocal();
    const services = this.registryService.getServices();

    const domains = new Set<string>();

    // Статические домены из конфига
    CONFIG.INFRA_DOMAINS.forEach((d) => domains.add(d));

    // Динамические домены сервисов
    for (const svc of Object.values(services)) {
      if (svc.ingress) {
        for (const rule of Object.values(svc.ingress as Record<string, any>)) {
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

    // Идемпотентная команда: удаляет старую запись (по маркеру) и добавляет новую
    const marker = "# coolcinema-managed";
    const line = `${hostsLine} ${marker}`;

    // sed удаляет строки с маркером
    // echo | tee -a добавляет новую строку (с sudo)
    const cmd = `sudo sed -i '/${marker}/d' /etc/hosts && echo '${line}' | sudo tee -a /etc/hosts > /dev/null`;

    console.log(chalk.green(cmd));
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
