import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";

const TEMPLATE = `version: 1.0.0
metadata:
  name: MyService
  slug: my-service
  description: ""

# grpc:
#   main:
#     proto: src/proto/service.proto
#     port: 5000
`;

export const initCommand = async () => {
  const targetPath = path.join(process.cwd(), "coolcinema.yaml");
  if (fs.existsSync(targetPath)) {
    console.error(chalk.red("❌ coolcinema.yaml already exists"));
    process.exit(1);
  }

  const dirName = path.basename(process.cwd());
  const content = TEMPLATE.replace("MyService", toPascalCase(dirName)).replace(
    "my-service",
    dirName,
  );

  fs.writeFileSync(targetPath, content);
  console.log(chalk.green("✅ Created coolcinema.yaml"));
};

function toPascalCase(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (w) => w.toUpperCase())
    .replace(/[\s\-_]+/g, "");
}
