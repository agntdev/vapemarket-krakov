import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
const composer = new Composer<Ctx>();
const HELP = "Откройте /start и выберите раздел кнопкой.\nВ каталоге добавьте товар в корзину, затем подтвердите заказ.\nОплата — наличными при получении.";
composer.command("help", async (ctx) => { await ctx.reply(HELP); });
composer.callbackQuery("menu:help", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.editMessageText(HELP, { reply_markup: inlineKeyboard([[inlineButton("В меню", "menu:main")]]) }); });
export default composer;
