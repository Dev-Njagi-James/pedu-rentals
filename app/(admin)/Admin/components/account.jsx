import React, { useState } from "react";
import "../css/account.css";

const iconPaths = {
  device: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="1.5" />
      <path d="M8 20h8M12 17v3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c.5-3.2 2.8-5 7-5s6.5 1.8 7 5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M10 18.5h4" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9m-3 3 3 3m-6 0 3 3" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2" />
      <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.2-1.2" />
    </>
  ),
  file: (
    <>
      <path d="M6 2.5h8l4 4V21H6z" />
      <path d="M14 2.5v5h5M9 12h6M9 16h6" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  phoneDevice: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18.5h2" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5" />
      <path d="M4 17v4h16v-4" />
    </>
  ),
  terminal: (
    <>
      <path d="m4 7 5 5-5 5M12 17h8" />
      <rect x="2.5" y="3" width="19" height="18" rx="2" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="8" cy="18" r="2" />
    </>
  ),
  camera: (
    <>
      <path d="M4 7h3l1.5-2h7L17 7h3v12H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9 7-.2 1-1.1 2.4-2.5 3.6M6.2 6.2C4 7.6 2.6 9.5 2 12c.3 1.3 1.4 3.1 3.4 4.5A11 11 0 0 0 12 19c1.3 0 2.5-.3 3.5-.8" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="13" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2" />
    </>
  ),
  star: (
    <path d="m12 2.5 3 6.1 6.7 1-4.9 4.8 1.2 6.7-6-3.2-6 3.2 1.1-6.7-4.8-4.8 6.7-1z" />
  ),
  thumb: (
    <>
      <path d="M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 10l5-8c2 0 3 1.5 2 4l-1 3h6a2 2 0 0 1 2 2l-1 8a2 2 0 0 1-2 2H7" />
    </>
  ),
};

function Icon({ name, size = 18, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={`dashboard-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round">
      {iconPaths[name] || iconPaths.file}
    </svg>
  );
}

function CardHeader({ icon, title, trailing }) {
  return (
    <div className="card-header">
      <div className="card-title">
        <h2>{title}</h2>
      </div>
      {trailing ? <div className="card-trailing">{trailing}</div> : null}
    </div>
  );
}

function CredentialCard({ title, value, badge }) {
  return (
    <div className="credential-card">
      <div className="credential-heading">
        <span className="credential-name">
          {title}
        </span>
        {badge ? <span className="credential-badge">{badge}</span> : null}
      </div>
      <div className="credential-value">
        <code>{value}</code>
        <button
          className="icon-button"
          type="button"
          aria-label={`Copy ${title}`}>
          <Icon name="eyeOff" size={16} />
        </button>
      </div>
    </div>
  );
}

function ActivityItem({ icon, tone = "", title, detail }) {
  return (
    <li className="activity-item">
      <span className={`activity-icon ${tone}`}>
        <Icon name={icon} size={17} />
      </span>
      <span className="activity-copy">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </li>
  );
}

export default function AccountSecurityDashboard({ onUpdatePassword }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onUpdatePassword?.({ username, password });
    setPassword("");
  }

  return (
    <div className="account-dashboard-shell">
      <main className="dashboard-frame">
        <div className="dashboard-intro">
          <h1>Admin Account &amp; Security Settings</h1>
          <p>
            Manage your personal administrator identity, credentials, active
            session keys, and platform notification hooks.
          </p>
        </div>

        <div className="dashboard-grid">
          <div className="main-column">
            <section className="dashboard-card profile-card">
              <CardHeader
                title="Personal Administrator Identity"
                trailing={<span className="text-action">View Details ↗</span>}
              />
              <div className="profile-banner">
                <div className="avatar">
                  P<span className="online-dot" />
                </div>
                <div className="profile-name">
                  <strong>Pedu Rentals</strong>
                  <span>
                    <Icon name="check" size={14} /> Full System Access
                  </span>
                </div>
                <div className="profile-actions">
                  <button type="button">
                    <Icon name="camera" size={16} />
                    Change Photo
                  </button>
                  <button type="button">
                    <Icon name="trash" size={16} />
                    Remove
                  </button>
                </div>
              </div>
              <div className="profile-fields">
                <label className="detail-field">
                  <span>Username</span>
                  <div>
                    <Icon name="user" />
                    Pedu Rentals
                  </div>
                </label>
                <label className="detail-field">
                  <span>Email</span>
                  <div>
                    <Icon name="mail" />
                    admin@example.com
                  </div>
                </label>
                <label className="detail-field">
                  <span>Phone Number</span>
                  <div>
                    <Icon name="phone" />
                    +254 700 000 000
                  </div>
                </label>
              </div>
            </section>

            <section className="dashboard-card security-card">
              <CardHeader
                icon="key"
                title="Authentication & Cryptographic Passkey"
              />
              <form className="security-form" onSubmit={handleSubmit}>
                <label className="form-field">
                  <span>Username</span>
                  <div className="input-wrap">
                    <Icon name="user" />
                    <input
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>
                </label>
                <label className="form-field">
                  <span>Password</span>
                  <div className="input-wrap">
                    <Icon name="lock" />
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                </label>
                <div className="security-submit">
                  <button className="update-button" type="submit">
                    Update Password
                  </button>
                </div>
              </form>
            </section>

            <section className="dashboard-card api-card">
              <CardHeader
                icon="link"
                title="Platform API Keys & Gateway Secrets"
                trailing={
                  <span className="section-label">STAGING / PRODUCTION</span>
                }
              />
              <CredentialCard
                title="Clark Master Admin Secret Key"
                value="ck_live_demo_••••••••••••••••••••••••••••••••"
                badge="Environment: Demo"
              />
              <CredentialCard
                title="M-Pesa Daraja B2C / C2B Consumer Key & Shortcode"
                value="daraja_demo_key_••••••••••••••••••••••••••••"
                badge="Shortcode: Demo"
              />
            </section>
          </div>

          <aside className="side-column">
            <section className="dashboard-card side-card log-card">
              <CardHeader
                icon="history"
                title="Admin Action Log"
                trailing={<span className="section-label">Today</span>}
              />
              <ul className="activity-list">
                <ActivityItem
                  icon="check"
                  tone="success"
                  title="Listing MFD-031 approved"
                  detail="Kilimani 2nd Executive · 14:28 EAT"
                />
                <ActivityItem
                  icon="download"
                  title="Quarterly Tax CSV exported"
                  detail="Revenue aggregate report · 11:45 EAT"
                />
                <ActivityItem
                  icon="file"
                  tone="warning"
                  title="Re-generated Daraja staging secret"
                  detail="Manual key rotate · Oct 26, 2024"
                />
                <ActivityItem
                  icon="terminal"
                  title="Console session initialized"
                  detail="IP 102.64.212.18 · Oct 26, 2024"
                />
              </ul>
              <button type="button" className="audit-link">
                View Complete Security Audit History →
              </button>
            </section>

            <section className="dashboard-card side-card alerts-card">
              <CardHeader
                icon="bell"
                title="Emergency Alerts"
                trailing={<Icon name="sliders" size={17} />}
              />
              <ul className="alert-list">
                <li>
                  Failed M-Pesa Dispatches (&gt; KES 50K)
                  <span className="alert-check">✓</span>
                </li>
                <li>
                  New Landlord Onboarding KYC
                  <span className="alert-check">✓</span>
                </li>
                <li>
                  Suspicious High Velocity Requests
                  <span className="alert-check">✓</span>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
