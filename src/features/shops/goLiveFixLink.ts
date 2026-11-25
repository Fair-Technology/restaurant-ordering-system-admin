export function goLiveFixLink(shopId: string, key: string): string {
  switch (key) {
    case 'stripe_connected':
      return `/shops/${shopId}/settings?section=pay`;
    case 'has_products':
      return `/shops/${shopId}/products`;
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
