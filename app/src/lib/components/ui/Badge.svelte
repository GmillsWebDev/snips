<script lang="ts">
  type Status = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'no_show'

  let { status }: { status: Status } = $props()

  const labels: Record<Status, string> = {
    pending:   'Pending',
    accepted:  'Confirmed',
    rejected:  'Rejected',
    cancelled: 'Cancelled',
    completed: 'Completed',
    no_show:   'No Show',
  }
</script>

<span class="badge badge--{status.replace('_', '-')}">
  {labels[status]}
</span>

<style>
  .badge {
    display: inline-block;
    padding: 0 var(--space-2);
    min-width: 2.5em;
    font-size: var(--font-size-sm);
    font-weight: 500;
    border-radius: var(--radius-full);
    line-height: 1.7;
    text-align: center;
    background: var(--color-surface-hover);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    user-select: none;
    white-space: nowrap;
  }
  .badge--pending {
    background: var(--color-pending-bg);
    color: var(--color-pending-text);
    border-color: var(--color-pending-text);
  }
  .badge--accepted {
    background: var(--color-accepted-bg);
    color: var(--color-accepted-text);
    border-color: var(--color-accepted-text);
  }
  .badge--rejected {
    background: var(--color-rejected-bg);
    color: var(--color-rejected-text);
    border-color: var(--color-rejected-text);
  }
  .badge--cancelled {
    background: var(--color-cancelled-bg);
    color: var(--color-cancelled-text);
    border-color: var(--color-cancelled-text);
  }
  .badge--completed {
    background: var(--color-completed-bg);
    color: var(--color-completed-text);
    border-color: var(--color-completed-text);
  }
  .badge--no-show {
    background: var(--color-noshow-bg);
    color: var(--color-noshow-text);
    border-color: var(--color-noshow-text);
  }
</style>