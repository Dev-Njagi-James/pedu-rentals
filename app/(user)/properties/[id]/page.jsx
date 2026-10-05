import { notFound } from "next/navigation";
import Link from "next/link";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import PropertyHero from "./components/detailsHero";
import styles from "./css/detailsPage.module.css";
import RelatedListingsCarousel from "./components/RelatedListingsCarousel";
import ReviewForm from "./components/reviewPrompt";

// Map a v1 row (payments listings_table shape) onto the legacy field names the
// detail-page components read. Legacy names are added as aliases — v1-native
// keys are never removed, and the same-named fields (ward_location,
// listing_id, phone_number, rent_duration) pass through untouched via the spread.
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
    media: [
      ...(v1Row.images_table?.video_url
        ? [
            {
              video_url: v1Row.images_table.video_url,
              image_url: null,
              position: -1,
            },
          ]
        : []),
      ...(v1Row.images_table?.images_url ?? []).map((img) => ({
        cloudinary_url: img.publicUrl,
        position: img.position,
      })),
    ],
  };
}

async function getListing(id) {
  const listing_id = parseInt(id, 10);
  if (isNaN(listing_id)) return null;

  const { data, error } = await paymentsSupabase
    .from("listings_table")
    .select(
      `listing_id, listing_name, listing_category, category_type, furnishing,
       rent_duration, price_kes, listing_ward, ward_display_name,
       listing_description, plan_name, created_at, updated_at,
       images_table (images_url, video_url)`,
    )
    .eq("listing_id", listing_id)
    .maybeSingle();

  if (error) throw new Error("Failed to fetch listing");
  if (!data) return null;

  return normalizeV1Listing(data);
}

function FilterTags({ listing }) {
  const tags = [
    listing.ward_name,
    listing.category_name,
    listing.type_name,
    listing.property_price
      ? `${Number(listing.property_price).toLocaleString()}`
      : null,
    listing.rent_duration,
    listing.property_interior,
  ].filter(Boolean);

  return (
    <div className={styles.filterTags}>
      {tags.map((tag, i) => (
        <span key={i} className={styles.filterTag}>
          {tag}
        </span>
      ))}
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Property Not Found" };

  return {
    title: `${listing.property_name} — KSH ${Number(listing.property_price).toLocaleString("en-KE")}/mo`,
    description:
      typeof listing.description === "string"
        ? listing.description.slice(0, 155)
        : undefined,
  };
}

export default async function PropertyDetailPage({ params }) {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) notFound();

  return (
    <>
      <div className={styles.page}>
        <div className={styles.container}>
          <Link href="/" className={styles.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M5 12l7-7M5 12l7 7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to listings
          </Link>

          <FilterTags listing={listing} />

          <PropertyHero listing={listing} />

          <RelatedListingsCarousel
            categoryName={listing.category_name}
            currentId={listing.listing_id}
          />
        </div>
      </div>
    </>
  );
}
