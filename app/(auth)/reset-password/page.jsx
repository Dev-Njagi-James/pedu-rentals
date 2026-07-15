'use client'
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import "@/app/(auth)/Auth/css/AuthForm.css";

const supabase = createBrowserSupabaseClient();

const validatePassword = v => {
  if (v.length < 8) return "At least 8 characters.";
  if (!/[A-Z]/.test(v)) return "Must contain an uppercase letter.";
  if (!/[a-z]/.test(v)) return "Must contain a lowercase letter.";
  if (!/[0-9]/.test(v)) return "Must contain a number.";
  if (!/[^A-Za-z0-9]/.test(v)) return "Must contain a special character.";
  return null;
};

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    className="input-icon" aria-hidden="true">
    <path d="M17 11V7a5 5 0 0 0-10 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" />
  </svg>
);

export default function ResetPassword() {
  const [ password, setPassword ] = useState("");
  const [ confirm, setConfirm ] = useState("");
  const [ showPw, setShowPw ] = useState(false);
  const [ loading, setLoading ] = useState(false);
  const [ ready, setReady ] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    const pwErr = validatePassword(password);
    if (pwErr) { toast.error(pwErr); return; }
    if (password !== confirm) { toast.error("Passwords do not match."); return; }

    setLoading(true);
    const { error: sbError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (sbError) { toast.error(sbError.message); return; }

    await supabase.auth.signOut();
    toast.success("Password updated. Redirecting…");
    setTimeout(() => router.push("/Auth"), 1800);
  };

  return (
    <div className="auth-scene">
      <div className="auth-card" >
        <div className="panel-brand">
          <span className="pdiamond pd1" />
          <span className="pdiamond pd2" />
          <span className="pdiamond pd3" />
          <div className="panel-content">
            <h2 className="panel-title">Almost there.</h2>
            <p className="panel-sub">Set a strong new password to secure your account.</p>
          </div>
        </div>

        <div className="panel-form">
          <h1 className="form-title">New Password</h1>

          {!ready ? (
            <div className="verify-state">
              <div className="verify-spinner" />
              Verifying reset link…
            </div>
          ) : (
            <>
              <p className="reset-info">
                Choose a password with uppercase, lowercase, number, and special character.
              </p>

              <div className="fields-single">
                <div className="field-wrap">
                  <div className="input-row">
                    <LockIcon />
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="New password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button type="button" className="eye-btn"
                      onClick={() => setShowPw(v => !v)}
                      aria-label={showPw ? "Hide" : "Show"}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                        width="18" height="18">
                        {showPw
                          ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                          : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
                        }
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="field-wrap">
                  <div className="input-row">
                    <LockIcon />
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleReset()}
                    />
                  </div>
                </div>
              </div>

              <div className="submit-wrap">
                <button className="submit-btn" onClick={handleReset} disabled={loading}>
                  {loading ? "Updating…" : "Update Password"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}