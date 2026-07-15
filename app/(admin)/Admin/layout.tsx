import Navbar from "@/app/(user)/navigation/nav.jsx";
import Footer from "@/app/(user)/navigation/footer.jsx";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
