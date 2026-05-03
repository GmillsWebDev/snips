import { fail } from '@sveltejs/kit'
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
}

export const load: PageServerLoad = async ({ parent }) => {
  const { role } = await parent()
  const admin = createSupabaseAdminClient()

  const { data, error } = await admin
    .from('services')
    .select('id, name, duration_minutes, price_pence, display_order, is_active')
    .eq('shop_id', role.shop_id)
    .order('display_order', { ascending: true })

  if (error) throw error

  return { services: (data ?? []) as Service[] }
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

    // Fetch the target service — .eq('shop_id') ensures it belongs to this shop
    const { data: current, error: currentErr } = await admin
      .from('services')
      .select('id, display_order')
      .eq('id', serviceId)
      .eq('shop_id', role.shop_id)
      .single()

    if (currentErr || !current) return fail(404, { reorderError: 'Service not found' })

    const neighborBase = admin
      .from('services')
      .select('id, display_order')
      .eq('shop_id', role.shop_id)

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

    // Verify service belongs to this shop before proceeding
    const { data: service, error: serviceErr } = await admin
      .from('services')
      .select('id')
      .eq('id', serviceId)
      .eq('shop_id', role.shop_id)
      .maybeSingle()

    if (serviceErr) return fail(500, { deleteError: 'Failed to verify service.' })
    if (!service) return fail(404, { deleteError: 'Service not found.' })

    // Block deletion if any upcoming active bookings use this service
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
      .delete()
      .eq('id', serviceId)
      .eq('shop_id', role.shop_id)

    if (deleteErr) return fail(500, { deleteError: 'Failed to delete service.' })

    return { deleted: true }
  },
}
