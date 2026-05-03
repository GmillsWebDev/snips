import { fail, redirect } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import { getRole } from '$lib/server/getRole'
import type { PageServerLoad, Actions } from './$types'

export type Service = {
  id: string
  name: string
  duration_minutes: number
  price_pence: number
  display_order: number
  is_active: boolean
  is_deleted: boolean
  deleted_at: string | null
}

export const load: PageServerLoad = async ({ parent, url }) => {
  const { role } = await parent()
  const admin = createSupabaseAdminClient()
  const showDeleted = url.searchParams.get('showDeleted') === 'true'

  let query = admin
    .from('services')
    .select('id, name, duration_minutes, price_pence, display_order, is_active, is_deleted, deleted_at')
    .eq('shop_id', role.shop_id)
    .order('display_order', { ascending: true })

  if (!showDeleted) {
    query = query.eq('is_deleted', false)
  }

  const { data, error } = await query

  if (error) throw error

  return { services: (data ?? []) as Service[], showDeleted }
}

export const actions: Actions = {
  reorder: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { reorderError: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { reorderError: 'Not authorized' })

    const formData = await request.formData()
    const serviceId = formData.get('serviceId')
    const direction = formData.get('direction')

    if (typeof serviceId !== 'string' || (direction !== 'up' && direction !== 'down')) {
      return fail(400, { reorderError: 'Invalid input' })
    }

    const admin = createSupabaseAdminClient()

    const { data: current, error: currentErr } = await admin
      .from('services')
      .select('id, display_order')
      .eq('id', serviceId)
      .eq('shop_id', role.shop_id)
      .eq('is_deleted', false)
      .single()

    if (currentErr || !current) return fail(404, { reorderError: 'Service not found' })

    const neighborBase = admin
      .from('services')
      .select('id, display_order')
      .eq('shop_id', role.shop_id)
      .eq('is_deleted', false)

    const { data: neighbor, error: neighborErr } = direction === 'up'
      ? await neighborBase
          .lt('display_order', current.display_order)
          .order('display_order', { ascending: false })
          .limit(1)
          .maybeSingle()
      : await neighborBase
          .gt('display_order', current.display_order)
          .order('display_order', { ascending: true })
          .limit(1)
          .maybeSingle()

    if (neighborErr) return fail(500, { reorderError: 'Failed to reorder' })
    if (!neighbor) return { reordered: false }

    const [resA, resB] = await Promise.all([
      admin.from('services').update({ display_order: neighbor.display_order }).eq('id', current.id),
      admin.from('services').update({ display_order: current.display_order }).eq('id', neighbor.id),
    ])

    if (resA.error || resB.error) return fail(500, { reorderError: 'Failed to update order' })

    return { reordered: true }
  },

  delete: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { deleteError: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { deleteError: 'Not authorized' })

    const formData = await request.formData()
    const serviceId = formData.get('serviceId')

    if (typeof serviceId !== 'string') return fail(400, { deleteError: 'Invalid request' })

    const admin = createSupabaseAdminClient()

    const { data: service, error: serviceErr } = await admin
      .from('services')
      .select('id')
      .eq('id', serviceId)
      .eq('shop_id', role.shop_id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (serviceErr) return fail(500, { deleteError: 'Failed to verify service.' })
    if (!service) return fail(404, { deleteError: 'Service not found.' })

    const { data: upcoming, error: bookingsErr } = await admin
      .from('bookings')
      .select('id')
      .eq('service_id', serviceId)
      .eq('shop_id', role.shop_id)
      .not('status', 'in', '(cancelled,rejected,completed,no_show)')
      .gt('start_at', new Date().toISOString())
      .limit(1)

    if (bookingsErr) return fail(500, { deleteError: 'Failed to check bookings.' })

    if (upcoming && upcoming.length > 0) {
      return fail(400, {
        deleteError: 'This service has upcoming bookings and cannot be deleted. Set it to inactive instead.',
      })
    }

    const { error: deleteErr } = await admin
      .from('services')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', serviceId)
      .eq('shop_id', role.shop_id)

    if (deleteErr) return fail(500, { deleteError: 'Failed to delete service.' })

    return { deleted: true }
  },

  restore: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { restoreError: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { restoreError: 'Not authorized' })

    const formData = await request.formData()
    const serviceId = formData.get('serviceId')

    if (typeof serviceId !== 'string') return fail(400, { restoreError: 'Invalid request' })

    const admin = createSupabaseAdminClient()

    const { data: service, error: serviceErr } = await admin
      .from('services')
      .select('id')
      .eq('id', serviceId)
      .eq('shop_id', role.shop_id)
      .eq('is_deleted', true)
      .maybeSingle()

    if (serviceErr) return fail(500, { restoreError: 'Failed to verify service.' })
    if (!service) return fail(404, { restoreError: 'Service not found.' })

    const { error: restoreErr } = await admin
      .from('services')
      .update({ is_deleted: false, deleted_at: null })
      .eq('id', serviceId)
      .eq('shop_id', role.shop_id)

    if (restoreErr) return fail(500, { restoreError: 'Failed to restore service.' })

    redirect(303, '/admin/services?showDeleted=true')
  },
}
