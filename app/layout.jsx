import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from 'sonner'
import Script from 'next/script'
import Providers from './providers'
import FeedbackBanner from './FeedbackBanner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: [ "latin" ],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: [ "latin" ],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: [ "latin" ],
});

export const metadata = {
  title: "Pedu Rentals",
  description: "Lets find your future home",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.hugeicons.com/font/hgi-stroke-rounded.css" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Pedu Rentals",
              "url": "https://www.pedurentals.com",
              "logo": "https://www.pedurentals.com/logo2.png"
            })
          }}
        />
      </head>
      <body
        data-scroll-behavior='smooth'
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}>
        <Analytics />
        <SpeedInsights />
        <Toaster position="top-right" duration={4000} richColors />
        {/* <FeedbackBanner /> */}
        <main>
          <Providers>
            {children}
          </Providers>
        </main>
        <Script src="https://tally.so/widgets/embed.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}