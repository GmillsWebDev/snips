<script lang="ts">
  import { invalidate } from '$app/navigation'
  import { onMount } from 'svelte'
  import { createSupabaseBrowserClient } from '$lib/supabase'
  import type { LayoutData } from './$types'

  let { data, children }: { data: LayoutData, children: any } = $props()

  const supabase = createSupabaseBrowserClient()

  onMount(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.expires_at !== data.session?.expires_at) {
        invalidate('supabase:auth')
      }
    })

    return () => subscription.unsubscribe()
  })
</script>

{@render children()}