import { redirect, fail } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'

export type NotificationPrefs = {
  emailConfirmations: boolean
  emailReminders: boolean
  whatsappConfirmations: boolean
  whatsappReminders: boolean
  smsConfirmations: boolean
  smsReminders: boolean
}

export type CustomerProfile = {
  firstName: string
  lastName: string
  phone: string
  notificationPrefs: NotificationPrefs
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailConfirmations: true,
  emailReminders: true,
  whatsappConfirmations: false,
  whatsappReminders: false,
  smsConfirmations: false,
  smsReminders: false,
}

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession()
  if (!user) return redirect(303, '/login')

  const { data: customer, error: customerErr } = await locals.supabase
    .from('customers')
    .select(`
      id,
      first_name,
      last_name,
      phone,
      customer_notification_preferences (
        email_confirmations,
        email_reminders,
        whatsapp_confirmations,
        whatsapp_reminders,
        sms_confirmations,
        sms_reminders
      )
    `)
    .eq('user_id', user.id)
    .single()

  if (customerErr || !customer) return redirect(303, '/dashboard')

  const prefs = Array.isArray(customer.customer_notification_preferences)
    ? customer.customer_notification_preferences[0]
    : customer.customer_notification_preferences

  return {
    customer: {
      firstName: customer.first_name ?? '',
      lastName: customer.last_name ?? '',
      phone: customer.phone ?? '',
      notificationPrefs: prefs
        ? {
            emailConfirmations: prefs.email_confirmations,
            emailReminders: prefs.email_reminders,
            whatsappConfirmations: prefs.whatsapp_confirmations,
            whatsappReminders: prefs.whatsapp_reminders,
            smsConfirmations: prefs.sms_confirmations,
            smsReminders: prefs.sms_reminders,
          }
        : DEFAULT_PREFS,
    } satisfies CustomerProfile,
    email: user.email ?? '',
  }
}

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { profileError: 'Not authenticated' })

    const form = await request.formData()
    const firstName = (form.get('first_name') as string | null)?.trim() ?? ''
    const lastName  = (form.get('last_name')  as string | null)?.trim() ?? ''
    const phone     = (form.get('phone')       as string | null)?.trim() ?? ''

    if (!firstName) return fail(400, { profileError: 'First name is required', firstName, lastName, phone })
    if (!lastName)  return fail(400, { profileError: 'Last name is required',  firstName, lastName, phone })

    const { error: updateErr } = await locals.supabase
      .from('customers')
      .update({ first_name: firstName, last_name: lastName, phone: phone || null })
      .eq('user_id', user.id)

    if (updateErr) return fail(500, { profileError: 'Failed to save changes. Please try again.' })

    return { profileSuccess: true }
  },

  updateNotifications: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { notifError: 'Not authenticated' })

    const { data: customer, error: customerErr } = await locals.supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (customerErr || !customer) return fail(403, { notifError: 'Customer not found' })

    const form = await request.formData()
    const prefs = {
      email_confirmations:    form.has('email_confirmations'),
      email_reminders:        form.has('email_reminders'),
      whatsapp_confirmations: form.has('whatsapp_confirmations'),
      whatsapp_reminders:     form.has('whatsapp_reminders'),
      sms_confirmations:      form.has('sms_confirmations'),
      sms_reminders:          form.has('sms_reminders'),
      updated_at:             new Date().toISOString(),
    }

    const { error: upsertErr } = await locals.supabase
      .from('customer_notification_preferences')
      .upsert({ customer_id: customer.id, ...prefs }, { onConflict: 'customer_id' })

    if (upsertErr) return fail(500, { notifError: 'Failed to save preferences. Please try again.' })

    return { notifSuccess: true }
  },
}
