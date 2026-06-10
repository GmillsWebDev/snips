<script lang="ts">
  import type { PageData } from './$types'

  type Booking = {
    id: string
    status: string
    start_at: string
    end_at: string
    customers: { first_name: string; last_name: string } | null
    services: { name: string; duration_minutes: number } | null
  }

  const TZ = 'Europe/London'
  const PX_PER_MIN = 1.5
  const GUTTER_W = 60
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const COL_OPTIONS = [1, 3, 5, 7] as const

  let { data }: { data: PageData } = $props()

  const bookings = $derived(data.bookings as unknown as Booking[])

  function parseHHMM(s: string): number {
    const [h, m] = s.split(':').map(Number)
    return h * 60 + m
  }

  const earliestMins = $derived(parseHHMM(data.earliestStart))
  const latestMins   = $derived(parseHHMM(data.latestEnd))
  const totalMins    = $derived(latestMins - earliestMins)
  const totalHeight  = $derived(totalMins * PX_PER_MIN)

  const days = $derived.by(() => {
    const start = new Date(data.weekStart)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setUTCDate(start.getUTCDate() + i)
      return d
    })
  })

  function londonDate(d: Date): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
  }

  const todayKey = londonDate(new Date())

  function currentMondayISO(): string {
    const d = new Date()
    const day = d.getUTCDay()
    d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1))
    return d.toISOString().slice(0, 10)
  }

  const weekLabel = $derived.by(() => {
    const mon = new Date(data.weekStart)
    const sun = new Date(data.weekEnd)
    const fmt = (d: Date) =>
      new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d)
    return `${fmt(mon)} – ${fmt(sun)} ${sun.getUTCFullYear()}`
  })

  const bookingsByDay = $derived.by(() => {
    const map: Record<string, Booking[]> = {}
    for (const b of bookings) {
      const key = londonDate(new Date(b.start_at))
      if (!map[key]) map[key] = []
      map[key].push(b)
    }
    return map
  })

  const hourSlots = $derived.by(() => {
    const startH = Math.floor(earliestMins / 60)
    const endH   = Math.ceil(latestMins / 60)
    return Array.from({ length: endH - startH + 1 }, (_, i) => {
      const h = startH + i
      return { label: `${String(h).padStart(2, '0')}:00`, topPx: (h * 60 - earliestMins) * PX_PER_MIN }
    })
  })

  const halfHourTopsPx = $derived.by(() => {
    const startH = Math.floor(earliestMins / 60)
    const endH   = Math.ceil(latestMins / 60)
    return Array.from({ length: endH - startH }, (_, i) => {
      return (startH * 60 + 30 + i * 60 - earliestMins) * PX_PER_MIN
    }).filter(t => t > 0 && t < totalHeight)
  })

  function timeParts(iso: string): { h: number; m: number } {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(iso))
    return {
      h: parseInt(parts.find(p => p.type === 'hour')?.value   ?? '0', 10),
      m: parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10),
    }
  }

  function formatTime(iso: string): string {
    const { h, m } = timeParts(iso)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  function bookingTopPx(b: Booking): number {
    const { h, m } = timeParts(b.start_at)
    return Math.max(0, (h * 60 + m - earliestMins) * PX_PER_MIN)
  }

  function bookingHeightPx(b: Booking): number {
    return Math.max((b.services?.duration_minutes ?? 30) * PX_PER_MIN, 20)
  }

  function bookingTitle(b: Booking): string {
    const name = b.customers ? `${b.customers.first_name} ${b.customers.last_name}` : 'Customer'
    return `${name} — ${b.services?.name ?? ''} — ${formatTime(b.start_at)}–${formatTime(b.end_at)}`
  }

  function blockStyle(status: string): string {
    if (status === 'pending')  return 'background:#d97706;color:#fff'
    if (status === 'accepted') return 'background:var(--color-primary);color:var(--color-on-primary)'
    return 'background:#555555;color:#cccccc'
  }

  // Mobile
  let mobileColumns = $state(3)

  const mobileStartIndex = $derived.by(() => {
    const todayIdx = days.findIndex(d => londonDate(d) === todayKey)
    if (todayIdx === -1) return 0
    const half = Math.floor(mobileColumns / 2)
    return Math.max(0, Math.min(todayIdx - half, 7 - mobileColumns))
  })

  let calOuterEl: HTMLElement | null = null
  const dayColEls: Record<number, HTMLElement | null> = {}

  $effect(() => {
    const idx = mobileStartIndex
    requestAnimationFrame(() => {
      if (!calOuterEl) return
      const col = dayColEls[idx]
      calOuterEl.scrollLeft = col ? col.offsetLeft - GUTTER_W : 0
    })
  })
</script>

<svelte:head>
  <title>Calendar — Snips Admin</title>
</svelte:head>

<div class="cal-page" style="--mobile-col-count: {mobileColumns}">
  <div class="cal-page__header">
    <h1>Calendar</h1>
    <div class="week-nav">
      <a href="?week={data.prevWeek}" class="week-nav__btn">← Prev</a>
      <span class="week-nav__label">{weekLabel}</span>
      <a href="?week={data.nextWeek}" class="week-nav__btn">Next →</a>
      <a href="?week={currentMondayISO()}" class="week-nav__today">Today</a>
    </div>
  </div>

  <div class="view-selector" role="group" aria-label="Days to show">
    {#each COL_OPTIONS as opt}
      <button
        type="button"
        class="view-selector__btn"
        class:view-selector__btn--active={mobileColumns === opt}
        onclick={() => { mobileColumns = opt }}
      >{opt}</button>
    {/each}
  </div>

  <div class="cal-outer" bind:this={calOuterEl}>
    <div class="cal-grid">

      <!-- Header row -->
      <div class="cal-corner"></div>
      {#each days as day, i}
        {@const isToday = londonDate(day) === todayKey}
        <div class="cal-head" class:cal-head--today={isToday}>
          <span class="cal-head__name">{DAY_NAMES[i]}</span>
          <span class="cal-head__date" class:cal-head__date--today={isToday}>{day.getUTCDate()}</span>
        </div>
      {/each}

      <!-- Gutter -->
      <div class="cal-gutter" style="height: {totalHeight}px">
        {#each hourSlots as slot}
          <span class="cal-gutter__label" style="top: {slot.topPx}px">{slot.label}</span>
        {/each}
      </div>

      <!-- Day columns -->
      {#each days as day, i}
        {@const dayBookings = bookingsByDay[londonDate(day)] ?? []}
        <div
          class="cal-col"
          class:cal-col--weekend={i >= 5}
          style="height: {totalHeight}px"
          bind:this={dayColEls[i]}
        >
          {#each hourSlots as slot}
            <div class="cal-line cal-line--hour" style="top: {slot.topPx}px"></div>
          {/each}
          {#each halfHourTopsPx as top}
            <div class="cal-line cal-line--half" style="top: {top}px"></div>
          {/each}
          {#each dayBookings as b (b.id)}
            <a
              href="/admin/bookings/{b.id}"
              class="booking"
              style="top: {bookingTopPx(b)}px; height: {bookingHeightPx(b)}px; {blockStyle(b.status)}"
              title={bookingTitle(b)}
            >
              {#if (b.services?.duration_minutes ?? 0) >= 30}
                <span class="booking__name">{b.customers?.first_name ?? ''}</span>
                <span class="booking__svc">{b.services?.name ?? ''}</span>
              {/if}
            </a>
          {/each}
        </div>
      {/each}

    </div>
  </div>
</div>

<style>
  .cal-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  /* ── Header ──────────────────────────────────────── */

  .cal-page__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-4);
  }

  .cal-page__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  /* ── Week nav ────────────────────────────────────── */

  .week-nav {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .week-nav__btn,
  .week-nav__today {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-muted);
    text-decoration: none;
    background: var(--color-surface);
    transition: var(--transition);
    white-space: nowrap;

    &:hover {
      color: var(--color-text);
      border-color: var(--color-text-subtle);
      background: var(--color-surface-hover);
      text-decoration: none;
    }
  }

  .week-nav__label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    padding: 0 var(--space-2);
    white-space: nowrap;
  }

  /* ── Mobile view selector ────────────────────────── */

  .view-selector {
    display: none;
    width: max-content;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .view-selector {
      display: flex;
    }
  }

  .view-selector__btn {
    padding: var(--space-1) var(--space-4);
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-muted);
    background: var(--color-surface);
    border: none;
    border-right: 1px solid var(--color-border);
    cursor: pointer;
    transition: var(--transition);

    &:last-child {
      border-right: none;
    }

    &:hover {
      background: var(--color-surface-hover);
      color: var(--color-text);
    }
  }

  .view-selector__btn--active {
    background: var(--color-primary);
    color: var(--color-on-primary);
  }

  /* ── Calendar scroll wrapper ─────────────────────── */

  .cal-outer {
    overflow: auto;
    max-height: calc(100vh - 220px);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  /* ── Grid ────────────────────────────────────────── */

  .cal-grid {
    display: grid;
    grid-template-columns: 60px repeat(7, minmax(100px, 1fr));
    min-width: 100%;
  }

  @media (max-width: 768px) {
    .cal-grid {
      grid-template-columns: 60px repeat(7, calc((100vw - 60px) / var(--mobile-col-count)));
      min-width: unset;
    }
  }

  /* ── Corner ──────────────────────────────────────── */

  .cal-corner {
    position: sticky;
    top: 0;
    left: 0;
    z-index: 4;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
  }

  /* ── Day headers ─────────────────────────────────── */

  .cal-head {
    position: sticky;
    top: 0;
    z-index: 3;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: var(--space-2) var(--space-1);
  }

  .cal-head__name {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .cal-head__date {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .cal-head__date--today {
    background: var(--color-primary);
    color: var(--color-on-primary);
  }

  /* ── Time gutter ─────────────────────────────────── */

  .cal-gutter {
    position: sticky;
    left: 0;
    z-index: 2;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
  }

  .cal-gutter__label {
    position: absolute;
    right: var(--space-2);
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
    transform: translateY(-50%);
    white-space: nowrap;
    pointer-events: none;
    user-select: none;
  }

  /* ── Day columns ─────────────────────────────────── */

  .cal-col {
    position: relative;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);

    &:last-child {
      border-right: none;
    }
  }

  .cal-col--weekend {
    background: var(--color-bg);
  }

  /* ── Grid lines ──────────────────────────────────── */

  .cal-line {
    position: absolute;
    left: 0;
    right: 0;
    pointer-events: none;
  }

  .cal-line--hour {
    border-top: 1px solid var(--color-border);
  }

  .cal-line--half {
    border-top: 1px solid var(--color-border);
    opacity: 0.3;
  }

  /* ── Booking blocks ──────────────────────────────── */

  .booking {
    position: absolute;
    left: 3px;
    right: 3px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    padding: 3px var(--space-1);
    text-decoration: none;
    font-size: 11px;
    line-height: 1.3;
    display: flex;
    flex-direction: column;
    gap: 1px;
    transition: opacity var(--transition);

    &:hover {
      opacity: 0.82;
      text-decoration: none;
    }
  }

  .booking__name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .booking__svc {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.85;
  }
</style>
