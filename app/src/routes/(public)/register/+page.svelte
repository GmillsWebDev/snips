<script lang="ts">
  import { enhance } from '$app/forms'
  import { Input, Button } from '$lib/components/ui'
  import type { ActionData } from './$types'

  let { form }: { form: ActionData } = $props()
  let loading = $state(false)
</script>

<svelte:head>
  <title>Create Account — Snips</title>
</svelte:head>

<div class="auth-page container">
  <div class="auth-card">
    <div class="auth-card__header">
      <h1>Create account</h1>
      <p>Get started with Snips</p>
    </div>

    {#if form?.error}
      <div class="auth-card__error">
        {form.error}
      </div>
    {/if}

    <form
      method="POST"
      use:enhance={() => {
        loading = true
        return async ({ update }) => {
          loading = false
          await update()
        }
      }}
      class="auth-card__form"
    >
      <Input
        name="first_name"
        label="First name"
        required
        placeholder="John"
        />

        <Input
        name="last_name"
        label="Last name"
        required
        placeholder="Smith"
        />

      <Input
        name="email"
        label="Email"
        type="email"
        required
        placeholder="you@example.com"
      />

      <Input
        name="password"
        label="Password"
        type="password"
        required
        placeholder="Min. 10 characters"
      />

      <Input
        name="confirm"
        label="Confirm password"
        type="password"
        required
        placeholder="••••••••"
      />

      <Button type="submit" {loading}>
        Create account
      </Button>
    </form>

    <p class="auth-card__footer">
      Already have an account? <a href="/login">Sign in</a>
    </p>
  </div>
</div>

<style>
  .auth-page {
    display: flex;
    justify-content: center;
    min-height: 100vh;
   }
</style>