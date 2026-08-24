import type { Ctx } from "./bot.js";

export type Product = { id: string; photo?: string; name: string; description: string; price: number; category: string; stock: number; visibility: boolean; excise_mark: string };
export type CartLine = { productId: string; quantity: number };
export type ShopUser = { telegram_id: number; name: string; username?: string; registration_date: number; orders_count: number; total_spent: number; referral_link: string; invited_users: number[]; discount: number; age_confirmed?: boolean };
export type Order = { id: string; client: number; delivery_method: "pickup" | "delivery"; payment_method: "cash"; items: CartLine[]; total: number; status: "new" | "accepted" | "ready" | "completed" | "cancelled"; timestamp: number; comment: string; address?: string };
export type Referral = { inviter: number; invited: number; timestamp: number; bonus: number };

type StoreCtx = Ctx & { env?: { CHAT_DO?: { idFromName(name: string): unknown; get(id: unknown): { fetch(input: string, init?: { method?: string; body?: string }): Promise<Response> } } } };
let clock = () => Date.now();

/** The single clock seam for timestamps. Tests may replace it without faking data. */
export function now(): number { return clock(); }

export function setClockForTest(next: () => number): void { clock = next; }

async function request<T>(ctx: StoreCtx, path: string, body?: unknown): Promise<T | undefined> {
  const ns = ctx.env?.CHAT_DO;
  if (!ns) return undefined;
  const stub = ns.get(ns.idFromName("shop:global"));
  const response = await stub.fetch(`https://do${path}`, body === undefined ? { method: "GET" } : { method: "POST", body: JSON.stringify(body) });
  if (response.status === 204) return undefined;
  if (!response.ok) throw new Error("shop storage unavailable");
  return (await response.json()) as T;
}

export async function get<T>(ctx: Ctx, key: string): Promise<T | undefined> { return request<T>(ctx as StoreCtx, `/shop/get?key=${encodeURIComponent(key)}`); }
export async function put(ctx: Ctx, key: string, value: unknown): Promise<void> { await request(ctx as StoreCtx, "/shop/put", { key, value }); }
export async function nextId(ctx: Ctx, kind: string): Promise<string | undefined> { return request<string>(ctx as StoreCtx, "/shop/next", { kind }); }

export async function registerUser(ctx: Ctx): Promise<ShopUser | undefined> {
  if (!ctx.from) return undefined;
  const key = `user:${ctx.from.id}`;
  let user = await get<ShopUser>(ctx, key);
  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "Покупатель";
  if (!user) {
    user = { telegram_id: ctx.from.id, name, username: ctx.from.username, registration_date: now(), orders_count: 0, total_spent: 0, referral_link: `ref_${ctx.from.id.toString(36)}`, invited_users: [], discount: 0 };
  } else {
    // Telegram names and usernames can change; retain the registration date and
    // commerce history while keeping the contact record current.
    user.name = name;
    user.username = ctx.from.username;
  }
  await put(ctx, key, user);
  return user;
}

export async function listedProducts(ctx: Ctx): Promise<Product[]> {
  const ids = (await get<string[]>(ctx, "products:index")) ?? [];
  const products = await Promise.all(ids.map((id) => get<Product>(ctx, `product:${id}`)));
  return products.filter((p): p is Product => Boolean(p && p.visibility));
}
export async function saveProduct(ctx: Ctx, product: Product): Promise<void> {
  const ids = (await get<string[]>(ctx, "products:index")) ?? [];
  if (!ids.includes(product.id)) await put(ctx, "products:index", [...ids, product.id]);
  await put(ctx, `product:${product.id}`, product);
}
export async function cart(ctx: Ctx): Promise<CartLine[]> { return (await get<CartLine[]>(ctx, `cart:${ctx.from?.id}`)) ?? []; }
export async function saveCart(ctx: Ctx, lines: CartLine[]): Promise<void> { if (ctx.from) await put(ctx, `cart:${ctx.from.id}`, lines); }
export async function orders(ctx: Ctx): Promise<Order[]> { const ids = (await get<string[]>(ctx, "orders:index")) ?? []; const values = await Promise.all(ids.map((id) => get<Order>(ctx, `order:${id}`))); return values.filter((o): o is Order => Boolean(o)); }
export async function saveOrder(ctx: Ctx, order: Order): Promise<void> { const ids = (await get<string[]>(ctx, "orders:index")) ?? []; if (!ids.includes(order.id)) await put(ctx, "orders:index", [...ids, order.id]); await put(ctx, `order:${order.id}`, order); }
