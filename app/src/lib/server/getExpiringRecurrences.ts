import type { SupabaseClient } from '@supabase/supabase-js'

export type ExpiringRecurrence = {
  id: string
  recurrence_id: string
  recurrence_pattern: string
  start_at: string
  end_at: string
  generated_until: string
  recurrence_end_date: string | null
}

export async function getExpiringRecurrences(
  shopId: string,
  supabase: SupabaseClient,
): Promise<ExpiringRecurrence[]> {
  const { data: barber } = await supabase
    .from('barbers')
    .select('id')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!barber) return []

  const cap = new Date()
  cap.setDate(cap.getDate() + 30)
  const thirtyDaysStr = cap.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('blocked_slots')
    .select('id, recurrence_id, recurrence_pattern, start_at, end_at, generated_until, recurrence_end_date')
    .eq('barber_id', barber.id)
    .neq('recurrence_pattern', 'none')
    .not('generated_until', 'is', null)
    .lte('generated_until', thirtyDaysStr)
    .order('recurrence_id', { ascending: true })
    .order('generated_until', { ascending: true })

  if (error || !data) return []

  // Exclude intentionally-ending series: keep only rows where
  // recurrence_end_date IS NULL OR recurrence_end_date > generated_until
  const active = data.filter(
    (row) => !row.recurrence_end_date || row.recurrence_end_date > row.generated_until,
  )

  // Simulate DISTINCT ON (recurrence_id): one representative row per series
  const seen = new Set<string>()
  return active.filter((row) => {
    if (!row.recurrence_id || seen.has(row.recurrence_id)) return false
    seen.add(row.recurrence_id)
    return true
  }) as ExpiringRecurrence[]
}
