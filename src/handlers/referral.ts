import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { get, registerUser, type ShopUser } from "../shop.js";
registerMainMenuItem({ label: "Реферальная программа", data: "referral:view", order: 30 });
const composer = new Composer<Ctx>();
composer.callbackQuery("referral:view", async (ctx) => { await ctx.answerCallbackQuery(); const user = await registerUser(ctx); if (!user) { await ctx.editMessageText("Не удалось открыть программу. Попробуйте ещё раз."); return; } const username = ctx.me.username; const link = username ? `https://t.me/${username}?start=${user.referral_link}` : "Ссылка станет доступна после настройки бота."; await ctx.editMessageText(`Пригласите друга и получите бонус после подтверждения администратором.\nВаша ссылка: ${link}\nПриглашено: ${user.invited_users.length}.\nБонус: ${user.discount.toFixed(2)} PLN.`, { reply_markup: inlineKeyboard([[inlineButton("В меню", "menu:main")]]) }); });
export default composer;
