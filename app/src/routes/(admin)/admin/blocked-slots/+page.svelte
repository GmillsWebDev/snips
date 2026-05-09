<script lang="ts">
  import { enhance } from '$app/forms'
  import Modal from '$lib/components/ui/Modal.svelte'
  import Toast from '$lib/components/ui/Toast.svelte'
  import type { PageData } from './$types'
  import type { BlockedSlot, RecurringBlock } from './+page.server'

  let { data }: { data: PageData } = $props()

  // ── One-off block state ───────────────────────────────────────────

  let showModal = $state(false)
  let submitting = $state(false)
  let formError = $state<string | null>(null)

  let blockType = $state<'full_day' | 'custom_range'>('full_day')
  let date = $state('')
  let startTime = $state('')
  let endTime = $state('')
  let reason = $state('')

  const reasonLength = $derived(reason.length)

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

  // ── Recurring breaks state ────────────────────────────────────────

  type RecurrencePattern = 'daily' | 'weekly' | 'fortnightly' | 'monthly'

  const patternLabels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    fortnightly: 'Fortnightly',
    monthly: 'Monthly',
  }

  // Add form
  let showAddRecurringModal = $state(false)
  let rPattern = $state<RecurrencePattern>('weekly')
  let rStartDate = $state('')
  let rStartTime = $state('')
  let rEndTime = $state('')
  let rReason = $state('')
  let rHasEndDate = $state(false)
  let rEndDate = $state('')
  let rSubmitting = $state(false)
  let rFormError = $state<string | null>(null)
  const rReasonLength = $derived(rReason.length)

  // Create warning
  type RecurringFormData = {
    pattern: string
    startDate: string
    startTime: string
    endTime: string
    reason: string
    endDate: string | null
  }
  type RecurringWarning = { count: number; formData: RecurringFormData }
  let recurringWarning = $state<RecurringWarning | null>(null)
  let recurringWarningConfirming = $state(false)
  let recurringWarningError = $state<string | null>(null)

  // Delete modal
  let deleteModal = $state<RecurringBlock | null>(null)

  // Edit modal
  let editModal = $state<RecurringBlock | null>(null)
  let editStartTime = $state('')
  let editEndTime = $state('')
  let editReason = $state('')
  let editHasEndDate = $state(false)
  let editEndDate = $state('')
  let editScope = $state<'single' | 'future'>('future')
  let editSubmitting = $state(false)
  let editFormError = $state<string | null>(null)
  const editReasonLength = $derived(editReason.length)

  // Edit warning
  type EditFormData = {
    blockId: string
    scope: string
    startTime: string
    endTime: string
    reason: string
    endDate: string | null
  }
  type EditWarning = { count: number; formData: EditFormData }
  let editWarning = $state<EditWarning | null>(null)
  let editWarningConfirming = $state(false)
  let editWarningError = $state<string | null>(null)

  // ── Extend state ─────────────────────────────────────────────────

  let extending = $state<string | null>(null) // recurrenceId currently being extended

  // ── Toast ─────────────────────────────────────────────────────────

  let showErrorToast = $state(false)
  let errorToastMessage = $state('')

  $effect(() => {
    if (!showErrorToast) return
    const t = setTimeout(() => {
      showErrorToast = false
    }, 5000)
    return () => clearTimeout(t)
  })

  // ── One-off block helpers ─────────────────────────────────────────

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

  // ── Recurring breaks helpers ──────────────────────────────────────

  function formatRecurringTime(iso: string): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(iso))
    const h = parts.find((p) => p.type === 'hour')?.value ?? '00'
    const m = parts.find((p) => p.type === 'minute')?.value ?? '00'
    return `${h}:${m}`
  }

  function formatRecurringStartDate(iso: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  }

  function formatEndDate(dateStr: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr + 'T12:00:00Z'))
  }

  function formatGeneratedUntil(dateStr: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr + 'T12:00:00Z'))
  }

  function openAddRecurringModal() {
    showAddRecurringModal = true
    rPattern = 'weekly'
    rStartDate = ''
    rStartTime = ''
    rEndTime = ''
    rReason = ''
    rHasEndDate = false
    rEndDate = ''
    rFormError = null
  }

  function closeAddRecurringModal() {
    showAddRecurringModal = false
    rFormError = null
  }

  function openEditModal(block: RecurringBlock) {
    editModal = block
    editStartTime = formatRecurringTime(block.start_at)
    editEndTime = formatRecurringTime(block.end_at)
    editReason = block.reason ?? ''
    editHasEndDate = !!block.recurrence_end_date
    editEndDate = block.recurrence_end_date ?? ''
    editScope = 'future'
    editFormError = null
  }

  function closeEditModal() {
    editModal = null
    editFormError = null
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

  <!-- One-off booking conflict warning -->
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
          }}>Cancel</button
        >
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
                  <span class="block-badge block-badge--{isFullDayBlock(block) ? 'full' : 'custom'}">
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
    <div class="blocks-section__header">
      <h2 class="blocks-section__title">Recurring breaks</h2>
      <button type="button" class="add-btn" onclick={openAddRecurringModal}>Add recurring break</button>
    </div>

    <!-- Expiry alert panel -->
    {#if data.expiringRecurrences.length > 0}
      <div class="expiry-panel">
        <h3 class="expiry-panel__title">Recurring breaks expiring soon</h3>
        <div class="expiry-panel__rows">
          {#each data.expiringRecurrences as exp (exp.recurrence_id)}
            <div class="expiry-row">
              <span class="pattern-badge pattern-badge--{exp.recurrence_pattern}">
                {patternLabels[exp.recurrence_pattern] ?? exp.recurrence_pattern}
              </span>
              <span class="expiry-row__time">
                {formatRecurringTime(exp.start_at)} – {formatRecurringTime(exp.end_at)}
              </span>
              <span class="expiry-row__expires">
                Expires {formatGeneratedUntil(exp.generated_until)}
              </span>
              <form
                method="post"
                action="?/extendRecurrence"
                use:enhance={() => {
                  extending = exp.recurrence_id
                  return async ({ result, update }) => {
                    extending = null
                    if (result.type === 'failure') {
                      const d = result.data as Record<string, unknown>
                      errorToastMessage = String(d?.formError ?? 'Failed to extend series')
                      showErrorToast = true
                    } else {
                      await update()
                    }
                  }
                }}
              >
                <input type="hidden" name="recurrenceId" value={exp.recurrence_id} />
                <button
                  type="submit"
                  class="action-btn"
                  disabled={extending === exp.recurrence_id}
                >
                  {extending === exp.recurrence_id ? 'Extending…' : 'Extend'}
                </button>
              </form>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Create warning banner -->
    {#if recurringWarning}
      <div class="warning-banner">
        <p class="warning-banner__text">
          This recurring break overlaps with {recurringWarning.count} upcoming booking{recurringWarning.count ===
          1
            ? ''
            : 's'}. These will not be cancelled automatically. Confirm to proceed.
        </p>
        <div class="warning-banner__actions">
          <form
            method="post"
            action="?/createRecurringConfirmed"
            use:enhance={() => {
              recurringWarningConfirming = true
              recurringWarningError = null
              return async ({ result, update }) => {
                recurringWarningConfirming = false
                if (result.type === 'success') {
                  recurringWarning = null
                  await update()
                } else if (result.type === 'failure') {
                  const d = result.data as Record<string, unknown>
                  recurringWarningError = String(d?.formError ?? 'An error occurred')
                }
              }
            }}
          >
            <input type="hidden" name="pattern" value={recurringWarning.formData.pattern} />
            <input type="hidden" name="startDate" value={recurringWarning.formData.startDate} />
            <input type="hidden" name="startTime" value={recurringWarning.formData.startTime} />
            <input type="hidden" name="endTime" value={recurringWarning.formData.endTime} />
            <input type="hidden" name="reason" value={recurringWarning.formData.reason} />
            {#if recurringWarning.formData.endDate}
              <input type="hidden" name="endDate" value={recurringWarning.formData.endDate} />
            {/if}
            <button type="submit" class="btn btn--danger" disabled={recurringWarningConfirming}>
              Confirm
            </button>
          </form>
          <button
            type="button"
            class="btn btn--ghost"
            onclick={() => {
              recurringWarning = null
              recurringWarningError = null
            }}>Cancel</button
          >
        </div>
        {#if recurringWarningError}
          <p class="warning-banner__error">{recurringWarningError}</p>
        {/if}
      </div>
    {/if}

    <!-- Edit warning banner -->
    {#if editWarning}
      <div class="warning-banner">
        <p class="warning-banner__text">
          This change overlaps with {editWarning.count} upcoming booking{editWarning.count === 1
            ? ''
            : 's'}. These will not be cancelled automatically. Confirm to proceed.
        </p>
        <div class="warning-banner__actions">
          <form
            method="post"
            action="?/updateOccurrenceConfirmed"
            use:enhance={() => {
              editWarningConfirming = true
              editWarningError = null
              return async ({ result, update }) => {
                editWarningConfirming = false
                if (result.type === 'redirect') {
                  editWarning = null
                  await update()
                } else if (result.type === 'failure') {
                  const d = result.data as Record<string, unknown>
                  editWarningError = String(d?.formError ?? 'An error occurred')
                }
              }
            }}
          >
            <input type="hidden" name="blockId" value={editWarning.formData.blockId} />
            <input type="hidden" name="scope" value={editWarning.formData.scope} />
            <input type="hidden" name="startTime" value={editWarning.formData.startTime} />
            <input type="hidden" name="endTime" value={editWarning.formData.endTime} />
            <input type="hidden" name="reason" value={editWarning.formData.reason} />
            {#if editWarning.formData.endDate}
              <input type="hidden" name="endDate" value={editWarning.formData.endDate} />
            {/if}
            <button type="submit" class="btn btn--danger" disabled={editWarningConfirming}>
              Confirm
            </button>
          </form>
          <button
            type="button"
            class="btn btn--ghost"
            onclick={() => {
              editWarning = null
              editWarningError = null
            }}>Cancel</button
          >
        </div>
        {#if editWarningError}
          <p class="warning-banner__error">{editWarningError}</p>
        {/if}
      </div>
    {/if}

    <!-- Recurring list -->
    {#if data.recurringBlocks.length === 0}
      <div class="empty-state">
        <p class="empty-state__message">No recurring breaks set.</p>
      </div>
    {:else}
      <div class="table-wrap">
        <table class="blocks-table">
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Time</th>
              <th>From</th>
              <th>Until</th>
              <th>Reason</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.recurringBlocks as block (block.id)}
              <tr>
                <td>
                  <span class="pattern-badge pattern-badge--{block.recurrence_pattern}">
                    {patternLabels[block.recurrence_pattern] ?? block.recurrence_pattern}
                  </span>
                </td>
                <td class="blocks-table__datetime">
                  {formatRecurringTime(block.start_at)} – {formatRecurringTime(block.end_at)}
                </td>
                <td class="blocks-table__date">
                  {formatRecurringStartDate(block.start_at)}
                </td>
                <td class="blocks-table__date">
                  {#if block.recurrence_end_date}
                    {formatEndDate(block.recurrence_end_date)}
                  {:else}
                    <span class="blocks-table__no-reason">No end date</span>
                  {/if}
                </td>
                <td class="blocks-table__reason">
                  {#if block.reason}
                    {block.reason}
                  {:else}
                    <span class="blocks-table__no-reason">No reason given</span>
                  {/if}
                </td>
                <td class="blocks-table__actions">
                  <div class="action-group">
                    <button
                      type="button"
                      class="action-btn"
                      onclick={() => openEditModal(block)}
                    >Edit</button>
                    <button
                      type="button"
                      class="action-btn action-btn--danger"
                      onclick={() => {
                        deleteModal = block
                      }}
                    >Delete</button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</div>

<!-- Add one-off block modal -->
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
    <div class="form-group">
      <div class="type-selector">
        <label
          class="type-selector__option"
          class:type-selector__option--active={blockType === 'full_day'}
        >
          <input type="radio" name="blockType" value="full_day" bind:group={blockType} />
          Full day
        </label>
        <label
          class="type-selector__option"
          class:type-selector__option--active={blockType === 'custom_range'}
        >
          <input type="radio" name="blockType" value="custom_range" bind:group={blockType} />
          Custom time range
        </label>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="block-date">Date</label>
      <input id="block-date" type="date" name="date" class="form-input" bind:value={date} required />
    </div>

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

<!-- Add recurring break modal -->
<Modal open={showAddRecurringModal} title="Add recurring break" onclose={closeAddRecurringModal}>
  <form
    method="post"
    action="?/createRecurring"
    use:enhance={() => {
      rSubmitting = true
      const capturedPattern = rPattern
      const capturedStartDate = rStartDate
      const capturedStartTime = rStartTime
      const capturedEndTime = rEndTime
      const capturedReason = rReason
      const capturedEndDate = rHasEndDate ? rEndDate : null
      return async ({ result, update }) => {
        rSubmitting = false
        if (result.type === 'failure') {
          const d = result.data as Record<string, unknown>
          if (d?.warning) {
            recurringWarning = {
              count: d.count as number,
              formData: {
                pattern: capturedPattern,
                startDate: capturedStartDate,
                startTime: capturedStartTime,
                endTime: capturedEndTime,
                reason: capturedReason,
                endDate: capturedEndDate,
              },
            }
            closeAddRecurringModal()
          } else {
            rFormError = String(d?.formError ?? 'An error occurred')
          }
        } else if (result.type === 'success') {
          closeAddRecurringModal()
          await update()
        }
      }
    }}
  >
    <div class="form-group">
      <label class="form-label">Pattern</label>
      <div class="type-selector">
        {#each (['daily', 'weekly', 'fortnightly', 'monthly'] as RecurrencePattern[]) as p}
          <label
            class="type-selector__option"
            class:type-selector__option--active={rPattern === p}
          >
            <input type="radio" name="pattern" value={p} bind:group={rPattern} />
            {patternLabels[p]}
          </label>
        {/each}
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="r-start-date">First occurrence</label>
      <input
        id="r-start-date"
        type="date"
        name="startDate"
        class="form-input"
        bind:value={rStartDate}
        required
      />
    </div>

    <div class="form-group form-group--row">
      <div class="form-group__col">
        <label class="form-label" for="r-start-time">From</label>
        <input
          id="r-start-time"
          type="time"
          name="startTime"
          class="form-input"
          bind:value={rStartTime}
          required
        />
      </div>
      <div class="form-group__col">
        <label class="form-label" for="r-end-time">To</label>
        <input
          id="r-end-time"
          type="time"
          name="endTime"
          class="form-input"
          bind:value={rEndTime}
          required
        />
      </div>
    </div>

    <div class="form-group">
      <label class="form-label form-label--checkbox">
        <input type="checkbox" class="form-checkbox" bind:checked={rHasEndDate} />
        Set an end date
      </label>
      {#if rHasEndDate}
      
        <input
          type="date"
          name="endDate"
          class="form-input"
          bind:value={rEndDate}
        />
      {/if}
    </div>

    <div class="form-group">
      <label class="form-label" for="r-reason">
        Reason <span class="form-label__optional">(optional)</span>
      </label>
      <input
        id="r-reason"
        type="text"
        name="reason"
        class="form-input"
        bind:value={rReason}
        maxlength="200"
        placeholder="e.g. Lunch break, Training"
      />
      <p class="form-hint">{rReasonLength}/200</p>
    </div>

    {#if rFormError}
      <p class="form-error">{rFormError}</p>
    {/if}

    <div class="modal-actions">
      <button
        type="button"
        class="btn btn--ghost"
        onclick={closeAddRecurringModal}
        disabled={rSubmitting}
      >
        Cancel
      </button>
      <button type="submit" class="btn btn--primary" disabled={rSubmitting}>
        {rSubmitting ? 'Adding…' : 'Add recurring break'}
      </button>
    </div>
  </form>
</Modal>

<!-- Delete recurring break modal -->
<Modal
  open={deleteModal !== null}
  title="Delete recurring break"
  onclose={() => {
    deleteModal = null
  }}
>
  {#if deleteModal}
    <p class="modal-body-text">
      Delete this occurrence only, or this and all future occurrences?
    </p>
    <form
      method="post"
      action="?/deleteOccurrence"
      use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'failure') {
            const d = result.data as Record<string, unknown>
            errorToastMessage = String(d?.deleteError ?? 'Failed to delete')
            showErrorToast = true
          }
          deleteModal = null
          await update()
        }
      }}
    >
      <input type="hidden" name="blockId" value={deleteModal.id} />
      <div class="modal-actions">
        <button
          type="button"
          class="btn btn--ghost"
          onclick={() => {
            deleteModal = null
          }}
        >
          Cancel
        </button>
        <button type="submit" name="scope" value="single" class="btn btn--ghost">
          This one only
        </button>
        <button type="submit" name="scope" value="future" class="btn btn--danger">
          This and all future
        </button>
      </div>
    </form>
  {/if}
</Modal>

<!-- Edit recurring break modal -->
<Modal open={editModal !== null} title="Edit recurring break" onclose={closeEditModal}>
  {#if editModal}
    <form
      method="post"
      action="?/updateOccurrence"
      use:enhance={() => {
        editSubmitting = true
        const capturedBlockId = editModal?.id ?? ''
        const capturedScope = editScope
        const capturedStartTime = editStartTime
        const capturedEndTime = editEndTime
        const capturedReason = editReason
        const capturedEndDate = editHasEndDate ? editEndDate : null
        return async ({ result, update }) => {
          editSubmitting = false
          if (result.type === 'failure') {
            const d = result.data as Record<string, unknown>
            if (d?.warning) {
              editWarning = {
                count: d.count as number,
                formData: {
                  blockId: capturedBlockId,
                  scope: capturedScope,
                  startTime: capturedStartTime,
                  endTime: capturedEndTime,
                  reason: capturedReason,
                  endDate: capturedEndDate,
                },
              }
              closeEditModal()
            } else {
              editFormError = String(d?.formError ?? 'An error occurred')
            }
          } else {
            closeEditModal()
            await update()
          }
        }
      }}
    >
      <input type="hidden" name="blockId" value={editModal.id} />

      <div class="form-group form-group--row">
        <div class="form-group__col">
          <label class="form-label" for="edit-start-time">From</label>
          <input
            id="edit-start-time"
            type="time"
            name="startTime"
            class="form-input"
            bind:value={editStartTime}
            required
          />
        </div>
        <div class="form-group__col">
          <label class="form-label" for="edit-end-time">To</label>
          <input
            id="edit-end-time"
            type="time"
            name="endTime"
            class="form-input"
            bind:value={editEndTime}
            required
          />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label form-label--checkbox">
          <input type="checkbox" class="form-checkbox" bind:checked={editHasEndDate} />
          Set an end date
        </label>
        {#if editHasEndDate}
        <p class="form-label__optional">This date is inclusive of the set rule.</p>
          <input
            type="date"
            name="endDate"
            class="form-input"
            bind:value={editEndDate}
          />
        {/if}
      </div>

      <div class="form-group">
        <label class="form-label" for="edit-reason">
          Reason <span class="form-label__optional">(optional)</span>
        </label>
        <input
          id="edit-reason"
          type="text"
          name="reason"
          class="form-input"
          bind:value={editReason}
          maxlength="200"
          placeholder="e.g. Lunch break, Training"
        />
        <p class="form-hint">{editReasonLength}/200</p>
      </div>

      <div class="form-group">
        <p class="form-label">Apply changes to</p>
        <div class="type-selector">
          <label
            class="type-selector__option"
            class:type-selector__option--active={editScope === 'single'}
          >
            <input type="radio" name="scope" value="single" bind:group={editScope} />
            This occurrence only
          </label>
          <label
            class="type-selector__option"
            class:type-selector__option--active={editScope === 'future'}
          >
            <input type="radio" name="scope" value="future" bind:group={editScope} />
            This and all future
          </label>
        </div>
      </div>

      {#if editFormError}
        <p class="form-error">{editFormError}</p>
      {/if}

      <div class="modal-actions">
        <button
          type="button"
          class="btn btn--ghost"
          onclick={closeEditModal}
          disabled={editSubmitting}
        >
          Cancel
        </button>
        <button type="submit" class="btn btn--primary" disabled={editSubmitting}>
          {editSubmitting ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  {/if}
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
    white-space: nowrap;

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

  .blocks-section__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
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

  .blocks-table__date {
    white-space: nowrap;
    color: var(--color-text-muted);
  }

  .blocks-table__reason {
    color: var(--color-text-muted);
    max-width: 200px;
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

  /* ── Expiry panel ───────────────────────────────── */

  .expiry-panel {
    background: var(--color-pending-bg);
    border: 1px solid var(--color-pending-text);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .expiry-panel__title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-pending-text);
    margin: 0;
  }

  .expiry-panel__rows {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .expiry-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    flex-wrap: wrap;
  }

  .expiry-row__time {
    font-size: var(--font-size-sm);
    font-variant-numeric: tabular-nums;
    color: var(--color-text);
    font-weight: 500;
  }

  .expiry-row__expires {
    font-size: var(--font-size-sm);
    color: var(--color-pending-text);
    font-weight: 500;
    margin-left: auto;
  }

  /* ── Pattern badge ───────────────────────────────── */

  .pattern-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: 500;
    white-space: nowrap;
    border: 1px solid;
    background: var(--color-surface-hover);
    color: var(--color-text-muted);
    border-color: var(--color-border);
  }

  .pattern-badge--daily {
    background: var(--color-accepted-bg);
    color: var(--color-accepted-text);
    border-color: var(--color-accepted-text);
  }

  .pattern-badge--weekly {
    background: var(--color-pending-bg);
    color: var(--color-pending-text);
    border-color: var(--color-pending-text);
  }

  .pattern-badge--fortnightly {
    background: var(--color-cancelled-bg);
    color: var(--color-cancelled-text);
    border-color: var(--color-cancelled-text);
  }

  .pattern-badge--monthly {
    background: var(--color-completed-bg);
    color: var(--color-completed-text);
    border-color: var(--color-completed-text);
  }

  /* ── Action buttons ──────────────────────────────── */

  .action-group {
    display: flex;
    gap: var(--space-1);
  }

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

  /* ── Modal content ───────────────────────────────── */

  .modal-body-text {
    font-size: var(--font-size-sm);
    color: var(--color-text);
    margin: 0 0 var(--space-4);
    line-height: 1.5;
  }

  /* ── Form elements ───────────────────────────────── */

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

  .form-label--checkbox {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    font-weight: 400;
  }

  .form-label__optional {
    font-weight: 400;
    color: var(--color-text-muted);
  }

  .form-checkbox {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--color-primary);
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
