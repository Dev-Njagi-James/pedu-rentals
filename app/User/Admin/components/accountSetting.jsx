'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from '../css/accountSettings.module.css';
import { toast } from 'sonner';
import NotificationsSection from './NotificationSection'

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className={styles.adminFieldIcon} aria-hidden="true">
    <path d={d} />
  </svg>
);

const icons = {
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 0l8 8 8-8',
  lock: 'M17 11V7a5 5 0 0 0-10 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z',
};

const FieldDisplay = ({ icon, label, value, masked = false }) => (
  <div className={styles.adminFieldRow}>
    <Icon d={icons[ icon ]} />
    <div className={styles.adminFieldBody}>
      <span className={styles.adminFieldLabel}>{label}</span>
      <span className={`${styles.adminFieldValue} ${masked ? styles.adminMasked : ''}`}>
        {masked ? '••••••••••' : (value || '—')}
      </span>
    </div>
  </div>
);

const FieldEdit = ({ icon, label, name, type = 'text', value, onChange, hint }) => (
  <div className={styles.adminFieldRow}>
    <Icon d={icons[ icon ]} />
    <div className={styles.adminFieldBody}>
      <label className={styles.adminFieldLabel} htmlFor={name}>{label}</label>
      <input
        id={name} name={name} type={type} value={value}
        onChange={onChange} className={styles.adminFieldInput} autoComplete="off"
      />
      {hint && <span className={styles.adminFieldHint}>{hint}</span>}
    </div>
  </div>
);

const Section = ({ title, children, editing, onEdit, onSave, onCancel, saved, loading, dirty }) => (
  <div className={styles.adminSection}>
    <div className={styles.adminSectionHeader}>
      <span className={styles.adminSectionTitle}>{title}</span>
      <div className={styles.adminHeaderActions}>
        {saved && <span className={styles.adminSavedBadge}>saved</span>}
        {editing ? (
          <>
            <button className={styles.adminCancelBtn} onClick={onCancel} disabled={loading}>Cancel</button>
            <button className={styles.adminSaveBtn} onClick={onSave} disabled={loading || !dirty}>
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </>
        ) : (
          <button className={styles.adminEditBtn} onClick={onEdit}>Edit</button>
        )}
      </div>
    </div>
    <div className={styles.adminSectionBody}>{children}</div>
  </div>
);

// ── System Features ──────────────────────────────────────────
function SystemFeatures() {
  const [ mpesa, setMpesa ] = useState(false);
  const [ editDays, setEditDays ] = useState(5);
  const [ draftDays, setDraftDays ] = useState(5);
  const [ editingDays, setEditingDays ] = useState(false);
  const [ loading, setLoading ] = useState(true);
  const [ saving, setSaving ] = useState({ mpesa: false, days: false });

  useEffect(() => {
    fetch('/api/adminRo/settings')
      .then(r => r.json())
      .then(data => {
        setMpesa(data.mpesa_enabled);
        setEditDays(data.edit_window_days);
        setDraftDays(data.edit_window_days);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleMpesa = async (next) => {
    setSaving(s => ({ ...s, mpesa: true }));
    try {
      const res = await fetch('/api/adminRo/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mpesa_enabled', value: String(next) }),
      });
      if (!res.ok) throw new Error('Failed to update.');
      setMpesa(next);
      toast.success(`M-Pesa payments ${next ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(s => ({ ...s, mpesa: false }));
    }
  };

  const saveEditDays = async () => {
    const val = Math.max(1, Math.min(365, parseInt(draftDays, 10) || 1));
    setSaving(s => ({ ...s, days: true }));
    try {
      const res = await fetch('/api/adminRo/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit_window_days', value: String(val) }),
      });
      if (!res.ok) throw new Error('Failed to update.');
      setEditDays(val);
      setDraftDays(val);
      setEditingDays(false);
      toast.success(`Edit window set to ${val} day${val !== 1 ? 's' : ''}.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(s => ({ ...s, days: false }));
    }
  };

  if (loading) return (
    <div className={styles.adminSection}>
      <div className={styles.adminSectionHeader}>
        <span className={styles.adminSectionTitle}>System Features</span>
      </div>
      <div className={styles.adminSectionBody}>
        <p className={styles.adminLoading}>Loading settings…</p>
      </div>
    </div>
  );

  return (
    <div className={styles.adminSection}>
      <div className={styles.adminSectionHeader}>
        <span className={styles.adminSectionTitle}>System Features</span>
      </div>
      <div className={styles.adminSectionBody}>

        {/* ── MPESA toggle ── */}
        <div className={styles.adminFieldRow}>
          <div className={styles.adminFieldBody}>
            <span className={styles.adminFieldLabel}>Activate Listing Payment</span>
            <span className={styles.adminFieldValue}>
              {mpesa ? 'M-Pesa payments live' : 'Simulated (no charge)'}
            </span>
          </div>
          <button
            className={`${styles.featureToggle} ${mpesa ? styles.featureToggleOn : ''}`}
            onClick={() => toggleMpesa(!mpesa)}
            disabled={saving.mpesa}
            aria-label="Toggle M-Pesa"
          >
            <span className={styles.featureToggleThumb} />
          </button>
        </div>

        {/* ── Edit window days ── */}
        <div className={styles.adminFieldRow}>
          <div className={styles.adminFieldBody}>
            <span className={styles.adminFieldLabel}>Editing Window Days</span>
            {editingDays ? (
              <div className={styles.featureDaysRow}>
                <input
                  type="number"
                  min={1}
                  max={365}
                  className={styles.featureDaysInput}
                  value={draftDays}
                  onChange={e => setDraftDays(e.target.value)}
                />
                <button
                  className={styles.adminSaveBtn}
                  onClick={saveEditDays}
                  disabled={saving.days || String(draftDays) === String(editDays)}
                >
                  {saving.days ? 'Saving…' : 'Save'}
                </button>
                <button
                  className={styles.adminCancelBtn}
                  onClick={() => { setDraftDays(editDays); setEditingDays(false); }}
                  disabled={saving.days}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <span className={styles.adminFieldValue}>{editDays} day{editDays !== 1 ? 's' : ''}</span>
            )}
          </div>
          {!editingDays && (
            <button className={styles.adminEditBtn} onClick={() => setEditingDays(true)}>
              Edit
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
const EMPTY = { username: '', email: '' };

export default function AdminAccountSettings() {
  const [ data, setData ] = useState(EMPTY);
  const [ fetching, setFetching ] = useState(true);
  const [ error, setError ] = useState(null);

  const [ accountDraft, setAccountDraft ] = useState({ username: '' });
  const [ securityDraft, setSecurityDraft ] = useState({ email: '', password: '' });

  const [ editing, setEditing ] = useState({ account: false, security: false });
  const [ loading, setLoading ] = useState({ account: false, security: false });
  const [ saved, setSaved ] = useState({ account: false, security: false });
  const [ dirty, setDirty ] = useState({ account: false, security: false });

  const fetchAccount = () =>
    fetch('/api/adminRo/account')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load account data.');
        return res.json();
      })
      .then(json => {
        setData(json);
        setAccountDraft({ username: json.username });
        setSecurityDraft({ email: json.email, password: '' });
      })
      .catch(err => setError(err.message))
      .finally(() => setFetching(false));

  useEffect(() => { fetchAccount(); }, []);

  const initials = data.username ? data.username.slice(0, 2).toUpperCase() : '..';

  const handleAccountChange = useCallback(e => {
    const { name, value } = e.target;
    setAccountDraft(prev => ({ ...prev, [ name ]: value }));
    setDirty(prev => ({ ...prev, account: true }));
  }, []);

  const handleSecurityChange = useCallback(e => {
    const { name, value } = e.target;
    setSecurityDraft(prev => ({ ...prev, [ name ]: value }));
    setDirty(prev => ({ ...prev, security: true }));
  }, []);

  const startEdit = section => {
    if (section === 'account') setAccountDraft({ username: data.username });
    if (section === 'security') setSecurityDraft({ email: data.email, password: '' });
    setEditing(prev => ({ ...prev, [ section ]: true }));
    setDirty(prev => ({ ...prev, [ section ]: false }));
    setError(null);
  };

  const cancelEdit = section => {
    setEditing(prev => ({ ...prev, [ section ]: false }));
    setDirty(prev => ({ ...prev, [ section ]: false }));
    setError(null);
  };

  const save = async (section) => {
    setLoading(prev => ({ ...prev, [ section ]: true }));
    setError(null);

    const body = section === 'account'
      ? { type: 'account', username: accountDraft.username }
      : {
        type: 'security',
        email: securityDraft.email.trim() || null,
        password: securityDraft.password.trim() || null,
      };

    try {
      const res = await fetch('/api/adminRo/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save.');

      await fetchAccount();
      setEditing(prev => ({ ...prev, [ section ]: false }));
      setDirty(prev => ({ ...prev, [ section ]: false }));

      if (section === 'security') {
        toast.success('Changes saved. Check your Gmail for a confirmation link.');
      } else {
        toast.success('Username updated successfully.');
      }

    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(prev => ({ ...prev, [ section ]: false }));
    }
  };

  if (fetching) return <div className={styles.adminLoading}>Loading account…</div>;

  return (
    <div className={styles.adminRoot}>

      <div className={styles.adminProfileHeader}>
        <div className={styles.adminAvatar}>{initials}</div>
        <div className={styles.adminProfileMeta}>
          <h1 className={styles.adminProfileName}>{data.username}</h1>
          <p className={styles.adminProfileEmail}>{data.email}</p>
        </div>
      </div>

      {error && <p className={styles.adminErrorBanner}>{error}</p>}

      <div className={styles.adminSectionsGrid}>
        <Section
          title="Account Details"
          editing={editing.account}
          onEdit={() => startEdit('account')}
          onSave={() => save('account')}
          onCancel={() => cancelEdit('account')}
          saved={saved.account}
          loading={loading.account}
          dirty={dirty.account}
        >
          {editing.account ? (
            <FieldEdit icon="user" label="Username" name="username"
              value={accountDraft.username} onChange={handleAccountChange} />
          ) : (
            <FieldDisplay icon="user" label="Username" value={data.username} />
          )}
        </Section>

        <Section
          title="Security"
          editing={editing.security}
          onEdit={() => startEdit('security')}
          onSave={() => save('security')}
          onCancel={() => cancelEdit('security')}
          saved={saved.security}
          loading={loading.security}
          dirty={dirty.security}
        >
          {editing.security ? (
            <>
              <FieldEdit icon="mail" label="Email" name="email" type="email"
                value={securityDraft.email} onChange={handleSecurityChange} />
              <FieldEdit icon="lock" label="New Password" name="password" type="password"
                value={securityDraft.password} onChange={handleSecurityChange}
                hint="Leave blank to keep current password." />
            </>
          ) : (
            <>
              <FieldDisplay icon="mail" label="Email" value={data.email} />
              <FieldDisplay icon="lock" label="Password" masked />
            </>
          )}
        </Section>
      </div>

      {/* ── System Features — full width ── */}
      <SystemFeatures />

      {/* ── Notifications — full width ── */}
      <div style={{ marginTop: '1.5rem' }}>
        <NotificationsSection />
      </div>

    </div>
  );
}