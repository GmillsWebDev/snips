# CLAUDE.md — Snips Project Conventions

This file instructs AI agents and coding assistants on the conventions, patterns and structure used in this project. Always follow these rules when generating or editing code.

---

## Project Structure

```
snips/
  app/                        ← SvelteKit frontend
    src/
      lib/
        components/
          ui/                 ← Shared UI primitives (Button, Input, Modal, Toast, Badge)
          booking/            ← Booking flow specific components
          admin/              ← Admin dashboard specific components
        server/               ← Server-only Supabase clients (never imported in browser code)
        utils/                ← Shared utility/helper functions
      routes/
        (public)/             ← Unauthenticated pages (landing, login, register, booking flow)
        (customer)/           ← Authenticated customer pages (dashboard, bookings, account)
        (admin)/
          admin/              ← Admin pages live under /admin/* URL prefix
      app.css                 ← Global styles and CSS custom properties only
      app.d.ts                ← Global TypeScript declarations
      hooks.server.ts         ← Server hooks (Supabase session handling)
  supabase/
    migrations/               ← Numbered SQL migration files
    functions/                ← Supabase Edge Functions (Deno/TypeScript)
      _shared/                ← Shared helpers imported by edge functions
```

---

## Framework & Language

- **SvelteKit** with **Svelte 5** — always use Svelte 5 runes syntax
- **TypeScript** throughout — no plain `.js` files
- **Deno** runtime in Edge Functions — use ESM imports from `https://esm.sh/`

---

## Svelte 5 Rules

Always use runes syntax. Never use legacy Svelte 4 syntax.

```svelte
<!-- ✅ Correct — Svelte 5 -->
let { value, children } = $props()
let count = $state(0)
let doubled = $derived(count * 2)
let label = $derived.by(() => (count > 1 ? 'items' : 'item'))
{@render children()}

<!-- ❌ Wrong — Svelte 4 legacy -->
export let value
$: doubled = count * 2
<slot />
```

- Use `$props()` instead of `export let`
- Use `$state()` instead of `let` for reactive variables
- Use `$derived(expr)` for simple derived values; use `$derived.by(() => { ... })` for multi-line or conditional logic
- Use `$effect(() => { ... })` for side effects that must run when reactive state changes (e.g. syncing a derived value to a `$bindable` prop). Keep effects minimal — prefer `$derived` where possible
- Use `{@render children()}` instead of `<slot />`
- Use `onclick` not `on:click` for event handlers
- Use `export type Foo = { ... }` to export TypeScript types from a `.svelte` file — this is fine. The banned pattern is `export let` for props
- **Never destructure `data` at the top of a page component.** Always reference `data.x` directly in the template. Destructuring (`const { booking } = data`) copies the value at mount and breaks reactivity when SvelteKit updates `data` during same-route navigation (e.g. `/admin/bookings/[id]` → another `[id]`).

---

## Component Conventions

### File Naming
- Components are **PascalCase**: `Button.svelte`, `BookingCard.svelte`
- Route files follow SvelteKit convention: `+page.svelte`, `+layout.svelte`, `+page.server.ts`
- Utility files are **camelCase**: `formatDate.ts`, `supabase.ts`

### Component Structure
Always in this order:
1. `<script lang="ts">` block
2. HTML template
3. `<style>` block

```svelte
<script lang="ts">
  // 1. Type definitions / exported types first
  // 2. Props via $props()
  // 3. State via $state()
  // 4. Derived values via $derived() / $derived.by()
  // 5. Effects via $effect()
  // 6. Functions
</script>

<!-- template -->

<style>
  /* scoped styles */
</style>
```

### Props Typing
Always explicitly type props:

```typescript
// ✅ Correct
let {
  label,
  value = $bindable(''),
  disabled = false,
}: {
  label: string
  value?: string
  disabled?: boolean
} = $props()
```

---

## CSS & Styling Conventions

### No Tailwind
This project does **not** use Tailwind CSS. Do not add Tailwind classes or install Tailwind packages.

### CSS Custom Properties
All design tokens live in `src/app.css` as CSS custom properties under `:root`. Always use these variables — never hardcode colours, spacing, or font sizes.

```css
/* ✅ Correct */
color: var(--color-text);
padding: var(--space-4);
border-radius: var(--radius-md);

/* ✅ Nested CSS is fine */
.card {
  background: var(--color-surface);
  
  &:hover {
    background: var(--color-surface-hover);
  }
  
  &__header {
    padding: var(--space-4);
  }
}

/* ❌ Wrong */
color: #18181b;
padding: 16px;
border-radius: 8px;
```

### Available CSS Variables

**Colours**
```
--color-primary, --color-primary-hover, --color-accent
--color-bg, --color-surface, --color-surface-hover, --color-border
--color-text, --color-text-muted, --color-text-subtle
```

**Status colours** (each has `-bg` and `-text` variant)
```
--color-pending-bg / --color-pending-text
--color-accepted-bg / --color-accepted-text
--color-rejected-bg / --color-rejected-text
--color-cancelled-bg / --color-cancelled-text
--color-completed-bg / --color-completed-text
--color-noshow-bg / --color-noshow-text
```

**Spacing:** `--space-1` through `--space-12`

**Border radius:** `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full`

**Shadows:** `--shadow-sm`, `--shadow-md`, `--shadow-lg`

**Typography:** `--font-sans`, `--font-size-xs` through `--font-size-3xl`

**Transitions:** `--transition`

### BEM-style Class Naming
Use BEM (Block Element Modifier) naming for component classes:

```css
/* Block */
.card { }

/* Element */
.card__header { }
.card__body { }
.card__footer { }

/* Modifier */
.card--featured { }
.btn--primary { }
.btn--sm { }
```

### Scoped vs Global Styles
- Component-specific styles go in the component's `<style>` block (Svelte scopes these automatically)
- Only truly global styles (resets, typography, CSS variables) go in `app.css`
- Never use `:global()` unless absolutely necessary

---

## Supabase Conventions

### Shared Server Utilities

Reusable server-only helpers live in `$lib/server/`. Use these instead of inlining the same logic across route files:

| File | Purpose |
|---|---|
| `resolveCustomer.ts` | Find-or-create a customer row by `shop_id` + `email`. Patches `user_id` onto an existing row when an auth account is present. Used in the booking creation flow. |
| `resolveChair.ts` | Returns a chair id for a barber/shop: prefers the barber's assigned chair, falls back to any active shop chair. Returns `null` if none found. |
| `getRole.ts` | Fetches the `user_roles` row for the current user — used in admin route guards. |

**Customer lookup — two distinct patterns, do not conflate:**

- **Booking creation** (`resolveCustomer`): scoped by `shop_id` + `email`. A customer can exist at multiple shops with the same email — the shop scope is intentional.
- **Auth-linked page loads** (dashboard, booking detail, account): query by `user_id` first via `locals.supabase`, then fall back to `email` via the admin client, patching `user_id` on the row for future lookups. No `shop_id` constraint — these are finding the logged-in user's own record.

### Client Usage
Always use the correct client for the context:

```typescript
// In +page.svelte or browser code — uses anon key, respects RLS
import { createSupabaseBrowserClient } from '$lib/supabase'
const supabase = createSupabaseBrowserClient()

// In +page.server.ts, +layout.server.ts, form actions — uses anon key + user session
const supabase = event.locals.supabase

// In server code that needs to bypass RLS (use sparingly)
import { createSupabaseAdminClient } from '$lib/server/supabase'
const supabase = createSupabaseAdminClient()
```

### Query Patterns
Always handle errors explicitly:

```typescript
// ✅ Correct
const { data, error } = await supabase.from('bookings').select('*')
if (error) throw error

// ❌ Wrong — ignoring the error
const { data } = await supabase.from('bookings').select('*')
```

### Type Safety
Use Supabase's generated types where available. When querying with `.select()`, type the response explicitly if the generated types aren't sufficient.

---

## Routing Conventions

| Route group | URL prefix | Purpose |
|---|---|---|
| `(public)` | `/` | No auth required |
| `(customer)` | `/dashboard`, `/bookings`, etc. | Requires customer auth |
| `(admin)` | `/admin/*` | Requires owner/staff auth |

- Always use `redirect(303, ...)` for auth redirects in server load functions
- Always use `error(403, ...)` for permission errors
- Never do auth checks in `+page.svelte` — always in `+page.server.ts` or `+layout.server.ts`

---

## Edge Functions (Supabase)

- Runtime: **Deno** — use `Deno.env.get()` for environment variables
- Imports: ESM from `https://esm.sh/` or relative `../` imports
- Always wrap the handler body in `try/catch` and return a proper error response
- Always return `new Response(JSON.stringify(...), { headers: { 'Content-Type': 'application/json' } })`
- Shared utilities live in `supabase/functions/_shared/` and are imported with `../`

---

## Database Conventions

- Primary keys: `uuid` using `gen_random_uuid()` — never `uuid_generate_v4()`
- Timestamps: always `timestamptz` — never `timestamp`
- Prices/money: stored as **integer pence** (e.g. 1500 = £15.00) — never floats
- Status enums: enforced with `check` constraints on the column
- All tables have RLS enabled — never disable RLS
- Migration files are numbered sequentially and grouped logically

---

## TypeScript Conventions

- Always use `type` imports: `import type { ... }`
- Avoid `any` — use `unknown` and narrow the type, or define a proper interface
- Export types from the file they are defined in
- Use `interface` for object shapes, `type` for unions and aliases

---

## File Organisation Rules

- One component per file
- Keep files under ~150 lines — split into sub-components if longer
- Co-locate a component's types with the component itself
- Do not import server-only modules (`$lib/server/*`) in client-side code or `.svelte` files

---

## What NOT to Do

- ❌ Do not use Tailwind classes
- ❌ Do not use `export let` for props (Svelte 4 syntax) — use `$props()`. `export type` is fine
- ❌ Do not use `<slot />` (use `{@render children()}`)
- ❌ Do not use `on:click` (use `onclick`)
- ❌ Do not hardcode colours or spacing — use CSS variables
- ❌ Do not use `uuid_generate_v4()` in SQL — use `gen_random_uuid()`
- ❌ Do not store prices as floats — use integer pence
- ❌ Do not skip error handling on Supabase queries
- ❌ Do not do auth checks in `.svelte` files — use server load functions
- ❌ Do not import `$lib/server/*` in browser/component files
- ❌ Do not destructure `data` from `$props()` in page components — reference `data.x` directly so same-route navigations re-render correctly

---

## Deployment

This project is hosted on **Netlify** — not Vercel. Apply this everywhere hosting choices are relevant.

- SvelteKit adapter: **`@sveltejs/adapter-netlify`** — never `adapter-vercel` or `adapter-auto`
- Config lives in `netlify.toml` at the repo root (publish dir, build command, edge function settings)
- Environment variables are set in the Netlify dashboard (or `netlify.toml` for non-secret values)
- Netlify serves SvelteKit SSR via Netlify Functions (Node) — no edge runtime unless explicitly opted in
- Do not generate or reference any Vercel config (`vercel.json`, `VERCEL_*` env vars, Vercel-specific APIs)

---

## Reference Docs

These files contain the full project plan and build checklist — read them when you need broader context on architecture, the DB schema, the booking state machine, or what phase of the build we're in:

- [`barbershop-booking-app-plan.md`](./barbershop-booking-app-plan.md) — full technical plan (architecture, DB schema, routes, edge functions, RLS strategy, feature list)
- [`barbershop-build-steps.md`](./barbershop-build-steps.md) — phased build checklist (companion to the plan above)
