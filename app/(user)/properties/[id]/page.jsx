import { notFound } from 'next/navigation';
import Link from 'next/link';
import PropertyHero from './components/detailsHero';
import PropertyTabs from './components/detailsTab';
import styles from './css/detailsPage.module.css';
import RelatedListingsCarousel from './components/RelatedListingsCarousel'
import ViewTracker from './components/ViewTracker';
import ReviewForm from './components/reviewPrompt'

// Map a v1 row (payments listings_table shape) onto the legacy field names the
// detail-page components read. Called on the ?src=v1 fetch path only.
// Legacy names are added as aliases — v1-native keys are never removed, and the
// same-named fields (ward_location, listing_id, phone_number, rent_duration)
// pass through untouched via the spread.
function normalizeV1Listing(v1Row) {
  return {
    ...v1Row,
    property_name: v1Row.listing_name,
    property_price: v1Row.price_kes,
    property_interior: v1Row.furnishing,
    category_name: v1Row.listing_category,
    type_name: v1Row.category_type,
    ward_name: v1Row.ward_display_name,
    description: v1Row.listing_description,
    property_location: v1Row.location_url,
    media: [
      ...(v1Row.images_table?.video_url
        ? [{ video_url: v1Row.images_table.video_url, image_url: null, position: -1 }]
        : []),
      ...(v1Row.images_table?.images_url ?? [])
        .map(img => ({ cloudinary_url: img.publicUrl, position: img.position })),
    ],
  };
}

async function getListing(id, src) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  // ?src=v1 → fetch the v1 row from the payments project; default stays legacy.
  const endpoint = src === 'v1' ? `/api/v1/listings/${id}` : `/api/listings/${id}`;

  const res = await fetch(`${baseUrl}${endpoint}`, {
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch listing');

  const json = await res.json();

  // Legacy branch: return json.data unchanged, byte for byte.
  if (src !== 'v1') return json.data;

  // V1 branch: alias v1 field names onto the legacy names components read.
  return normalizeV1Listing(json.data);
}

function FilterTags({ listing }) {
  const tags = [
    listing.ward_name,
    listing.category_name,
    listing.type_name,
    listing.property_price ? `${Number(listing.property_price).toLocaleString()}` : null,
    listing.rent_duration,
    listing.property_interior,
  ].filter(Boolean);

  return (
    <div className={styles.filterTags}>
      {tags.map((tag, i) => (
        <span key={i} className={styles.filterTag}>{tag}</span>
      ))}
    </div>
  );
}
export async function generateMetadata({ params, searchParams }) {
  const { id } = await params;
  const { src } = await searchParams;
  const listing = await getListing(id, src);
  if (!listing) return { title: 'Property Not Found' };

  return {
    title: `${listing.property_name} — KSH ${Number(listing.property_price).toLocaleString('en-KE')}/mo`,
    description: typeof listing.description === 'string'
      ? listing.description.slice(0, 155)
      : undefined,
  };
}

export default async function PropertyDetailPage({ params, searchParams }) {
  const { id } = await params;
  const { src } = await searchParams;
  const listing = await getListing(id, src);

  if (!listing) notFound();

  return (
    <>
      <ViewTracker listingId={listing.listing_id} />
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Back nav */}
          <Link href="/" className={styles.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12l7-7M5 12l7 7"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to listings
          </Link>

          <FilterTags listing={listing} />

          {/* Hero: gallery + info */}
          <PropertyHero listing={listing} />

          {/* Tabs: description + map */}
          {/* <PropertyTabs listing={listing} /> */}

          {/* <ReviewForm listing_id={listing.listing_id} listing_name={listing.property_name} /> */}

          <RelatedListingsCarousel
            categoryName={listing.category_name}
            currentId={listing.listing_id}
          />
        </div>
      </div>
    </>
  );
}