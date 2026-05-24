import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
try {
  const app = await buildApp(config);
  await app.listen({ host: config.host, port: config.port });
  const model = config.aiProvider === "gemini" ? config.geminiModel : config.openAiModel;
  app.log.info(
    { contextDir: config.contextDir, host: config.host, model, port: config.port, provider: config.aiProvider },
    "Server started"
  );
} catch (error) {
  console.error(error);
  process.exit(1);
}
