import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useGetShopByIdQuery,
  useGetProductsByShopQuery,
  useGetCategoriesByShopQuery,
  useUpdateCategoryMutation,
  useUpdateProductMutation,
} from '../services/api';
import type { CategoryResponse, MenuLanguage, ProductResponse, TranslationMap } from '../services/api';
import { MyCard } from '../components/ui/MyCard';
import { MyButton } from '../components/ui/MyButton';
import { MyInput, MyTextarea } from '../components/ui/MyInput';
import { MySpinner } from '../components/ui/MySpinner';
import { useToast } from '../contexts/ToastContext';
import { countMissingTranslations } from '../features/menu/translations';

// Loose shape covering both variantGroups and addonGroups entries (addon-only fields optional).
interface ProductGroup {
  id?: string;
  name?: string;
  nameTranslations?: TranslationMap;
  minSelectable?: number;
  maxSelectable?: number;
  options?: { id?: string; name?: string; nameTranslations?: TranslationMap; priceDelta?: number; isAvailable?: boolean }[];
}

// Draft edits for one product, keyed by group id / option id, keeping the rest of the product untouched.
interface ProductDraft {
  name?: string;
  description?: string;
  groups: Record<string, { name?: string; options: Record<string, string> }>;
}

export function TranslationsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const toast = useToast();

  const { data: shop, isLoading: shopLoading, isError: shopError } = useGetShopByIdQuery({ shopId: shopId! });
  const { data: products, isLoading: productsLoading, isError: productsError } = useGetProductsByShopQuery({ shopId: shopId! });
  const { data: categories, isLoading: categoriesLoading, isError: categoriesError } = useGetCategoriesByShopQuery({ shopId: shopId! });
  const [updateCategory] = useUpdateCategoryMutation();
  const [updateProduct] = useUpdateProductMutation();

  const [langOverride, setLangOverride] = useState<MenuLanguage | null>(null);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, string>>({});
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [productDrafts, setProductDrafts] = useState<Record<string, ProductDraft>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  const isLoading = shopLoading || productsLoading || categoriesLoading;
  const isError = shopError || productsError || categoriesError;

  if (isLoading) return <MySpinner label={t('translations.loading')} />;
  if (isError || !shop) return <p className="text-red-500">{t('translations.loadError')}</p>;

  const languages: MenuLanguage[] = shop.menuLanguages?.length ? shop.menuLanguages : ['de'];
  const extra = languages.slice(1);

  if (extra.length === 0) {
    return (
      <MyCard className="p-6 max-w-lg">
        <p className="text-sm text-gray-600 mb-3">{t('translations.noExtraLanguage')}</p>
        <Link to={`/shops/${shopId}/settings`} className="text-sm font-medium text-gray-900 underline underline-offset-2">
          {t('translations.goToSettings')}
        </Link>
      </MyCard>
    );
  }

  const lang: MenuLanguage = langOverride && extra.includes(langOverride) ? langOverride : extra[0];

  const productDraft = (productId: string): ProductDraft =>
    productDrafts[productId] ?? { groups: {} };

  const setProductField = (productId: string, patch: Partial<ProductDraft>) => {
    setProductDrafts((prev) => ({
      ...prev,
      [productId]: { ...productDraft(productId), ...patch },
    }));
  };

  const setGroupName = (productId: string, groupId: string, name: string) => {
    setProductDrafts((prev) => {
      const draft = productDraft(productId);
      const group = draft.groups[groupId] ?? { options: {} };
      return { ...prev, [productId]: { ...draft, groups: { ...draft.groups, [groupId]: { ...group, name } } } };
    });
  };

  const setOptionName = (productId: string, groupId: string, optionId: string, name: string) => {
    setProductDrafts((prev) => {
      const draft = productDraft(productId);
      const group = draft.groups[groupId] ?? { options: {} };
      return {
        ...prev,
        [productId]: {
          ...draft,
          groups: { ...draft.groups, [groupId]: { ...group, options: { ...group.options, [optionId]: name } } },
        },
      };
    });
  };

  const handleSaveCategory = async (c: CategoryResponse) => {
    const value = categoryDrafts[c.id!] ?? c.nameTranslations?.[lang] ?? '';
    setSavingCategoryId(c.id!);
    try {
      await updateCategory({
        shopId: shopId!,
        categoryId: c.id!,
        updateCategoryRequest: { nameTranslations: { ...(c.nameTranslations ?? {}), [lang]: value } },
      }).unwrap();
      toast.success(t('translations.saved'));
    } catch {
      toast.error(t('translations.failed'));
    } finally {
      setSavingCategoryId(null);
    }
  };

  const mapGroups = (groups: ProductGroup[] | undefined, draft: ProductDraft) =>
    (groups ?? []).map((g) => {
      const groupDraft = draft.groups[g.id ?? ''];
      return {
        id: g.id ?? crypto.randomUUID(),
        name: g.name ?? '',
        nameTranslations: { ...(g.nameTranslations ?? {}), [lang]: groupDraft?.name ?? g.nameTranslations?.[lang] ?? '' },
        minSelectable: g.minSelectable,
        maxSelectable: g.maxSelectable,
        options: (g.options ?? []).map((o) => ({
          id: o.id ?? crypto.randomUUID(),
          name: o.name ?? '',
          nameTranslations: {
            ...(o.nameTranslations ?? {}),
            [lang]: groupDraft?.options[o.id ?? ''] ?? o.nameTranslations?.[lang] ?? '',
          },
          priceDelta: o.priceDelta ?? 0,
          isAvailable: o.isAvailable ?? true,
        })),
      };
    });

  const handleSaveProduct = async (p: ProductResponse) => {
    const draft = productDraft(p.id!);
    const nameValue = draft.name ?? p.nameTranslations?.[lang] ?? '';
    const descValue = draft.description ?? p.descriptionTranslations?.[lang] ?? '';
    setSavingProductId(p.id!);
    try {
      await updateProduct({
        productId: p.id!,
        updateProductRequest: {
          shopId: shopId!,
          nameTranslations: { ...(p.nameTranslations ?? {}), [lang]: nameValue },
          descriptionTranslations: { ...(p.descriptionTranslations ?? {}), [lang]: descValue },
          variantGroups: mapGroups(p.variantGroups, draft).map((g) => ({
            id: g.id, name: g.name, nameTranslations: g.nameTranslations, options: g.options,
          })),
          addonGroups: mapGroups(p.addonGroups, draft).map((g) => ({
            id: g.id, name: g.name, nameTranslations: g.nameTranslations, options: g.options,
            minSelectable: g.minSelectable ?? 0,
            maxSelectable: g.maxSelectable ?? 1,
          })),
        },
      }).unwrap();
      toast.success(t('translations.saved'));
    } catch {
      toast.error(t('translations.failed'));
    } finally {
      setSavingProductId(null);
    }
  };

  const missing = countMissingTranslations(products ?? [], categories ?? [], lang);
  const isEmpty = !(products?.length) && !(categories?.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('translations.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {t('translations.subtitle', { language: t(`shops.languageName.${lang}`) })}
        </p>
        <p className="text-xs text-gray-400 mt-1">{t('translations.missing', { count: missing })}</p>
      </div>

      {extra.length > 1 && (
        <div className="flex gap-1">
          {extra.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLangOverride(l)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                l === lang ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t(`shops.languageName.${l}`)}
            </button>
          ))}
        </div>
      )}

      {isEmpty && <p className="text-gray-400 text-sm">{t('translations.empty')}</p>}

      {(categories?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
            {t('translations.categoriesHeading')}
          </h2>
          <MyCard className="divide-y divide-gray-200">
            {categories!.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-sm text-gray-500 w-1/3 truncate">{c.name}</span>
                <MyInput
                  className="flex-1"
                  value={categoryDrafts[c.id!] ?? c.nameTranslations?.[lang] ?? ''}
                  onChange={(e) => setCategoryDrafts((prev) => ({ ...prev, [c.id!]: e.target.value }))}
                />
                <MyButton
                  type="button"
                  size="sm"
                  disabled={savingCategoryId === c.id}
                  onClick={() => handleSaveCategory(c)}
                >
                  {savingCategoryId === c.id ? t('translations.saving') : t('translations.save')}
                </MyButton>
              </div>
            ))}
          </MyCard>
        </section>
      )}

      {(products?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
            {t('translations.dishesHeading')}
          </h2>
          <div className="space-y-3">
            {products!.map((p) => {
              const draft = productDraft(p.id!);
              return (
                <MyCard key={p.id} className="p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <MyInput
                      label={`${t('products.name')} (${t('translations.original')}: ${p.name})`}
                      value={draft.name ?? p.nameTranslations?.[lang] ?? ''}
                      onChange={(e) => setProductField(p.id!, { name: e.target.value })}
                    />
                    <MyTextarea
                      label={`${t('products.description')} (${t('translations.original')}: ${p.description})`}
                      rows={2}
                      value={draft.description ?? p.descriptionTranslations?.[lang] ?? ''}
                      onChange={(e) => setProductField(p.id!, { description: e.target.value })}
                    />
                  </div>
                  {[...(p.variantGroups ?? []), ...(p.addonGroups ?? [])].map((g) => (
                    <div key={g.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <MyInput
                        label={`${t('variants.title')} (${t('translations.original')}: ${g.name})`}
                        value={draft.groups[g.id!]?.name ?? g.nameTranslations?.[lang] ?? ''}
                        onChange={(e) => setGroupName(p.id!, g.id!, e.target.value)}
                      />
                      {(g.options ?? []).map((o) => (
                        <MyInput
                          key={o.id}
                          label={`${t('translations.original')}: ${o.name}`}
                          value={draft.groups[g.id!]?.options[o.id!] ?? o.nameTranslations?.[lang] ?? ''}
                          onChange={(e) => setOptionName(p.id!, g.id!, o.id!, e.target.value)}
                        />
                      ))}
                    </div>
                  ))}
                  <MyButton
                    type="button"
                    size="sm"
                    disabled={savingProductId === p.id}
                    onClick={() => handleSaveProduct(p)}
                  >
                    {savingProductId === p.id ? t('translations.saving') : t('translations.save')}
                  </MyButton>
                </MyCard>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
