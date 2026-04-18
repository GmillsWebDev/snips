<script lang="ts">
  import { invalidate } from '$app/navigation'
  import { onMount } from 'svelte'
  import { createSupabaseBrowserClient } from '$lib/supabase'
  import type { LayoutData } from './$types'
  import '../app.css'
  import '../clientBranding.css'

  let { data, children }: { data: LayoutData, children: any } = $props()

  const supabase = createSupabaseBrowserClient()

  onMount(() => {
    // Apply shop branding as CSS custom properties on the root element so they
    // cascade to everything on the page, overriding the clientBranding.css defaults.
    if (data.branding) {
      const root = document.documentElement
      root.style.setProperty('--color-primary',   data.branding.color_primary)
      root.style.setProperty('--color-secondary',  data.branding.color_secondary)
      if (data.branding.font_heading) root.style.setProperty('--font-heading', data.branding.font_heading)
      if (data.branding.font_body)    root.style.setProperty('--font-body',    data.branding.font_body)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.expires_at !== data.session?.expires_at) {
        invalidate('supabase:auth')
      }
    })

    return () => subscription.unsubscribe()
  })
</script>

{@render children()}