import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
  const { data: shopData, error: shopError } = await locals.supabase
    .from('shops')
    .select('id, name, slug')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (shopError) {
    if (shopError.code === 'PGRST116') error(404, 'Shop not found')
    throw shopError
  }

  const shop = { id: shopData.id, name: shopData.name, slug: shopData.slug }

  const [brandingResult, reviewsResult] = await Promise.all([
    locals.supabase
      .from('client_branding')
      .select('color_primary, color_on_primary')
      .eq('shop_id', shop.id)
      .single(),
    locals.supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        customers(first_name),
        bookings!inner(shop_id, services(name))
      `)
      .eq('is_visible', true)
      .eq('bookings.shop_id', shop.id)
      .order('created_at', { ascending: false }),
  ])

  if (brandingResult.error && brandingResult.error.code !== 'PGRST116') throw brandingResult.error
  if (reviewsResult.error) throw reviewsResult.error

  type ReviewRow = {
    id: string
    rating: number
    comment: string | null
    created_at: string
    customers: { first_name: string } | null
    bookings: { shop_id: string; services: { name: string } | null } | null
  }

  const rawReviews = (reviewsResult.data ?? []) as unknown as ReviewRow[]

  const reviews = rawReviews.map(r => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    customer_first_name: r.customers?.first_name ?? 'Customer',
    service_name: r.bookings?.services?.name ?? '',
  }))

  const totalReviews = reviews.length
  const averageRating =
    totalReviews > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : 0

  const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of reviews) {
    ratingBreakdown[r.rating] = (ratingBreakdown[r.rating] ?? 0) + 1
  }

  return {
    shop,
    branding: brandingResult.data ?? null,
    reviews,
    totalReviews,
    averageRating,
    ratingBreakdown,
  }
}
