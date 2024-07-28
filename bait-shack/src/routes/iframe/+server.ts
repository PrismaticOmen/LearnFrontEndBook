import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const GET = async () => {
  const rollupConfigPath = path.join(__dirname, "../../../rollup.config.js");
  const distPath = path.join(__dirname, "dist.js");

  try {
    await new Promise((resolve, reject) => {
      const rollup = spawn("npx", ["rollup", "-c", rollupConfigPath]);

      rollup.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
      });

      rollup.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });

      rollup.on("close", (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(`Rollup process exited with code ${code}`);
        }
      });
    });

    const scriptContent = await fs.readFile(distPath, "utf-8");

    const fullHtml = `
            <html>
                <head>
                    <title>Iframe Content</title>
                </head>
                <body>
                    <script>${scriptContent}</script>
                </body>
            </html>
        `;

    return new Response(fullHtml, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Error generating component", {
      status: 500,
    });
  }
};
