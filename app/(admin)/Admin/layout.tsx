import { Suspense } from "react";
import Navbar from "@/app/(user)/navigation/nav.jsx";
import Footer from "@/app/(user)/navigation/footer.jsx";

export default function AdminLayout({
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
