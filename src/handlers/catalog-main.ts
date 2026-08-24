import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { UNCATEGORIZED, cart, get, listedProducts, saveCart, type Category, type Product } from "../shop.js";
registerMainMenuItem({ label: "Каталог", data: "catalog:main", order: 10 });
const composer = new Composer<Ctx>();
const back = inlineKeyboard([[inlineButton("В меню", "menu:main")]]);
type CatalogCtx = Ctx & { session: { catalogCategory?: Category; catalogSearch?: boolean; catalogQuery?: string } };
const categoryCodes = ["liquids", "cartridges", "pods", "disposables"] as const;
const categories: Record<(typeof categoryCodes)[number], Exclude<Category, typeof UNCATEGORIZED>> = {
  liquids: "Жидкости", cartridges: "Картриджи", pods: "Pod-системы", disposables: "Одноразки",
};
function displayCategory(category: Category): string { return category === UNCATEGORIZED ? "Без категории" : category; }
async function showCatalog(ctx: Ctx, edit: boolean) {
  const kb = inlineKeyboard([
    ...categoryCodes.map((code) => [inlineButton(categories[code], `catalog:category:${code}:0`)]),
    [inlineButton("В меню", "menu:main")],
  ]);
  if (edit) await ctx.editMessageText("Выберите категорию.", { reply_markup: kb }); else await ctx.reply("Выберите категорию.", { reply_markup: kb });
}
async function showProducts(ctx: Ctx, category: Category, page: number, query = "", inStock = false) {
  const all = await listedProducts(ctx, category);
  const needle = query.trim().toLocaleLowerCase("ru");
  const products = all.filter((p) => (!needle || `${p.name} ${p.description}`.toLocaleLowerCase("ru").includes(needle)) && (!inStock || p.stock > 0));
  const safePage = Math.max(0, Math.min(page, Math.max(0, Math.ceil(products.length / 5) - 1)));
  const items = products.slice(safePage * 5, safePage * 5 + 5);
  const suffix = query ? ` Поиск: ${query}.` : "";
  const text = items.length ? `Товары: ${displayCategory(category)}.${suffix}` : `В категории «${displayCategory(category)}» ничего не найдено.${suffix}`;
  const code = categoryCodes.find((key) => categories[key] === category);
  if (!code) { await ctx.editMessageText("Эта категория пока недоступна.", { reply_markup: back }); return; }
  const rows = items.map((p) => [inlineButton(p.name, `product:${p.id}:${code}:${safePage}`)]);
  if (products.length > 5) rows.push([
    ...(safePage > 0 ? [inlineButton("Назад", `catalog:category:${code}:${safePage - 1}`)] : []),
    ...(safePage < Math.ceil(products.length / 5) - 1 ? [inlineButton("Далее", `catalog:category:${code}:${safePage + 1}`)] : []),
  ]);
  rows.push([inlineButton("Поиск в категории", `catalog:search:${code}`), inlineButton("В наличии", `catalog:stock:${code}`)]);
  rows.push([inlineButton("К категориям", "catalog:main")]);
  await ctx.editMessageText(text, { reply_markup: inlineKeyboard(rows) });
}
composer.callbackQuery("catalog:main", async (ctx) => { await ctx.answerCallbackQuery(); await showCatalog(ctx, true); });
composer.callbackQuery(/^catalog:category:(liquids|cartridges|pods|disposables):(\d+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const c = ctx as CatalogCtx; const category = categories[ctx.match[1] as (typeof categoryCodes)[number]]; c.session.catalogCategory = category; await showProducts(ctx, category, Number(ctx.match[2])); });
composer.callbackQuery(/^catalog:stock:(liquids|cartridges|pods|disposables)$/, async (ctx) => { await ctx.answerCallbackQuery(); await showProducts(ctx, categories[ctx.match[1] as (typeof categoryCodes)[number]], 0, "", true); });
composer.callbackQuery(/^catalog:search:(liquids|cartridges|pods|disposables)$/, async (ctx) => { await ctx.answerCallbackQuery(); const c = ctx as CatalogCtx; c.session.catalogCategory = categories[ctx.match[1] as (typeof categoryCodes)[number]]; c.session.catalogSearch = true; await ctx.editMessageText(`Введите запрос для категории «${displayCategory(c.session.catalogCategory)}».`); });
composer.on("message:text", async (ctx, next) => { const c = ctx as CatalogCtx; if (!c.session.catalogSearch || !c.session.catalogCategory) return next(); const query = ctx.message.text.trim(); if (!query) { await ctx.reply("Введите название или описание товара."); return; } const code = categoryCodes.find((key) => categories[key] === c.session.catalogCategory); if (!code) return next(); c.session.catalogSearch = false; c.session.catalogQuery = query; await ctx.reply(`Результаты для «${query}»:`, { reply_markup: inlineKeyboard([[inlineButton("Показать результаты", `catalog:results:${code}`)]]) }); });
composer.callbackQuery(/^catalog:results:(liquids|cartridges|pods|disposables)$/, async (ctx) => { await ctx.answerCallbackQuery(); const c = ctx as CatalogCtx; await showProducts(ctx, categories[ctx.match[1] as (typeof categoryCodes)[number]], 0, c.session.catalogQuery ?? ""); });
composer.callbackQuery(/^product:([^:]+):(liquids|cartridges|pods|disposables):(\d+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const p = await get<Product>(ctx, `product:${ctx.match[1]}`); const code = ctx.match[2]; const page = ctx.match[3]; if (!p || !p.visibility) { await ctx.editMessageText("Этот товар больше недоступен.", { reply_markup: back }); return; } const stock = p.stock > 0 ? `В наличии: ${p.stock} шт.` : "Нет в наличии."; await ctx.editMessageText(`${p.name}\n${p.description}\n${p.price.toFixed(2)} PLN\n${stock}\nАкцизная маркировка: ${p.excise_mark}`, { reply_markup: inlineKeyboard([[inlineButton("Добавить в корзину", `cart:add:${p.id}`)], [inlineButton("К товарам", `catalog:category:${code}:${page}`)]]) }); });
composer.callbackQuery(/^cart:add:(.+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const p = await get<Product>(ctx, `product:${ctx.match[1]}`); if (!p || !p.visibility || p.stock < 1) { await ctx.editMessageText("Товара нет в наличии. Выберите другой вариант.", { reply_markup: back }); return; } const lines = await cart(ctx); const line = lines.find((x) => x.productId === p.id); if (line) line.quantity += 1; else lines.push({ productId: p.id, quantity: 1 }); await saveCart(ctx, lines); await ctx.editMessageText("Товар добавлен в корзину.", { reply_markup: inlineKeyboard([[inlineButton("Открыть корзину", "cart:view")], [inlineButton("Продолжить покупки", "catalog:main")]]) }); });
export default composer;
