<script lang="ts">
  import { enhance } from '$app/forms'
  import Modal from '$lib/components/ui/Modal.svelte'
  import Toast from '$lib/components/ui/Toast.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  let reordering = $state<string | null>(null)
  let deleteTarget = $state<{ id: string; name: string; price_pence: number } | null>(null)
  let deleting = $state(false)
  let confirmInput = $state('')
  let showToast = $state(false)
  let toastMessage = $state('')

  const expectedConfirm = $derived.by(() => {
    if (!deleteTarget) return ''
    const firstWord = deleteTarget.name.split(' ')[0].replace(/^[,\-.()'"]+|[,\-.()'"]+$/g, '')
    const price = (deleteTarget.price_pence / 100).toFixed(2)
    return `${firstWord} ${price}`
  })

  const confirmMatches = $derived(
    expectedConfirm !== '' && confirmInput.trim().toLowerCase() === expectedConfirm.toLowerCase()
  )

  $effect(() => {
    if (!showToast) return
    const t = setTimeout(() => { showToast = false }, 5000)
    return () => clearTimeout(t)
  })

  function formatPrice(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`
  }
</script>

<svelte:head>
  <title>Services — Snips Admin</title>
</svelte:head>

<div class="services-page">
  <header class="services-page__header">
    <h1>Services</h1>
    <a href="/admin/services/new" class="add-btn">Add service</a>
  </header>

  {#if data.services.length === 0}
    <div class="empty-state">
      <p class="empty-state__message">No services yet.</p>
      <p class="empty-state__hint">Add your first service to start taking bookings.</p>
    </div>
  {:else}
    <div class="table-wrap">
      <table class="services-table">
        <thead>
          <tr>
            <th class="services-table__order-col">Order</th>
            <th>Name</th>
            <th>Duration</th>
            <th>Price</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each data.services as service, index (service.id)}
            <tr>
              <td class="services-table__order-col">
                <div class="reorder">
                  <form
                    method="post"
                    action="?/reorder"
                    use:enhance={() => {
                      reordering = `${service.id}-up`
                      return async ({ update }) => { await update(); reordering = null }
                    }}
                  >
                    <input type="hidden" name="serviceId" value={service.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      class="reorder-btn"
                      disabled={index === 0 || reordering !== null}
                      aria-label="Move up"
                    >↑</button>
                  </form>
                  <form
                    method="post"
                    action="?/reorder"
                    use:enhance={() => {
                      reordering = `${service.id}-down`
                      return async ({ update }) => { await update(); reordering = null }
                    }}
                  >
                    <input type="hidden" name="serviceId" value={service.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      class="reorder-btn"
                      disabled={index === data.services.length - 1 || reordering !== null}
                      aria-label="Move down"
                    >↓</button>
                  </form>
                </div>
              </td>
              <td class="services-table__name">{service.name}</td>
              <td class="services-table__meta">{service.duration_minutes} min</td>
              <td class="services-table__meta services-table__price">{formatPrice(service.price_pence)}</td>
              <td>
                <span class="status-badge status-badge--{service.is_active ? 'active' : 'inactive'}">
                  {service.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td class="services-table__actions">
                <a href="/admin/services/{service.id}/edit" class="action-btn">Edit</a>
                <button
                  type="button"
                  class="action-btn action-btn--danger"
                  onclick={() => deleteTarget = { id: service.id, name: service.name, price_pence: service.price_pence }}
                >Delete</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <Modal
    open={deleteTarget !== null}
    title="Delete service"
    onclose={() => { if (!deleting) { deleteTarget = null; confirmInput = '' } }}
  >
    {#if deleteTarget}
      <div class="delete-confirm">
        <div class="delete-confirm__service">
          <span class="delete-confirm__service-name">{deleteTarget.name}</span>
          <span class="delete-confirm__service-price">{formatPrice(deleteTarget.price_pence)}</span>
        </div>
        <p class="delete-confirm__instruction">
          This action will permanently delete the service <strong>{deleteTarget.name}</strong> and all associated data. If this is a temporary measure, consider setting the service to inactive instead.
        </p>
        <p class="delete-confirm__instruction">
          To confirm this deletion, please type <code class="delete-confirm__example">{expectedConfirm}</code> below:
          
        </p>
        <form
          method="post"
          action="?/delete"
          use:enhance={() => {
            deleting = true
            return async ({ result, update }) => {
              if (result.type === 'failure') {
                const d = result.data as Record<string, string> | undefined
                if (d?.deleteError) {
                  toastMessage = d.deleteError
                  showToast = true
                  deleteTarget = null
                  confirmInput = ''
                  deleting = false
                  return
                }
              }
              await update()
              deleting = false
              deleteTarget = null
              confirmInput = ''
            }
          }}
        >
          <input type="hidden" name="serviceId" value={deleteTarget.id} />
          <input
            type="text"
            class="delete-confirm__input"
            bind:value={confirmInput}
            placeholder={expectedConfirm}
            autocomplete="off"
            spellcheck="false"
            disabled={deleting}
          />
          <div class="delete-confirm__actions">
            <button
              type="button"
              class="action-btn"
              onclick={() => { deleteTarget = null; confirmInput = '' }}
              disabled={deleting}
            >Cancel</button>
            <button
              type="submit"
              class="action-btn action-btn--danger"
              disabled={!confirmMatches || deleting}
            >{deleting ? 'Deleting…' : 'Confirm Delete'}</button>
          </div>
        </form>
      </div>
    {/if}
  </Modal>

  <div class="toast-container">
    <Toast show={showToast} message={toastMessage} type="error" />
  </div>
</div>

<style>
  .services-page {
    max-width: 860px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .services-page__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .services-page__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  /* .add-btn {
    padding: var(--space-2) var(--space-5);
    background: var(--color-primary);
    color: var(--color-on-primary);
    border-radius: var(--radius-md);
    text-decoration: none;
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: var(--transition);

    &:hover {
      background: var(--color-primary-hover);
    }
  } */

  /* ── Empty state ─────────────────────────────────── */

  .empty-state {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-12) var(--space-8);
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .empty-state__message {
    font-size: var(--font-size-lg);
    font-weight: 500;
  }

  .empty-state__hint {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  /* ── Table ───────────────────────────────────────── */

  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .services-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  .services-table thead {
    border-bottom: 1px solid var(--color-border);
  }

  .services-table th {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    font-weight: 600;
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .services-table td {
    padding: var(--space-3) var(--space-4);
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .services-table tbody tr:last-child td {
    border-bottom: none;
  }

  .services-table tbody tr {
    transition: var(--transition);

    &:hover {
      background: var(--color-surface-hover);
    }
  }

  /* ── Order / reorder ─────────────────────────────── */

  .services-table__order-col {
    width: 5.5rem;
  }

  .reorder {
    display: flex;
    gap: var(--space-1);
  }

  .reorder-btn {
    width: 1.75rem;
    height: 1.75rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: none;
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: var(--transition);

    &:hover:not(:disabled) {
      border-color: var(--color-text-subtle);
      color: var(--color-text);
      background: var(--color-surface-hover);
    }

    &:disabled {
      opacity: 0.3;
      cursor: default;
    }
  }

  /* ── Data columns ────────────────────────────────── */

  .services-table__name {
    font-weight: 500;
  }

  .services-table__meta {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: var(--color-text-muted);
  }

  .services-table__price {
    font-weight: 500;
    color: var(--color-text);
  }

  /* ── Status badge ────────────────────────────────── */

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: 500;
    white-space: nowrap;
  }

  .status-badge--active {
    background: var(--color-accepted-bg);
    color: var(--color-accepted-text);
  }

  .status-badge--inactive {
    background: var(--color-cancelled-bg);
    color: var(--color-cancelled-text);
  }

  /* ── Actions column ──────────────────────────────── */

  .services-table__actions {
    width: 1px;
    white-space: nowrap;
    padding-left: 0;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: var(--color-text-muted);
    text-decoration: none;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: none;
    cursor: pointer;
    transition: var(--transition);
    margin-left: var(--space-2);

    &:hover:not(:disabled) {
      color: var(--color-text);
      border-color: var(--color-text-subtle);
      background: var(--color-surface-hover);
    }

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }

  .action-btn--danger:hover:not(:disabled) {
    color: var(--color-rejected-text);
    border-color: var(--color-rejected-text);
    background: var(--color-rejected-bg);
  }

  /* ── Delete confirm modal ─────────────────────────── */

  .delete-confirm {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .delete-confirm__service {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
    background: var(--color-surface-hover);
    border-radius: var(--radius-md);
  }

  .delete-confirm__actions{
    margin-top: var(--space-4);
  }

  .delete-confirm__service-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .delete-confirm__service-price {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .delete-confirm__instruction {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .delete-confirm__example {
    display: inline-block;
    padding: 1px var(--space-2);
    background: var(--color-surface-hover);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-family: monospace;
    font-size: var(--font-size-xs);
    color: var(--color-text);
    user-select: all;
  }

  .delete-confirm__input {
    width: 100%;
    box-sizing: border-box;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    background: var(--color-bg);
    transition: var(--transition);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &:disabled {
      opacity: 0.6;
    }
  }

  .delete-confirm__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
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
