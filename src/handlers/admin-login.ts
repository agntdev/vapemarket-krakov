import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { adminChatId, inlineButton, inlineKeyboard, isOwner, registerMainMenuItem } from "../toolkit/index.js";
import { get, type ShopUser } from "../shop.js";

registerMainMenuItem({ label: "Админ-панель", data: "admin:login", order: 90 });
const composer = new Composer<Ctx>();

/** The injected owner is the only super-admin; persisted admins run shop work. */
export async function hasAdminAccess(ctx: Ctx): Promise<boolean> {
  if (isOwner(ctx)) return true;
  const user = ctx.from ? await get<ShopUser>(ctx, `user:${ctx.from.id}`) : undefined;
  return user?.role === "admin";
}

export async function requireAdmin(ctx: Ctx): Promise<boolean> {
  if (await hasAdminAccess(ctx)) return true;
  // The callback has already been acknowledged by callers. Calling
  // requireOwner here used to answer it a second time, causing noisy 400s.
  await ctx.reply(adminChatId(ctx as { env?: Record<string, unknown> | null }) === undefined
    ? "Доступ владельца ещё не настроен."
    : "Доступ к админ-панели ограничен.");
  return false;
}

export async function openAdmin(ctx: Ctx, edit: boolean) {
  if (!(await hasAdminAccess(ctx))) {
    if (edit) await ctx.editMessageText("Доступ к админ-панели ограничен.");
    else await ctx.reply("Доступ к админ-панели ограничен.");
    return;
  }
  const opts = { reply_markup: inlineKeyboard([
    [inlineButton("Товары", "admin:products")],
    [inlineButton("Заказы", "admin:orders")],
    [inlineButton("Пользователи", "admin:users")],
    [inlineButton("Реферальные бонусы", "admin:bonus")],
    [inlineButton("В меню", "menu:main")],
  ]) };
  if (edit) await ctx.editMessageText("Админ-панель. Выберите раздел.", opts);
  else await ctx.reply("Админ-панель. Выберите раздел.", opts);
}

composer.callbackQuery("admin:login", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await requireAdmin(ctx))) return;
  await openAdmin(ctx, true);
});
export default composer;
