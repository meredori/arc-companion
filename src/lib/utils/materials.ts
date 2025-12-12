export const isBasicMaterial = (category?: string | null, type?: string | null) => {
  const normalizedCategory = category?.toLowerCase().trim();
  const normalizedType = type?.toLowerCase().trim();
  return normalizedCategory === 'basic material' || normalizedType === 'basic material';
};

