'use client';

import { useState } from 'react';
import styles from '../css/Faqquestions.module.css';

const faqData = [
  {
    id: 'tenants',
    label: 'For Tenants',
    items: [
      {
        q: 'How do I search for a house?',
        a: 'Use the search and filter tools to find properties by location, price, house type, and other preferences.',
      },
      {
        q: 'Is it free to search for houses?',
        a: 'Yes. Browsing and searching for rental properties is completely free.',
      },
      {
        q: 'How do I contact a landlord?',
        a: "Navigate and search for a property listing. On the listing is a 'call' button. Click it — it will take you to your phone's dial pad with the lister's number appearing. Make your call.",
      },
      {
        q: 'Does Pedu Rentals own the listed houses?',
        a: 'No. Pedu Rentals is a marketplace that connects tenants with landlords and agents.',
      },
      {
        q: 'How can I report a suspicious listing?',
        a: "Once you make a call, a 5-star rating tab will pop up. The tab contains a space where you can report issues about the specific listing. Alternatively, contact our support team.",
      },
    ],
  },
  {
    id: 'landlords',
    label: 'For Landlords & Agents',
    items: [
      {
        q: 'How do I list a property?',
        a: 'Create an account, log in, and click "Add Listing" to upload your property details and photos.',
      },
      {
        q: 'Is there a fee to upload a property?',
        a: 'New users may receive promotional listing periods. Standard listing and subscription charges will apply according to the current pricing policy.',
      },
      {
        q: 'What information should I include?',
        a: null,
        list: [
          'Location',
          'Rent amount',
          'Number of bedrooms',
          'Amenities',
          'Photos',
          'Embed a specific Google HTML link of the house location',
          'Phone number where prospective tenants may reach you',
        ],
      },
      {
        q: 'How long will my listing remain active?',
        a: 'Listings remain active for a period of one (1) month.',
      },
      {
        q: 'Can I edit my listing?',
        a: 'Yes. You can update your property information within 2 days (48 hours) through your dashboard.',
      },
    ],
  },
];

const generalData = [
  {
    q: 'Is Pedu Rentals available throughout Kenya?',
    a: 'No. Currently Pedu Rentals is focused in Nairobi and its bordering environs. Property owners and tenants can use the platform across these specific regions.',
  },
  {
    q: 'How do I create an account?',
    a: 'Click "Register," provide the required details, and verify your account if requested.',
  },
  {
    q: 'How can I contact Pedu Rentals?',
    a: 'Use the Contact Us page or reach us through the phone number and email provided on the website.',
  },
  {
    q: 'What if I forget my password?',
    a: 'Use the "Forgot Password" option on the login page to reset your password.',
  },
  {
    q: 'Is my personal information secure?',
    a: 'We take reasonable measures to protect user data. Please refer to our Privacy Policy for details.',
  },
  {
    q: 'How do I know a listing is genuine?',
    a: 'While Pedu Rentals strives to maintain quality listings, users should independently verify property details, visit the property, and avoid making payments before confirming legitimacy. This helps protect tenants from fraud and sets clear expectations.',
  },
];

function AccordionItem({ q, a, list }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`${styles.item} ${open ? styles.itemOpen : ''}`}>
      <button className={styles.question} onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className={styles.answer}>
          {a && <p>{a}</p>}
          {list && (
            <ul className={styles.answerList}>
              {list.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function FaqQuestions() {
  const [activeTab, setActiveTab] = useState('tenants');

  const activeGroup = faqData.find(g => g.id === activeTab);

  return (
    <section className={styles.section}>

      {/* ── FAQ ── */}
      <div className={styles.block}>
        <div className={styles.labelRow}>
          <span className={styles.label}>FAQ</span>
          <div className={styles.labelLine} />
        </div>

        <h2 className={styles.headline}>Frequently Asked<br />Questions</h2>
        <p className={styles.subtitle}>
          Quick answers for tenants, landlords, and agents using the platform.
        </p>

        <div className={styles.tabs}>
          {faqData.map(group => (
            <button
              key={group.id}
              className={`${styles.tab} ${activeTab === group.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(group.id)}
            >
              {group.label}
            </button>
          ))}
        </div>

        <div className={styles.accordion}>
          {activeGroup.items.map((item, i) => (
            <AccordionItem key={i} {...item} />
          ))}
        </div>
      </div>

      {/* ── General Questions ── */}
      <div className={styles.block}>
        <div className={styles.labelRow}>
          <span className={styles.label}>General</span>
          <div className={styles.labelLine} />
        </div>

        <h2 className={styles.headline}>General Questions</h2>
        <p className={styles.subtitle}>
          Platform-wide answers about availability, accounts, and security.
        </p>

        <div className={styles.accordion}>
          {generalData.map((item, i) => (
            <AccordionItem key={i} {...item} />
          ))}
        </div>
      </div>

    </section>
  );
}