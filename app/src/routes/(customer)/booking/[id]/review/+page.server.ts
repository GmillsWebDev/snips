
// SvelteKit utilities for error handling, redirects, and form failure
import { error, fail, redirect } from '@sveltejs/kit'
// Import Supabase admin client factory (server-only)
import { createSupabaseAdminClient } from '$lib/server/supabase'
// Import SvelteKit types for load and actions
import type { PageServerLoad, Actions } from './$types'


export const load: PageServerLoad = async ({ params, locals, parent }) => {
  // Wait for parent load (ensures layout data is loaded)
  await parent()

  // Get the current user session (throws if not authenticated)
  const { user } = await locals.safeGetSession()
  if (!user) return redirect(303, '/login')

  // Create a Supabase admin client (bypasses RLS)
  const admin = createSupabaseAdminClient()

  // Try to find the customer by user_id
  const { data: customerByUserId } = await admin
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  // Store customerId if found
  let customerId: string | null = customerByUserId?.id ?? null

  // If not found by user_id, try to find by email (for guest bookings)
  if (!customerId && user.email) {
    const { data: customerByEmail } = await admin
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    // If found by email, update the record to link user_id and mark as not guest
    if (customerByEmail) {
      await admin
        .from('customers')
        .update({ user_id: user.id, is_guest: false })
        .eq('id', customerByEmail.id)
      customerId = customerByEmail.id
    }
  }

  // If still no customerId, forbid access
  if (!customerId) error(403, 'Forbidden')

  // Fetch the booking and any existing review in a single query
  const { data, error: bookingError } = await admin
    .from('bookings')
    .select(`
      id,
      customer_id,
      status,
      services ( name ),
      reviews ( id )
    `)
    .eq('id', params.id)
    .single()

  // If booking not found or error, return 404
  if (bookingError || !data) error(404, 'Booking not found')
  // If booking does not belong to this customer, forbid access
  if (data.customer_id !== customerId) error(403, 'Forbidden')

  // Only allow reviews for completed bookings
  if (data.status !== 'completed') return redirect(303, `/booking/${params.id}`)

  // Prevent duplicate reviews (admin client can see hidden reviews)
  const hasReview = Array.isArray(data.reviews) ? data.reviews.length > 0 : data.reviews !== null
  if (hasReview) return redirect(303, `/booking/${params.id}`)

  // Return booking info for the review form
  return {
    booking: {
      id: data.id,
      serviceName: (data.services as unknown as { name: string } | null)?.name ?? '',
    },
  }
}

// SvelteKit form actions for submitting a review
export const actions: Actions = {
  default: async ({ params, request, locals }) => {
    // Get the current user session
    const { user } = await locals.safeGetSession()
    if (!user) return fail(401, { error: 'Not authenticated' })

    // Parse form data
    const form = await request.formData()
    const ratingRaw = form.get('rating')
    // Trim comment and set to null if empty
    const comment   = (form.get('comment') as string | null)?.trim() || null

    // Validate rating (must be integer 1-5)
    const rating = Number(ratingRaw)
    if (!ratingRaw || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return fail(400, { error: 'Please select a rating' })
    }

    // Create Supabase admin client
    const admin = createSupabaseAdminClient()

    // Find the customer by user_id
    const { data: customer } = await admin
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    // If not found, forbid
    if (!customer) return fail(403, { error: 'Forbidden' })

    // Fetch the booking to ensure it belongs to this customer and is completed
    const { data: booking, error: fetchErr } = await admin
      .from('bookings')
      .select('id, customer_id, status')
      .eq('id', params.id)
      .single()

    // Handle not found or forbidden
    if (fetchErr || !booking) return fail(404, { error: 'Booking not found' })
    if (booking.customer_id !== customer.id) return fail(403, { error: 'Forbidden' })
    if (booking.status !== 'completed') return fail(400, { error: 'Only completed bookings can be reviewed' })

    // Insert the review (booking_id, customer_id, rating, comment)
    const { error: insertErr } = await admin
      .from('reviews')
      .insert({
        booking_id:  params.id,
        customer_id: customer.id,
        rating,
        comment,
      })

    // If unique constraint violation (review already exists), redirect to booking
    if (insertErr) {
      // Unique constraint violation — review already exists
      if (insertErr.code === '23505') return redirect(303, `/booking/${params.id}`)
      // Other errors: show generic error
      return fail(500, { error: 'Could not submit your review. Please try again.' })
    }

    // On success, redirect to dashboard
    return redirect(303, '/dashboard')
  },
}
