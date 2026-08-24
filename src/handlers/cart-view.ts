import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { cart, get, saveCart, type Product } from "../shop.js";
registerMainMenuItem({ label: "Корзина", data: "cart:view", order: 20 });
const composer = new Composer<Ctx>();
async function render(ctx: Ctx, edit = true) {
  const lines = await cart(ctx); const detailed = await Promise.all(lines.map(async (l) => ({ l, p: await get<Product>(ctx, `product:${l.productId}`) }))); const usable = detailed.filter((x): x is { l: typeof lines[number]; p: Product } => Boolean(x.p));
  if (!usable.length) { const text = "Корзина пуста — выберите товары в каталоге."; const opts = { reply_markup: inlineKeyboard([[inlineButton("Открыть каталог", "catalog:main")], [inlineButton("В меню", "menu:main")]]) }; if (edit) await ctx.editMessageText(text, opts); else await ctx.reply(text, opts); return; }
  const total = usable.reduce((sum, x) => sum + x.p.price * x.l.quantity, 0); const text = `В корзине:\n${usable.map((x) => `${x.p.name} × ${x.l.quantity} — ${(x.p.price * x.l.quantity).toFixed(2)} PLN`).join("\n")}\nИтого: ${total.toFixed(2)} PLN`;
  await ctx.editMessageText(text, { reply_markup: inlineKeyboard([...usable.map((x) => [inlineButton(`Убрать ${x.p.name}`, `cart:remove:${x.p.id}`)]), [inlineButton("Оформить заказ", "checkout:start")], [inlineButton("В меню", "menu:main")]]) });
}
composer.callbackQuery("cart:view", async (ctx) => { await ctx.answerCallbackQuery(); await render(ctx); });
composer.callbackQuery(/^cart:remove:(.+)$/, async (ctx) => { await ctx.answerCallbackQuery(); await saveCart(ctx, (await cart(ctx)).filter((x) => x.productId !== ctx.match[1])); await render(ctx); });
export default composer;
