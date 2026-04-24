import type { PageServerLoad } from './$types'
import { createSupabaseAdminClient } from '$lib/server/supabase'

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

export const load: PageServerLoad = async ({ parent }) => {
  const { role } = await parent()
  const shopId = role.shop_id

  const admin = createSupabaseAdminClient()
  const { dayStart, dayEnd } = getLondonDayBounds()

  const [shopResult, bookingsResult] = await Promise.all([
    admin.from('shops').select('brand_colour').eq('id', shopId).single(),
    admin
      .from('bookings')
      .select(`
        id,
        start_at,
        status,
        created_at,
        customers ( first_name, last_name ),
        services ( name )
      `)
      .eq('shop_id', shopId)
      .gte('start_at', dayStart)
      .lte('start_at', dayEnd)
      .order('start_at'),
  ])

  if (bookingsResult.error) throw bookingsResult.error

  const raw = bookingsResult.data
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

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
    createdAt: b.created_at,
  }))

  return {
    bookings,
    stats: {
      total:     raw.length,
      pending:   raw.filter(b => b.status === 'pending').length,
      accepted:  raw.filter(b => b.status === 'accepted').length,
      completed: raw.filter(b => b.status === 'completed').length,
    },
    needsAttention: bookings.filter(b => b.status === 'pending' && (b.createdAt ?? '') < twoHoursAgo),
    brandColour: shopResult.data?.brand_colour ?? null,
  }
}
