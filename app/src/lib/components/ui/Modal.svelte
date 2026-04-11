<script lang="ts">
  let {
    open = false,
    title = '',
    onclose,
    children
  }: {
    open?: boolean
    title?: string
    onclose?: () => void
    children: any
  } = $props()
</script>

{#if open}
  <div class="modal-overlay" onclick={onclose} role="dialog" aria-modal="true">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      {#if title}
        <div class="modal__header">
          <h3 class="modal__title">{title}</h3>
          <button class="modal__close" onclick={onclose} aria-label="Close">✕</button>
        </div>
      {/if}
      <div class="modal__body">
        {@render children()}
      </div>
    </div>
  </div>
{/if}

<style>
.modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.5);
}

.modal {
    border: 1px solid var(--color-grey);
    width: 90%;
    max-width: 800px;
    margin: 0 auto;
    padding: var(--space-4);
    border-radius: var(--radius-md);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    background-color: white;
    position: relative;
}
  
  .modal__close {
    position: absolute;
    top: var(--space-2);
    right: var(--space-4);
    padding: var(--space-1) var(--space-2);
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    &:hover{
        border: 1px solid var(--color-grey);
        border-radius: var(--radius-sm);
    }
   }
</style>