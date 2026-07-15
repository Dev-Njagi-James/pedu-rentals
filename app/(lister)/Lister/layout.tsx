import Navbar from "@/app/(user)/navigation/nav.jsx";
import Footer from "@/app/(user)/navigation/footer.jsx";

export default function ListerLayout({
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
