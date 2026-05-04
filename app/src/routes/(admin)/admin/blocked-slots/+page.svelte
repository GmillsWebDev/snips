<script lang="ts">
  import { enhance } from '$app/forms'
  import Modal from '$lib/components/ui/Modal.svelte'
  import Toast from '$lib/components/ui/Toast.svelte'
  import type { PageData } from './$types'
  import type { BlockedSlot } from './+page.server'

  let { data }: { data: PageData } = $props()

  // Modal / form state
  let showModal = $state(false)
  let submitting = $state(false)
  let formError = $state<string | null>(null)

  // Form fields
  let blockType = $state<'full_day' | 'custom_range'>('full_day')
  let date = $state('')
  let startTime = $state('')
  let endTime = $state('')
  let reason = $state('')

  const reasonLength = $derived(reason.length)

  // Warning state (booking conflict on createBlock)
  type PendingWarning = {
    count: number
    blockType: 'full_day' | 'custom_range'
    date: string
    startTime: string
    endTime: string
    reason: string
  }
  let pendingWarning = $state<PendingWarning | null>(null)
  let confirmingWarning = $state(false)
  let warningConfirmError = $state<string | null>(null)

  // Delete error toast
  let showErrorToast = $state(false)
  let errorToastMessage = $state('')

  $effect(() => {
    if (!showErrorToast) return
    const t = setTimeout(() => { showErrorToast = false }, 5000)
    return () => clearTimeout(t)
  })

  function openModal() {
    showModal = true
    formError = null
    blockType = 'full_day'
    date = ''
    startTime = ''
    endTime = ''
    reason = ''
  }

  function closeModal() {
    showModal = false
    formError = null
  }

  // Display helpers

  function isFullDayBlock(block: BlockedSlot): boolean {
    const fmt = (d: Date) =>
      d.toLocaleTimeString('en-GB', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    return fmt(new Date(block.start_at)) === '00:00:00' && fmt(new Date(block.end_at)) === '23:59:59'
  }

  function formatLondonDate(d: Date): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).formatToParts(d)
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
    return `${get('weekday')} ${get('day')} ${get('month')} ${get('year')}`
  }

  function formatLondonTime(d: Date): string {
    return d.toLocaleTimeString('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  function formatBlockDisplay(block: BlockedSlot): string {
    const start = new Date(block.start_at)
    const dateStr = formatLondonDate(start)
    if (isFullDayBlock(block)) return dateStr
    return `${dateStr} · ${formatLondonTime(start)} – ${formatLondonTime(new Date(block.end_at))}`
  }
</script>

<svelte:head>
  <title>Blocked Slots — Snips Admin</title>
</svelte:head>

<div class="blocks-page">
  <header class="blocks-page__header">
    <h1>Blocked Slots</h1>
    <button type="button" class="add-btn" onclick={openModal}>Add block</button>
  </header>

  <!-- Booking conflict warning banner -->
  {#if pendingWarning}
    <div class="warning-banner">
      <p class="warning-banner__text">
        This block overlaps with {pendingWarning.count} upcoming booking{pendingWarning.count === 1
          ? ''
          : 's'}. These will not be cancelled automatically. Confirm to proceed.
      </p>
      <div class="warning-banner__actions">
        <form
          method="post"
          action="?/createBlockConfirmed"
          use:enhance={() => {
            confirmingWarning = true
            warningConfirmError = null
            return async ({ result, update }) => {
              confirmingWarning = false
              if (result.type === 'success') {
                pendingWarning = null
                await update()
              } else if (result.type === 'failure') {
                const d = result.data as Record<string, unknown>
                warningConfirmError = String(d?.formError ?? 'An error occurred')
              }
            }
          }}
        >
          <input type="hidden" name="blockType" value={pendingWarning.blockType} />
          <input type="hidden" name="date" value={pendingWarning.date} />
          <input type="hidden" name="startTime" value={pendingWarning.startTime} />
          <input type="hidden" name="endTime" value={pendingWarning.endTime} />
          <input type="hidden" name="reason" value={pendingWarning.reason} />
          <button type="submit" class="btn btn--danger" disabled={confirmingWarning}>Confirm</button>
        </form>
        <button
          type="button"
          class="btn btn--ghost"
          onclick={() => {
            pendingWarning = null
            warningConfirmError = null
          }}
        >Cancel</button>
      </div>
      {#if warningConfirmError}
        <p class="warning-banner__error">{warningConfirmError}</p>
      {/if}
    </div>
  {/if}

  <!-- One-off blocks -->
  <section class="blocks-section">
    <h2 class="blocks-section__title">One-off blocks</h2>

    {#if data.blocks.length === 0}
      <div class="empty-state">
        <p class="empty-state__message">No upcoming blocked slots.</p>
      </div>
    {:else}
      <div class="table-wrap">
        <table class="blocks-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Date / Time</th>
              <th>Reason</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.blocks as block (block.id)}
              <tr>
                <td>
                  <span
                    class="block-badge block-badge--{isFullDayBlock(block) ? 'full' : 'custom'}"
                  >
                    {isFullDayBlock(block) ? 'Full day' : 'Custom range'}
                  </span>
                </td>
                <td class="blocks-table__datetime">{formatBlockDisplay(block)}</td>
                <td class="blocks-table__reason">
                  {#if block.reason}
                    {block.reason}
                  {:else}
                    <span class="blocks-table__no-reason">No reason given</span>
                  {/if}
                </td>
                <td class="blocks-table__actions">
                  <form
                    method="post"
                    action="?/deleteBlock"
                    use:enhance={() => {
                      return async ({ result, update }) => {
                        if (result.type === 'failure') {
                          const d = result.data as Record<string, unknown>
                          errorToastMessage = String(d?.deleteError ?? 'Failed to delete block')
                          showErrorToast = true
                        } else {
                          await update()
                        }
                      }
                    }}
                  >
                    <input type="hidden" name="blockId" value={block.id} />
                    <button
                      type="submit"
                      class="action-btn action-btn--danger"
                      onclick={(e) => {
                        if (!confirm('Delete this blocked slot? This cannot be undone.')) {
                          e.preventDefault()
                        }
                      }}
                    >Delete</button>
                  </form>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <!-- Recurring breaks -->
  <section class="blocks-section">
    <h2 class="blocks-section__title">Recurring breaks</h2>
    <div class="empty-state">
      <p class="empty-state__message">Recurring breaks coming soon.</p>
    </div>
  </section>
</div>

<!-- Add block modal -->
<Modal open={showModal} title="Add blocked slot" onclose={closeModal}>
  <form
    method="post"
    action="?/createBlock"
    use:enhance={() => {
      submitting = true
      const capturedBlockType = blockType
      const capturedDate = date
      const capturedStartTime = startTime
      const capturedEndTime = endTime
      const capturedReason = reason
      return async ({ result, update }) => {
        submitting = false
        if (result.type === 'failure') {
          const d = result.data as Record<string, unknown>
          if (d?.warning) {
            pendingWarning = {
              count: d.count as number,
              blockType: capturedBlockType,
              date: capturedDate,
              startTime: capturedStartTime,
              endTime: capturedEndTime,
              reason: capturedReason,
            }
            closeModal()
          } else {
            formError = String(d?.formError ?? 'An error occurred')
          }
        } else if (result.type === 'success') {
          closeModal()
          await update()
        }
      }
    }}
  >
    <!-- Block type selector -->
    <div class="form-group">
      <div class="type-selector">
        <label class="type-selector__option" class:type-selector__option--active={blockType === 'full_day'}>
          <input type="radio" name="blockType" value="full_day" bind:group={blockType} />
          Full day
        </label>
        <label class="type-selector__option" class:type-selector__option--active={blockType === 'custom_range'}>
          <input type="radio" name="blockType" value="custom_range" bind:group={blockType} />
          Custom time range
        </label>
      </div>
    </div>

    <!-- Date -->
    <div class="form-group">
      <label class="form-label" for="block-date">Date</label>
      <input
        id="block-date"
        type="date"
        name="date"
        class="form-input"
        bind:value={date}
        required
      />
    </div>

    <!-- Time range (custom_range only) -->
    {#if blockType === 'custom_range'}
      <div class="form-group form-group--row">
        <div class="form-group__col">
          <label class="form-label" for="block-start-time">From</label>
          <input
            id="block-start-time"
            type="time"
            name="startTime"
            class="form-input"
            bind:value={startTime}
            required
          />
        </div>
        <div class="form-group__col">
          <label class="form-label" for="block-end-time">To</label>
          <input
            id="block-end-time"
            type="time"
            name="endTime"
            class="form-input"
            bind:value={endTime}
            required
          />
        </div>
      </div>
    {/if}

    <!-- Reason -->
    <div class="form-group">
      <label class="form-label" for="block-reason">
        Reason <span class="form-label__optional">(optional)</span>
      </label>
      <input
        id="block-reason"
        type="text"
        name="reason"
        class="form-input"
        bind:value={reason}
        maxlength="200"
        placeholder="e.g. Holiday, Lunch, Training"
      />
      <p class="form-hint">{reasonLength}/200</p>
    </div>

    {#if formError}
      <p class="form-error">{formError}</p>
    {/if}

    <div class="modal-actions">
      <button type="button" class="btn btn--ghost" onclick={closeModal} disabled={submitting}>
        Cancel
      </button>
      <button type="submit" class="btn btn--primary" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add block'}
      </button>
    </div>
  </form>
</Modal>

<div class="toast-container">
  <Toast show={showErrorToast} message={errorToastMessage} type="error" />
</div>

<style>
  .blocks-page {
    max-width: 860px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .blocks-page__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .blocks-page__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  /* ── Add button ──────────────────────────────────── */

  .add-btn {
    display: inline-flex;
    align-items: center;
    padding: var(--space-2) var(--space-4);
    background: var(--color-primary);
    color: white;
    font-size: var(--font-size-sm);
    font-weight: 500;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition);
    text-decoration: none;

    &:hover {
      background: var(--color-primary-hover);
    }
  }

  /* ── Warning banner ──────────────────────────────── */

  .warning-banner {
    padding: var(--space-4);
    background: var(--color-pending-bg);
    border: 1px solid var(--color-pending-text);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .warning-banner__text {
    font-size: var(--font-size-sm);
    color: var(--color-pending-text);
    margin: 0;
    line-height: 1.5;
  }

  .warning-banner__actions {
    display: flex;
    gap: var(--space-2);
  }

  .warning-banner__error {
    font-size: var(--font-size-xs);
    color: var(--color-rejected-text);
    margin: 0;
  }

  /* ── Sections ────────────────────────────────────── */

  .blocks-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .blocks-section__title {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text);
  }

  /* ── Empty state ─────────────────────────────────── */

  .empty-state {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-8) var(--space-6);
    text-align: center;
  }

  .empty-state__message {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  /* ── Table ───────────────────────────────────────── */

  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .blocks-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  .blocks-table thead {
    border-bottom: 1px solid var(--color-border);
  }

  .blocks-table th {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    font-weight: 600;
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .blocks-table td {
    padding: var(--space-3) var(--space-4);
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .blocks-table tbody tr:last-child td {
    border-bottom: none;
  }

  .blocks-table tbody tr {
    transition: var(--transition);

    &:hover {
      background: var(--color-surface-hover);
    }
  }

  .blocks-table__datetime {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .blocks-table__reason {
    color: var(--color-text-muted);
    max-width: 240px;
  }

  .blocks-table__no-reason {
    font-style: italic;
    color: var(--color-text-subtle);
  }

  .blocks-table__actions {
    width: 1px;
    white-space: nowrap;
    padding-left: 0;
  }

  /* ── Block type badge ────────────────────────────── */

  .block-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: 500;
    white-space: nowrap;
    border: 1px solid;
  }

  .block-badge--full {
    background: var(--color-accepted-bg);
    color: var(--color-accepted-text);
    border-color: var(--color-accepted-text);
  }

  .block-badge--custom {
    background: var(--color-pending-bg);
    color: var(--color-pending-text);
    border-color: var(--color-pending-text);
  }

  /* ── Action buttons ──────────────────────────────── */

  .action-btn {
    display: inline-flex;
    align-items: center;
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: var(--color-text-muted);
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: none;
    cursor: pointer;
    transition: var(--transition);

    &:hover:not(:disabled) {
      color: var(--color-text);
      border-color: var(--color-text-subtle);
      background: var(--color-surface-hover);
    }
  }

  .action-btn--danger:hover:not(:disabled) {
    color: var(--color-rejected-text);
    border-color: var(--color-rejected-text);
    background: var(--color-rejected-bg);
  }

  /* ── Shared button styles ────────────────────────── */

  .btn {
    display: inline-flex;
    align-items: center;
    padding: var(--space-2) var(--space-4);
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

  .btn--primary {
    background: var(--color-primary);
    color: white;

    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
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

  /* ── Modal form ──────────────────────────────────── */

  .type-selector {
    display: flex;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .type-selector__option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: var(--transition);
    border-right: 1px solid var(--color-border);
    user-select: none;

    &:last-child {
      border-right: none;
    }

    &:hover {
      background: var(--color-surface-hover);
      color: var(--color-text);
    }

    input[type='radio'] {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
  }

  .type-selector__option--active {
    background: var(--color-surface-hover);
    color: var(--color-text);
    font-weight: 600;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .form-group--row {
    flex-direction: row;
    gap: var(--space-4);
  }

  .form-group__col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .form-label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .form-label__optional {
    font-weight: 400;
    color: var(--color-text-muted);
  }

  .form-input {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);
    color: var(--color-text);
    background: var(--color-bg);
    width: 100%;
    box-sizing: border-box;
    transition: var(--transition);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .form-hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
    margin: 0;
  }

  .form-error {
    font-size: var(--font-size-sm);
    color: var(--color-rejected-text);
    margin: 0 0 var(--space-2);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  /* ── Toast ───────────────────────────────────────── */

  .toast-container {
    position: fixed;
    bottom: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    width: max-content;
    max-width: calc(100vw - var(--space-8));
    pointer-events: none;
  }
</style>
