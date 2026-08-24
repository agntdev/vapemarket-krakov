import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, mainMenuKeyboard } from "../toolkit/index.js";
import { registerUser, get, put, now, type Referral } from "../shop.js";

const composer = new Composer<Ctx>();
const WELCOME = "VapeShop PL — легальные вейп-товары в Кракове.\nВыберите раздел.";
type AgeCtx = Ctx & { session: { age?: boolean } };

async function menu(ctx: AgeCtx, edit = false) {
  await registerUser(ctx);
  const text = WELCOME;
  const extra = { reply_markup: mainMenuKeyboard() };
  if (edit) await ctx.editMessageText(text, extra); else await ctx.reply(text, extra);
}
composer.command("start", async (ctx) => {
  const c = ctx as AgeCtx;
  const payload = ctx.match?.trim();
  await registerUser(ctx);
  if (payload.startsWith("ref_") && ctx.from) {
    const inviter = parseInt(payload.slice(4), 36);
    if (Number.isSafeInteger(inviter) && inviter !== ctx.from.id && !(await get<Referral>(ctx, `referral:${ctx.from.id}`))) {
      await put(ctx, `referral:${ctx.from.id}`, { inviter, invited: ctx.from.id, timestamp: now(), bonus: 0 });
    }
  }
  if (!c.session.age) {
    await ctx.reply("Подтвердите, что вам уже исполнилось 18 лет.", { reply_markup: inlineKeyboard([[inlineButton("Мне есть 18", "age:yes"), inlineButton("Мне нет 18", "age:no")]]) });
    return;
  }
  await menu(c);
});
composer.callbackQuery("age:yes", async (ctx) => { await ctx.answerCallbackQuery(); (ctx as AgeCtx).session.age = true; await menu(ctx as AgeCtx, true); });
composer.callbackQuery("age:no", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.editMessageText("Продолжить нельзя: магазин работает только для совершеннолетних."); });
composer.callbackQuery("menu:main", async (ctx) => { await ctx.answerCallbackQuery(); const c = ctx as AgeCtx; if (!c.session.age) { await ctx.editMessageText("Сначала подтвердите возраст.", { reply_markup: inlineKeyboard([[inlineButton("Мне есть 18", "age:yes")]]) }); return; } await menu(c, true); });
export default composer;
