import { fail, redirect, error } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import { getRole } from '$lib/server/getRole'
import { getExpiringRecurrences } from '$lib/server/getExpiringRecurrences'
import type { PageServerLoad, Actions } from './$types'

export type BlockedSlot = {
  id: string
  start_at: string
  end_at: string
  reason: string | null
  recurrence_pattern: string
}

export type RecurringBlock = {
  id: string
  start_at: string
  end_at: string
  reason: string | null
  recurrence_pattern: string
  recurrence_id: string
  recurrence_end_date: string | null
}

type RecurrencePattern = 'daily' | 'weekly' | 'fortnightly' | 'monthly'

// Converts a Europe/London date + time string to a UTC Date.
// Probes at noon UTC on the given date to determine the London UTC offset,
// avoiding DST edge cases at midnight.
function londonToUtc(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const londonHour = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      hour12: false,
    }).format(probe),
    10,
  )
  const offsetHours = londonHour - 12
  const [hh, mm, ss = 0] = timeStr.split(':').map(Number)
  return new Date(Date.UTC(year, month - 1, day, hh - offsetHours, mm, ss))
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Converts a UTC ISO string to the YYYY-MM-DD date in Europe/London timezone.
function utcToLondonDateStr(isoStr: string): string {
  const [dd, mm, yyyy] = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date(isoStr))
    .split('/')
  return `${yyyy}-${mm}-${dd}`
}

// Converts a UTC ISO string to an HH:MM time string in Europe/London timezone.
function utcToLondonTimeStr(isoStr: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(isoStr))
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${h}:${m}`
}

// Returns the date string of the next occurrence after lastDateStr for the given pattern.
function nextOccurrenceDate(pattern: RecurrencePattern, lastDateStr: string): string {
  const [ly, lm, ld] = lastDateStr.split('-').map(Number)
  if (pattern === 'daily') return toDateStr(new Date(ly, lm - 1, ld + 1))
  if (pattern === 'weekly') return toDateStr(new Date(ly, lm - 1, ld + 7))
  if (pattern === 'fortnightly') return toDateStr(new Date(ly, lm - 1, ld + 14))
  // monthly: advance one month at a time, preserving day-of-month; skip months where the day doesn't exist
  let offset = 1
  while (true) {
    const candidate = new Date(ly, lm - 1 + offset, ld)
    if (candidate.getDate() === ld) return toDateStr(candidate)
    offset++
  }
}

function generateOccurrenceDates(
  pattern: RecurrencePattern,
  startDateStr: string,
  limitDate: Date,
): string[] {
  const [sy, sm, sd] = startDateStr.split('-').map(Number)
  const dates: string[] = []

  if (pattern === 'daily') {
    let cur = new Date(sy, sm - 1, sd)
    while (cur <= limitDate) {
      dates.push(toDateStr(cur))
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1)
    }
  } else if (pattern === 'weekly') {
    let cur = new Date(sy, sm - 1, sd)
    while (cur <= limitDate) {
      dates.push(toDateStr(cur))
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 7)
    }
  } else if (pattern === 'fortnightly') {
    let cur = new Date(sy, sm - 1, sd)
    while (cur <= limitDate) {
      dates.push(toDateStr(cur))
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 14)
    }
  } else {
    // monthly: same day of month; skip months where that day doesn't exist (e.g. 31st in Feb)
    let offset = 0
    while (true) {
      const candidate = new Date(sy, sm - 1 + offset, sd)
      if (candidate > limitDate) break
      if (candidate.getDate() === sd) dates.push(toDateStr(candidate))
      offset++
    }
  }

  return dates
}

function computeLimitDate(endDate: string | null): Date {
  const cap = new Date()
  cap.setMonth(cap.getMonth() + 18)
  if (!endDate) return cap
  const d = new Date(`${endDate}T23:59:59`)
  return d < cap ? d : cap
}

function buildOccurrenceRows(
  barberId: string,
  recurrenceId: string,
  pattern: RecurrencePattern,
  startDate: string,
  startTime: string,
  endTime: string,
  reason: string,
  endDate: string | null,
) {
  const dates = generateOccurrenceDates(pattern, startDate, computeLimitDate(endDate))
  if (dates.length === 0) return []
  const lastDate = dates[dates.length - 1]
  return dates.map((date, i) => ({
    barber_id: barberId,
    start_at: londonToUtc(date, startTime).toISOString(),
    end_at: londonToUtc(date, endTime).toISOString(),
    reason: reason || null,
    recurrence_pattern: pattern,
    recurrence_id: recurrenceId,
    recurrence_end_date: endDate ?? null,
    generated_until: i === 0 ? lastDate : null,
  }))
}

type ParsedRecurring =
  | { ok: false; message: string }
  | {
      ok: true
      pattern: RecurrencePattern
      startDate: string
      startTime: string
      endTime: string
      reason: string
      endDate: string | null
    }

function parseRecurring(formData: FormData): ParsedRecurring {
  const pattern = String(formData.get('pattern') ?? '')
  const startDate = String(formData.get('startDate') ?? '')
  const startTime = String(formData.get('startTime') ?? '')
  const endTime = String(formData.get('endTime') ?? '')
  const reason = String(formData.get('reason') ?? '').trim()
  const endDateRaw = String(formData.get('endDate') ?? '').trim()

  if (!['daily', 'weekly', 'fortnightly', 'monthly'].includes(pattern))
    return { ok: false, message: 'Invalid recurrence pattern' }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate))
    return { ok: false, message: 'A valid start date is required' }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  if (new Date(startDate) < todayStart)
    return { ok: false, message: 'Start date must not be in the past' }

  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime))
    return { ok: false, message: 'Valid start and end times are required' }

  if (startTime >= endTime)
    return { ok: false, message: 'Start time must be before end time' }

  if (reason.length > 200)
    return { ok: false, message: 'Reason must be 200 characters or fewer' }

  let endDate: string | null = null
  if (endDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(endDateRaw)) {
    if (endDateRaw <= startDate)
      return { ok: false, message: 'End date must be after start date' }
    endDate = endDateRaw
  }

  return { ok: true, pattern: pattern as RecurrencePattern, startDate, startTime, endTime, reason, endDate }
}

type ParsedBlock =
  | { ok: false; message: string }
  | {
      ok: true
      blockType: 'full_day' | 'custom_range'
      date: string
      startTime: string
      endTime: string
      reason: string
      startUtc: Date
      endUtc: Date
    }

function parseBlock(formData: FormData): ParsedBlock {
  const blockType = String(formData.get('blockType') ?? '')
  const date = String(formData.get('date') ?? '')
  const startTime = String(formData.get('startTime') ?? '')
  const endTime = String(formData.get('endTime') ?? '')
  const reason = String(formData.get('reason') ?? '').trim()

  if (blockType !== 'full_day' && blockType !== 'custom_range')
    return { ok: false, message: 'Invalid block type' }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return { ok: false, message: 'A valid date is required' }

  if (reason.length > 200)
    return { ok: false, message: 'Reason must be 200 characters or fewer' }

  let startUtc: Date
  let endUtc: Date

  if (blockType === 'full_day') {
    startUtc = londonToUtc(date, '00:00:00')
    endUtc = londonToUtc(date, '23:59:59')
  } else {
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime))
      return { ok: false, message: 'Valid start and end times are required' }

    if (startTime >= endTime)
      return { ok: false, message: 'Start time must be before end time' }

    startUtc = londonToUtc(date, startTime)
    endUtc = londonToUtc(date, endTime)
  }

  if (startUtc <= new Date())
    return { ok: false, message: 'Blocked slot must be in the future' }

  return { ok: true, blockType, date, startTime, endTime, reason, startUtc, endUtc }
}

type AdminClient = ReturnType<typeof createSupabaseAdminClient>

// Ensures generated_until is set only on the first row of a series, pointing to the last occurrence.
async function syncGeneratedUntil(admin: AdminClient, recurrenceId: string): Promise<void> {
  await admin
    .from('blocked_slots')
    .update({ generated_until: null })
    .eq('recurrence_id', recurrenceId)

  const { data: firstRow } = await admin
    .from('blocked_slots')
    .select('id, start_at')
    .eq('recurrence_id', recurrenceId)
    .order('start_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: lastRow } = await admin
    .from('blocked_slots')
    .select('start_at')
    .eq('recurrence_id', recurrenceId)
    .order('start_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (firstRow && lastRow) {
    await admin
      .from('blocked_slots')
      .update({ generated_until: utcToLondonDateStr(lastRow.start_at) })
      .eq('id', firstRow.id)
  }
}

async function runCreateRecurring(request: Request, locals: App.Locals, skipCheck: boolean) {
  const { user } = await locals.safeGetSession()
  if (!user) return fail(403, { formError: 'Not authenticated' })

  const role = await getRole(locals.supabase, user.id)
  if (!role) return fail(403, { formError: 'Not authorized' })

  const formData = await request.formData()
  const parsed = parseRecurring(formData)
  if (!parsed.ok) return fail(400, { formError: parsed.message })

  const { pattern, startDate, startTime, endTime, reason, endDate } = parsed
  const admin = createSupabaseAdminClient()

  const { data: barber, error: barberErr } = await admin
    .from('barbers')
    .select('id')
    .eq('shop_id', role.shop_id)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (barberErr || !barber) return fail(404, { formError: 'Barber not found' })

  const recurrenceId = crypto.randomUUID()
  const rows = buildOccurrenceRows(barber.id, recurrenceId, pattern, startDate, startTime, endTime, reason, endDate)

  if (rows.length === 0)
    return fail(400, { formError: 'No occurrences generated for the given date range' })

  if (!skipCheck) {
    const { data: upcoming, error: bookingsErr } = await admin
      .from('bookings')
      .select('id')
      .eq('barber_id', barber.id)
      .not('status', 'in', '(cancelled,rejected,completed,no_show)')
      .gte('start_at', rows[0].start_at)
      .lt('start_at', rows[rows.length - 1].end_at)

    if (bookingsErr) return fail(500, { formError: 'Failed to check upcoming bookings' })

    if (upcoming && upcoming.length > 0) {
      return fail(409, {
        warning: true,
        count: upcoming.length,
        formData: { pattern, startDate, startTime, endTime, reason, endDate },
      })
    }
  }

  const { error: insertErr } = await admin.from('blocked_slots').insert(rows)
  if (insertErr) return fail(500, { formError: 'Failed to create recurring breaks' })

  return { created: true }
}

type UpdateWarningData = {
  blockId: string
  scope: string
  startTime: string
  endTime: string
  reason: string
  endDate: string | null
}

async function checkBookingConflicts(
  admin: AdminClient,
  barberId: string,
  startIso: string,
  endIso: string,
): Promise<{ ok: false } | { ok: true; count: number }> {
  const { data, error } = await admin
    .from('bookings')
    .select('id')
    .eq('barber_id', barberId)
    .not('status', 'in', '(cancelled,rejected,completed,no_show)')
    .gte('start_at', startIso)
    .lt('start_at', endIso)
  if (error) return { ok: false }
  return { ok: true, count: data?.length ?? 0 }
}

async function applySingleUpdate(
  admin: AdminClient,
  barberId: string,
  blockId: string,
  occurrenceDate: string,
  startTime: string,
  endTime: string,
  reason: string,
  skipCheck: boolean,
  warningData: UpdateWarningData,
) {
  const newStartUtc = londonToUtc(occurrenceDate, startTime)
  const newEndUtc = londonToUtc(occurrenceDate, endTime)

  if (!skipCheck) {
    const conflicts = await checkBookingConflicts(admin, barberId, newStartUtc.toISOString(), newEndUtc.toISOString())
    if (!conflicts.ok) return fail(500, { formError: 'Failed to check upcoming bookings' })
    if (conflicts.count > 0) return fail(409, { warning: true, count: conflicts.count, formData: warningData })
  }

  const { error: updateErr } = await admin
    .from('blocked_slots')
    .update({
      start_at: newStartUtc.toISOString(),
      end_at: newEndUtc.toISOString(),
      reason: reason || null,
    })
    .eq('id', blockId)

  if (updateErr) return fail(500, { formError: 'Failed to update blocked slot' })
  return redirect(303, '/admin/blocked-slots')
}

async function applyFutureUpdate(
  admin: AdminClient,
  barberId: string,
  block: { start_at: string; recurrence_id: string; recurrence_pattern: string; recurrence_end_date: string | null },
  occurrenceDate: string,
  startTime: string,
  endTime: string,
  reason: string,
  endDate: string | null,
  skipCheck: boolean,
  warningData: UpdateWarningData,
) {
  const recurrenceId = block.recurrence_id
  const seriesEndDate = endDate ?? block.recurrence_end_date ?? null

  const newRows = buildOccurrenceRows(
    barberId,
    recurrenceId,
    block.recurrence_pattern as RecurrencePattern,
    occurrenceDate,
    startTime,
    endTime,
    reason,
    seriesEndDate,
  )

  if (!skipCheck && newRows.length > 0) {
    const conflicts = await checkBookingConflicts(admin, barberId, newRows[0].start_at, newRows[newRows.length - 1].end_at)
    if (!conflicts.ok) return fail(500, { formError: 'Failed to check upcoming bookings' })
    if (conflicts.count > 0) return fail(409, { warning: true, count: conflicts.count, formData: warningData })
  }

  const { error: deleteErr } = await admin
    .from('blocked_slots')
    .delete()
    .eq('recurrence_id', recurrenceId)
    .gte('start_at', block.start_at)

  if (deleteErr) return fail(500, { formError: 'Failed to update recurring series' })

  if (newRows.length > 0) {
    const { error: insertErr } = await admin.from('blocked_slots').insert(newRows)
    if (insertErr) return fail(500, { formError: 'Failed to insert updated occurrences' })
  }

  await syncGeneratedUntil(admin, recurrenceId)
  return redirect(303, '/admin/blocked-slots')
}

async function runUpdateOccurrence(request: Request, locals: App.Locals, skipCheck: boolean) {
  const { user } = await locals.safeGetSession()
  if (!user) return fail(403, { formError: 'Not authenticated' })

  const role = await getRole(locals.supabase, user.id)
  if (!role) return fail(403, { formError: 'Not authorized' })

  const formData = await request.formData()
  const blockId = String(formData.get('blockId') ?? '')
  const scope = String(formData.get('scope') ?? '')
  const startTime = String(formData.get('startTime') ?? '')
  const endTime = String(formData.get('endTime') ?? '')
  const reason = String(formData.get('reason') ?? '').trim()
  const endDateRaw = String(formData.get('endDate') ?? '').trim()

  if (!blockId) return fail(400, { formError: 'Invalid block ID' })
  if (scope !== 'single' && scope !== 'future') return fail(400, { formError: 'Invalid scope' })
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime))
    return fail(400, { formError: 'Valid start and end times are required' })
  if (startTime >= endTime) return fail(400, { formError: 'Start time must be before end time' })
  if (reason.length > 200) return fail(400, { formError: 'Reason must be 200 characters or fewer' })

  let endDate: string | null = null
  if (endDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(endDateRaw)) endDate = endDateRaw

  const admin = createSupabaseAdminClient()

  const { data: barber, error: barberErr } = await admin
    .from('barbers')
    .select('id')
    .eq('shop_id', role.shop_id)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (barberErr || !barber) return fail(404, { formError: 'Barber not found' })

  const { data: block, error: blockErr } = await admin
    .from('blocked_slots')
    .select('id, start_at, recurrence_id, recurrence_pattern, recurrence_end_date')
    .eq('id', blockId)
    .eq('barber_id', barber.id)
    .maybeSingle()

  if (blockErr) return fail(500, { formError: 'Failed to fetch blocked slot' })
  if (!block) return fail(404, { formError: 'Blocked slot not found' })
  if (!block.recurrence_id) return fail(400, { formError: 'Block is not part of a recurring series' })

  const occurrenceDate = utcToLondonDateStr(block.start_at)
  const warningData: UpdateWarningData = { blockId, scope, startTime, endTime, reason, endDate }

  if (scope === 'single') {
    return applySingleUpdate(admin, barber.id, blockId, occurrenceDate, startTime, endTime, reason, skipCheck, warningData)
  }
  return applyFutureUpdate(admin, barber.id, block, occurrenceDate, startTime, endTime, reason, endDate, skipCheck, warningData)
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

  const { data: blocks, error: blocksErr } = await admin
    .from('blocked_slots')
    .select('id, start_at, end_at, reason, recurrence_pattern')
    .eq('barber_id', barber.id)
    .eq('recurrence_pattern', 'none')
    .gt('end_at', new Date().toISOString())
    .order('start_at', { ascending: true })

  if (blocksErr) throw error(500, blocksErr.message)

  const todayStr = new Date().toISOString().split('T')[0]

  const { data: allRecurring, error: recurringErr } = await admin
    .from('blocked_slots')
    .select('id, start_at, end_at, reason, recurrence_pattern, recurrence_id, recurrence_end_date')
    .eq('barber_id', barber.id)
    .neq('recurrence_pattern', 'none')
    .or(`recurrence_end_date.is.null,recurrence_end_date.gt.${todayStr}`)
    .order('recurrence_id', { ascending: true })
    .order('start_at', { ascending: true })

  if (recurringErr) throw error(500, recurringErr.message)

  // Simulate DISTINCT ON (recurrence_id): keep the first row per series for display
  const seen = new Set<string>()
  const recurringBlocks = (allRecurring ?? []).filter((r) => {
    if (!r.recurrence_id || seen.has(r.recurrence_id)) return false
    seen.add(r.recurrence_id)
    return true
  }) as RecurringBlock[]

  const expiringRecurrences = await getExpiringRecurrences(role.shop_id, admin)

  return {
    barber,
    blocks: (blocks ?? []) as BlockedSlot[],
    recurringBlocks,
    expiringRecurrences,
  }
}

export const actions: Actions = {
  createBlock: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { formError: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { formError: 'Not authorized' })

    const formData = await request.formData()
    const parsed = parseBlock(formData)
    if (!parsed.ok) return fail(400, { formError: parsed.message })

    const { startUtc, endUtc, blockType, reason } = parsed
    const admin = createSupabaseAdminClient()

    const { data: barber, error: barberErr } = await admin
      .from('barbers')
      .select('id')
      .eq('shop_id', role.shop_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (barberErr || !barber) return fail(404, { formError: 'Barber not found' })

    const { data: upcoming, error: bookingsErr } = await admin
      .from('bookings')
      .select('id')
      .eq('barber_id', barber.id)
      .not('status', 'in', '(cancelled,rejected,completed,no_show)')
      .gte('start_at', startUtc.toISOString())
      .lt('start_at', endUtc.toISOString())

    if (bookingsErr) return fail(500, { formError: 'Failed to check upcoming bookings' })

    if (upcoming && upcoming.length > 0) {
      return fail(409, {
        warning: true,
        count: upcoming.length,
        startAt: startUtc.toISOString(),
        endAt: endUtc.toISOString(),
        blockType,
        reason,
      })
    }

    const { error: insertErr } = await admin.from('blocked_slots').insert({
      barber_id: barber.id,
      start_at: startUtc.toISOString(),
      end_at: endUtc.toISOString(),
      reason: reason || null,
      recurrence_pattern: 'none',
      recurrence_id: null,
    })

    if (insertErr) return fail(500, { formError: 'Failed to create blocked slot' })

    return { created: true }
  },

  createBlockConfirmed: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { formError: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { formError: 'Not authorized' })

    const formData = await request.formData()
    const parsed = parseBlock(formData)
    if (!parsed.ok) return fail(400, { formError: parsed.message })

    const { startUtc, endUtc, reason } = parsed
    const admin = createSupabaseAdminClient()

    const { data: barber, error: barberErr } = await admin
      .from('barbers')
      .select('id')
      .eq('shop_id', role.shop_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (barberErr || !barber) return fail(404, { formError: 'Barber not found' })

    const { error: insertErr } = await admin.from('blocked_slots').insert({
      barber_id: barber.id,
      start_at: startUtc.toISOString(),
      end_at: endUtc.toISOString(),
      reason: reason || null,
      recurrence_pattern: 'none',
      recurrence_id: null,
    })

    if (insertErr) return fail(500, { formError: 'Failed to create blocked slot' })

    return { created: true }
  },

  deleteBlock: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { deleteError: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { deleteError: 'Not authorized' })

    const formData = await request.formData()
    const blockId = formData.get('blockId')

    if (typeof blockId !== 'string') return fail(400, { deleteError: 'Invalid request' })

    const admin = createSupabaseAdminClient()

    const { data: barber, error: barberErr } = await admin
      .from('barbers')
      .select('id')
      .eq('shop_id', role.shop_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (barberErr || !barber) return fail(404, { deleteError: 'Barber not found' })

    const { data: block, error: blockErr } = await admin
      .from('blocked_slots')
      .select('id, recurrence_pattern')
      .eq('id', blockId)
      .eq('barber_id', barber.id)
      .maybeSingle()

    if (blockErr) return fail(500, { deleteError: 'Failed to verify blocked slot' })
    if (!block) return fail(404, { deleteError: 'Blocked slot not found' })

    if (block.recurrence_pattern !== 'none') {
      return fail(400, { deleteError: 'Use the recurring breaks section to manage recurring blocks' })
    }

    const { error: deleteErr } = await admin.from('blocked_slots').delete().eq('id', blockId)

    if (deleteErr) return fail(500, { deleteError: 'Failed to delete blocked slot' })

    return redirect(303, '/admin/blocked-slots')
  },

  createRecurring: ({ request, locals }) => runCreateRecurring(request, locals, false),

  createRecurringConfirmed: ({ request, locals }) => runCreateRecurring(request, locals, true),

  deleteOccurrence: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { deleteError: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { deleteError: 'Not authorized' })

    const formData = await request.formData()
    const blockId = String(formData.get('blockId') ?? '')
    const scope = String(formData.get('scope') ?? '')

    if (!blockId) return fail(400, { deleteError: 'Invalid block ID' })
    if (scope !== 'single' && scope !== 'future') return fail(400, { deleteError: 'Invalid scope' })

    const admin = createSupabaseAdminClient()

    const { data: barber, error: barberErr } = await admin
      .from('barbers')
      .select('id')
      .eq('shop_id', role.shop_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (barberErr || !barber) return fail(404, { deleteError: 'Barber not found' })

    const { data: block, error: blockErr } = await admin
      .from('blocked_slots')
      .select('id, start_at, recurrence_id')
      .eq('id', blockId)
      .eq('barber_id', barber.id)
      .maybeSingle()

    if (blockErr) return fail(500, { deleteError: 'Failed to verify blocked slot' })
    if (!block) return fail(404, { deleteError: 'Blocked slot not found' })
    if (!block.recurrence_id) return fail(400, { deleteError: 'Block is not part of a recurring series' })

    if (scope === 'single') {
      const { error: deleteErr } = await admin.from('blocked_slots').delete().eq('id', blockId)
      if (deleteErr) return fail(500, { deleteError: 'Failed to delete occurrence' })
    } else {
      // future: delete this and all later occurrences in the series
      const { error: deleteErr } = await admin
        .from('blocked_slots')
        .delete()
        .eq('recurrence_id', block.recurrence_id)
        .gte('start_at', block.start_at)

      if (deleteErr) return fail(500, { deleteError: 'Failed to delete occurrences' })

      await syncGeneratedUntil(admin, block.recurrence_id)
    }

    return redirect(303, '/admin/blocked-slots')
  },

  updateOccurrence: ({ request, locals }) => runUpdateOccurrence(request, locals, false),

  updateOccurrenceConfirmed: ({ request, locals }) => runUpdateOccurrence(request, locals, true),

  extendRecurrence: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { formError: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { formError: 'Not authorized' })

    const formData = await request.formData()
    const recurrenceId = String(formData.get('recurrenceId') ?? '')
    if (!recurrenceId) return fail(400, { formError: 'Invalid recurrence ID' })

    const admin = createSupabaseAdminClient()

    const { data: barber, error: barberErr } = await admin
      .from('barbers')
      .select('id')
      .eq('shop_id', role.shop_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (barberErr || !barber) return fail(404, { formError: 'Barber not found' })

    // Fetch first row for pattern, times, reason, and end date
    const { data: firstRow, error: firstErr } = await admin
      .from('blocked_slots')
      .select('id, start_at, end_at, recurrence_pattern, recurrence_end_date, reason')
      .eq('recurrence_id', recurrenceId)
      .eq('barber_id', barber.id)
      .order('start_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (firstErr) return fail(500, { formError: 'Failed to fetch series' })
    if (!firstRow) return fail(404, { formError: 'Recurring series not found' })

    // Fetch last row to know where to extend from
    const { data: lastRow, error: lastErr } = await admin
      .from('blocked_slots')
      .select('start_at')
      .eq('recurrence_id', recurrenceId)
      .eq('barber_id', barber.id)
      .order('start_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastErr || !lastRow) return fail(500, { formError: 'Failed to fetch last occurrence' })

    const pattern = firstRow.recurrence_pattern as RecurrencePattern
    const startTime = utcToLondonTimeStr(firstRow.start_at)
    const endTime = utcToLondonTimeStr(firstRow.end_at)
    const reason = firstRow.reason ?? ''
    const endDate = firstRow.recurrence_end_date ?? null

    const lastDateStr = utcToLondonDateStr(lastRow.start_at)
    const nextDateStr = nextOccurrenceDate(pattern, lastDateStr)
    const limitDate = computeLimitDate(endDate)

    if (new Date(nextDateStr) > limitDate) {
      return fail(400, { formError: 'This series has reached its end date and cannot be extended.' })
    }

    const newRows = buildOccurrenceRows(barber.id, recurrenceId, pattern, nextDateStr, startTime, endTime, reason, endDate)
      .map((row) => ({ ...row, generated_until: null }))

    if (newRows.length === 0) {
      return fail(400, { formError: 'This series has reached its end date and cannot be extended.' })
    }

    const { error: insertErr } = await admin.from('blocked_slots').insert(newRows)
    if (insertErr) return fail(500, { formError: 'Failed to extend recurring series' })

    await syncGeneratedUntil(admin, recurrenceId)
    return redirect(303, '/admin/blocked-slots')
  },
}
