export type PaymentPolicy = 'pay_online' | 'pay_in_person';
export type StripeOnboardingStatus = 'not_started' | 'pending' | 'complete' | null | undefined;

/**
 * Online payment can only be switched on once Stripe Connect onboarding has
 * fully completed for the shop — otherwise there's nowhere for the money to go.
 */
export function canOfferOnlinePayments(stripeStatus: StripeOnboardingStatus): boolean {
  return stripeStatus === 'complete';
}
