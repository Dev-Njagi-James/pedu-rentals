import { Suspense } from "react";
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
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      {/*<WelcomeBanner /> */}
      {children}
      <Footer />
    </>
  );
}
