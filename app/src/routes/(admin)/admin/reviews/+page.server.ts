import { fail } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ parent }) => {
  const { role } = await parent()
  const shopId = role.shop_id
  const admin = createSupabaseAdminClient()

  const { data, error } = await admin
    .from('reviews')
    .select(`
      id,
      rating,
      comment,
      is_visible,
      created_at,
      customers(first_name, last_name),
      bookings!inner(id, shop_id, services(name))
    `)
    .eq('bookings.shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) throw error

  type ReviewRow = {
    id: string
    rating: number
    comment: string | null
    is_visible: boolean
    created_at: string
    customers: { first_name: string; last_name: string } | null
    bookings: { id: string; shop_id: string; services: { name: string } | null } | null
  }

  const rawReviews = (data ?? []) as unknown as ReviewRow[]

  const reviews = rawReviews.map(r => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    is_visible: r.is_visible,
    created_at: r.created_at,
    customer_name: `${r.customers?.first_name ?? ''} ${r.customers?.last_name ?? ''}`.trim(),
    service_name: r.bookings?.services?.name ?? '',
    booking_id: r.bookings?.id ?? '',
  }))

  return { reviews }
}

export const actions: Actions = {
  toggleVisibility: async ({ request }) => {
    const form = await request.formData()
    const reviewId = form.get('reviewId') as string | null
    const currentVisibility = form.get('currentVisibility') as string | null

    if (!reviewId) return fail(400, { message: 'Missing review ID.' })

    const newVisibility = currentVisibility !== 'true'

    const admin = createSupabaseAdminClient()
    const { error } = await admin
      .from('reviews')
      .update({ is_visible: newVisibility })
      .eq('id', reviewId)

    if (error) return fail(500, { message: error.message })

    return { success: true }
  },
}
