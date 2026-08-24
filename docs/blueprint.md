# VapeShop PL — Bot specification

**Archetype:** commerce

**Voice:** профессиональный и лаконичный — write every user-facing message, button label, error, and empty state in this voice.

Русскоязычный Telegram-бот интернет-магазина легальных вейп-товаров в Кракове. Позволяет просматривать каталог, добавлять товары в корзину, оформлять заказы с оплатой наличными при получении, а администраторам — управлять товарами, заказами и пользователями через ролями.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- взрослые пользователи (18+) в Кракове
- администраторы магазина

## Success criteria

- 100% заказов обрабатываются администраторами
- реферальная система активна у 20% пользователей
- ноль ошибок в обработке оплаты наличными

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Открыть главное меню
- **Каталог** (button, actor: user, callback: catalog:main) — Просмотр категорий и товаров
- **Корзина** (button, actor: user, callback: cart:view) — Просмотр и редактирование корзины
- **Админ-панель** (button, actor: admin, callback: admin:login) — Вход в админ-панель по Telegram ID
- **/admin** (command, actor: admin, command: /admin) — Альтернативный вход в админ-панель

## Flows

### Покупка товара
_Trigger:_ Каталог → Товар → Добавить в корзину

1. Выбор категории
2. Выбор товара
3. Добавление в корзину
4. Оформление заказа
5. Подтверждение заказа

_Data touched:_ product, cart, order

### Админ-управление
_Trigger:_ Админ-панель → Вход

1. Аутентификация по Telegram ID
2. Выбор роли
3. Управление товарами/заказами/пользователями

_Data touched:_ admin, product, order, user

### Реферальная программа
_Trigger:_ Реферальная программа → Ссылка

1. Показ реферальной ссылки
2. Приглашение пользователя
3. Начисление бонуса администратором

_Data touched:_ referral, user

## Owner-supplied settings

The OWNER provides these; they are collected in chat and injected into the environment at deploy. Read each one from the environment where it is used (`ctx.env.<KEY>` / `env.<KEY>` on Cloudflare Workers; `process.env.<KEY>` only as a Node/harness fallback — never the sole read). Do NOT invent your own way of learning the value, do NOT ask for it in a bot message, and do NOT hardcode a default.

- **ADMIN_CHAT_ID** — Telegram ID чата для уведомлений о новых заказах
  - this is the OWNER's own chat id; the platform already knows it. Read `ADMIN_CHAT_ID` via `ctx.env` (prefer toolkit `adminChatId` / `requireOwner`) — never ask a user, never treat whoever writes first as the admin, never invent claim-admin or open manage for everyone.
  - may be UNSET at runtime: the bot must still start, and the feature needing ADMIN_CHAT_ID must say so plainly instead of failing.
- **OWNER_TELEGRAM_ID** — Telegram ID владельца для управления админ-ролями
  - this is the OWNER's own chat id; the platform already knows it. Read `OWNER_TELEGRAM_ID` via `ctx.env` (prefer toolkit `adminChatId` / `requireOwner`) — never ask a user, never treat whoever writes first as the admin, never invent claim-admin or open manage for everyone.
  - may be UNSET at runtime: the bot must still start, and the feature needing OWNER_TELEGRAM_ID must say so plainly instead of failing.

Your behavioral specs run WITHOUT these values, so no spec may depend on one.

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

An entity that merely NAMES an owner-supplied setting above (an admin chat, an API account) is not something to store or discover — read it from the environment.

- **product** _(retention: persistent)_ — Товар в каталоге
  - fields: id, photo, name, description, price, category, stock, visibility, excise_mark
- **order** _(retention: persistent)_ — Заказ пользователя
  - fields: id, client, delivery_method, payment_method, items, total, status, timestamp, comment
- **user** _(retention: persistent)_ — Пользователь магазина
  - fields: telegram_id, name, registration_date, orders_count, total_spent, referral_link, invited_users, discount
- **referral** _(retention: persistent)_ — Реферальная запись
  - fields: inviter, invited, timestamp, bonus

## Integrations

- **Telegram** (required) — Bot API messaging
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Telegram ID админ-чата
- роли администраторов
- настройка реферальных бонусов
- активация/деактивация товаров

## Notifications

- Уведомление админ-чата о новом заказе
- Подтверждение заказа пользователю
- Уведомление о статусе заказа

## Permissions & privacy

- Доступ к Telegram ID пользователей
- Хранение персональных данных (имя, телефон, адрес) в соответствии с GDPR

## Edge cases

- Нет товара в наличии при оформлении заказа
- Пользователь отклоняет возрастное подтверждение
- Ошибка ввода адреса при доставке

## Required tests

- Покупка товара из корзины с оплатой наличными
- Создание и обработка заказа администратором
- Реферальная ссылка и начисление бонуса

## Assumptions

- Администраторы идентифицируются по Telegram ID
- Все данные хранятся в базе данных
- Рассылки требуют подтверждения
