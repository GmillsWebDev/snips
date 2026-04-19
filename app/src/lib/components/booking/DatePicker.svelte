<script lang="ts">
  import { createSupabaseBrowserClient } from '$lib/supabase'

  let {
    barber_id,
    service_id,
    booking_window_days,
    timezone,
    selected_start_at = $bindable(null),
  }: {
    barber_id: string
    service_id: string
    booking_window_days: number
    timezone: string
    selected_start_at?: string | null
  } = $props()

  const supabase = createSupabaseBrowserClient()

  function toDateStr(d: Date): string {
    return d.toLocaleDateString('en-CA')
  }

  function noon(s: string): Date {
    return new Date(`${s}T12:00:00`)
  }

  const todayStr = toDateStr(new Date())
  const todayYear = new Date().getFullYear()
  const todayMonthIndex = new Date().getMonth()
  const maxDateStr = toDateStr(new Date(noon(todayStr).getTime() + booking_window_days * 86_400_000))

  let windowStart = $state(noon(todayStr))
  let showMonth = $state(false)
  let monthYear = $state(todayYear)
  let monthMonth = $state(todayMonthIndex)
  let selectedDate = $state<string | null>(null)

  // Deeply reactive — property assignments are tracked by Svelte 5
  let availability = $state<Record<string, string>>({})
  let slotCache = $state<Record<string, string[]>>({})

  let slots = $derived(selectedDate ? (slotCache[selectedDate] ?? []) : [])

  let stripDates = $derived.by(() => {
    const out: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(windowStart)
      d.setDate(d.getDate() + i)
      out.push(toDateStr(d))
    }
    return out
  })

  let canGoPrev = $derived(toDateStr(windowStart) > todayStr)
  let canGoNext = $derived.by(() => {
    const d = new Date(windowStart)
    d.setDate(d.getDate() + 7)
    return toDateStr(d) <= maxDateStr
  })

  let monthGrid = $derived.by(() => {
    const first = new Date(monthYear, monthMonth, 1)
    const last = new Date(monthYear, monthMonth + 1, 0)
    const cells: (string | null)[] = Array((first.getDay() + 6) % 7).fill(null)
    for (let d = 1; d <= last.getDate(); d++) cells.push(toDateStr(new Date(monthYear, monthMonth, d)))
    while (cells.length % 7) cells.push(null)
    const weeks: (string | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
    return weeks
  })

  let monthLabel = $derived(
    new Date(monthYear, monthMonth).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  )
  let canPrevMonth = $derived(
    monthYear > todayYear || (monthYear === todayYear && monthMonth > todayMonthIndex)
  )
  let canNextMonth = $derived(
    toDateStr(new Date(monthYear, monthMonth + 1, 1)) <= maxDateStr
  )

  function outOfRange(s: string): boolean {
    return s < todayStr || s > maxDateStr
  }

  async function fetchAvailability(dateStr: string) {
    if (availability[dateStr] && availability[dateStr] !== 'error') return
    availability[dateStr] = 'loading'
    const { data, error } = await supabase.functions.invoke('get-available-slots', {
      body: { barber_id, service_id, date: dateStr },
    })
    if (error) { availability[dateStr] = 'error'; return }
    const fetched: string[] = data?.slots ?? []
    slotCache[dateStr] = fetched
    availability[dateStr] = fetched.length > 0 ? 'available' : 'unavailable'
  }

  function observe(node: HTMLElement, dateStr: string) {
    let io: IntersectionObserver | null = null
    function attach(s: string) {
      io?.disconnect()
      if (!s || outOfRange(s)) return
      if (!('IntersectionObserver' in window)) { fetchAvailability(s); return }
      io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { fetchAvailability(s); io?.disconnect() }
      }, { threshold: 0.1 })
      io.observe(node)
    }
    attach(dateStr)
    return { update: attach, destroy: () => io?.disconnect() }
  }

  async function selectDate(dateStr: string) {
    if (outOfRange(dateStr) || availability[dateStr] === 'unavailable') return
    selectedDate = dateStr
    selected_start_at = null
    if (!slotCache[dateStr]) await fetchAvailability(dateStr)
  }

  function prevWeek() {
    const d = new Date(windowStart); d.setDate(d.getDate() - 7)
    windowStart = toDateStr(d) >= todayStr ? d : noon(todayStr)
  }
  function nextWeek() {
    const d = new Date(windowStart); d.setDate(d.getDate() + 7); windowStart = d
  }
  function prevMonth() { if (monthMonth === 0) { monthYear--; monthMonth = 11 } else monthMonth-- }
  function nextMonth() { if (monthMonth === 11) { monthYear++; monthMonth = 0 } else monthMonth++ }
  function openMonth() { monthYear = windowStart.getFullYear(); monthMonth = windowStart.getMonth(); showMonth = true }

  function pickFromMonth(dateStr: string) {
    if (!dateStr || outOfRange(dateStr) || availability[dateStr] === 'unavailable') return
    showMonth = false
    windowStart = noon(dateStr)
    selectDate(dateStr)
  }

  function fmtDay(s: string) { return noon(s).toLocaleDateString('en-GB', { weekday: 'short' }) }
  function fmtDate(s: string) { return noon(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
  function fmtSlot(iso: string) {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timezone })
  }
</script>

<h2 class="step__title">Choose a date & time</h2>

<div class="date-strip">
  <div class="date-strip__row">
    <button class="nav-btn" onclick={prevWeek} disabled={!canGoPrev} aria-label="Previous week">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div class="date-cards">
      {#each stripDates as dateStr (dateStr)}
        {@const oor = outOfRange(dateStr)}
        {@const status = availability[dateStr]}
        {@const unavail = oor || status === 'unavailable'}
        {@const isLoading = status === 'loading'}
        <button
          class="date-card"
          class:date-card--selected={selectedDate === dateStr}
          class:date-card--unavailable={unavail}
          class:date-card--loading={isLoading}
          disabled={unavail || isLoading}
          onclick={() => selectDate(dateStr)}
          use:observe={dateStr}
          aria-pressed={selectedDate === dateStr}
        >
          {#if isLoading}
            <span class="skel skel--sm" aria-hidden="true"></span>
            <span class="skel" aria-hidden="true"></span>
          {:else}
            <span class="date-card__day">{fmtDay(dateStr)}</span>
            <span class="date-card__num">{fmtDate(dateStr)}</span>
            {#if status === 'unavailable'}
              <span class="date-card__badge">Unavailable</span>
            {/if}
          {/if}
        </button>
      {/each}
    </div>

    <button class="nav-btn" onclick={nextWeek} disabled={!canGoNext} aria-label="Next week">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>

  <button class="view-month-btn" onclick={openMonth}>View full calendar</button>
</div>

{#if showMonth}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="month-backdrop" onclick={() => (showMonth = false)}></div>

  <div class="month-panel" role="dialog" aria-modal="true" aria-label="Monthly calendar">
    <div class="month-panel__header">
      <button class="nav-btn" onclick={prevMonth} disabled={!canPrevMonth} aria-label="Previous month">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <span class="month-panel__label">{monthLabel}</span>
      <button class="nav-btn" onclick={nextMonth} disabled={!canNextMonth} aria-label="Next month">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <div class="month-grid">
      {#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as hdr}
        <span class="month-grid__hdr">{hdr}</span>
      {/each}
      {#each monthGrid as week}
        {#each week as cell}
          {#if cell}
            {@const oor = outOfRange(cell)}
            {@const status = availability[cell]}
            {@const unavail = oor || status === 'unavailable'}
            <button
              class="month-cell"
              class:month-cell--selected={selectedDate === cell}
              class:month-cell--disabled={unavail}
              class:month-cell--today={cell === todayStr}
              class:month-cell--loading={status === 'loading'}
              disabled={unavail}
              onclick={() => pickFromMonth(cell)}
              use:observe={cell}
              aria-label="{noon(cell).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}"
              aria-pressed={selectedDate === cell}
            >
              {noon(cell).getDate()}
            </button>
          {:else}
            <span class="month-cell month-cell--empty"></span>
          {/if}
        {/each}
      {/each}
    </div>

    <button class="month-panel__close" onclick={() => (showMonth = false)}>Close</button>
  </div>
{/if}

{#if selectedDate}
  <div class="slots-section">
    {#if availability[selectedDate] === 'loading'}
      <div class="slots-loading" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <span>Finding available times…</span>
      </div>
    {:else if availability[selectedDate] === 'error'}
      <p class="slots-msg slots-msg--error" role="alert">
        Could not load available times. Please try again.
      </p>
    {:else if slots.length === 0}
      <p class="slots-msg">No availability on this date — please try another day.</p>
    {:else}
      <p class="slots__label">Available times</p>
      <ul class="slots__grid">
        {#each slots as slot (slot)}
          <li>
            <button
              class="slot-btn"
              class:slot-btn--selected={selected_start_at === slot}
              onclick={() => (selected_start_at = slot)}
              aria-pressed={selected_start_at === slot}
            >
              {fmtSlot(slot)}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  .step__title {
    margin-bottom: var(--space-4);
  }

  /* ── Strip ──────────────────────────────────────────────── */
  .date-strip {
    margin-bottom: var(--space-6);
  }

  .date-strip__row {
    display: flex;
    align-items: stretch;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .date-cards {
    display: flex;
    flex: 1;
    gap: var(--space-1);
    min-width: 0;
  }

  .date-card {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-1);
    min-height: 72px;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    cursor: pointer;
    transition: border-color var(--transition), background var(--transition);

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      background: var(--color-surface-hover);
    }
  }

  .date-card--selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));

    & .date-card__day,
    & .date-card__num {
      color: var(--color-primary);
    }
  }

  .date-card--unavailable {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .date-card--loading {
    cursor: default;
  }

  .date-card__day {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  .date-card__num {
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-text);
  }

  .date-card__badge {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-subtle);
  }

  /* ── Nav buttons ────────────────────────────────────────── */
  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    flex-shrink: 0;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    transition: border-color var(--transition), color var(--transition);

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }

  /* ── View month link ────────────────────────────────────── */
  .view-month-btn {
    background: none;
    border: none;
    padding: 0;
    font-size: var(--font-size-sm);
    color: var(--color-primary);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover {
      color: var(--color-primary-hover);
    }
  }

  /* ── Skeleton ───────────────────────────────────────────── */
  .skel {
    width: 80%;
    height: 12px;
    border-radius: var(--radius-sm);
    background: var(--color-border);
    animation: pulse 1.2s ease-in-out infinite;
  }

  .skel--sm {
    width: 50%;
    height: 10px;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1 }
    50% { opacity: 0.35 }
  }

  /* ── Month overlay ──────────────────────────────────────── */
  .month-backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 40%);
    z-index: 100;
  }

  .month-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 101;
    width: min(360px, calc(100vw - var(--space-8)));
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    padding: var(--space-6);
  }

  .month-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .month-panel__label {
    font-size: var(--font-size-base);
    font-weight: 700;
    color: var(--color-text);
  }

  /* ── Month grid ─────────────────────────────────────────── */
  .month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    margin-bottom: var(--space-4);
  }

  .month-grid__hdr {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-align: center;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding-bottom: var(--space-2);
  }

  .month-cell {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-sm);
    font-weight: 500;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    transition: background var(--transition), color var(--transition);

    &:hover:not(:disabled) {
      background: var(--color-surface-hover);
    }
  }

  .month-cell--empty {
    pointer-events: none;
  }

  .month-cell--today {
    font-weight: 700;
    box-shadow: inset 0 0 0 1px var(--color-primary);
  }

  .month-cell--selected {
    background: var(--color-primary);
    color: white;
  }

  .month-cell--disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .month-cell--loading {
    animation: pulse 1.2s ease-in-out infinite;
  }

  .month-panel__close {
    display: block;
    width: 100%;
    padding: var(--space-2);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: border-color var(--transition);

    &:hover {
      border-color: var(--color-primary);
    }
  }

  /* ── Slots ──────────────────────────────────────────────── */
  .slots-section {
    margin-top: var(--space-2);
  }

  .slots-loading {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    padding: var(--space-4) 0;
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin { to { transform: rotate(360deg) } }

  .slots-msg {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    padding: var(--space-4) 0;
  }

  .slots-msg--error { color: var(--color-error); }

  .slots__label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: var(--space-3);
  }

  .slots__grid {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .slot-btn {
    padding: var(--space-2) var(--space-3);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    cursor: pointer;
    transition: border-color var(--transition), background var(--transition);

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-surface-hover);
    }
  }

  .slot-btn--selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
    color: var(--color-primary);
  }
</style>
