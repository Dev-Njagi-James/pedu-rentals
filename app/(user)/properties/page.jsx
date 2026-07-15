import Hero from '../home/components/heroSection'
import TrendingListings from '../home/components/TrendingListingsSection'
import BrowseCategories from './components/BrowseCategorySection'
import HomeSeekers from '../home/components/HomeSeekerSection'
import Testimonials from '../home/components/TestimonialSection'
import CTABanner from '../home/components/CTAbannerSection'

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