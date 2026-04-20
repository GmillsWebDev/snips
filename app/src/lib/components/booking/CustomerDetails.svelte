<script lang="ts">
  import Input from '$lib/components/ui/Input.svelte'

  export type CustomerDetails = {
    first_name: string
    last_name: string
    email: string
    phone: string
    is_guest: boolean
    customer_id: string | null
  }

  let {
    customer = $bindable<CustomerDetails | null>(null),
    onloginredirect,
  }: {
    customer?: CustomerDetails | null
    onloginredirect: () => void
  } = $props()

  let showForm = $state(false)
  let first_name = $state('')
  let last_name = $state('')
  let email = $state('')
  let phone = $state('')
  let touched = $state({ first_name: false, last_name: false, email: false, phone: false })

  function validateEmail(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
  }

  function validatePhone(v: string): boolean {
    const c = v.replace(/[\s\-()+]/g, '')
    return /^(44|0)[1-9]\d{8,9}$/.test(c)
  }

  let fieldErrors = $derived.by(() => ({
    first_name: touched.first_name && !first_name.trim() ? 'First name is required' : '',
    last_name:  touched.last_name  && !last_name.trim()  ? 'Last name is required'  : '',
    email: touched.email
      ? (!email.trim() ? 'Email is required' : !validateEmail(email) ? 'Please enter a valid email address' : '')
      : '',
    phone: touched.phone
      ? (!phone.trim() ? 'Phone number is required' : !validatePhone(phone) ? 'Please enter a valid UK phone number' : '')
      : '',
  }))

  let validCustomer = $derived.by<CustomerDetails | null>(() => {
    if (!showForm) return null
    if (!first_name.trim() || !last_name.trim()) return null
    if (!validateEmail(email) || !validatePhone(phone)) return null
    return {
      first_name: first_name.trim(),
      last_name:  last_name.trim(),
      email:      email.trim(),
      phone:      phone.trim(),
      is_guest:   true,
      customer_id: null,
    }
  })

  // Sync derived validity to the parent bindable
  $effect(() => { customer = validCustomer })

  function handleFocusOut(e: FocusEvent) {
    const n = (e.target as HTMLInputElement).name
    if      (n === 'first_name') touched.first_name = true
    else if (n === 'last_name')  touched.last_name  = true
    else if (n === 'email')      touched.email      = true
    else if (n === 'phone')      touched.phone      = true
  }
</script>

<h2 class="step__title">Your details</h2>

{#if !showForm}
  <p class="step__hint">How would you like to continue?</p>
  <div class="options">
    <button class="option-btn option-btn--primary" onclick={onloginredirect}>
      <span class="option-btn__title">Login / Register</span>
      <span class="option-btn__desc">Use your existing account</span>
    </button>
    <button class="option-btn" onclick={() => (showForm = true)}>
      <span class="option-btn__title">Continue as guest</span>
      <span class="option-btn__desc">No account needed</span>
    </button>
  </div>

{:else}
<p class="login-prompt">
    Got an account?
    <button class="login-prompt__link" onclick={onloginredirect}>Log in</button>
  </p>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="guest-form" onfocusout={handleFocusOut} role="group" aria-label="Guest details">
    <div class="name-row">
      <Input name="first_name" label="First name" bind:value={first_name} placeholder="Jane" required error={fieldErrors.first_name} />
      <Input name="last_name"  label="Last name"  bind:value={last_name}  placeholder="Smith" required error={fieldErrors.last_name} />
    </div>
    <Input name="email" label="Email"        type="email" bind:value={email} placeholder="jane@example.com" required error={fieldErrors.email} />
    <Input name="phone" label="Phone number" type="tel"   bind:value={phone} placeholder="07700 900123"     required error={fieldErrors.phone} />
  </div>
  
{/if}

<style>
  .step__title {
    margin-bottom: var(--space-2);
  }

  .step__hint {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
  }

  /* ── Option buttons ─────────────────────────────────────── */
  .options {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }

  .option-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: var(--space-4) var(--space-5);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    cursor: pointer;
    text-align: left;
    transition: border-color var(--transition), background var(--transition);

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-surface-hover);
    }
  }

  .option-btn--primary {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
  }

  .option-btn__title {
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--color-text);
  }

  .option-btn__desc {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin-top: var(--space-1);
  }

  /* ── Guest form ─────────────────────────────────────────── */
  .login-prompt {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin-top: var(--space-3);
  }

  .login-prompt__link {
    background: none;
    border: none;
    padding: 0;
    color: var(--color-primary);
    font-size: inherit;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover { color: var(--color-primary-hover); }
  }

  .guest-form {
    display: flex;
    flex-direction: column;
  }

  .name-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }
</style>
