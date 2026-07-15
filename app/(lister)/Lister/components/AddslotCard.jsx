'use client';

import { useState, useEffect } from 'react';
import styles from '../css/AddslotCard.module.css';

const SLOT_PRICE_KES = 500;

export default function AddSlotCard({ onSlotAdded }) {
   const [ mpesaEnabled, setMpesaEnabled ] = useState(false);
   const [ phone, setPhone ] = useState('');
   const [ quantity, setQuantity ] = useState(1);
   const [ step, setStep ] = useState('idle'); // idle | confirm | processing | success | error
   const [ errorMsg, setErrorMsg ] = useState('');
   const [ open, setOpen ] = useState(false);

 useEffect(() => {
   fetch('/api/adminRo/settings')
      .then(r => r.json())
      .then(data => {
         setMpesaEnabled(data.mpesa_enabled === true || data.mpesa_enabled === 'true');
      })
      .catch(() => setMpesaEnabled(false));
}, []);

   const totalKes = SLOT_PRICE_KES * quantity;

   const normalisePhone = (raw) => {
      const digits = raw.replace(/\D/g, '');
      if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
      if (digits.startsWith('254') && digits.length === 12) return digits;
      return null;
   };

   const handleInitiate = () => {
      if (mpesaEnabled && !normalisePhone(phone)) {
         setErrorMsg('Enter a valid Safaricom number (07XX or 2547XX).');
         return;
      }
      setErrorMsg('');
      setStep('confirm');
   };

   const handleConfirm = async () => {
      setStep('processing');
      setErrorMsg('');

      try {
         // ── CHANGED: Updated target route from /api/subscription to /api/payments ──
         const res = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               action: 'add_slots',
               quantity,
               phone: normalisePhone(phone) ?? phone,
            }),
         });

         const json = await res.json();
         if (!res.ok) throw new Error(json.error ?? 'Request failed.');

         if (!json.success) throw new Error(json.error ?? 'Unknown error');

         if (mpesaEnabled && json.CheckoutRequestID) {
            await pollForCompletion(json.CheckoutRequestID);
         }

         setStep('success');
         onSlotAdded?.(quantity);

      } catch (err) {
         setErrorMsg(err.message ?? 'Payment failed. Try again.');
         setStep('error');
      }
   };

   const pollForCompletion = async (checkoutId) => {
      for (let i = 0; i < 12; i++) {
         await new Promise(r => setTimeout(r, 5000));

         // ── CHANGED: Updated target polling route to use /api/payments ──
         const res = await fetch(`/api/payments?checkout_request_id=${checkoutId}`);
         const json = await res.json();

         if (json.payment_status === 'complete') return;
         if (json.payment_status === 'failed') throw new Error('Payment rejected. Try again.');
         if (json.payment_status === 'slot_error') throw new Error('Payment received but slot update failed. Contact support.');
      }
      throw new Error('Payment timed out. Check your M-Pesa and retry.');
   };

   const reset = () => {
      setStep('idle');
      setPhone('');
      setQuantity(1);
      setErrorMsg('');
   };

   return (
      <div className={styles.card}>

         <div className={styles.cardHeader} onClick={() => setOpen(o => !o)}>
            <div className={styles.headerLeft}>
               <div className={styles.iconWrap} aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                     <rect x="2" y="7" width="20" height="14" rx="2" />
                     <path d="M16 7V5a2 2 0 0 0-4 0v2M12 12v4M10 14h4" />
                  </svg>
               </div>
               <div>
                  <h3 className={styles.heading}>Add Listing Slots</h3>
                  <p className={styles.sub}>KES {SLOT_PRICE_KES.toLocaleString()} per listing slot · pay via M-Pesa</p>
               </div>
            </div>

            <div className={styles.headerRight}>
               <span className={styles.badge}>{mpesaEnabled ? 'M-Pesa' : 'Simulated'}</span>
               <svg
                  className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
               >
                  <polyline points="6 9 12 15 18 9" />
               </svg>
            </div>
         </div>

         {open && (
            <div className={styles.cardBody}>

               {(step === 'idle' || step === 'error') && (
                  <div className={styles.form}>
                     {mpesaEnabled && (
                        <div className={styles.field}>
                           <label className={styles.label} htmlFor="slot-phone">Safaricom number</label>
                           <input
                              id="slot-phone" className={styles.input} type="tel"
                              placeholder="07XX XXX XXX" value={phone}
                              onChange={(e) => setPhone(e.target.value)} maxLength={13}
                           />
                        </div>
                     )}
                     <div className={styles.field}>
                        <label className={styles.label} htmlFor="slot-qty">Slots</label>
                        <div className={styles.stepper}>
                           <button className={styles.stepBtn} onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label="Decrease">−</button>
                           <span className={styles.stepVal}>{quantity}</span>
                           <button className={styles.stepBtn} onClick={() => setQuantity(q => Math.min(20, q + 1))} aria-label="Increase">+</button>
                        </div>
                     </div>
                     {errorMsg && <p className={styles.errorText}>{errorMsg}</p>}
                     <button className={styles.primaryBtn} onClick={handleInitiate}>
                        {mpesaEnabled ? `You get 2 free slots. Need more? KES ${totalKes.toLocaleString()} each` : `Add ${quantity} slot${quantity > 1 ? 's' : ''} (simulated)`}
                     </button>
                  </div>
               )}

               {step === 'confirm' && (
                  <div className={styles.confirmBlock}>
                     <p className={styles.confirmMsg}>
                        {mpesaEnabled
                           ? <><strong>KES {totalKes.toLocaleString()}</strong> STK push to <strong>{phone}</strong> for {quantity} slot{quantity > 1 ? 's' : ''}?</>
                           : <>Add <strong>{quantity}</strong> slot{quantity > 1 ? 's' : ''} to your account (no charge)?</>}
                     </p>
                     <div className={styles.confirmRow}>
                        <button className={styles.primaryBtn} onClick={handleConfirm}>
                           {mpesaEnabled ? 'Confirm & Pay' : 'Confirm'}
                        </button>
                        <button className={styles.ghostBtn} onClick={reset}>Cancel</button>
                     </div>
                  </div>
               )}

               {step === 'processing' && (
                  <div className={styles.statusBlock}>
                     <span className={styles.spinner} aria-label="Processing" />
                     <p className={styles.statusText}>
                        {mpesaEnabled ? 'STK push sent — approve on your phone' : 'Writing to database…'}
                     </p>
                  </div>
               )}

               {step === 'success' && (
                  <div className={styles.statusBlock}>
                     <svg className={styles.successIcon} width="32" height="32" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="7 12 10.5 15.5 17 9" />
                     </svg>
                     <p className={styles.statusText}>{quantity} slot{quantity > 1 ? 's' : ''} added successfully.</p>
                     <button className={styles.ghostBtn} onClick={reset}>Add more</button>
                  </div>
               )}

            </div>
         )}

      </div>
   );
}