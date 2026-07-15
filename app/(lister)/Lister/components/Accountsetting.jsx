'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from '../css/AccountSettings.module.css';

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className={styles.fieldIcon} aria-hidden="true">
    <path d={d} />
  </svg>
);

const icons = {
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  lock: 'M17 11V7a5 5 0 0 0-10 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 0l8 8 8-8',
  building: 'M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  map: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z',
};

const FieldDisplay = ({ icon, label, value, masked = false }) => (
  <div className={styles.fieldRow}>
    <Icon d={icons[ icon ]} />
    <div className={styles.fieldBody}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={`${styles.fieldValue} ${masked ? styles.masked : ''}`}>
        {masked ? '••••••••••' : (value || '—')}
      </span>
    </div>
  </div>
);

const FieldEdit = ({ icon, label, name, type = 'text', value, onChange, hint }) => (
  <div className={styles.fieldRow}>
    <Icon d={icons[ icon ]} />
    <div className={styles.fieldBody}>
      <label className={styles.fieldLabel} htmlFor={name}>{label}</label>
      <input
        id={name} name={name} type={type} value={value}
        onChange={onChange} className={styles.fieldInput} autoComplete="off"
      />
      {hint && <span className={styles.fieldHint}>{hint}</span>}
    </div>
  </div>
);

const Section = ({ title, children, editing, onEdit, onSave, onCancel, saved, loading, dirty }) => (
  <div className={styles.section}>
    <div className={styles.sectionHeader}>
      <span className={styles.sectionTitle}>{title}</span>
      <div className={styles.headerActions}>
        {saved && <span className={styles.savedBadge}>saved</span>}
        {editing ? (
          <>
            <button className={styles.cancelBtn} onClick={onCancel} disabled={loading}>Cancel</button>
            <button className={styles.saveBtn} onClick={onSave} disabled={loading || !dirty}>
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </>
        ) : (
          <button className={styles.editBtn} onClick={onEdit}>Edit</button>
        )}
      </div>
    </div>
    <div className={styles.sectionBody}>{children}</div>
  </div>
);

const EMPTY = { username: '', email: '', contact: '', organisationName: '', ward: '' };

export default function AccountSettings() {
  const [ data, setData ] = useState(EMPTY);
  const [ fetching, setFetching ] = useState(true);
  const [ error, setError ] = useState(null);
  const [ emailNotice, setEmailNotice ] = useState(false);

  // Each section has its own draft, editing, loading, saved, dirty state
  const [ authDraft, setAuthDraft ] = useState({ email: '', password: '' });
  const [ profileDraft, setProfileDraft ] = useState({ username: '', contact: '' });
  const [ orgDraft, setOrgDraft ] = useState({ organisationName: '', ward: '' });

  const [ editing, setEditing ] = useState({ auth: false, profile: false, org: false });
  const [ loading, setLoading ] = useState({ auth: false, profile: false, org: false });
  const [ saved, setSaved ] = useState({ auth: false, profile: false, org: false });
  const [ dirty, setDirty ] = useState({ auth: false, profile: false, org: false });

  const fetchAccount = () =>
    fetch('/api/account')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load account data.');
        return res.json();
      })
      .then(json => {
        setData(json);
        setAuthDraft({ email: json.email, password: '' });
        setProfileDraft({ username: json.username, contact: json.contact });
        setOrgDraft({ organisationName: json.organisationName, ward: json.ward });
      })
      .catch(err => setError(err.message))
      .finally(() => setFetching(false));

  useEffect(() => {
    fetch('/api/account/sync-email', { method: 'POST' }).catch(() => { });
    fetchAccount();
  }, []);

  const initials = data.username ? data.username.slice(0, 2).toUpperCase() : '..';

  // Per-section change handlers that set dirty
  const handleAuthChange = useCallback(e => {
    const { name, value } = e.target;
    setAuthDraft(prev => ({ ...prev, [ name ]: value }));
    setDirty(prev => ({ ...prev, auth: true }));
  }, []);

  const handleProfileChange = useCallback(e => {
    const { name, value } = e.target;
    setProfileDraft(prev => ({ ...prev, [ name ]: value }));
    setDirty(prev => ({ ...prev, profile: true }));
  }, []);

  const handleOrgChange = useCallback(e => {
    const { name, value } = e.target;
    setOrgDraft(prev => ({ ...prev, [ name ]: value }));
    setDirty(prev => ({ ...prev, org: true }));
  }, []);

  const startEdit = section => {
    // Reset draft to current saved data on edit start
    if (section === 'auth') setAuthDraft({ email: data.email, password: '' });
    if (section === 'profile') setProfileDraft({ username: data.username, contact: data.contact });
    if (section === 'org') setOrgDraft({ organisationName: data.organisationName, ward: data.ward });
    setEditing(prev => ({ ...prev, [ section ]: true }));
    setDirty(prev => ({ ...prev, [ section ]: false }));
    setError(null);
    setEmailNotice(false);
  };

  const cancelEdit = section => {
    setEditing(prev => ({ ...prev, [ section ]: false }));
    setDirty(prev => ({ ...prev, [ section ]: false }));
    setError(null);
    setEmailNotice(false);
  };

  const saveAuth = async () => {
    setLoading(prev => ({ ...prev, auth: true }));
    setError(null);

    try {
      // ── STUB POINT: /api/account/auth ──
      const res = await fetch('/api/account/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authDraft.email.trim() || null,
          password: authDraft.password.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save.');

      const emailChanged = authDraft.email.trim() !== data.email.trim();

      setEditing(prev => ({ ...prev, auth: false }));
      setDirty(prev => ({ ...prev, auth: false }));
      setSaved(prev => ({ ...prev, auth: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, auth: false })), 2500);

      if (emailChanged) setEmailNotice(true);
      else await fetchAccount();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, auth: false }));
    }
  };

  const saveProfile = async () => {
    setLoading(prev => ({ ...prev, profile: true }));
    setError(null);

    try {
      // ── STUB POINT: /api/account/profile ──
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profileDraft.username.trim() || null,
          contact: profileDraft.contact.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save.');

      await fetchAccount();
      setEditing(prev => ({ ...prev, profile: false }));
      setDirty(prev => ({ ...prev, profile: false }));
      setSaved(prev => ({ ...prev, profile: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, profile: false })), 2500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const saveOrg = async () => {
    setLoading(prev => ({ ...prev, org: true }));
    setError(null);

    try {
      // ── STUB POINT: /api/account/profile (org fields) ──
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationName: orgDraft.organisationName.trim() || null,
          ward: orgDraft.ward.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save.');

      await fetchAccount();
      setEditing(prev => ({ ...prev, org: false }));
      setDirty(prev => ({ ...prev, org: false }));
      setSaved(prev => ({ ...prev, org: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, org: false })), 2500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, org: false }));
    }
  };

  if (fetching) return <div className={styles.loading}>Loading account…</div>;

  return (
    <div className={styles.root}>

      <div className={styles.profileHeader}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.profileMeta}>
          <h1 className={styles.profileName}>{data.username}</h1>
          <p className={styles.profileEmail}>{data.email}</p>
        </div>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      {emailNotice && (
        <p className={styles.noticeBanner}>
          Confirmation email sent. Click the link in your inbox to finalise the change.
          Your login email remains unchanged until confirmed.
        </p>
      )}

      <div className={styles.sectionsGrid}>

        <Section
          title="Login & Security"
          editing={editing.auth}
          onEdit={() => startEdit('auth')}
          onSave={saveAuth}
          onCancel={() => cancelEdit('auth')}
          saved={saved.auth}
          loading={loading.auth}
          dirty={dirty.auth}
        >
          {editing.auth ? (
            <>
              <FieldEdit icon="mail" label="Email" name="email" type="email"
                value={authDraft.email} onChange={handleAuthChange}
                hint="A confirmation link will be sent to the new address." />
              <FieldEdit icon="lock" label="New password" name="password" type="password"
                value={authDraft.password} onChange={handleAuthChange}
                hint="Leave blank to keep current password." />
            </>
          ) : (
            <>
              <FieldDisplay icon="mail" label="Email" value={data.email} />
              <FieldDisplay icon="lock" label="Password" masked />
            </>
          )}
        </Section>

        <Section
          title="Profile"
          editing={editing.profile}
          onEdit={() => startEdit('profile')}
          onSave={saveProfile}
          onCancel={() => cancelEdit('profile')}
          saved={saved.profile}
          loading={loading.profile}
          dirty={dirty.profile}
        >
          {editing.profile ? (
            <>
              <FieldEdit icon="user" label="Username" name="username"
                value={profileDraft.username} onChange={handleProfileChange} />
              <FieldEdit icon="phone" label="Contact" name="contact" type="tel"
                value={profileDraft.contact} onChange={handleProfileChange} />
            </>
          ) : (
            <>
              <FieldDisplay icon="user" label="Username" value={data.username} />
              <FieldDisplay icon="phone" label="Contact" value={data.contact} />
            </>
          )}
        </Section>

        <Section
          title="Organisation"
          editing={editing.org}
          onEdit={() => startEdit('org')}
          onSave={saveOrg}
          onCancel={() => cancelEdit('org')}
          saved={saved.org}
          loading={loading.org}
          dirty={dirty.org}
        >
          {editing.org ? (
            <>
              <FieldEdit icon="building" label="Organisation name" name="organisationName"
                value={orgDraft.organisationName} onChange={handleOrgChange} />
              <FieldEdit icon="map" label="Ward" name="ward"
                value={orgDraft.ward} onChange={handleOrgChange}
                hint="Helps match you to relevant listings." />
            </>
          ) : (
            <>
              <FieldDisplay icon="building" label="Organisation name" value={data.organisationName} />
              <FieldDisplay icon="map" label="Ward" value={data.ward} />
            </>
          )}
        </Section>

      </div>

      <div className={styles.dangerZone}>
        <div>
          <p className={styles.dangerTitle}>Delete account</p>
          <p className={styles.dangerSub}>Permanently removes your account and all listings. This cannot be undone.</p>
        </div>
        <button className={styles.deleteBtn}>Delete account</button>
      </div>

    </div>
  );
}