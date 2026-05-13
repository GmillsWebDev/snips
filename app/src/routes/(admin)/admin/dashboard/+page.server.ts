import type { PageServerLoad } from './$types'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import { getExpiringRecurrences } from '$lib/server/getExpiringRecurrences'

function getLondonDayBounds(): { dayStart: string; dayEnd: string } {
  const now = new Date()
  const todayLondon = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now)

  const tzPart = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/London',
    timeZoneName: 'shortOffset',
  }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value ?? 'GMT'

  let offsetStr = '+00:00'
  const match = tzPart.match(/GMT([+-])(\d+)/)
  if (match) offsetStr = `${match[1]}${match[2].padStart(2, '0')}:00`

  return {
    dayStart: new Date(`${todayLondon}T00:00:00${offsetStr}`).toISOString(),
    dayEnd:   new Date(`${todayLondon}T23:59:59${offsetStr}`).toISOString(),
  }
}

export const load: PageServerLoad = async ({ parent, depends }) => {
  depends('app:dashboard')
  const { role } = await parent()
  const shopId = role.shop_id

  const admin = createSupabaseAdminClient()
  const { dayStart, dayEnd } = getLondonDayBounds()

  const [brandingResult, bookingsResult, pendingResult, expiringRecurrences] = await Promise.all([
    admin.from('client_branding').select('color_primary').eq('shop_id', shopId).maybeSingle(),
    admin
      .from('bookings')
      .select(`
        id,
        start_at,
        status,
        customers ( first_name, last_name ),
        services ( name )
      `)
      .eq('shop_id', shopId)
      .gte('start_at', dayStart)
      .lte('start_at', dayEnd)
      .order('start_at'),
    admin
      .from('bookings')
      .select(`
        id,
        start_at,
        created_at,
        customers ( first_name, last_name ),
        services ( name )
      `)
      .eq('shop_id', shopId)
      .eq('status', 'pending')
      .gte('start_at', new Date().toISOString())
      .order('start_at'),
    getExpiringRecurrences(shopId, admin),
  ])

  if (bookingsResult.error) throw bookingsResult.error
  if (pendingResult.error) throw pendingResult.error

  const raw = bookingsResult.data

  const bookings = raw.map(b => ({
    id: b.id,
    time: new Date(b.start_at).toLocaleTimeString('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
    }),
    status: b.status as 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'no_show',
    customerName: `${b.customers?.first_name ?? ''} ${b.customers?.last_name ?? ''}`.trim(),
    serviceName: b.services?.name ?? '',
  }))

  const needsAttention = (pendingResult.data ?? [])
    .map(b => ({
      id: b.id,
      dateTime: `${new Date(b.start_at).toLocaleDateString('en-GB', {
        timeZone: 'Europe/London',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })} · ${new Date(b.start_at).toLocaleTimeString('en-GB', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      customerName: `${b.customers?.first_name ?? ''} ${b.customers?.last_name ?? ''}`.trim(),
      serviceName: b.services?.name ?? '',
    }))

  return {
    shopId,
    bookings,
    stats: {
      total:     raw.length,
      pending:   raw.filter(b => b.status === 'pending').length,
      accepted:  raw.filter(b => b.status === 'accepted').length,
      completed: raw.filter(b => b.status === 'completed').length,
    },
    needsAttention,
    expiringRecurrences,
    brandColour: brandingResult.data?.color_primary ?? null,
  }
}
