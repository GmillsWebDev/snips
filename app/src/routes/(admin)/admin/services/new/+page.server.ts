import { redirect, fail } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import { getRole } from '$lib/server/getRole'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ parent }) => {
  const { role } = await parent()
  const admin = createSupabaseAdminClient()

  const { data } = await admin
    .from('services')
    .select('display_order')
    .eq('shop_id', role.shop_id)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { defaultOrder: (data?.display_order ?? 0) + 1 }
}

export const actions: Actions = {
  create: async ({ request, locals }) => {
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

    const { error: insertErr } = await admin.from('services').insert({
      shop_id: role.shop_id,
      name: values.name.trim(),
      description: values.description.trim() || null,
      duration_minutes: duration,
      price_pence: Math.round(priceFloat * 100),
      display_order: displayOrder,
      is_active: isActive,
    })

    if (insertErr) {
      if ((insertErr as { code?: string }).code === '23505') {
        const errors: Record<string, string> = { displayOrder: 'That display order is already in use.' }
        return fail(400, { errors, values })
      }
      return fail(500, { error: 'Failed to create service. Please try again.' })
    }

    return redirect(303, '/admin/services')
  },
}
