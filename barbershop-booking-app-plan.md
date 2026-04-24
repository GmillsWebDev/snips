# Barbershop Booking App — Full Technical Plan

> **Stack:** SvelteKit · Supabase · Brevo · Stripe (later)  
> **Scope:** UK-only, single timezone (`Europe/London`)  
> **MVP Target:** Solo barber / single chair, expandable to multi-chair shops

---

## Table of Contents

1. [Core Architecture](#1-core-architecture)
2. [The shop_type Model](#2-the-shop_type-model)
3. [Database Schema](#3-database-schema)
4. [Booking State Machine](#4-booking-state-machine)
5. [SvelteKit Route Structure](#5-sveltekit-route-structure)
6. [Supabase Edge Functions](#6-supabase-edge-functions)
7. [Brevo Integration Points](#7-brevo-integration-points)
8. [Row Level Security Strategy](#8-row-level-security-strategy)
9. [Solo → Multi Expansion Path](#9-solo--multi-expansion-path)
10. [Feature List by Priority](#10-feature-list-by-priority)
11. [Build Order — Recommended Phases](#11-build-order--recommended-phases)

---

## 1. Core Architecture

| Layer | Technology |
|---|---|
| Frontend | SvelteKit (SSR + client routing) |
| Backend / DB | Supabase (Postgres + RLS + Edge Functions) |
| Auth | Supabase Auth (email/password, magic link, guest flow) |
| Email / SMS / WhatsApp | Brevo (transactional + scheduled) |
| Payments (later) | Stripe |
| Hosting | Netlify |

---

## 2. The `shop_type` Model

Every shop registers with a `plan_type` that gates features and determines UI rendering. This single field drives conditional logic throughout the entire app — routes, components, and DB queries all branch on it. Adding new plan tiers later (e.g. `franchise`) is trivial.

| Value | Who it's for | What it unlocks |
|---|---|---|
| `solo` | Single barber, single chair | Simplified booking (no barber/chair selection) |
| `multi` | Shop owner, multiple chairs | Full staff management, per-barber schedules, chair assignment |

---

## 3. Database Schema

### `shops`
```sql
id                   uuid PK
owner_id             uuid → auth.users
name                 text
slug                 text UNIQUE        -- e.g. "cuts-by-dave" for public booking URL
plan_type            text               -- 'solo' | 'multi'
auto_accept          boolean DEFAULT false
booking_window_days  int DEFAULT 28     -- how far ahead customers can book
buffer_minutes       int DEFAULT 0      -- gap between appointments
timezone             text DEFAULT 'Europe/London'
logo_url             text
brand_colour         text               -- hex, for branded emails
is_active            boolean DEFAULT true
created_at           timestamptz
```

### `barbers`
```sql
id          uuid PK
shop_id     uuid → shops
user_id     uuid → auth.users   -- nullable: owner can add barbers without accounts
name        text
email       text
phone       text
avatar_url  text
is_active   boolean DEFAULT true
```

> For `solo` plan: one barber row is auto-created on shop setup. The UI hides barber selection entirely.

### `chairs`
```sql
id          uuid PK
shop_id     uuid → shops
label       text               -- e.g. "Chair 1", "Alex's Station"
barber_id   uuid → barbers     -- nullable: chair can be unassigned
is_active   boolean
```

> For `solo` plan: one chair row is auto-created on setup and hidden from UI.

### `services`
```sql
id               uuid PK
shop_id          uuid → shops
name             text               -- e.g. "Skin Fade"
description      text
duration_minutes int
price_pence      int                -- store in pence, display as £
is_active        boolean
display_order    int
```

### `availability_rules`
```sql
id           uuid PK
barber_id    uuid → barbers
day_of_week  int               -- 0=Sun, 6=Sat
start_time   time
end_time     time
is_working   boolean
```

### `blocked_slots`
```sql
id          uuid PK
barber_id   uuid → barbers
start_at    timestamptz
end_at      timestamptz
reason      text               -- "Holiday", "Lunch", etc.
```

### `customers`
```sql
id             uuid PK
user_id        uuid → auth.users   -- nullable for guests
shop_id        uuid → shops
name           text
email          text
phone          text
is_guest       boolean DEFAULT false
loyalty_points int DEFAULT 0
notes          text               -- owner-visible notes
created_at     timestamptz
```

### `bookings`
```sql
id                  uuid PK
shop_id             uuid → shops
customer_id         uuid → customers
barber_id           uuid → barbers
chair_id            uuid → chairs
service_id          uuid → services
status              text               -- see state machine below
start_at            timestamptz
end_at              timestamptz        -- derived: start_at + service.duration
notes               text               -- customer-facing notes
internal_notes      text               -- owner/barber only
cancellation_reason text
deposit_paid_pence  int DEFAULT 0
created_at          timestamptz
updated_at          timestamptz
```

### `waitlist`
```sql
id              uuid PK
shop_id         uuid → shops
customer_id     uuid → customers
service_id      uuid → services
barber_id       uuid → barbers     -- nullable: any barber is ok
preferred_date  date
notified_at     timestamptz        -- null until a slot opens
created_at      timestamptz
```

### `reviews`
```sql
id           uuid PK
booking_id   uuid → bookings UNIQUE
customer_id  uuid → customers
rating       int                -- 1–5
comment      text
is_visible   boolean DEFAULT true
created_at   timestamptz
```

### `notification_log`
```sql
id               uuid PK
booking_id       uuid → bookings
type             text   -- 'confirmation' | 'reminder' | 'accepted' | 'rejected' | 'cancelled' | 'waitlist'
channel          text   -- 'email' | 'sms' | 'whatsapp'
sent_at          timestamptz
brevo_message_id text
status           text   -- 'sent' | 'failed' | 'bounced'
```

### `discount_codes`
```sql
id          uuid PK
shop_id     uuid → shops
code        text UNIQUE
type        text               -- 'percent' | 'fixed_pence'
value       int
max_uses    int
uses_count  int DEFAULT 0
expires_at  timestamptz
is_active   boolean
```

### `user_roles`
```sql
id       uuid PK
user_id  uuid → auth.users
shop_id  uuid → shops
role     text               -- 'owner' | 'barber' | 'receptionist'
```

---

## 4. Booking State Machine

```
                    ┌─────────┐
        (created)   │ PENDING │
                    └────┬────┘
                         │
           ┌─────────────┼──────────────┐
           ▼             ▼              ▼
       ACCEPTED       REJECTED      (auto-expired
           │          (notify)       after X hrs)
           │
     ┌─────┴──────┐
     ▼            ▼
COMPLETED      CANCELLED
               (by customer
                or owner)
     │
     ▼
(review invited)
```

| Transition | Who triggers it | Brevo event fired |
|---|---|---|
| → PENDING | Customer | `booking_confirmation` to customer |
| PENDING → ACCEPTED | Owner / auto-accept | `booking_accepted` to customer |
| PENDING → REJECTED | Owner | `booking_rejected` to customer |
| ACCEPTED → CANCELLED | Customer or owner | `booking_cancelled` to both parties |
| ACCEPTED → COMPLETED | Owner marks done | `review_invite` to customer |
| ACCEPTED → NO_SHOW | Owner marks | Internal log only |

---

## 5. SvelteKit Route Structure

```
src/routes/
│
├── (public)/
│   ├── /                          Landing / marketing page
│   ├── book/[slug]/               Public booking flow (guest or authed)
│   │   ├── +page.svelte           Service → Barber (if multi) → Date/Time → Details
│   │   └── confirm/               Booking confirmation page
│   ├── login/
│   ├── register/
│   └── reviews/[slug]/            Public reviews page
│
├── (customer)/                    Authed customers
│   ├── dashboard/                 My upcoming bookings
│   ├── bookings/[id]/             Booking detail + cancel/reschedule
│   ├── history/                   Past bookings + leave review
│   └── account/                   Profile, notification prefs
│
├── (admin)/                       Owner + staff
│   ├── dashboard/                 Today's bookings, quick stats
│   ├── bookings/
│   │   ├── +page.svelte           All bookings (filterable list + calendar toggle)
│   │   └── [id]/                  Booking detail, accept/reject, internal notes
│   ├── calendar/                  Weekly calendar view
│   ├── customers/                 Customer list + loyalty points + notes
│   ├── services/                  CRUD services
│   ├── barbers/                   CRUD barbers (multi only)
│   ├── schedule/                  Availability rules + block slots
│   ├── analytics/                 Charts: bookings, revenue, no-shows
│   ├── notifications/             Email template preview + history
│   ├── discount-codes/            CRUD discount codes
│   └── settings/
│       ├── shop/                  Name, slug, logo, brand colour
│       ├── booking/               Auto-accept toggle, buffer, window, deposit
│       └── billing/               Plan management (future Stripe)
```

---

## 6. Supabase Edge Functions

| Function | Trigger | Purpose |
|---|---|---|
| `on-booking-created` | DB webhook | Fire Brevo confirmation email, check auto-accept |
| `on-booking-updated` | DB webhook | Fire accepted / rejected / cancelled emails |
| `send-reminders` | Cron (daily 8am) | Find bookings in 24hrs, send Brevo reminders |
| `expire-pending` | Cron (hourly) | Auto-expire pending bookings older than X hrs |
| `notify-waitlist` | DB webhook on cancel | Find waitlisted customers, send slot-open email |
| `get-available-slots` | HTTP (called by frontend) | Compute open slots from rules, blocks & existing bookings |

---

## 7. Brevo Integration Points

| Template Name | Trigger | Recipient |
|---|---|---|
| `booking_confirmation` | Booking created | Customer |
| `booking_accepted` | Status → accepted | Customer |
| `booking_rejected` | Status → rejected | Customer |
| `booking_reminder_24h` | Cron, 24hrs before | Customer |
| `booking_cancelled_customer` | Cancelled by owner | Customer |
| `booking_cancelled_owner` | Cancelled by customer | Owner |
| `review_invite` | Status → completed | Customer |
| `waitlist_slot_open` | Cancellation triggers | Waitlisted customer |
| `new_booking_alert` | Booking created | Owner (if not auto-accept) |
| `guest_booking_link` | Guest books | Customer (magic link to manage booking) |

> All templates should use the shop's `brand_colour` and `logo_url` via Brevo dynamic params for white-labelled, branded emails.

---

## 8. Row Level Security Strategy

| Table | Customer can | Barber can | Owner can |
|---|---|---|---|
| `bookings` | Read/create own | Read assigned | Full access |
| `customers` | Read/edit own | Read | Full access |
| `services` | Read active | Read | Full CRUD |
| `barbers` | Read active | Read own | Full CRUD |
| `reviews` | Read all, write own | Read | Read + hide |
| `discount_codes` | Validate only | — | Full CRUD |

---

## 9. Solo → Multi Expansion Path

The `plan_type` flag on the `shops` table keeps expansion clean and requires no schema migrations:

| Phase | What changes |
|---|---|
| **Now (solo)** | Barber/chair selection hidden in UI. One barber & one chair auto-created on shop setup. Simplified admin dashboard. |
| **Later (multi)** | Toggle `plan_type = 'multi'` on the shop record. The same codebase unlocks barber/chair selection in the booking flow, per-barber schedule management, and staff login roles. |

---

## 10. Feature List by Priority

### ✂️ Must Have (MVP)

**Customer Side**
- Book an appointment (select service, barber if multi, date/time)
- View and cancel their own upcoming bookings
- Email confirmation on booking and cancellation (Brevo)
- Account creation / login (Supabase Auth)
- Guest booking (no account, just email + magic link)

**Owner / Admin Side**
- Dashboard showing all upcoming bookings
- Accept or reject booking requests
- Email notification sent to customer on accept/reject
- View full booking details (name, service, time, contact)

**System**
- Prevent double-booking (slot availability logic)
- Business hours configuration
- Service catalogue (name, duration, price)
- `solo` / `multi` plan_type flag

---

### 👍 Should Have

**Customer Side**
- Email reminder 24hrs before appointment (Brevo scheduled)
- Rescheduling an existing booking

**Owner Side**
- Mark bookings as completed or no-show
- Block out time slots (holidays, breaks, days off)
- Basic analytics — bookings per day/week, popular services
- Multiple barbers support (multi plan)

**System**
- Full booking status flow: Pending → Accepted → Completed / Cancelled / No-show
- Buffer time between appointments
- Max advance booking window (configurable, default 28 days)

---

### 💡 Could Have (V2)

**Customer Side**
- SMS reminders via Brevo
- Favourite barber preference
- View past booking history
- Leave a review / rating after completed appointment

**Owner Side**
- Weekly calendar view
- Export bookings to CSV
- Per-barber schedule management
- Custom confirmation message templates

**System**
- Waitlist — notify customers when a cancelled slot opens
- Coupon / discount codes
- Service packages (e.g. cut + beard)

---

### ✨ Nice to Have (Polish & Scale)

**Customer Side**
- Shareable public booking page (no login needed)
- WhatsApp notifications (Brevo)
- Loyalty points / stamp card system
- One-click "Book same again"

**Owner Side**
- Multi-location support
- Staff roles: barber vs. owner vs. receptionist
- Revenue reports and earnings per barber
- Fully branded email templates with shop logo

**System**
- Google Calendar two-way sync
- Online deposit / payment at time of booking (Stripe)
- PWA support — installable on mobile home screen
- Auto-close stale pending bookings after configurable hours

---

## 11. Build Order — Recommended Phases

| Phase | Name | What to build |
|---|---|---|
| **1** | Foundation | Supabase project, full schema, RLS policies, Auth setup, SvelteKit scaffold, env config |
| **2** | Public Booking Flow | `/book/[slug]` page, slot availability edge function, guest + authed booking, Brevo confirmation email |
| **3** | Admin Core | Dashboard, booking list, accept/reject actions, status updates, owner alert emails |
| **4** | Customer Portal | Login, my bookings page, cancel/reschedule, booking history |
| **5** | Services & Schedule | Service CRUD, availability rules, blocked slots UI |
| **6** | Notifications | 24hr reminder cron, waitlist notify, all cancellation emails |
| **7** | Polish | Reviews, loyalty points, analytics charts, discount codes, calendar view |
| **8** | Multi-barber | Unlock multi plan, barber management pages, per-chair scheduling |
| **9** | Payments | Stripe deposit integration at time of booking |

---

## Notes & Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Auth strategy | Supabase Auth (email/password + magic link) | Built-in, integrates with RLS natively |
| Guest bookings | Yes — email + magic link to manage | Reduces friction for new customers |
| Default booking flow | Manual accept by owner | Gives owner control; auto-accept is opt-in per shop |
| Timezone handling | UK only (`Europe/London`) for now | Simplifies V1; can be made per-shop later |
| Price storage | Integer pence (e.g. 1500 = £15.00) | Avoids floating point issues |
| Slug | Per-shop unique slug for public booking URL | Allows white-label feel without custom domains |
| Plan gating | Single `plan_type` field on `shops` | Simple, no extra tables, easy to extend |

---

*Plan authored: 2026 — ready to build when you are. Start with Phase 1.*
