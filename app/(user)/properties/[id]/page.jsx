import { notFound } from 'next/navigation';
import Link from 'next/link';
import PropertyHero from './components/detailsHero';
import PropertyTabs from './components/detailsTab';
import styles from './css/detailsPage.module.css';
import RelatedListingsCarousel from './components/RelatedListingsCarousel'
import ViewTracker from './components/ViewTracker';
import ReviewForm from './components/reviewPrompt'

async function getListing(id) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  const res = await fetch(`${baseUrl}/api/listings/${id}`, {
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch listing');

  const json = await res.json();
  return json.data;
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
export async function generateMetadata({ params }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: 'Property Not Found' };

  return {
    title: `${listing.property_name} — KSH ${Number(listing.property_price).toLocaleString('en-KE')}/mo`,
    description: listing.description?.slice(0, 155) ?? undefined,
  };
}

export default async function PropertyDetailPage({ params }) {
  const { id } = await params;
  const listing = await getListing(id);

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