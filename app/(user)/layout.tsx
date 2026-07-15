import Navbar from "./navigation/nav.jsx";
import Footer from "./navigation/footer.jsx";

export default function UserLayout({
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
