import type { ShopResponse } from '../../services/api';

/** Round shop logo, or its first letter when no logo is uploaded (same look as the sidebar). */
export function ShopLogoBadge({
  shop,
  size = 40,
}: {
  shop: Pick<ShopResponse, 'name' | 'branding'> | undefined;
  size?: number;
}) {
  const logo = shop?.branding?.logoUrl;
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#efe7de] bg-white"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {logo ? (
        <img src={logo} alt="" className="h-[80%] w-[80%] object-contain" />
      ) : (
        <span className="text-sm font-bold text-[#6b6058]">{shop?.name?.charAt(0).toUpperCase() ?? '?'}</span>
      )}
    </span>
  );
}
