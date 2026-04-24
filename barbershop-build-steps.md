# Barbershop Booking App — High Level Build Steps

---

## 1 — Supabase Setup
- [x] 1.1 Create project & configure environment variables
- [x] 1.2 Write and run all schema migrations (tables, indexes, constraints)
- [x] 1.3 Configure Row Level Security policies for all tables
- [x] 1.4 Set up Supabase Auth (email/password + magic link)
- [ ] 1.5 Write Edge Functions (booking created, booking updated, available slots, reminders cron, expire pending cron, waitlist notify)
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
- [ ] 3.6 Guest magic link email via Brevo

---

## 4 — Admin Core
- [x] 4.1 Admin dashboard (today's bookings, quick stats, needs-attention alerts)
- [x] 4.2 Bookings list page (filterable by status, date, barber; contact reveal toggle; current-booking highlight; view button)
- [x] 4.3 Single booking detail page (customer, appointment, service, notes, other bookings panel)
- [ ] 4.4 Accept / reject actions with status update
- [ ] 4.5 Mark as completed / no-show
- [ ] 4.6 Internal notes on bookings

---

## 5 — Customer Portal
- [x] 5.1 Login & register pages
- [ ] 5.2 Customer dashboard (upcoming bookings)
- [ ] 5.3 Booking detail page (view, cancel, reschedule)
- [ ] 5.4 Booking history & review submission
- [ ] 5.5 Account settings (profile, notification preferences)

---

## 6 — Services & Schedule Management
- [ ] 6.1 Service CRUD (name, price, duration, display order)
- [ ] 6.2 Availability rules (per barber, per day of week)
- [ ] 6.3 Blocked slots UI (holidays, breaks, custom time off)
- [ ] 6.4 Shop settings (buffer time, booking window, auto-accept toggle)

---

## 7 — Brevo Notifications
- [ ] 7.1 Configure Brevo account, API key, sender domain
- [ ] 7.2 Build all email templates (confirmation, accepted, rejected, cancelled, reminder, review invite, waitlist)
- [ ] 7.3 Wire templates to Edge Function triggers
- [ ] 7.4 24hr reminder cron job
- [ ] 7.5 Notification log recording & admin history view

---

## 8 — Polish & V1 Features
- [ ] 8.1 Reviews display (public page + admin visibility toggle)
- [ ] 8.2 Loyalty points tracking
- [ ] 8.3 Discount codes (CRUD + validation at booking)
- [ ] 8.4 Analytics dashboard (bookings, revenue, no-shows, popular services)
- [ ] 8.5 Weekly calendar view in admin
- [ ] 8.6 CSV export of bookings
- [ ] 8.7 Waitlist feature end-to-end

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
