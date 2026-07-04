import AboutHeroSection from '../components/About/AboutHeroSection';
import AboutComp from '../components/About/AboutComp'
import PropertyOwner from '../components/About/PropertySection'
import ContactSection from '../components/About/ContactSection'
import FaqQuestions from '../components/About/Faqquestions'
export default function About(){
   return(
      <>
      <AboutHeroSection/>
      <AboutComp/>
      <PropertyOwner/>
      <FaqQuestions/>
      <ContactSection/>
      </>
   )
}