import { fail } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import { getRole } from '$lib/server/getRole'
import type { PageServerLoad, Actions } from './$types'

export type AvailabilityRule = {
  id: string
  day_of_week: number
  shift_number: number
  start_time: string
  end_time: string
  is_working: boolean
}

function londonDayOfWeek(isoString: string): number {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/London',
    weekday: 'short',
  }).format(new Date(isoString))
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(label)
}

export const load: PageServerLoad = async ({ parent }) => {
  const { role } = await parent()
  const admin = createSupabaseAdminClient()

  const { data: barber, error: barberErr } = await admin
    .from('barbers')
    .select('id, name')
    .eq('shop_id', role.shop_id)
    .single()

  if (barberErr || !barber) throw new Error('Barber not found')

  const { data: rules, error: rulesErr } = await admin
    .from('availability_rules')
    .select('id, day_of_week, shift_number, start_time, end_time, is_working')
    .eq('barber_id', barber.id)
    .order('day_of_week', { ascending: true })
    .order('shift_number', { ascending: true })

  if (rulesErr) throw rulesErr

  return { barber, rules: (rules ?? []) as AvailabilityRule[] }
}

export const actions: Actions = {
  toggleDay: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { error: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { error: 'Not authorized' })

    const formData = await request.formData()
    const dayOfWeek = Number(formData.get('dayOfWeek'))
    const currentlyWorking = formData.get('currentlyWorking') === 'true'

    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return fail(400, { error: 'Invalid dayOfWeek' })
    }

    const admin = createSupabaseAdminClient()

    const { data: barber, error: barberErr } = await admin
      .from('barbers')
      .select('id')
      .eq('shop_id', role.shop_id)
      .single()

    if (barberErr || !barber) return fail(404, { error: 'Barber not found' })

    if (currentlyWorking) {
      const { data: upcoming, error: bookingsErr } = await admin
        .from('bookings')
        .select('id, start_at')
        .eq('barber_id', barber.id)
        .not('status', 'in', '(cancelled,rejected,completed,no_show)')
        .gt('start_at', new Date().toISOString())

      if (bookingsErr) return fail(500, { error: 'Failed to check bookings' })

      const affectedCount = (upcoming ?? []).filter(
        (b) => londonDayOfWeek(b.start_at) === dayOfWeek,
      ).length

      if (affectedCount > 0) {
        return fail(409, { warning: true, count: affectedCount, dayOfWeek })
      }

      const { error: updateErr } = await admin
        .from('availability_rules')
        .update({ is_working: false })
        .eq('barber_id', barber.id)
        .eq('day_of_week', dayOfWeek)

      if (updateErr) return fail(500, { error: 'Failed to update availability' })
    } else {
      const { data: existing } = await admin
        .from('availability_rules')
        .select('id')
        .eq('barber_id', barber.id)
        .eq('day_of_week', dayOfWeek)

      if (existing && existing.length > 0) {
        const { error: updateErr } = await admin
          .from('availability_rules')
          .update({ is_working: true })
          .eq('barber_id', barber.id)
          .eq('day_of_week', dayOfWeek)

        if (updateErr) return fail(500, { error: 'Failed to update availability' })
      } else {
        const { error: insertErr } = await admin
          .from('availability_rules')
          .insert({
            barber_id: barber.id,
            day_of_week: dayOfWeek,
            shift_number: 1,
            start_time: '09:00',
            end_time: '17:00',
            is_working: true,
          })

        if (insertErr) return fail(500, { error: 'Failed to create availability' })
      }
    }

    return { toggled: true }
  },

  toggleDayConfirmed: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { error: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { error: 'Not authorized' })

    const formData = await request.formData()
    const dayOfWeek = Number(formData.get('dayOfWeek'))

    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return fail(400, { error: 'Invalid dayOfWeek' })
    }

    const admin = createSupabaseAdminClient()

    const { data: barber, error: barberErr } = await admin
      .from('barbers')
      .select('id')
      .eq('shop_id', role.shop_id)
      .single()

    if (barberErr || !barber) return fail(404, { error: 'Barber not found' })

    const { error: updateErr } = await admin
      .from('availability_rules')
      .update({ is_working: false })
      .eq('barber_id', barber.id)
      .eq('day_of_week', dayOfWeek)

    if (updateErr) return fail(500, { error: 'Failed to update availability' })

    return { toggled: true }
  },
}
