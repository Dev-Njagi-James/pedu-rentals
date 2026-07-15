import AboutHeroSection from './components/AboutHeroSection';
import AboutComp from './components/AboutComp'
import PropertyOwner from './components/PropertySection'
import ContactSection from './components/ContactSection'
import FaqQuestions from './components/Faqquestions'
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