import { loadConfig, requiredEnvNames } from "../config.js";

try {
  loadConfig();
  console.log(`WatchAgent environment OK. Required vars present: ${requiredEnvNames().join(", ")}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
