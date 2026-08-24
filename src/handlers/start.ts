import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, mainMenuKeyboard } from "../toolkit/index.js";
import { registerUser, get, put, now, type Referral, type ShopUser } from "../shop.js";

const composer = new Composer<Ctx>();
const WELCOME = "VapeShop PL — легальные вейп-товары в Кракове.\nВыберите раздел.";
type AgeCtx = Ctx & { session: { age?: boolean } };

async function menu(ctx: AgeCtx, edit = false) {
  const text = WELCOME;
  const extra = { reply_markup: mainMenuKeyboard() };
  if (edit) await ctx.editMessageText(text, extra); else await ctx.reply(text, extra);
}
composer.command("start", async (ctx) => {
  const c = ctx as AgeCtx;
  try {
    const payload = ctx.match?.trim() ?? "";
    const user = await registerUser(ctx);
    if (payload.startsWith("ref_") && ctx.from) {
      const inviter = parseInt(payload.slice(4), 36);
      if (Number.isSafeInteger(inviter) && inviter !== ctx.from.id && !(await get<Referral>(ctx, `referral:${ctx.from.id}`))) {
        await put(ctx, `referral:${ctx.from.id}`, { inviter, invited: ctx.from.id, timestamp: now(), bonus: 0 });
        const inviterUser = await get<ShopUser>(ctx, `user:${inviter}`);
        if (inviterUser && !inviterUser.invited_users.includes(ctx.from.id)) {
          inviterUser.invited_users.push(ctx.from.id);
          await put(ctx, `user:${inviter}`, inviterUser);
        }
      }
    }
    if (!c.session.age && !user?.age_confirmed) {
      await ctx.reply("Подтвердите, что вам уже исполнилось 18 лет.", { reply_markup: inlineKeyboard([[inlineButton("Мне есть 18", "age:yes"), inlineButton("Мне нет 18", "age:no")]]) });
      return;
    }
    c.session.age = true;
    await menu(c);
  } catch (error) {
    console.error("[vapeshop] start handler failed", { userId: ctx.from?.id, error });
    await ctx.reply("Не удалось открыть магазин. Попробуйте ещё раз через минуту.");
  }
});
composer.callbackQuery("age:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  const c = ctx as AgeCtx;
  c.session.age = true;
  try {
    const user = await registerUser(ctx);
    if (user) {
      user.age_confirmed = true;
      await put(ctx, `user:${user.telegram_id}`, user);
    }
    await menu(c, true);
  } catch (error) {
    console.error("[vapeshop] age confirmation failed", { userId: ctx.from?.id, error });
    await ctx.editMessageText("Не удалось сохранить подтверждение. Попробуйте ещё раз через минуту.");
  }
});
composer.callbackQuery("age:no", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.editMessageText("Продолжить нельзя: магазин работает только для совершеннолетних."); });
composer.callbackQuery("menu:main", async (ctx) => { await ctx.answerCallbackQuery(); const c = ctx as AgeCtx; if (!c.session.age) { await ctx.editMessageText("Сначала подтвердите возраст.", { reply_markup: inlineKeyboard([[inlineButton("Мне есть 18", "age:yes")]]) }); return; } await menu(c, true); });
export default composer;
