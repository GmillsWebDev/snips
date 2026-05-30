# Barbershop Booking App — High Level Build Steps

---

## 1 — Supabase Setup
- [x] 1.1 Create project & configure environment variables
- [x] 1.2 Write and run all schema migrations (tables, indexes, constraints)
- [x] 1.3 Configure Row Level Security policies for all tables
- [x] 1.4 Set up Supabase Auth (email/password + magic link)
- [x] 1.5 Write Edge Functions — built: `on-booking-created`, `on-booking-updated`, `send-reminders` (daily cron), `extend-recurring-blocks` (daily cron), `get-available-slots` (HTTP), `send-guest-booking-link`. Remaining: `expire-pending`, `notify-waitlist`
- [ ] 1.6 Configure DB webhooks to trigger Edge Functions

---

## 2 — SvelteKit Scaffold
- [x] 2.1 Initialise project, folder structure, and route groups
- [x] 2.2 Install and configure Supabase JS client
- [x] 2.3 Set up auth session handling (hooks, layout load functions)
- [x] 2.4 Build shared UI component library (buttons, modals, form inputs, toasts)
- [x] 2.5 Configure route guards (public vs customer vs admin)

---

## 3 — Public Booking Flow
- [x] 3.1 Shop landing page (`/book/[slug]`) — page file created, seed data ready for testing
- [x] 3.2 Service selection step
- [x] 3.3 Date & time picker (calls `get-available-slots` Edge Function)
- [x] 3.4 Customer details step (guest or login)
- [x] 3.5 Booking confirmation page
- [x] 3.6 Guest magic link email via Resend (`send-guest-booking-link` edge function)

---

## 4 — Admin Core
- [x] 4.1 Admin dashboard (today's bookings, quick stats, needs-attention alerts)
- [x] 4.2 Bookings list page (filterable by status, date, barber; contact reveal toggle; current-booking highlight; view button)
- [x] 4.3 Single booking detail page (customer, appointment, service, notes, other bookings panel)
- [x] 4.4 Accept / reject actions with status update
- [x] 4.5 Mark as completed / no-show
- [x] 4.6 Internal notes on bookings (collapsible, hidden by default)

---

## 5 — Customer Portal
- [x] 5.1 Login & register pages
- [x] 5.2 Customer dashboard (upcoming bookings)
- [x] 5.3 Booking detail page (view, cancel, reschedule)
- [x] 5.4 Booking history & review submission
- [x] 5.5 Account settings (profile, notification preferences)

---

## 6 — Services & Schedule Management
- [x] 6.1 Service CRUD (name, price, duration, display order, soft-delete with confirmation modal)
- [x] 6.2 Availability rules (per barber, per day of week, split shifts, debounced auto-save with inline feedback)
- [x] 6.3 Blocked slots UI (one-off full day, custom range, recurring breaks with recurrence patterns, expiry alerts, auto-extend cron)
- [x] 6.4 Shop settings — complete. Single `/admin/settings` page with three sections: Booking Preferences (`booking_window_days`, `buffer_minutes` with server-side validation), Display Settings (coming soon toggles), and Branding (four colour pickers with hex inputs, live WCAG AA contrast checker, soft save warning with bypass). Server actions: `?/updatePreferences` and `?/updateBranding`. New components: `ColourRow.svelte` (admin), `ComingSoon.svelte` (ui). New utility: `$lib/utils/contrast.ts`. Migration `20260512000000_client_branding_on_colours.sql` added `color_on_primary` and `color_on_secondary` to `client_branding`.

---

## 7 — Resend Notifications
- [x] 7.1 Configure Resend account, API key, sender domain. Shared `sendEmail` helper at `supabase/functions/_shared/sendEmail.ts`. Test function: `test-resend-connection`.
- [x] 7.2 Build all email templates — 7 templates in `supabase/functions/_templates/`: `bookingConfirmation`, `bookingAccepted`, `bookingRejected`, `bookingCancelled`, `bookingReminder`, `reviewInvite`, `waitlistNotification`. Each exports `getSubject()` and the HTML function. Consistent dark-themed inline HTML, brand colour params, no Tailwind.
- [x] 7.3 Wire templates to Edge Function triggers — `on-booking-created` fires confirmation + owner alert (if not auto-accept); `on-booking-updated` fires accepted / rejected / cancelled / review-invite based on new status.
- [x] 7.4 24hr reminder cron job — `send-reminders` runs daily at 7am UTC; deduplicates via `notification_log`; respects `email_reminders` preference.
- [x] 7.5 Notification log recording & admin history view — all sends logged to `notification_log` with `type`, `channel`, `status: 'sent'`, `sent_at`. Admin booking detail page shows a "Notification history" panel listing all logged notifications with type, channel, timestamp, and status badge. Panel sits side-by-side with "Other bookings" on desktop, stacks on mobile, and expands full-width if the customer has no other bookings.

---

## 8 — Polish & V1 Features
- [x] 8.1 Reviews display (public page + admin visibility toggle)
- [x] 8.2 Loyalty points tracking (earn on completed bookings, admin manual adjust, reward tiers with redemption on admin booking and customer detail pages, customer dashboard points card with log)
- [x] 8.3 Discount codes (CRUD + validation at booking)
- [ ] 8.4 Analytics dashboard (bookings, revenue, no-shows, popular services)
- [ ] 8.5 Weekly calendar view in admin
- [ ] 8.6 CSV export of bookings
- [ ] 8.7 Waitlist feature end-to-end
- [ ] 8.8 Mobile-optimised colour picker for branding settings
- [ ] 8.9 Loyalty tier–reached email notification & admin notification channel settings panel

---

## 9 — Multi-Barber Expansion
- [ ] 9.1 Shop settings toggle (`solo` → `multi`)
- [ ] 9.2 Barber management CRUD
- [ ] 9.3 Chair management & barber assignment
- [ ] 9.4 Barber selection step in booking flow (conditional on plan_type)
- [ ] 9.5 Per-barber schedule & availability management
- [ ] 9.6 Staff login roles (owner vs barber vs receptionist)

---

## 10 — Payments (Stripe)
- [ ] 10.1 Stripe account setup & webhook config
- [ ] 10.2 Deposit amount setting per service
- [ ] 10.3 Payment step in booking flow
- [ ] 10.4 Refund handling on cancellation
- [ ] 10.5 Revenue reporting in analytics

---

*Build steps companion to: `barbershop-booking-app-plan.md`*
