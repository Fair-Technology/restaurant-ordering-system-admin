export function goLiveFixLink(shopId: string, key: string, hasAnyProducts?: boolean): string {
  switch (key) {
    case 'stripe_connected':
      return `/shops/${shopId}/settings?section=pay`;
    case 'profile_name':
    case 'profile_address':
      return `/shops/${shopId}/settings?section=details`;
    case 'opening_hours':
      return `/shops/${shopId}/settings?section=hours`;
    case 'has_products':
      return hasAnyProducts === false
        ? `/shops/${shopId}/products?addProduct=1`
        : `/shops/${shopId}/products`;
    case 'has_categories':
      return `/shops/${shopId}/categories`;
    case 'dpa_accepted':
      return `/shops/${shopId}/legal?section=dpa`;
    case 'impressum':
      return `/shops/${shopId}/legal?section=impressum`;
    case 'terms':
      return `/shops/${shopId}/legal?section=terms`;
    case 'withdrawal':
      return `/shops/${shopId}/legal?section=withdrawal`;
    case 'privacy_notice':
      return `/shops/${shopId}/legal?section=privacy`;
    case 'invoice_tax_id':
      return `/shops/${shopId}/legal?section=impressum`;
    default:
      return `/shops/${shopId}/settings`;
  }
}
