'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import styles from '../css/CheckoutPopup.module.css';

// Matches app/(lister)/Lister/components/AddListing.jsx phone handling —
// same sanitisation contract as lib/payments/phone.js (server side).
const normalisePhone = (raw) => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
  if (digits.startsWith('254') && digits.length === 12) return digits;
  return null;
};

export default function CheckoutPopup({ listingId, categoryName, propertyLabel, onClose, onPaid }) {
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('select'); // select | processing | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!categoryName) {
      setPlansError('No category found for this listing.');
      setPlansLoading(false);
      return;
    }
    fetch(`/api/v1/plans?category_name=${encodeURIComponent(categoryName)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load plans.');
        return r.json();
      })
      .then((json) => {
        setPlans(json.plans ?? []);
        // Default to the first (highest-priority) plan, matching Figma default.
        if (json.plans?.length) setSelectedPlan(json.plans[0].plan_name);
      })
      .catch((err) => setPlansError(err.message))
      .finally(() => setPlansLoading(false));
  }, [categoryName]);

  const total = plans.find((p) => p.plan_name === selectedPlan)?.price_kes ?? 0;

  const pollForCompletion = async (checkoutRequestId) => {
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const res = await fetch(`/api/v1/payments/status/${checkoutRequestId}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.status === 'completed') return;
      if (json.status === 'failed') throw new Error('Payment rejected. Try again.');
      if (json.status === 'error') throw new Error('Payment received but confirmation failed. Contact support.');
    }
    throw new Error('Payment timed out. Check your M-Pesa and retry.');
  };

  const handleCheckout = async () => {
    const sanitised = normalisePhone(phone);
    if (!sanitised) {
      setErrorMsg('Enter a valid Safaricom number (07XX or 2547XX).');
      return;
    }
    if (!selectedPlan) {
      setErrorMsg('Select a package.');
      return;
    }

    setErrorMsg('');
    setStep('processing');

    try {
      const res = await fetch('/api/v1/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          listing_id: listingId,
          plan_name: selectedPlan,
          phone: sanitised,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Payment initiation failed.');

      await pollForCompletion(json.checkout_request_id);

      setStep('success');
      toast.success('Payment confirmed — your listing is live.');
      onPaid?.();
    } catch (err) {
      setErrorMsg(err.message ?? 'Payment failed. Try again.');
      setStep('error');
    }
  };

  return (
    <div className={styles.checkoutPanel}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandName}>Pedu Rentals</span>
          </div>
          <button className={styles.cancelBtn} onClick={onClose} disabled={step === 'processing'}>
            Cancel
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.message}>
            <h2 className={styles.title}>Give Your Listing More Visibility</h2>
            <p className={styles.subtitle}>
              Choose a listing package that suits your needs. Higher-tier packages give your
              property greater visibility and help it stand out to potential tenants and customers.
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Property</label>
            <div className={styles.readonlyInput}>{propertyLabel ?? categoryName}</div>
          </div>

          <div className={styles.packages}>
            <h3 className={styles.sectionTitle}>Choose Package</h3>

            {plansLoading && <p className={styles.hint}>Loading packages…</p>}
            {plansError && <p className={styles.errorBanner}>{plansError}</p>}

            {!plansLoading && !plansError && plans.map((plan) => {
              const isSelected = selectedPlan === plan.plan_name;
              return (
                <button
                  key={plan.plan_name}
                  type="button"
                  className={`${styles.packageCard} ${isSelected ? styles.packageCardSelected : ''} ${styles[`accent_${plan.plan_name}`] ?? ''}`}
                  onClick={() => setSelectedPlan(plan.plan_name)}
                  disabled={step === 'processing'}
                >
                  <div className={styles.packageTop}>
                    <span className={styles.packageName}>{plan.plan_name}</span>
                    <span className={`${styles.radio} ${isSelected ? styles.radioSelected : ''}`} aria-hidden />
                  </div>
                  <div className={styles.packageRow}>
                    <span>{plan.visibility_label}</span>
                    <strong>KSH {plan.price_kes.toLocaleString()}</strong>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.totalSection}>
          <h3 className={styles.checkoutDetailsTitle}>Checkout Details</h3>

          <div className={styles.phoneField}>
            <label className={styles.fieldLabel}>Phone Number</label>
            <div className={styles.phoneRow}>
              <div className={styles.phonePrefix}>+ 254</div>
              <input
                className={styles.phoneInput}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="789 908 567"
                maxLength={12}
                disabled={step === 'processing'}
              />
            </div>
          </div>

          <div className={styles.totalRow}>
            <span>Total</span>
            <strong>KSH {total.toLocaleString()}</strong>
          </div>

          {errorMsg && <p className={styles.errorBanner}>{errorMsg}</p>}
        </div>

        <div className={styles.payBar}>
          {step === 'select' || step === 'error' ? (
            <button className={styles.checkoutBtn} onClick={handleCheckout} disabled={plansLoading}>
              Checkout
            </button>
          ) : step === 'processing' ? (
            <div className={styles.processingRow}>
              <span className={styles.spinner} aria-label="Processing" />
              <span>STK push sent — approve on your phone</span>
            </div>
          ) : (
            <div className={styles.successRow}>
              <span>Payment confirmed.</span>
              <button className={styles.checkoutBtn} onClick={onClose}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}