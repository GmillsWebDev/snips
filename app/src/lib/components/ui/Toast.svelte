<script lang="ts">
  type ToastType = 'success' | 'error' | 'info'

  let {
    message = '',
    type = 'info',
    show = false,
  }: {
    message?: string
    type?: ToastType
    show?: boolean
  } = $props()
</script>

{#if show}
  <div class="toast toast--{type}" role="alert">
    <p class="toast__message">{message}</p>
  </div>
{/if}

<style>
  .toast {
    min-width: 220px;
    max-width: 400px;
    margin: var(--space-2) auto;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    font-size: var(--font-size-base);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    z-index: 1000;
  }
  .toast--success {
    background: var(--color-accepted-bg);
    color: var(--color-accepted-text);
    border-color: var(--color-accepted-text);
  }
  .toast--error {
    background: var(--color-rejected-bg);
    color: var(--color-rejected-text);
    border-color: var(--color-rejected-text);
  }
  .toast--info {
    background: var(--color-surface-hover);
    color: var(--color-text);
    border-color: var(--color-border);
  }
  .toast__message {
    flex: 1;
    margin: 0;
    padding: 0;
  }
</style>