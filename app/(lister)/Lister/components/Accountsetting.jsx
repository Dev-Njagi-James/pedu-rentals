"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import styles from "../css/AccountSettings.module.css";
import {
  getListerProfile,
  getCachedListerProfileSync,
  setListerProfile,
  computeMissingFields,
} from "@/lib/cache/listerProfileCache"; // adjust to actual relative path

const Icon = ({ d, size = 18 }) => (
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
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  lock: "M17 11V7a5 5 0 0 0-10 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 0l8 8 8-8",
  building:
    "M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4",
  phone:
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  map: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z",
  calendar:
    "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  shield: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  crown: "M2 20h20M4 20l1.5-9L9 15l3-8 3 8 3.5-4L20 20",
  alertCircle: "M12 8v5M12 16h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
  key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  pencil: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z",
};

const FieldDisplay = ({
  icon,
  label,
  value,
  masked = false,
  badge = null,
  missing = false,
}) => (
  <div className={styles.fieldRow}>
    <Icon d={icons[icon]} size={16} />
    <div className={styles.fieldBody}>
      <span className={styles.fieldLabel}>{label}</span>
      <span
        className={`${styles.fieldValue} ${masked ? styles.masked : ""} ${missing ? styles.missing : ""}`}>
        {masked ? "••••••••••" : value || "—"}
      </span>
    </div>
    {badge && (
      <span className={`${styles.badge} ${styles[badge.tone]}`}>
        {badge.text}
      </span>
    )}
    {missing && !badge && (
      <span className={`${styles.badge} ${styles.warn}`}>Missing</span>
    )}
  </div>
);

const FieldEdit = ({
  icon,
  label,
  name,
  type = "text",
  value,
  onChange,
  hint,
}) => (
  <div className={styles.fieldRow}>
    <Icon d={icons[icon]} size={16} />
    <div className={styles.fieldBody}>
      <label className={styles.fieldLabel} htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className={styles.fieldInput}
        autoComplete="off"
      />
      {hint && <span className={styles.fieldHint}>{hint}</span>}
    </div>
  </div>
);

const Section = ({
  title,
  subtitle,
  icon,
  iconTone,
  children,
  editing,
  onEdit,
  onSave,
  onCancel,
  saved,
  loading,
  dirty,
  editable = true,
}) => (
  <div className={styles.section}>
    <div className={styles.sectionHeader}>
      <div className={styles.sectionHeadLeft}>
        <span className={`${styles.iconBox} ${styles[iconTone]}`}>
          <Icon d={icons[icon]} size={18} />
        </span>
        <div className={styles.sectionHeadText}>
          <span className={styles.sectionTitle}>{title}</span>
          <span className={styles.sectionSubtitle}>{subtitle}</span>
        </div>
      </div>
      {editable && (
        <div className={styles.headerActions}>
          {saved && <span className={styles.savedBadge}>saved</span>}
          {editing ? (
            <>
              <button
                className={styles.cancelBtn}
                onClick={onCancel}
                disabled={loading}>
                Cancel
              </button>
              <button
                className={styles.saveBtn}
                onClick={onSave}
                disabled={loading || !dirty}>
                {loading ? "Saving…" : "Save changes"}
              </button>
            </>
          ) : (
            <button className={styles.editBtn} onClick={onEdit}>
              <Icon d={icons.key} size={12} /> Edit
            </button>
          )}
        </div>
      )}
    </div>
    <div className={styles.sectionBody}>{children}</div>
  </div>
);

const EMPTY = {
  username: "",
  lister_email: "",
  phone_number: "",
  lister_organization: "",
  ward_name: "",
  emailVerified: false,
  memberSince: "",
  accountStatus: "",
  totalListings: "",
  accountType: "",
};

// Single point of truth: coerces every text column that can be null in
// users_table to "". Anything that reads `data` after this — including
// startEdit's drafts — never has to null-check again.
function normalizeProfile(profile) {
  if (!profile) return EMPTY;
  return {
    ...profile,
    username: profile.username ?? "",
    lister_email: profile.lister_email ?? "",
    phone_number: profile.phone_number ?? "",
    lister_organization: profile.lister_organization ?? "",
    ward_name: profile.ward_name ?? "",
    memberSince: profile.created_at
      ? new Date(profile.created_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
        })
      : "",
    accountType: profile.account_type ?? "Lister",
  };
}

function fireIncompleteToast(profile) {
  const missing = computeMissingFields(profile);
  if (missing.length === 0) return;
  toast.warning("Finish setting up your account", {
    description: "Complete your profile to start publishing listings.",
    duration: 8000,
  });
}
const STATUS_TONES = {
  active: "statusGood",
  pending: "statusWarn",
};

const BannerStat = ({ icon, label, children }) => (
  <div className={styles.bannerStat}>
    <span className={styles.bannerStatIcon}>
      <Icon d={icons[icon]} size={20} />
    </span>
    <div className={styles.bannerStatBody}>
      <span className={styles.bannerStatLabel}>{label}</span>
      {children}
    </div>
  </div>
);

const ProfileBanner = ({
  data,
  missing,
  editing,
  draft,
  onChange,
  onEdit,
  onSave,
  onCancel,
  loading,
  dirty,
  saved,
}) => {
  const usernameMissing = missing.includes("username");
  const phoneMissing = missing.includes("phone_number");

  const statusTone =
    STATUS_TONES[data.accountStatus?.toLowerCase()] ?? "statusNeutral";

  const listings =
    data.totalListings === "" || data.totalListings == null
      ? "—"
      : data.totalListings;

  return (
    <section className={styles.banner} aria-label="Profile">
      <div className={styles.bannerIdentity}>
        <div className={styles.bannerAvatar}>
          <div className={styles.bannerAvatarInner}>
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="22" r="11" fill="currentColor" />
              <circle cx="32" cy="22" r="3.5" fill="#fff" opacity="0.9" />
              <path
                d="M14 52a18 18 0 0 1 36 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {editing ? (
          <div className={styles.bannerEditFields}>
            <div className={styles.bannerField}>
              <label
                className={styles.bannerFieldLabel}
                htmlFor="banner-username">
                Username
              </label>

              <input
                id="banner-username"
                name="username"
                value={draft.username}
                onChange={onChange}
                className={styles.bannerInput}
                autoComplete="off"
              />
            </div>

            <div className={styles.bannerField}>
              <label className={styles.bannerFieldLabel} htmlFor="banner-phone">
                Contact
              </label>

              <input
                id="banner-phone"
                name="phone_number"
                type="tel"
                value={draft.phone_number}
                onChange={onChange}
                className={styles.bannerInput}
                autoComplete="off"
              />
            </div>
          </div>
        ) : (
          <div className={styles.bannerInfo}>
            <div className={styles.bannerNameRow}>
              <h2
                className={`${styles.bannerName} ${
                  usernameMissing ? styles.bannerMissing : ""
                }`}>
                {data.username || "Add a username"}
              </h2>

              {data.accountType && (
                <span className={styles.bannerTag}>{data.accountType}</span>
              )}
            </div>

            <p
              className={`${styles.bannerPhone} ${
                phoneMissing ? styles.bannerMissing : ""
              }`}>
              <Icon d={icons.phone} size={16} />
              {data.phone_number || "Add a phone number"}
            </p>
          </div>
        )}
      </div>

      <div className={styles.bannerStats}>
        <BannerStat icon="list" label="Total listings">
          <span className={styles.bannerStatValue}>{listings}</span>
        </BannerStat>

        <BannerStat icon="calendar" label="Member since">
          <span className={styles.bannerStatValue}>
            {data.memberSince || "—"}
          </span>
        </BannerStat>

        <BannerStat icon="shield" label="Account status">
          {data.accountStatus ? (
            <span className={`${styles.bannerPill} ${styles[statusTone]}`}>
              <i className={styles.bannerDot} />
              {data.accountStatus}
            </span>
          ) : (
            <span className={styles.bannerStatValue}>—</span>
          )}
        </BannerStat>
      </div>

      {/* Only ONE edit icon */}
      {!editing && (
        <button
          type="button"
          className={styles.bannerEditIconButton}
          onClick={onEdit}
          aria-label="Edit profile"
          title="Edit profile">
          <Icon d={icons.pencil} size={16} />
        </button>
      )}

      <div className={styles.bannerActions}>
        {saved && <span className={styles.savedBadge}>saved</span>}

        {editing && (
          <>
            <button
              type="button"
              className={styles.bannerGhostBtn}
              onClick={onCancel}
              disabled={loading}>
              Cancel
            </button>

            <button
              type="button"
              className={styles.bannerPrimaryBtn}
              onClick={onSave}
              disabled={loading || !dirty}>
              {loading ? "Saving…" : "Save changes"}
            </button>
          </>
        )}
      </div>
    </section>
  );
};

export default function AccountSettings() {
  const [data, setData] = useState(() =>
    normalizeProfile(getCachedListerProfileSync()),
  );

  const [emailNotice, setEmailNotice] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [authDraft, setAuthDraft] = useState({
    lister_email: "",
    password: "",
  });
  const [profileDraft, setProfileDraft] = useState({
    username: "",
    phone_number: "",
  });
  const [orgDraft, setOrgDraft] = useState({
    lister_organization: "",
    ward_name: "",
  });

  const [editing, setEditing] = useState({
    auth: false,
    profile: false,
    org: false,
  });
  const [loading, setLoading] = useState({
    auth: false,
    profile: false,
    org: false,
  });
  const [saved, setSaved] = useState({
    auth: false,
    profile: false,
    org: false,
  });
  const [dirty, setDirty] = useState({
    auth: false,
    profile: false,
    org: false,
  });

  // Reads the module cache. First mount anywhere in the app triggers the
  // network call; every later mount (including tab-away/tab-back on this
  // component) reads the resolved value synchronously — no fetch, no
  // loading flicker. Toast fires on every mount where required fields are
  // still missing, no sessionStorage gate, per spec. fireIncompleteToast
  // still receives the raw (un-normalized) profile — computeMissingFields
  // already treats null/empty the same way, so normalization here doesn't
  // change toast behavior.
  useEffect(() => {
    let cancelled = false;

    const cached = getCachedListerProfileSync();
    if (cached !== undefined) {
      if (!cancelled) setData(normalizeProfile(cached));
      fireIncompleteToast(cached);
      return;
    }

    getListerProfile().then((profile) => {
      if (cancelled) return;
      setData(normalizeProfile(profile));
      fireIncompleteToast(profile);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthChange = useCallback((e) => {
    const { name, value } = e.target;
    setAuthDraft((prev) => ({ ...prev, [name]: value }));
    setDirty((prev) => ({ ...prev, auth: true }));
  }, []);

  const handleProfileChange = useCallback((e) => {
    const { name, value } = e.target;
    setProfileDraft((prev) => ({ ...prev, [name]: value }));
    setDirty((prev) => ({ ...prev, profile: true }));
  }, []);

  const handleOrgChange = useCallback((e) => {
    const { name, value } = e.target;
    setOrgDraft((prev) => ({ ...prev, [name]: value }));
    setDirty((prev) => ({ ...prev, org: true }));
  }, []);

  const startEdit = (section) => {
    // data is already normalized — no null ever reaches these drafts.
    if (section === "auth")
      setAuthDraft({ lister_email: data.lister_email, password: "" });
    if (section === "profile")
      setProfileDraft({
        username: data.username,
        phone_number: data.phone_number,
      });
    if (section === "org")
      setOrgDraft({
        lister_organization: data.lister_organization,
        ward_name: data.ward_name,
      });
    setEditing((prev) => ({ ...prev, [section]: true }));
    setDirty((prev) => ({ ...prev, [section]: false }));
    setSaveError(null);
    setEmailNotice(false);
  };

  const cancelEdit = (section) => {
    setEditing((prev) => ({ ...prev, [section]: false }));
    setDirty((prev) => ({ ...prev, [section]: false }));
    setSaveError(null);
    setEmailNotice(false);
  };

  const saveAuth = async () => {
    // /api/v1/users/me PATCH has no email/password fields — Clerk-managed.
    // Do not fabricate a PATCH the route would silently ignore.
    console.warn(
      "AccountSettings.saveAuth: email/password not savable via /api/v1/users/me. Wire via Clerk instead.",
    );
    setEmailNotice(true);
    setEditing((prev) => ({ ...prev, auth: false }));
    setDirty((prev) => ({ ...prev, auth: false }));
    setSaveError(null);
  };

  const saveProfile = async () => {
    setLoading((prev) => ({ ...prev, profile: true }));
    setSaveError(null);
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: profileDraft.username.trim() || null,
          phone_number: profileDraft.phone_number.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save.");

      setListerProfile(json.data); // updates cache + notifies subscribers (e.g. nav orgName), no re-fetch
      setData(normalizeProfile(json.data));
      setEditing((prev) => ({ ...prev, profile: false }));
      setDirty((prev) => ({ ...prev, profile: false }));
      setSaved((prev) => ({ ...prev, profile: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, profile: false })), 2500);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, profile: false }));
    }
  };

  const saveOrg = async () => {
    setLoading((prev) => ({ ...prev, org: true }));
    setSaveError(null);
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lister_organization: orgDraft.lister_organization.trim() || null,
          ward_name: orgDraft.ward_name.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save.");

      setListerProfile(json.data);
      setData(normalizeProfile(json.data));
      setEditing((prev) => ({ ...prev, org: false }));
      setDirty((prev) => ({ ...prev, org: false }));
      setSaved((prev) => ({ ...prev, org: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, org: false })), 2500);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, org: false }));
    }
  };

  const missingFields = computeMissingFields(data);

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Account overview</h1>
          <p className={styles.pageSub}>
            Manage your personal information, security and preferences.
          </p>
        </div>
        <div className={styles.secureNote}>
          <Icon d={icons.shield} size={15} />
          <span>Your data is secure with us</span>
        </div>
      </div>

      {saveError && <p className={styles.noticeBanner}>{saveError}</p>}

      {emailNotice && (
        <p className={styles.noticeBanner}>
          Email and password are managed by Clerk. Saving them via
          /api/v1/users/me is not supported (that route has no email/password
          fields) — this section will be rewired to Clerk in a separate step.
        </p>
      )}

      <ProfileBanner
        data={data}
        missing={missingFields}
        editing={editing.profile}
        draft={profileDraft}
        onChange={handleProfileChange}
        onEdit={() => startEdit("profile")}
        onSave={saveProfile}
        onCancel={() => cancelEdit("profile")}
        loading={loading.profile}
        dirty={dirty.profile}
        saved={saved.profile}
      />

      <div className={styles.sectionsGrid}>
        <Section
          title="Login & Security"
          subtitle="Manage your login credentials and security settings."
          icon="lock"
          iconTone="tonePurple"
          editing={editing.auth}
          onEdit={() => startEdit("auth")}
          onSave={saveAuth}
          onCancel={() => cancelEdit("auth")}
          saved={saved.auth}
          loading={loading.auth}
          dirty={dirty.auth}>
          {editing.auth ? (
            <>
              <FieldEdit
                icon="mail"
                label="Email"
                name="lister_email"
                type="email"
                value={authDraft.lister_email}
                onChange={handleAuthChange}
                hint="Clerk-managed — save wiring pending."
              />
              <FieldEdit
                icon="lock"
                label="New password"
                name="password"
                type="password"
                value={authDraft.password}
                onChange={handleAuthChange}
                hint="Leave blank to keep current password."
              />
            </>
          ) : (
            <>
              <FieldDisplay
                icon="mail"
                label="Email address"
                value={data.lister_email}
                badge={{
                  text: data.emailVerified ? "Verified" : "Unverified",
                  tone: data.emailVerified ? "good" : "warn",
                }}
              />
              <FieldDisplay icon="lock" label="Password" masked />
            </>
          )}
        </Section>

        <Section
          title="Organisation"
          subtitle="Your organisation and location details."
          icon="building"
          iconTone="toneOrange"
          editing={editing.org}
          onEdit={() => startEdit("org")}
          onSave={saveOrg}
          onCancel={() => cancelEdit("org")}
          saved={saved.org}
          loading={loading.org}
          dirty={dirty.org}>
          {editing.org ? (
            <>
              <FieldEdit
                icon="building"
                label="Organisation name"
                name="lister_organization"
                value={orgDraft.lister_organization}
                onChange={handleOrgChange}
              />
              <FieldEdit
                icon="map"
                label="Ward"
                name="ward_name"
                value={orgDraft.ward_name}
                onChange={handleOrgChange}
                hint="Helps match you to relevant listings."
              />
            </>
          ) : (
            <>
              <FieldDisplay
                icon="building"
                label="Organisation name"
                value={data.lister_organization}
                missing={missingFields.includes("lister_organization")}
              />
              <FieldDisplay icon="map" label="Ward" value={data.ward_name} />
            </>
          )}
        </Section>
      </div>

      <div className={styles.dangerZone}>
        <div className={styles.dangerLeft}>
          <span className={styles.dangerIconWrap}>
            <Icon d={icons.lock} size={16} />
          </span>
          <div>
            <p className={styles.dangerTitle}>Delete account</p>
            <p className={styles.dangerSub}>
              Permanently deletes your account and all associated data. This
              action cannot be undone.
            </p>
          </div>
        </div>
        <button className={styles.deleteBtn}>
          <Icon d={icons.lock} size={13} /> Delete account
        </button>
      </div>
    </div>
  );
}
