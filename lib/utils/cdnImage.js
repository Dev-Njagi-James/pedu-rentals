const CDN_HOST = "cdn.stravontechlabs.com";

/**
 * Wraps a stored CDN image URL with a Cloudflare Image Transformation prefix,
 * requesting an exact width/height at the edge instead of letting Vercel
 * resize it. Falls back to the original URL untouched for any non-CDN source
 * (Unsplash, Supabase, Cloudinary) since those origins aren't registered as
 * allowed sources for transformations.
 */
export function buildCdnImageUrl(
  url,
  { width, height, quality = 75, fit = "cover" } = {},
) {
  if (!url || !url.includes(CDN_HOST)) {
    return { src: url, isTransformed: false };
  }

  const params = [
    width ? `width=${width}` : null,
    height ? `height=${height}` : null,
    `fit=${fit}`,
    `quality=${quality}`,
    "format=auto",
  ]
    .filter(Boolean)
    .join(",");

  const src = url.replace(
    `https://${CDN_HOST}/`,
    `https://${CDN_HOST}/cdn-cgi/image/${params}/`,
  );

  return { src, isTransformed: true };
}
