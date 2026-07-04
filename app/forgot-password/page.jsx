'use client'
import { useState } from "react";
import { toast } from "sonner";
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import "../AuthForm.css";

const supabase = createBrowserSupabaseClient();

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }
    setLoading(true);
    const { error: sbError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (sbError) {
      toast.error(sbError.message);
      return;
    }
    toast.success("Reset link sent. Check your inbox.");
  };

  return (
    <div className="auth-scene">
      <div className="auth-card">
        <div className="panel-brand">
          <span className="pdiamond pd1" />
          <span className="pdiamond pd2" />
          <span className="pdiamond pd3" />
          <div className="panel-content">
            <h2 className="panel-title">Remember now?</h2>
            <p className="panel-sub">Head back and sign in with your credentials.</p>
            <a href="/Auth" className="panel-btn" style={{ display: "inline-block", textDecoration: "none" }}>
              Log In
            </a>
          </div>
        </div>

        <div className="panel-form">
          <h1 className="form-title">Reset Password</h1>
          <p className="reset-info">
            Enter the email tied to your account. We'll send a password reset link.
          </p>

          <div className="fields-single">
            <div className="field-wrap">
              <div className="input-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className="input-icon" aria-hidden="true">
                  <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 0l8 8 8-8" />
                </svg>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />
              </div>
            </div>
          </div>

          <div className="submit-wrap">
            <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </div>

          <div className="back-link-wrap">
            <a href="/Auth" className="forgot-link">Back to login</a>
          </div>
        </div>
      </div>
    </div>
  );
}