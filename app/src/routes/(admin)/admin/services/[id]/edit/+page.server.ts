import { error, redirect, fail } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import { getRole } from '$lib/server/getRole'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ parent, params }) => {
  const { role } = await parent()
  const admin = createSupabaseAdminClient()

  const { data, error: fetchErr } = await admin
    .from('services')
    .select('id, name, description, duration_minutes, price_pence, display_order, is_active, is_deleted')
    .eq('id', params.id)
    .eq('shop_id', role.shop_id)
    .single()

  if (fetchErr || !data || data.is_deleted) error(404, 'Service not found')

  return {
    service: {
      id: data.id,
      name: data.name,
      description: data.description ?? '',
      duration_minutes: data.duration_minutes,
      price_pounds: (data.price_pence / 100).toFixed(2),
      display_order: data.display_order,
      is_active: data.is_active,
    },
  }
}

export const actions: Actions = {
  update: async ({ request, locals, params }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { error: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { error: 'Not authorized' })

    const fd = await request.formData()
    const name = fd.get('name')
    const descriptionRaw = fd.get('description')
    const durationStr = fd.get('duration_minutes')
    const priceStr = fd.get('price')
    const orderStr = fd.get('display_order')
    const isActive = fd.get('is_active') === 'on'

    const values = {
      name: typeof name === 'string' ? name : '',
      description: typeof descriptionRaw === 'string' ? descriptionRaw : '',
      duration: typeof durationStr === 'string' ? durationStr : '',
      price: typeof priceStr === 'string' ? priceStr : '',
      displayOrder: typeof orderStr === 'string' ? orderStr : '',
      isActive,
    }

    const errors: Record<string, string> = {}
    if (!values.name.trim()) errors.name = 'Name is required'
    if (values.description.length > 125) errors.description = 'Description must be 125 characters or fewer'

    const duration = parseInt(values.duration, 10)
    if (isNaN(duration) || duration < 5) errors.duration = 'Duration must be at least 5 minutes'

    const priceFloat = parseFloat(values.price)
    if (isNaN(priceFloat) || priceFloat < 0) errors.price = 'Price must be 0 or more'

    const displayOrder = parseInt(values.displayOrder, 10)
    if (isNaN(displayOrder) || displayOrder < 1) errors.displayOrder = 'Must be a positive number'

    if (Object.keys(errors).length > 0) return fail(400, { errors, values })

    const admin = createSupabaseAdminClient()

    const { error: updateErr } = await admin
      .from('services')
      .update({
        name: values.name.trim(),
        description: values.description.trim() || null,
        duration_minutes: duration,
        price_pence: Math.round(priceFloat * 100),
        display_order: displayOrder,
        is_active: isActive,
      })
      .eq('id', params.id)
      .eq('shop_id', role.shop_id)

    if (updateErr) {
      if ((updateErr as { code?: string }).code === '23505') {
        return fail(400, { errors: { displayOrder: 'That display order is already in use.' }, values })
      }
      return fail(500, { error: 'Failed to update service. Please try again.' })
    }

    redirect(303, '/admin/services')
  },
}
