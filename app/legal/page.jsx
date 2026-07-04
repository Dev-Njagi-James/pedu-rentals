'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

const content = {
   terms: {
      title: 'Terms & Conditions',
      subtitle: 'Last Updated: 1st June, 2026',
      sections: [
         {
            heading: '1. Acceptance of Terms',
            body: `By accessing or using Pedu Rentals, you agree to comply with these Terms & Conditions. If you do not agree, please do not use the platform.`,
         },
         {
            heading: '2. About Pedu Rentals',
            body: `Pedu Rentals is an online platform that connects property owners, agents, and prospective tenants by allowing the advertisement and discovery of rental properties.`,
         },
         {
            heading: '3. User Accounts',
            items: [
               'Users are responsible for maintaining the confidentiality of their account credentials.',
               'Users must provide accurate information when creating accounts.',
               'Pedu Rentals reserves the right to suspend or terminate accounts that provide false information or violate these terms.',
            ],
         },
         {
            heading: '4. Property Listings',
            items: [
               'Landlords and agents are responsible for the accuracy of their listings.',
               'Users must not post misleading, fraudulent, illegal, or offensive content.',
               'Pedu Rentals may remove listings that violate platform policies.',
            ],
         },
         {
            heading: '5. Payments',
            items: [
               'Listing fees and subscription fees, where applicable, are non-refundable unless otherwise stated.',
               'Users are responsible for ensuring payment details are correct.',
            ],
         },
         {
            heading: '6. Limitation of Liability',
            body: `Pedu Rentals acts only as a platform connecting users. We do not own, manage, inspect, or guarantee properties listed on the platform.`,
         },
         {
            heading: '7. Prohibited Activities',
            body: `Users shall not:`,
            items: [
               'Upload false listings.',
               'Impersonate other persons or businesses.',
               'Attempt unauthorized access to the platform.',
               'Use the platform for unlawful purposes.',
               'Listers should not solicit, demand, collect or receive any form of payment as booking fee, reservation fee, viewing fee, or other monetary consideration from prospective tenants outside or through the platform prior to lawful tenancy agreement and independent verification of the property.',
            ],
         },
         {
            heading: '8. Intellectual Property',
            body: `The Pedu Rentals name, logo, website content, and software are protected by applicable intellectual property laws.`,
         },
         {
            heading: '9. Termination',
            body: `Pedu Rentals may suspend or terminate user accounts that violate these Terms & Conditions.`,
         },
         {
            heading: '10. Changes to Terms',
            body: `We may update these Terms & Conditions at any time. Continued use of the platform constitutes acceptance of the updated terms.`,
         },
         {
            heading: '11. Contact Information',
            contact: {
               email: 'pedurentals@gmail.com',
               phone: '+254-798725928',
               website: 'https://www.pedurentals.com',
            },
         },
      ],
   },
   privacy: {
      title: 'Privacy Policy',
      subtitle: 'Last Updated: 1st June, 2026',
      sections: [
         {
            heading: 'Welcome',
            body: `Welcome to Pedu Rentals. We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how Pedu Rentals collects, uses, stores, and protects information obtained from users of our website and services.\n\nBy using Pedu Rentals, you agree to the practices described in this Privacy Policy.`,
         },
         {
            heading: '1. Information We Collect',
            body: `We may collect the following information:`,
            subsections: [
               {
                  label: 'Personal Information',
                  items: [ 'Full name', 'Email address', 'Phone number', 'Account login information', 'Property owner or agent details' ],
               },
               {
                  label: 'Property Information',
                  items: [ 'Property listings', 'Property descriptions', 'Images and videos uploaded by users', 'Property location details' ],
               },
               {
                  label: 'Technical Information',
                  items: [ 'IP address', 'Browser type', 'Device information', 'Pages visited on the website', 'Date and time of access' ],
               },
            ],
         },
         {
            heading: '2. How We Use Your Information',
            items: [
               'Create and manage user accounts',
               'Display property listings',
               'Facilitate communication between landlords and tenants',
               'Improve our services and user experience',
               'Provide customer support',
               'Detect fraud and unauthorized activities',
               'Comply with legal obligations',
            ],
         },
         {
            heading: '3. Sharing of Information',
            body: `Pedu Rentals does not sell users' personal information.\n\nWe may share information:`,
            items: [
               'With service providers who help us operate the platform',
               'When required by law, court order, or government authorities',
               'To protect the rights, safety, and security of Pedu Rentals and its users',
            ],
            footer: 'Property listings submitted by landlords or agents may be publicly visible on the platform.',
         },
         {
            heading: '4. Data Security',
            body: `We implement reasonable technical and organizational measures to protect user information from unauthorized access, alteration, disclosure, or destruction.\n\nHowever, no method of internet transmission or electronic storage is completely secure, and we cannot guarantee absolute security.`,
         },
         {
            heading: '5. Cookies and Analytics',
            body: `Pedu Rentals may use cookies and similar technologies to:`,
            items: [
               'Remember user preferences',
               'Improve website performance',
               'Analyze website traffic',
               'Enhance user experience',
            ],
            footer: 'Users may disable cookies through their browser settings, although some website features may not function properly.',
         },
         {
            heading: '6. Third-Party Services',
            body: `Our website may contain links to third-party websites or services. Pedu Rentals is not responsible for the privacy practices or content of those third parties.`,
         },
         {
            heading: '7. User Rights',
            body: `Users may request to:`,
            items: [
               'Access their personal information',
               'Correct inaccurate information',
               'Delete their account and associated data, subject to legal requirements',
               'Withdraw consent where applicable',
            ],
            footer: 'Requests can be submitted using the contact information provided below.',
         },
         {
            heading: '8. Children\'s Privacy',
            body: `Pedu Rentals is not intended for children under the age of 18. We do not knowingly collect personal information from children.`,
         },
         {
            heading: '9. Changes to This Privacy Policy',
            body: `We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date.\n\nContinued use of the platform after changes are posted constitutes acceptance of the updated Privacy Policy.`,
         },
         {
            heading: '10. Contact Us',
            body: `If you have questions regarding this Privacy Policy, please contact us:`,
            contact: {
               email: 'pedurentals@gmail.com',
               phone: '+254-798725928',
               website: 'https://www.pedurentals.com',
            },
         },
      ],
   },
};

function LegalContent() {
   const searchParams = useSearchParams();
   const doc = searchParams.get('doc');
   const active = content[ doc ] ?? content.terms;

   return (
      <div style={{ maxWidth: 780, margin: '1.8em auto', padding: '80px 24px 64px' }}>
         <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', marginBottom: '0.2px', marginTop: '0.5em', fontFamily:'var(--font-geist-mono)', }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Home
         </Link>
         <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.25rem', fontFamily: 'var(--font-geist-sans)' }}>
            {active.title}
         </h1>
         {active.subtitle && (
            <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem', fontFamily: 'var(--font-geist-mono)' }}>
               {active.subtitle}
            </p>
         )}
         <div style={{ height: 3, width: 48, background: '#002EFF', borderRadius: 2, marginBottom: '2.5rem' }} />

         {active.sections.map((section, i) => (
            <div key={i} style={{ marginBottom: '2rem' }}>

               <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.5rem', fontFamily: 'var(--font-geist-sans)' }}>
                  {section.heading}
               </h2>

               {section.body && (
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#444', fontSize: '0.92rem', marginBottom: '0.5rem', fontFamily: 'var(--font-inter)' }}>
                     {section.body}
                  </p>
               )}

               {section.subsections && section.subsections.map((sub, j) => (
                  <div key={j} style={{ marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
                     <p style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1a1a2e', marginBottom: '0.25rem' }}>
                        {sub.label}
                     </p>
                     <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                        {sub.items.map((item, k) => (
                           <li key={k} style={{ fontSize: '0.9rem', fontFamily: 'var(--font-inter)', color: '#444', lineHeight: 1.8 }}>{item}</li>
                        ))}
                     </ul>
                  </div>
               ))}

               {section.items && (
                  <ul style={{ paddingLeft: '1.25rem', margin: '0.25rem 0' }}>
                     {section.items.map((item, j) => (
                        <li key={j} style={{ fontSize: '0.9rem', color: '#444', fontFamily: 'var(--font-inter)', lineHeight: 1.8 }}>{item}</li>
                     ))}
                  </ul>
               )}

               {section.footer && (
                  <p style={{ fontSize: '0.9rem', color: '#444', lineHeight: 1.8, marginTop: '0.5rem' }}>
                     {section.footer}
                  </p>
               )}

               {section.contact && (
                  <div style={{ fontSize: '0.9rem', color: '#444', fontFamily: 'var(--font-geist-mono)', lineHeight: 2 }}>
                     <p style={{ margin: 0 }}>Email: <a href={`mailto:${section.contact.email}`} style={{ color: '#002EFF', fontFamily: 'var(--font-inter)', }}>{section.contact.email}</a></p>
                     <p style={{ margin: 0, fontFamily: 'var(--font-inter)' }}>Phone: {section.contact.phone}</p>
                     <p style={{ margin: 0 }}>Website: <a href={section.contact.website} style={{ color: '#002EFF', fontFamily: 'var(--font-inter)', }}>{section.contact.website}</a></p>
                  </div>
               )}

            </div>
         ))}
      </div>
   );
}

export default function LegalPage() {
   return (
      <Suspense>
         <LegalContent />
      </Suspense>
   );
}