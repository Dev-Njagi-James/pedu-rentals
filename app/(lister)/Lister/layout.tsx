import Navbar from "@/app/(user)/navigation/nav.jsx";
import Footer from "@/app/(user)/navigation/footer.jsx";
import WelcomeBanner from "./components/WelcomeMessage";

export default function ListerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      {/*<WelcomeBanner /> */}
      {children}
      <Footer />
    </>
  );
}
