'use client'
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import "./css/AuthForm.css";
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const supabase = createBrowserSupabaseClient();

const VALIDATORS = {
  username: v =>
    v.trim().length < 3 ? "Username must be at least 3 characters." : null,

  email: v =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
      ? null
      : "Enter a valid email address.",

  password: v => {
    if (v.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(v)) return "Password must contain an uppercase letter.";
    if (!/[a-z]/.test(v)) return "Password must contain a lowercase letter.";
    if (!/[0-9]/.test(v)) return "Password must contain a number.";
    if (!/[^A-Za-z0-9]/.test(v)) return "Password must contain a special character.";
    return null;
  },

  organisationName: v =>
    v.trim().length === 0 ? "Organisation name is required." : null,

  contact: v => {
    const stripped = v.replace(/[\s\-]/g, "");
    return /^\+?[0-9]{7,15}$/.test(stripped)
      ? null
      : "Enter a valid phone number (7–15 digits).";
  },

  ward: () => null, // optional — always passes
};

function validateSignup(fields) {
  const errors = {};
  for (const key of [ "username", "email", "password", "organisationName", "contact", "ward" ]) {
    const err = VALIDATORS[ key ]?.(fields[ key ] ?? "");
    if (err) errors[ key ] = err;
  }
  return errors;
}

function validateLogin(fields) {
  const errors = {};
  if (!fields.username.trim()) errors.username = "Username is required.";
  if (!fields.password) errors.password = "Password is required.";
  return errors;
}

/* ── SVG icon helper ── */
const Icon = ({ d }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="input-icon"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const icons = {
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  lock: "M17 11V7a5 5 0 0 0-10 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 0l8 8 8-8",
  building: "M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  map: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z",
};

/* ── Single field — controlled ── */
const Field = ({ icon, placeholder, type = "text", hint, fullWidth = false, value, onChange, name, error }) => {
  const [ showPassword, setShowPassword ] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={`field-wrap${fullWidth ? " field-full" : ""}${error ? " field-error" : ""}`}>
      <div className="input-row">
        <Icon d={icons[ icon ]} />
        <input
          type={inputType}
          placeholder={placeholder}
          autoComplete="off"
          name={name}
          value={value}
          onChange={onChange}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="eye-btn"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <EyeIcon open={showPassword} />
          </button>
        )}
      </div>
      {error && <span className="field-hint error-msg" id={`${name}-error`} role="alert">{error}</span>}
      {!error && hint && <span className="field-hint">{hint}</span>}
    </div>
  );
};
/* ── Sign Up: 2-column grid ── */
const SignUpFields = ({ values, onChange, errors }) => (
  <div className="fields-grid">
    <Field icon="user" name="username" placeholder="Username" value={values.username} onChange={onChange} error={errors.username} />
    <Field icon="lock" name="password" placeholder="Password" value={values.password} onChange={onChange} type="password" error={errors.password} />
    <Field icon="mail" name="email" placeholder="Email" value={values.email} onChange={onChange} error={errors.email} />
    <Field icon="building" name="organisationName" placeholder="Organisation Name" value={values.organisationName} onChange={onChange} error={errors.organisationName} />
    <Field icon="phone" name="contact" placeholder="Contact" value={values.contact} onChange={onChange} error={errors.contact} />
    <Field
      icon="map"
      name="ward"
      placeholder="Ward (optional)"
      value={values.ward}
      onChange={onChange}
      hint="Providing your ward helps our algorithms match you faster to relevant search results."
      fullWidth
      error={errors.ward}
    />
  </div>
);

/* ── Log In: single column ── */
const LogInFields = ({ values, onChange, errors }) => (
  <div className="fields-single">
    <Field icon="user" name="username" placeholder="Username" value={values.username} onChange={onChange} error={errors.username} />
    <Field icon="lock" name="password" placeholder="Password" value={values.password} onChange={onChange} type="password" error={errors.password} />
  </div>
);
const EyeIcon = ({ open }) => (
  <svg
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    width="18" height="18" aria-hidden="true"
  >
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

/* ── Field state shapes ── */
const SIGNUP_INIT = { username: "", password: "", email: "", organisationName: "", contact: "", ward: "" };
const LOGIN_INIT = { username: "", password: "" };

/* ── Root component ── */
export default function AuthForm() {
  const [ mode, setMode ] = useState("signup"); // "signup" | "login"
  const router = useRouter();
  const isSignup = mode === "signup";

  const [ signupFields, setSignupFields ] = useState(SIGNUP_INIT);
  const [ loginFields, setLoginFields ] = useState(LOGIN_INIT);

  const [ fieldErrors, setFieldErrors ] = useState({});
  const [ error, setError ] = useState(null);
  const [ loading, setLoading ] = useState(false);

  const toggleMode = useCallback(() => {
    setMode(m => m === "signup" ? "login" : "signup");
    setError(null);
    setFieldErrors({});
  }, []);

  const handleSignupChange = useCallback(e => {
    const { name, value } = e.target;
    setSignupFields(prev => ({ ...prev, [ name ]: value }));
    // Clear the per-field error as soon as user edits it
    setFieldErrors(prev => ({ ...prev, [ name ]: null }));
  }, []);

  const handleLoginChange = useCallback(e => {
    const { name, value } = e.target;
    setLoginFields(prev => ({ ...prev, [ name ]: value }));
    setFieldErrors(prev => ({ ...prev, [ name ]: null }));
  }, []);

  const handleSubmit = async () => {
    setError(null);

    // Run validation
    const errors = isSignup
      ? validateSignup(signupFields)
      : validateLogin(loginFields);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return; // Block submission
    }

    setFieldErrors({});
    setLoading(true);

    const endpoint = "/api/auth";
    const body = isSignup
      ? { mode: "signup", ...signupFields }
      : { mode: "login", ...loginFields };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      if (isSignup) {
        setSignupFields(SIGNUP_INIT);
        setMode("login");
        setError(null);
        setFieldErrors({});
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: loginFields.password,
        });

        if (signInError) {
          setError("Invalid username or password.");
          return;
        }

        router.push(data.role === "admin" ? "/Admin" : "/Lister");
      }

    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-scene">
      <div className="auth-card">

        {/* LEFT BRAND PANEL */}
        <div className="panel-brand">
          <span className="pdiamond pd1" />
          <span className="pdiamond pd2" />
          <span className="pdiamond pd3" />

          <div className="panel-content">
            <h2 className="panel-title">
              {isSignup ? "Welcome Back!" : "New Here?"}
            </h2>
            <p className="panel-sub">
              {isSignup
                ? "Already have an account? Sign in with your credentials."
                : "Create an account to get started and access all features."}
            </p>
            <button className="panel-btn" onClick={toggleMode}>
              {isSignup ? "Log In" : "Sign Up"}
            </button>
          </div>
        </div>

        {/* RIGHT FORM PANEL — key forces remount → replays CSS animation */}
        <div className="panel-form" key={mode}>
          <h1 className="form-title">
            {isSignup ? "Create Account" : "Log In"}
          </h1>

          {isSignup
            ? <SignUpFields values={signupFields} onChange={handleSignupChange} errors={fieldErrors} />
            : <LogInFields values={loginFields} onChange={handleLoginChange} errors={fieldErrors} />
          }

          {!isSignup && (
            <div className="forgot-wrap">
              <a href="/forgot-password" className="forgot-link">Forgot password?</a>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="submit-wrap">
            <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? "Please wait…" : isSignup ? "Sign Up" : "Log In"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}