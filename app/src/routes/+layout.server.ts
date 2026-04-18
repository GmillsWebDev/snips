import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const { session, user } = await locals.safeGetSession()
  const supabase = locals.supabase

  const brandingSelect = 'color_primary, color_secondary, font_heading, font_body, logo_url'

  // Resolve branding by shop slug first (public booking pages /book/[slug]),
  // then fall back to the logged-in user's own shop.
  const slug = url.pathname.match(/^\/book\/([^/]+)/)?.[1]

  let branding = null

  if (slug) {
    const { data, error } = await supabase
      .from('shops')
      .select(`client_branding(${brandingSelect})`)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
    if (error) throw error
    branding = data?.client_branding ?? null
  } else if (user) {
    const { data: shopId, error: rpcError } = await supabase.rpc('get_my_shop_id')
    if (rpcError) throw rpcError

    if (shopId) {
      const { data, error } = await supabase
        .from('client_branding')
        .select(brandingSelect)
        .eq('shop_id', shopId)
        .single()
      if (error) throw error
      branding = data ?? null
    }
  }

  return { session, user, branding }
}