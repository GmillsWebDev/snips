import { createSupabaseAdminClient } from '$lib/server/supabase'
import type { PageServerLoad } from './$types'

function toMonday(d: Date): Date {
  const day = d.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysBack = day === 0 ? 6 : day - 1
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - daysBack)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export const load: PageServerLoad = async ({ parent, url }) => {
  const { role } = await parent()
  const shopId = role.shop_id
  const admin = createSupabaseAdminClient()

  const weekParam = url.searchParams.get('week')
  const weekStart =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
      ? toMonday(new Date(`${weekParam}T00:00:00Z`))
      : toMonday(new Date())

  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)

  const prevWeekDate = new Date(weekStart)
  prevWeekDate.setUTCDate(weekStart.getUTCDate() - 7)

  const nextWeekDate = new Date(weekStart)
  nextWeekDate.setUTCDate(weekStart.getUTCDate() + 7)

  const [bookingsResult, rulesResult] = await Promise.all([
    admin
      .from('bookings')
      .select('id, status, start_at, end_at, customers(first_name, last_name), services(name, duration_minutes)')
      .eq('shop_id', shopId)
      .gte('start_at', weekStart.toISOString())
      .lte('start_at', weekEnd.toISOString())
      .in('status', ['pending', 'accepted', 'completed'])
      .order('start_at', { ascending: true }),
    admin
      .from('availability_rules')
      .select('day_of_week, start_time, end_time, is_working, barbers!inner(shop_id)')
      .eq('barbers.shop_id', shopId)
      .order('day_of_week')
      .order('shift_number'),
  ])

  if (bookingsResult.error) throw bookingsResult.error
  if (rulesResult.error) throw rulesResult.error

  type BookingRow = {
    id: string
    status: string
    start_at: string
    end_at: string
    customers: { first_name: string; last_name: string } | null
    services: { name: string; duration_minutes: number } | null
  }

  type RuleRow = {
    day_of_week: number
    start_time: string
    end_time: string
    is_working: boolean
  }

  const bookings = (bookingsResult.data ?? []) as unknown as BookingRow[]
  const rules = (rulesResult.data ?? []) as unknown as RuleRow[]

  const workingRules = rules.filter(r => r.is_working)

  const earliestStart =
    workingRules.length > 0
      ? workingRules.reduce((min, r) => {
          const t = r.start_time.slice(0, 5)
          return t < min ? t : min
        }, workingRules[0].start_time.slice(0, 5))
      : '08:00'

  const latestEnd =
    workingRules.length > 0
      ? workingRules.reduce((max, r) => {
          const t = r.end_time.slice(0, 5)
          return t > max ? t : max
        }, workingRules[0].end_time.slice(0, 5))
      : '20:00'

  return {
    bookings,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    prevWeek: isoDate(prevWeekDate),
    nextWeek: isoDate(nextWeekDate),
    earliestStart,
    latestEnd,
  }
}
