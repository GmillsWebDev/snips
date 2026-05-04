<script lang="ts">
  import { enhance } from '$app/forms'
  import { onDestroy } from 'svelte'
  import type { PageData } from './$types'
  import type { AvailabilityRule } from './+page.server'

  let { data }: { data: PageData } = $props()

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  // Monday first (1–6) then Sunday (0)
  const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

  type DayInfo = {
    dow: number
    name: string
    isWorking: boolean
    shift1: AvailabilityRule | null
    shift2: AvailabilityRule | null
    hasSplit: boolean
  }

  const days: DayInfo[] = $derived(
    DISPLAY_ORDER.map((dow) => {
      const dayRules = data.rules.filter((r) => r.day_of_week === dow)
      const shift1 = dayRules.find((r) => r.shift_number === 1) ?? null
      const shift2 = dayRules.find((r) => r.shift_number === 2) ?? null
      return {
        dow,
        name: DAY_NAMES[dow],
        isWorking: dayRules.some((r) => r.is_working),
        shift1,
        shift2,
        hasSplit: shift2 !== null,
      }
    }),
  )

  let warning = $state<{ dow: number; count: number } | null>(null)
  let submitting = $state<number | null>(null)

  // Per-row debounce/save state keyed by `${dow}-${shiftNumber}`
  type RowState = {
    pendingTimer: ReturnType<typeof setTimeout> | null
    isSaving: boolean
    saveStatus: null | 'saved' | 'error'
    errorMessage: string
    successTimer: ReturnType<typeof setTimeout> | null
    abortController: AbortController | null
  }

  let rowStates = $state<Record<string, RowState>>({})
  const formRefs: Record<string, HTMLFormElement | null> = {}

  function stripSeconds(t: string): string {
    return t.slice(0, 5)
  }

  function getRow(key: string): RowState {
    if (!rowStates[key]) {
      rowStates[key] = {
        pendingTimer: null,
        isSaving: false,
        saveStatus: null,
        errorMessage: '',
        successTimer: null,
        abortController: null,
      }
    }
    return rowStates[key]
  }

  function triggerDebouncedSave(dow: number, shiftNum: number): void {
    const key = `${dow}-${shiftNum}`
    const row = getRow(key)

    if (row.pendingTimer !== null) clearTimeout(row.pendingTimer)
    row.saveStatus = null
    if (row.successTimer !== null) {
      clearTimeout(row.successTimer)
      row.successTimer = null
    }

    row.pendingTimer = setTimeout(async () => {
      row.pendingTimer = null

      if (row.abortController) row.abortController.abort()
      const controller = new AbortController()
      row.abortController = controller

      row.isSaving = true

      const form = formRefs[key]
      if (!form) {
        row.isSaving = false
        return
      }

      try {
        const response = await fetch('?/updateTimes', {
          method: 'POST',
          body: new FormData(form),
          signal: controller.signal,
          headers: { 'x-sveltekit-action': 'true' },
        })

        const result = (await response.json()) as {
          type: string
          data?: { message?: string }
        }

        if (result.type === 'success') {
          row.isSaving = false
          row.saveStatus = 'saved'
          row.successTimer = setTimeout(() => {
            row.saveStatus = null
            row.successTimer = null
          }, 2000)
        } else {
          row.isSaving = false
          row.saveStatus = 'error'
          row.errorMessage = result.data?.message ?? 'Failed to save'
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        row.isSaving = false
        row.saveStatus = 'error'
        row.errorMessage = 'Failed to save'
      }
    }, 700)
  }

  onDestroy(() => {
    for (const row of Object.values(rowStates)) {
      if (row.pendingTimer !== null) clearTimeout(row.pendingTimer)
      if (row.successTimer !== null) clearTimeout(row.successTimer)
      if (row.abortController) row.abortController.abort()
    }
  })
</script>

<svelte:head>
  <title>Schedule — Snips Admin</title>
</svelte:head>

<div class="schedule-page">
  <header class="schedule-page__header">
    <h1 class="schedule-page__title">Schedule</h1>
    <p class="schedule-page__subtitle">Working days for {data.barber.name}</p>
  </header>

  <div class="schedule-grid">
    {#each days as day (day.dow)}
      <div class="schedule-day" class:schedule-day--off={!day.isWorking}>

        <!-- Top row: name · (inline times or "Day off") · day toggle -->
        <div class="schedule-day__header">
          <span class="schedule-day__name">{day.name}</span>

          <div class="schedule-day__center">
            {#if day.isWorking && !day.hasSplit && day.shift1}
              <form
                method="POST"
                action="?/updateTimes"
                class="times-form"
                bind:this={formRefs[`${day.dow}-1`]}
              >
                <input type="hidden" name="dayOfWeek" value={day.dow} />
                <input type="hidden" name="shiftNumber" value="1" />
                <div class="times-row">
                  <input
                    class="time-input"
                    type="time"
                    name="startTime"
                    value={stripSeconds(day.shift1.start_time)}
                    oninput={() => triggerDebouncedSave(day.dow, 1)}
                  />
                  <span class="times-sep">→</span>
                  <input
                    class="time-input"
                    type="time"
                    name="endTime"
                    value={stripSeconds(day.shift1.end_time)}
                    oninput={() => triggerDebouncedSave(day.dow, 1)}
                  />
                  {#if rowStates[`${day.dow}-1`]?.isSaving}
                    <span class="save-spinner" aria-hidden="true"></span>
                  {:else if rowStates[`${day.dow}-1`]?.saveStatus === 'saved'}
                    <span class="save-status save-status--saved">Saved ✓</span>
                  {/if}
                </div>
              </form>
            {:else if !day.isWorking}
              <span class="schedule-day__off-label">Day off</span>
            {/if}
          </div>

          <form
            method="POST"
            action="?/toggleDay"
            use:enhance={() => {
              submitting = day.dow
              return async ({ result, update }) => {
                submitting = null
                const d = result.type === 'failure' ? (result.data as Record<string, unknown>) : null
                if (d?.warning) {
                  warning = { dow: day.dow, count: d.count as number }
                } else {
                  if (warning?.dow === day.dow) warning = null
                  await update()
                }
              }
            }}
          >
            <input type="hidden" name="dayOfWeek" value={day.dow} />
            <input type="hidden" name="currentlyWorking" value={String(day.isWorking)} />
            <button
              type="submit"
              class="toggle"
              class:toggle--on={day.isWorking}
              disabled={submitting === day.dow}
              aria-label="{day.isWorking ? 'Disable' : 'Enable'} {day.name}"
              aria-pressed={day.isWorking}
            >
              <span class="toggle__thumb"></span>
            </button>
          </form>
        </div>

        <!-- Single-shift time error (below header, above split row) -->
        {#if day.isWorking && !day.hasSplit && rowStates[`${day.dow}-1`]?.saveStatus === 'error'}
          <p class="time-error time-error--top">{rowStates[`${day.dow}-1`].errorMessage}</p>
        {/if}

        <!-- Split shift time rows -->
        {#if day.isWorking && day.hasSplit}
          <div class="schedule-day__shifts">
            {#if day.shift1}
              <div class="schedule-day__shift">
                <div class="schedule-day__shift-row">
                  <span class="schedule-day__shift-label">Shift 1</span>
                  <form
                    method="POST"
                    action="?/updateTimes"
                    class="times-form"
                    bind:this={formRefs[`${day.dow}-1`]}
                  >
                    <input type="hidden" name="dayOfWeek" value={day.dow} />
                    <input type="hidden" name="shiftNumber" value="1" />
                    <div class="times-row">
                      <input
                        class="time-input"
                        type="time"
                        name="startTime"
                        value={stripSeconds(day.shift1.start_time)}
                        oninput={() => triggerDebouncedSave(day.dow, 1)}
                      />
                      <span class="times-sep">→</span>
                      <input
                        class="time-input"
                        type="time"
                        name="endTime"
                        value={stripSeconds(day.shift1.end_time)}
                        oninput={() => triggerDebouncedSave(day.dow, 1)}
                      />
                      {#if rowStates[`${day.dow}-1`]?.isSaving}
                        <span class="save-spinner" aria-hidden="true"></span>
                      {:else if rowStates[`${day.dow}-1`]?.saveStatus === 'saved'}
                        <span class="save-status save-status--saved">Saved ✓</span>
                      {/if}
                    </div>
                  </form>
                </div>
                {#if rowStates[`${day.dow}-1`]?.saveStatus === 'error'}
                  <p class="time-error">{rowStates[`${day.dow}-1`].errorMessage}</p>
                {/if}
              </div>
            {/if}
            {#if day.shift2}
              <div class="schedule-day__shift schedule-day__shift--second">
                <div class="schedule-day__shift-row">
                  <span class="schedule-day__shift-label">Second shift</span>
                  <form
                    method="POST"
                    action="?/updateTimes"
                    class="times-form"
                    bind:this={formRefs[`${day.dow}-2`]}
                  >
                    <input type="hidden" name="dayOfWeek" value={day.dow} />
                    <input type="hidden" name="shiftNumber" value="2" />
                    <div class="times-row">
                      <input
                        class="time-input"
                        type="time"
                        name="startTime"
                        value={stripSeconds(day.shift2.start_time)}
                        oninput={() => triggerDebouncedSave(day.dow, 2)}
                      />
                      <span class="times-sep">→</span>
                      <input
                        class="time-input"
                        type="time"
                        name="endTime"
                        value={stripSeconds(day.shift2.end_time)}
                        oninput={() => triggerDebouncedSave(day.dow, 2)}
                      />
                      {#if rowStates[`${day.dow}-2`]?.isSaving}
                        <span class="save-spinner" aria-hidden="true"></span>
                      {:else if rowStates[`${day.dow}-2`]?.saveStatus === 'saved'}
                        <span class="save-status save-status--saved">Saved ✓</span>
                      {/if}
                    </div>
                  </form>
                </div>
                {#if rowStates[`${day.dow}-2`]?.saveStatus === 'error'}
                  <p class="time-error">{rowStates[`${day.dow}-2`].errorMessage}</p>
                {/if}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Split shift toggle -->
        {#if day.isWorking}
          <div class="schedule-day__split-row">
            <span class="schedule-day__split-label">Split shift</span>
            {#if day.hasSplit}
              <form
                method="POST"
                action="?/disableSplitShift"
                use:enhance={() => async ({ result, update }) => {
                  if (result.type !== 'failure') await update()
                }}
              >
                <input type="hidden" name="dayOfWeek" value={day.dow} />
                <button
                  type="submit"
                  class="toggle toggle--on toggle--sm"
                  aria-label="Disable split shift for {day.name}"
                  onclick={(e) => {
                    if (!confirm('Merging shifts will combine your two shifts into one. Continue?')) {
                      e.preventDefault()
                    }
                  }}
                >
                  <span class="toggle__thumb"></span>
                </button>
              </form>
            {:else}
              <form
                method="POST"
                action="?/enableSplitShift"
                use:enhance={() => async ({ result, update }) => {
                  if (result.type !== 'failure') await update()
                }}
              >
                <input type="hidden" name="dayOfWeek" value={day.dow} />
                <button
                  type="submit"
                  class="toggle toggle--sm"
                  aria-label="Enable split shift for {day.name}"
                  disabled={!day.shift1}
                >
                  <span class="toggle__thumb"></span>
                </button>
              </form>
            {/if}
          </div>
        {/if}

        <!-- Day-off warning banner -->
        {#if warning?.dow === day.dow}
          <div class="schedule-day__warning">
            <p class="schedule-day__warning-text">
              This will affect {warning.count} upcoming booking{warning.count === 1 ? '' : 's'}.
              These appointments will not be cancelled automatically. Tap confirm to proceed.
            </p>
            <div class="schedule-day__warning-actions">
              <form
                method="POST"
                action="?/toggleDayConfirmed"
                use:enhance={() => {
                  submitting = day.dow
                  return async ({ update }) => {
                    submitting = null
                    warning = null
                    await update()
                  }
                }}
              >
                <input type="hidden" name="dayOfWeek" value={day.dow} />
                <button type="submit" class="btn btn--danger" disabled={submitting === day.dow}>
                  Confirm
                </button>
              </form>
              <button type="button" class="btn btn--ghost" onclick={() => { warning = null }}>
                Cancel
              </button>
            </div>
          </div>
        {/if}

      </div>
    {/each}
  </div>
</div>

<style>
  .schedule-page {
    max-width: 640px;
    margin: var(--space-8) auto;
    padding: 0 var(--space-6);
  }

  .schedule-page__header {
    margin-bottom: var(--space-8);
  }

  .schedule-page__title {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 var(--space-1);
  }

  .schedule-page__subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  .schedule-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .schedule-day {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    overflow: hidden;
  }

  /* Top row */
  .schedule-day__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-4);
  }

  .schedule-day__name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    width: 2.5rem;
    flex-shrink: 0;
  }

  .schedule-day--off .schedule-day__name {
    color: var(--color-text-muted);
  }

  .schedule-day__center {
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .schedule-day__off-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-subtle);
    font-style: italic;
  }

  /* Time form and inputs */
  .times-form {
    width: 100%;
  }

  .times-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .time-input {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);

    &:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 1px;
      border-color: var(--color-primary);
    }
  }

  .times-sep {
    color: var(--color-text-subtle);
    font-size: var(--font-size-sm);
    flex-shrink: 0;
  }

  /* Save status indicators */
  .save-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .save-status {
    font-size: var(--font-size-xs);
    flex-shrink: 0;
  }

  .save-status--saved {
    color: var(--color-accepted-text);
  }

  /* Split shift rows */
  .schedule-day__shifts {
    border-top: 1px solid var(--color-border);
  }

  .schedule-day__shift {
    padding: var(--space-3) var(--space-4);
  }

  .schedule-day__shift--second {
    border-top: 1px solid var(--color-border);
  }

  .schedule-day__shift-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .schedule-day__shift-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    width: 5.5rem;
    flex-shrink: 0;
  }

  /* Split shift toggle row */
  .schedule-day__split-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-4) var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  .schedule-day__split-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  /* Toggle switch */
  .toggle {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 44px;
    height: 24px;
    padding: 2px;
    border: none;
    border-radius: var(--radius-full);
    background: var(--color-border);
    cursor: pointer;
    transition: background var(--transition);
    flex-shrink: 0;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .toggle--on {
    background: var(--color-primary);
  }

  .toggle--sm {
    width: 36px;
    height: 20px;

    .toggle__thumb {
      width: 16px;
      height: 16px;
    }

    &.toggle--on .toggle__thumb {
      transform: translateX(16px);
    }
  }

  .toggle__thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition);
  }

  .toggle--on .toggle__thumb {
    transform: translateX(20px);
  }

  /* Validation errors */
  .time-error {
    margin: var(--space-1) 0 0;
    font-size: var(--font-size-xs);
    color: var(--color-rejected-text);
  }

  .time-error--top {
    margin: 0;
    padding: 0 var(--space-4) var(--space-2);
  }

  /* Day-off warning banner */
  .schedule-day__warning {
    padding: var(--space-3) var(--space-4) var(--space-4);
    background: var(--color-pending-bg);
    border-top: 1px solid var(--color-border);
  }

  .schedule-day__warning-text {
    font-size: var(--font-size-sm);
    color: var(--color-pending-text);
    margin: 0 0 var(--space-3);
    line-height: 1.5;
  }

  .schedule-day__warning-actions {
    display: flex;
    gap: var(--space-2);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-4);
    font-size: var(--font-size-sm);
    font-weight: 500;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    cursor: pointer;
    transition: var(--transition);

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .btn--danger {
    background: var(--color-rejected-text);
    color: white;

    &:hover:not(:disabled) {
      opacity: 0.85;
    }
  }

  .btn--ghost {
    background: transparent;
    color: var(--color-text-muted);
    border-color: var(--color-border);

    &:hover:not(:disabled) {
      background: var(--color-surface-hover);
      color: var(--color-text);
    }
  }
</style>
