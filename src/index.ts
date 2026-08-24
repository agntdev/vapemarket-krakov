import { buildBot } from "./bot.js";
import { setDefaultCommands } from "./toolkit/index.js";

async function main() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error("BOT_TOKEN is required");
    process.exit(1);
  }
  const bot = await buildBot(token);
  // /admin is the documented owner shortcut; customer actions remain button-first.
  await setDefaultCommands(bot, [{ command: "admin", description: "Панель управления" }]);
  bot.start();
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
