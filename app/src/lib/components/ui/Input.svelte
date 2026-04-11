<script lang="ts">
  let {
    label,
    name,
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    error = '',
    required = false,
    disabled = false,
  }: {
    label?: string
    name: string
    type?: string
    value?: string
    placeholder?: string
    error?: string
    required?: boolean
    disabled?: boolean
  } = $props()
</script>

<div class="field">
  {#if label}
    <label class="field__label" for={name}>
      {label}{required ? ' *' : ''}
    </label>
  {/if}

  <input
    id={name}
    {name}
    {type}
    {placeholder}
    {required}
    {disabled}
    bind:value
    class="field__input {error ? 'field__input--error' : ''}"
  />

  {#if error}
    <p class="field__error">{error}</p>
  {/if}
</div>

<style>
  .field {
    margin: var(--space-4) var(--space-2) var(--space-4) 0;
   }
  .field__label {
    margin-right: var(--space-2);
   }
  .field__input {
    padding: var(--space-1) var(--space-2);
   }
  .field__input--error {
    border: 2px solid var(--color-error)
   }
  .field__error {
    color: var(--color-error);
   }
</style>