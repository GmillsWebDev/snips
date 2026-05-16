import type { Session, SupabaseClient, User } from '@supabase/supabase-js'

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient
      safeGetSession: () => Promise<{ session: Session | null; user: User | null }>
    }
    interface PageData {
      session: Session | null
      user: User | null
    }
  }

  interface Window {
    gtagLoaded?: boolean
    csqLoaded?: boolean
    hj?: ((...args: unknown[]) => void) & { q?: unknown[][] }
    _hjSettings?: { hjid: string | number }
  }
}

export {}