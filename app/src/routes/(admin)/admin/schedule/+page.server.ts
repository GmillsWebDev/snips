import { fail, error } from '@sveltejs/kit'
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

function isValidTime(t: string): boolean {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(t)
}

// Strips optional seconds so HH:MM and HH:MM:SS compare consistently.
function toHHMM(t: string): string {
  return t.slice(0, 5)
}

// Returns 0=Sun, 1=Mon … 6=Sat in the Europe/London calendar day.
// Uses en-CA (YYYY-MM-DD output) + UTC noon to avoid DST/locale ambiguity.
function londonDayOfWeek(isoString: string): number {
  const londonDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoString))
  return new Date(`${londonDate}T12:00:00Z`).getUTCDay()
}

export const load: PageServerLoad = async ({ parent }) => {
  const { role } = await parent()
  const admin = createSupabaseAdminClient()

  const { data: barber, error: barberErr } = await admin
    .from('barbers')
    .select('id, name')
    .eq('shop_id', role.shop_id)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (barberErr || !barber) throw error(500, 'Barber not found for this shop')

  const { data: rules, error: rulesErr } = await admin
    .from('availability_rules')
    .select('id, day_of_week, shift_number, start_time, end_time, is_working')
    .eq('barber_id', barber.id)
    .order('day_of_week', { ascending: true })
    .order('shift_number', { ascending: true })

  if (rulesErr) throw error(500, rulesErr.message)

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
      .eq('is_active', true)
      .limit(1)
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
      .eq('is_active', true)
      .limit(1)
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

  updateTimes: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { message: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { message: 'Not authorized' })

    const formData = await request.formData()
    const dayOfWeek = Number(formData.get('dayOfWeek'))
    const shiftNumber = Number(formData.get('shiftNumber'))
    const startTime = String(formData.get('startTime') ?? '')
    const endTime = String(formData.get('endTime') ?? '')

    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return fail(400, { message: 'Invalid day', dayOfWeek, shiftNumber })
    }
    if (![1, 2].includes(shiftNumber)) {
      return fail(400, { message: 'Invalid shift number', dayOfWeek, shiftNumber })
    }
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return fail(400, { message: 'Invalid time format', dayOfWeek, shiftNumber })
    }
    if (toHHMM(startTime) >= toHHMM(endTime)) {
      return fail(400, { message: 'Start time must be before end time', dayOfWeek, shiftNumber })
    }

    const admin = createSupabaseAdminClient()

    const { data: barber, error: barberErr } = await admin
      .from('barbers')
      .select('id')
      .eq('shop_id', role.shop_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (barberErr || !barber) return fail(404, { message: 'Barber not found', dayOfWeek, shiftNumber })

    const { data: updated, error: updateErr } = await admin
      .from('availability_rules')
      .update({ start_time: startTime, end_time: endTime })
      .eq('barber_id', barber.id)
      .eq('day_of_week', dayOfWeek)
      .eq('shift_number', shiftNumber)
      .select('id')

    if (updateErr) return fail(500, { message: 'Failed to save times', dayOfWeek, shiftNumber })
    if (!updated || updated.length === 0) {
      return fail(404, { message: 'Shift not found', dayOfWeek, shiftNumber })
    }

    return { updated: true }
  },

  enableSplitShift: async ({ request, locals }) => {
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
      .eq('is_active', true)
      .limit(1)
      .single()

    if (barberErr || !barber) return fail(404, { error: 'Barber not found' })

    const { data: existing2 } = await admin
      .from('availability_rules')
      .select('id')
      .eq('barber_id', barber.id)
      .eq('day_of_week', dayOfWeek)
      .eq('shift_number', 2)
      .maybeSingle()

    if (existing2) return fail(409, { error: 'Split shift already enabled for this day' })

    const { data: shift1, error: shift1Err } = await admin
      .from('availability_rules')
      .select('id, start_time, end_time')
      .eq('barber_id', barber.id)
      .eq('day_of_week', dayOfWeek)
      .eq('shift_number', 1)
      .single()

    if (shift1Err || !shift1) return fail(404, { error: 'No shift found for this day' })

    const [sh, sm] = shift1.start_time.split(':').map(Number)
    const [eh, em] = shift1.end_time.split(':').map(Number)
    const midMins = Math.floor((sh * 60 + sm + eh * 60 + em) / 2)
    const midpoint = `${String(Math.floor(midMins / 60)).padStart(2, '0')}:${String(midMins % 60).padStart(2, '0')}`
    const originalEnd = shift1.end_time

    const { error: upErr } = await admin
      .from('availability_rules')
      .update({ end_time: midpoint })
      .eq('id', shift1.id)

    if (upErr) return fail(500, { error: 'Failed to update shift 1' })

    const { error: insErr } = await admin
      .from('availability_rules')
      .insert({
        barber_id: barber.id,
        day_of_week: dayOfWeek,
        shift_number: 2,
        start_time: midpoint,
        end_time: originalEnd,
        is_working: true,
      })

    if (insErr) return fail(500, { error: 'Failed to create shift 2' })

    return { split: true }
  },

  disableSplitShift: async ({ request, locals }) => {
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
      .eq('is_active', true)
      .limit(1)
      .single()

    if (barberErr || !barber) return fail(404, { error: 'Barber not found' })

    const { data: shifts, error: shiftsErr } = await admin
      .from('availability_rules')
      .select('id, shift_number, end_time')
      .eq('barber_id', barber.id)
      .eq('day_of_week', dayOfWeek)
      .in('shift_number', [1, 2])
      .order('shift_number', { ascending: true })

    if (shiftsErr) return fail(500, { error: 'Failed to fetch shifts' })

    const shift1 = shifts?.find((s) => s.shift_number === 1)
    const shift2 = shifts?.find((s) => s.shift_number === 2)

    if (!shift1 || !shift2) return fail(404, { error: 'Both shifts must exist to merge' })

    const { error: upErr } = await admin
      .from('availability_rules')
      .update({ end_time: shift2.end_time })
      .eq('id', shift1.id)

    if (upErr) return fail(500, { error: 'Failed to merge shifts' })

    const { error: delErr } = await admin
      .from('availability_rules')
      .delete()
      .eq('id', shift2.id)

    if (delErr) return fail(500, { error: 'Failed to remove shift 2' })

    return { merged: true }
  },
}
