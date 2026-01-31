import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const configPath = path.join(__dirname, "../vendor.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const DEST_ROOT = path.join(__dirname, "../protos");

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close(() => resolve());
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

async function main() {
  console.log("🔄 Vendoring external protos...");

  if (!config.protos) {
    console.error("Invalid vendor.json format");
    process.exit(1);
  }

  for (const [relativePath, url] of Object.entries(
    config.protos as Record<string, string>,
  )) {
    const destPath = path.join(DEST_ROOT, relativePath);
    const destDir = path.dirname(destPath);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    try {
      await download(url, destPath);
      console.log(`✅ Downloaded: ${relativePath}`);
    } catch (e: any) {
      console.error(`❌ Failed: ${relativePath}`, e.message);
      process.exit(1);
    }
  }
}

main();
