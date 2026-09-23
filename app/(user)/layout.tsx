import { Suspense } from "react";
import Navbar from "./navigation/nav.jsx";
import Footer from "./navigation/footer.jsx";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      {children}
      <Footer />
    </>
  );
}
