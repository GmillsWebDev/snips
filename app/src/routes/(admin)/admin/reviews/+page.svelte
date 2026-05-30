<script lang="ts">
  import { enhance } from '$app/forms'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  let toggling = $state<Record<string, boolean>>({})

  function formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      .format(new Date(iso))
  }

  function starsFor(rating: number): ('full' | 'empty')[] {
    return Array.from({ length: 5 }, (_, i) => (i < rating ? 'full' : 'empty'))
  }

  function truncate(text: string | null, max = 120): string {
    if (!text) return '—'
    return text.length > max ? `${text.slice(0, max)}…` : text
  }
</script>

<svelte:head>
  <title>Reviews — Snips Admin</title>
</svelte:head>

<div class="reviews-page">
  <header class="reviews-page__header">
    <h1>Reviews</h1>
  </header>

  {#if data.reviews.length === 0}
    <div class="empty-state">
      <p class="empty-state__message">No reviews yet.</p>
    </div>
  {:else}
    <div class="table-wrap">
      <table class="reviews-table">
        <thead>
          <tr>
            <th>Rating</th>
            <th>Comment</th>
            <th>Customer</th>
            <th>Service</th>
            <th>Date</th>
            <th>Visibility</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each data.reviews as review (review.id)}
            <tr>
              <td class="reviews-table__stars">
                {#each starsFor(review.rating) as star}
                  <span class="star star--{star}">{star === 'full' ? '★' : '☆'}</span>
                {/each}
              </td>
              <td
                class="reviews-table__comment"
                title={review.comment && review.comment.length > 120 ? review.comment : undefined}
              >{truncate(review.comment)}</td>
              <td class="reviews-table__meta">{review.customer_name}</td>
              <td class="reviews-table__meta">{review.service_name}</td>
              <td class="reviews-table__meta">{formatDate(review.created_at)}</td>
              <td>
                <span class="status-badge status-badge--{review.is_visible ? 'visible' : 'hidden'}">
                  {review.is_visible ? 'Visible' : 'Hidden'}
                </span>
              </td>
              <td class="reviews-table__actions">
                <form
                  method="post"
                  action="?/toggleVisibility"
                  use:enhance={() => {
                    toggling[review.id] = true
                    return async ({ update }) => {
                      await update()
                      toggling[review.id] = false
                    }
                  }}
                >
                  <input type="hidden" name="reviewId" value={review.id} />
                  <input type="hidden" name="currentVisibility" value={String(review.is_visible)} />
                  <button
                    type="submit"
                    class="action-btn"
                    disabled={toggling[review.id]}
                  >
                    {review.is_visible ? 'Hide' : 'Show'}
                  </button>
                </form>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .reviews-page {
    max-width: 1000px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .reviews-page__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .reviews-page__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  /* Empty state */
  .empty-state {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-12) var(--space-8);
    text-align: center;
  }

  .empty-state__message {
    font-size: var(--font-size-lg);
    font-weight: 500;
  }

  /* Table */
  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .reviews-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  .reviews-table thead {
    border-bottom: 1px solid var(--color-border);
  }

  .reviews-table th {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    font-weight: 600;
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .reviews-table td {
    padding: var(--space-3) var(--space-4);
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .reviews-table tbody tr:last-child td {
    border-bottom: none;
  }

  .reviews-table tbody tr {
    transition: var(--transition);

    &:hover {
      background: var(--color-surface-hover);
    }
  }

  /* Column-specific */
  .reviews-table__stars {
    white-space: nowrap;
    letter-spacing: -1px;
  }

  .reviews-table__comment {
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text-muted);
  }

  .reviews-table__meta {
    white-space: nowrap;
    color: var(--color-text-muted);
  }

  .reviews-table__actions {
    width: 1px;
    white-space: nowrap;
    padding-left: 0;
  }

  /* Stars */
  .star {
    line-height: 1;
  }

  .star--full {
    color: var(--color-warning);
  }

  .star--empty {
    color: var(--color-text-subtle);
  }

  /* Badge */
  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: 500;
    white-space: nowrap;
  }

  .status-badge--visible {
    background: var(--color-accepted-bg);
    color: var(--color-accepted-text);
  }

  .status-badge--hidden {
    background: var(--color-cancelled-bg);
    color: var(--color-cancelled-text);
  }

  /* Action button */
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
</style>
