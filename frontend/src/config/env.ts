function normalizeBaseUrl(url: string | undefined, fallback: string): string {
  const value = (url ?? fallback).trim();
  return value.replace(/\/+$/, '');
}

export const ENV = {
  useMocks: import.meta.env.VITE_USE_MOCKS !== 'false',
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL, 'http://localhost:4566'),
  s3ImagesBaseUrl: normalizeBaseUrl(
    import.meta.env.VITE_S3_IMAGES_BASE_URL,
    'http://localhost:4566/imginstrumentos',
  ),
} as const;

export function resolveInstrumentImageUrl(imageUrl?: string, imageKey?: string): string {
  if (imageUrl && imageUrl.trim().length > 0) {
    return imageUrl;
  }
  if (imageKey && imageKey.trim().length > 0) {
    const cleanKey = imageKey.replace(/^\/+/, '');
    return `${ENV.s3ImagesBaseUrl}/${cleanKey}`;
  }
  return '';
}
