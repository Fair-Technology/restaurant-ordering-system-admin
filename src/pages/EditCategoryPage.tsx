import { Navigate, useParams } from 'react-router-dom';

/** The old full-page editor now lives in a drawer over the category list. */
export function EditCategoryPage() {
  const { shopId, categoryId } = useParams<{ shopId: string; categoryId: string }>();
  return <Navigate to={`/shops/${shopId}/categories?category=${categoryId}`} replace />;
}
