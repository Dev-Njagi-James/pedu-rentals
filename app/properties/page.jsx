import Hero from '../components/Home/heroSection'
import TrendingListings from '../components/Home/TrendingListingsSection'
import BrowseCategories from '../components/Home/BrowseCategorySection'
import HomeSeekers from '../components/Home/HomeSeekerSection'
import Testimonials from '../components/Home/TestimonialSection'
import CTABanner from '../components/Home/CTAbannerSection'

export default async function PropertiesPage() {
  return (
    <>
      <Hero />
      <TrendingListings />
      <BrowseCategories />
      <HomeSeekers />
      <Testimonials />
      <CTABanner />
    </>
  )
}