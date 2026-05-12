<script lang="ts">
  let {
    label,
    description,
    error = '',
    pickerValue = $bindable(''),
    hexValue = $bindable(''),
  }: {
    label: string
    description: string
    error?: string
    pickerValue?: string
    hexValue?: string
  } = $props()
</script>

<div class="setting-row">
  <div class="setting-row__info">
    <span class="setting-row__label">{label}</span>
    <span class="setting-row__desc">{description}</span>
    {#if error}
      <p class="field-error">{error}</p>
    {/if}
  </div>
  <div class="colour-controls">
    <input
      type="color"
      class="colour-picker"
      bind:value={pickerValue}
      oninput={(e) => { hexValue = (e.target as HTMLInputElement).value.slice(1) }}
    />
    <span class="colour-hash">#</span>
    <input
      type="text"
      class="colour-hex"
      class:colour-hex--error={error}
      maxlength="6"
      bind:value={hexValue}
      oninput={(e) => {
        const v = (e.target as HTMLInputElement).value
        if (/^[A-Fa-f0-9]{6}$|^[A-Fa-f0-9]{3}$/.test(v)) pickerValue = '#' + v
      }}
    />
  </div>
</div>

<style>
  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    padding: var(--space-4) 0;
  }

  .setting-row__info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
    min-width: 0;
  }

  .setting-row__label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .setting-row__desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    line-height: 1.4;
  }

  .field-error {
    font-size: var(--font-size-xs);
    color: var(--color-rejected-text);
  }

  .colour-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .colour-picker {
    width: 2.25rem;
    height: 2.25rem;
    padding: 2px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg);
    cursor: pointer;
    flex-shrink: 0;
  }

  .colour-hash {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    user-select: none;
  }

  .colour-hex {
    width: 5.5rem;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: monospace;
    color: var(--color-text);
    background: var(--color-bg);
    transition: var(--transition);
    letter-spacing: 0.05em;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &--error {
      border-color: var(--color-rejected-text);
    }
  }
</style>
