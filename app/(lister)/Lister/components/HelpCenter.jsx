"use client";

import styles from "../css/HelpCenter.module.css";

const Icon = ({ d, size = 20 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: size, height: size }}
    aria-hidden="true">
    <path d={d} />
  </svg>
);

const icons = {
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  chevronRight: "M9 18l6-6-6-6",
  arrowRight: "M5 12h14M13 5l7 7-7 7",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z M14 2v6h6",
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  card: "M2 7h20M2 6h20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z",
  image:
    "M3 5h18v14H3zM3 15l5-5 4 4 4-5 5 6M8.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  chart: "M3 3v18h18M7 15l4-4 3 3 5-6",
  shield: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z",
  dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  play: "M6 4l14 8-14 8V4z",
  headset:
    "M3 14v-3a9 9 0 1 1 18 0v3M21 14a3 3 0 0 1-3 3h-1M3 14a3 3 0 0 0 3 3h1",
  chat: "M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-4.2-1.1L3 20l1.1-5.3A8.5 8.5 0 1 1 21 11.5z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 0l8 8 8-8",
  community:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  bulb: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z",
};

/* ── EDIT THIS OBJECT — everything on the page reads from here ── */
const HELP_DATA = {
  heading: "How can we help you?",
  subheading:
    "Find answers, watch tutorials and learn how to get the most out of your account.",
  searchPlaceholder: "Search for help articles, guides and videos...",

  popularTopics: [
    "Create a listing",
    "Manage account",
    "Pricing & payments",
    "Verify account",
    "Analytics",
  ],

  categories: [
    {
      icon: "doc",
      tone: "tonePrimary",
      title: "Getting started",
      desc: "New to Lister? Start here and get familiar with the basics.",
      count: 12,
    },
    {
      icon: "home",
      tone: "toneAccent",
      title: "Listings",
      desc: "Learn how to create, manage and optimise your listings.",
      count: 18,
    },
    {
      icon: "user",
      tone: "toneSecondary",
      title: "Account & profile",
      desc: "Manage your account details, security and preferences.",
      count: 15,
    },
    {
      icon: "card",
      tone: "toneDarkSecondary",
      title: "Payments & billing",
      desc: "Understand pricing, payments and refund policies.",
      count: 10,
    },
  ],

  guides: [
    {
      icon: "doc",
      tone: "tonePrimarySoft",
      title: "How to create your first listing",
      desc: "Step-by-step guide to create and publish a listing.",
      href: "#",
    },
    {
      icon: "doc",
      tone: "toneAccentSoft",
      title: "How to edit your account information",
      desc: "Update your profile, contact info and preferences.",
      href: "#",
    },
    {
      icon: "dollar",
      tone: "toneSecondarySoft",
      title: "How subscription & pricing works",
      desc: "Learn about our listing packages and pricing.",
      href: "#",
    },
    {
      icon: "image",
      tone: "toneDarkSecondarySoft",
      title: "How to add photos and videos to a listing",
      desc: "Make your listing stand out with high quality media.",
      href: "#",
    },
    {
      icon: "chart",
      tone: "tonePrimarySoft",
      title: "How to track views and leads",
      desc: "Understand analytics and improve your performance.",
      href: "#",
    },
    {
      icon: "shield",
      tone: "toneAccentSoft",
      title: "How to verify your account",
      desc: "Get verified and unlock full platform features.",
      href: "#",
    },
  ],

  videos: [
    {
      title: "Create a listing in 5 minutes",
      sub: "Step-by-step walkthrough",
      duration: "4:32",
      tone: "tonePrimary",
      thumb: null,
    },
    {
      title: "Manage your account settings",
      sub: "Profile & security",
      duration: "3:18",
      tone: "toneAccent",
      thumb: null,
    },
    {
      title: "Understand your analytics",
      sub: "Views, leads & performance",
      duration: "2:45",
      tone: "toneSecondary",
      thumb: null,
    },
    {
      title: "Payments & billing explained",
      sub: "Packages and transactions",
      duration: "3:02",
      tone: "toneDarkSecondary",
      thumb: null,
    },
  ],

  contact: {
    title: "Still need help?",
    sub: "Our support team is here for you.",
    ctaLabel: "Contact support",
    ctaHref: "#",
  },

  otherWays: [
    {
      icon: "chat",
      tone: "toneAccent",
      title: "Live chat",
      desc: "Chat with our support team in real-time.",
      linkLabel: "Start chat",
      href: "#",
    },
    {
      icon: "mail",
      tone: "tonePrimary",
      title: "Email support",
      desc: "We usually respond within 24 hours.",
      linkLabel: "Send email",
      href: "#",
    },
    {
      icon: "community",
      tone: "toneDarkSecondary",
      title: "Help community",
      desc: "Ask questions and get help from others.",
      linkLabel: "Visit community",
      href: "#",
    },
  ],

  footerNote: {
    text: "Can't find what you're looking for?",
    linkLabel: "Search our help center or contact support.",
    href: "#",
  },
};

export default function HelpCenter() {
  const d = HELP_DATA;

  return (
    <div className={styles.root}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heading}>{d.heading}</h1>
          <p className={styles.subheading}>{d.subheading}</p>

          <div className={styles.searchBox}>
            <Icon d={icons.search} size={18} />
            <input
              className={styles.searchInput}
              placeholder={d.searchPlaceholder}
            />
          </div>

          <div className={styles.popularRow}>
            <span className={styles.popularLabel}>Popular topics:</span>
            {d.popularTopics.map((t) => (
              <button key={t} className={styles.topicChip}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── uploaded illustration slotted in place of the old gradient block ── */}
        <div className={styles.heroArt}>
          <img src="/help-hero.png" alt="" className={styles.heroArtImg} />
        </div>
      </div>

      <section>
        <h2 className={styles.sectionTitle}>Browse help topics</h2>
        <div className={styles.categoryGrid}>
          {d.categories.map((c) => (
            <button key={c.title} className={styles.categoryCard}>
              <span className={`${styles.iconBox} ${styles[c.tone]}`}>
                <Icon d={icons[c.icon]} size={20} />
              </span>
              <span className={styles.categoryTitle}>{c.title}</span>
              <span className={styles.categoryDesc}>{c.desc}</span>
              <span className={styles.categoryFooter}>
                <span className={styles.categoryCount}>{c.count} articles</span>
                <Icon d={icons.chevronRight} size={16} />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className={styles.sectionHeadRow}>
          <h2 className={styles.sectionTitle}>
            Featured guides (Documentation)
          </h2>
          <a className={styles.viewAllLink} href="#">
            View all articles <Icon d={icons.arrowRight} size={14} />
          </a>
        </div>
        <div className={styles.guideGrid}>
          {[0, 1].map((col) => (
            <div className={styles.guideCol} key={col}>
              {d.guides
                .filter((_, i) => i % 2 === col)
                .map((g) => (
                  <a key={g.title} href={g.href} className={styles.guideRow}>
                    <span className={`${styles.iconBoxSm} ${styles[g.tone]}`}>
                      <Icon d={icons[g.icon]} size={16} />
                    </span>
                    <span className={styles.guideText}>
                      <span className={styles.guideTitle}>{g.title}</span>
                      <span className={styles.guideDesc}>{g.desc}</span>
                    </span>
                    <Icon d={icons.chevronRight} size={16} />
                  </a>
                ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className={styles.sectionHeadRow}>
          <h2 className={styles.sectionTitle}>Video tutorials</h2>
          <a className={styles.viewAllLink} href="#">
            View all videos <Icon d={icons.arrowRight} size={14} />
          </a>
        </div>
        <div className={styles.videoGrid}>
          {d.videos.map((v) => (
            <button key={v.title} className={styles.videoCard}>
              <span className={`${styles.videoThumb} ${styles[v.tone]}`}>
                {v.thumb ? (
                  <img src={v.thumb} alt="" className={styles.videoThumbImg} />
                ) : null}
                <span className={styles.playBtn}>
                  <Icon d={icons.play} size={18} />
                </span>
                <span className={styles.videoDuration}>{v.duration}</span>
              </span>
              <span className={styles.videoTitle}>{v.title}</span>
              <span className={styles.videoSub}>{v.sub}</span>
            </button>
          ))}
        </div>
      </section>

      <div className={styles.bottomGrid}>
        <div className={styles.contactCard}>
          <span className={styles.headsetWrap}>
            <Icon d={icons.headset} size={24} />
          </span>
          <span className={styles.contactTitle}>{d.contact.title}</span>
          <span className={styles.contactSub}>{d.contact.sub}</span>
          <a href={d.contact.ctaHref} className={styles.contactBtn}>
            {d.contact.ctaLabel}
          </a>
        </div>

        <div className={styles.otherWaysCard}>
          <span className={styles.otherWaysTitle}>Other ways to get help</span>
          <div className={styles.otherWaysGrid}>
            {d.otherWays.map((w) => (
              <div key={w.title} className={styles.otherWayItem}>
                <span className={`${styles.iconBoxSm} ${styles[w.tone]}`}>
                  <Icon d={icons[w.icon]} size={16} />
                </span>
                <span className={styles.owTitle}>{w.title}</span>
                <span className={styles.owDesc}>{w.desc}</span>
                <a className={styles.owLink} href={w.href}>
                  {w.linkLabel} <Icon d={icons.arrowRight} size={12} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footerNote}>
        <Icon d={icons.bulb} size={14} />
        <span>
          {d.footerNote.text}{" "}
          <a href={d.footerNote.href}>{d.footerNote.linkLabel}</a>
        </span>
      </div>
    </div>
  );
}
