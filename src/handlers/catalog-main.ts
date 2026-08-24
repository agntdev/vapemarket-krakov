import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { cart, get, listedProducts, saveCart, type Product } from "../shop.js";
registerMainMenuItem({ label: "Каталог", data: "catalog:main", order: 10 });
const composer = new Composer<Ctx>();
const back = inlineKeyboard([[inlineButton("В меню", "menu:main")]]);
async function showCatalog(ctx: Ctx, edit: boolean) {
  const products = await listedProducts(ctx);
  if (!products.length) { const text = "Каталог пока пуст. Попробуйте позже."; if (edit) await ctx.editMessageText(text, { reply_markup: back }); else await ctx.reply(text, { reply_markup: back }); return; }
  const categories = [...new Set(products.map((p) => p.category))];
  const kb = inlineKeyboard([...categories.map((c, i) => [inlineButton(c, `cat:${i}`)]), [inlineButton("В меню", "menu:main")]]);
  if (edit) await ctx.editMessageText("Выберите категорию.", { reply_markup: kb }); else await ctx.reply("Выберите категорию.", { reply_markup: kb });
}
composer.callbackQuery("catalog:main", async (ctx) => { await ctx.answerCallbackQuery(); await showCatalog(ctx, true); });
composer.callbackQuery(/^cat:(\d+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const categories = [...new Set((await listedProducts(ctx)).map((p) => p.category))]; const category = categories[Number(ctx.match[1])]; const products = (await listedProducts(ctx)).filter((p) => p.category === category); await ctx.editMessageText(category ? `Товары: ${category}.` : "Категория недоступна.", { reply_markup: inlineKeyboard([...products.map((p) => [inlineButton(p.name, `product:${p.id}`)]), [inlineButton("К категориям", "catalog:main")]]) }); });
composer.callbackQuery(/^product:(.+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const p = await get<Product>(ctx, `product:${ctx.match[1]}`); if (!p || !p.visibility) { await ctx.editMessageText("Этот товар больше недоступен.", { reply_markup: back }); return; } const stock = p.stock > 0 ? `В наличии: ${p.stock} шт.` : "Нет в наличии."; await ctx.editMessageText(`${p.name}\n${p.description}\n${p.price.toFixed(2)} PLN\n${stock}\nАкцизная маркировка: ${p.excise_mark}`, { reply_markup: inlineKeyboard([[inlineButton("Добавить в корзину", `cart:add:${p.id}`)], [inlineButton("К каталогу", "catalog:main")]]) }); });
composer.callbackQuery(/^cart:add:(.+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const p = await get<Product>(ctx, `product:${ctx.match[1]}`); if (!p || !p.visibility || p.stock < 1) { await ctx.editMessageText("Товара нет в наличии. Выберите другой вариант.", { reply_markup: back }); return; } const lines = await cart(ctx); const line = lines.find((x) => x.productId === p.id); if (line) line.quantity += 1; else lines.push({ productId: p.id, quantity: 1 }); await saveCart(ctx, lines); await ctx.editMessageText("Товар добавлен в корзину.", { reply_markup: inlineKeyboard([[inlineButton("Открыть корзину", "cart:view")], [inlineButton("Продолжить покупки", "catalog:main")]]) }); });
export default composer;
