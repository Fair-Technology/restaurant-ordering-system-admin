export function goLiveFixLink(shopId: string, key: string): string {
  switch (key) {
    case 'stripe_connected':
      return `/shops/${shopId}/settings#payments`;
    case 'has_products':
      return `/shops/${shopId}`;
    case 'has_categories':
      return `/shops/${shopId}/categories`;
    case 'dpa_accepted':
      return `/shops/${shopId}/legal#dpa`;
    case 'impressum':
      return `/shops/${shopId}/legal#impressum`;
    case 'terms':
      return `/shops/${shopId}/legal#terms`;
    case 'withdrawal':
      return `/shops/${shopId}/legal#withdrawal`;
    case 'privacy_notice':
      return `/shops/${shopId}/legal#privacy`;
    case 'invoice_tax_id':
      return `/shops/${shopId}/legal#impressum`;
    default:
      return `/shops/${shopId}/settings`;
  }
}
