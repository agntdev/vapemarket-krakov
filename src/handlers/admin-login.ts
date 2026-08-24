import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, isOwner, registerMainMenuItem, requireOwner } from "../toolkit/index.js";
registerMainMenuItem({ label: "Админ-панель", data: "admin:login", order: 90 });
const composer = new Composer<Ctx>();
export async function openAdmin(ctx: Ctx, edit: boolean) {
  if (!isOwner(ctx)) { if (edit) { await ctx.editMessageText("Доступ к админ-панели есть только у владельца."); } else await ctx.reply("Доступ к админ-панели есть только у владельца."); return; }
  const text = "Админ-панель. Выберите раздел."; const opts = { reply_markup: inlineKeyboard([[inlineButton("Товары", "admin:products")], [inlineButton("Заказы", "admin:orders")], [inlineButton("Пользователи и бонусы", "admin:users")], [inlineButton("В меню", "menu:main")]]) };
  if (edit) await ctx.editMessageText(text, opts); else await ctx.reply(text, opts);
}
composer.callbackQuery("admin:login", async (ctx) => { await ctx.answerCallbackQuery(); if (!(await requireOwner(ctx))) return; await openAdmin(ctx, true); });
export default composer;
