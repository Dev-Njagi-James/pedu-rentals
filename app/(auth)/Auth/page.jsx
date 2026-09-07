"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSignUp, useSignIn } from "@clerk/nextjs/legacy";
import { useUser } from "@clerk/nextjs";
import "./css/AuthForm.css";
import "./css/AuthForm.v2.css";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const supabase = createBrowserSupabaseClient();

// ─────────────────────────────────────────────────────────
// PARKED — legacy username/password validation.
// Not deleted. Reference for future Clerk wiring.
// ─────────────────────────────────────────────────────────
// function validateLegacyLogin(fields) {
//   const errors = {};
//
//   if (!fields.username.trim()) {
//     errors.username = 'Username is required.';
//   }
//
//   if (!fields.password) {
//     errors.password = 'Password is required.';
//   }
//
//   return errors;
// }

function validateEmail(email) {
  const trimmed = email.trim();
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!trimmed) {
    return "Email is required.";
  }

  if (!EMAIL_RE.test(trimmed)) {
    return "Enter a valid email address.";
  }

  return null;
}

function validateCode(code) {
  const trimmed = code.trim();

  if (!trimmed) {
    return "Verification code is required.";
  }

  return null;
}

// ─────────────────────────────────────────────────────────
// PARKED — legacy icon components (username/password panel UI).
// Not deleted. Reference for future Clerk wiring.
// ─────────────────────────────────────────────────────────
// const LockIcon = () => (
//   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="input-icon" aria-hidden="true">
//     <path d="M17 11V7a5 5 0 0 0-10 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" />
//   </svg>
// );
//
// const UserIcon = () => (
//   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="input-icon" aria-hidden="true">
//     <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
//   </svg>
// );
//
// const EyeIcon = ({ open }) => (
//   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
//     {open ? (
//       <>
//         <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
//         <circle cx="12" cy="12" r="3" />
//       </>
//     ) : (
//       <>
//         <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
//         <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
//         <line x1="1" y1="1" x2="23" y2="23" />
//       </>
//     )}
//   </svg>
// );

const MailIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="input-icon"
    aria-hidden="true">
    <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 0l8 8 8-8" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 5.04c1.62 0 3.06.56 4.2 1.66l3.12-3.12C17.46 1.8 14.96.75 12 .75 7.7.75 3.99 3.22 2.18 6.81l3.64 2.83C6.71 7.03 9.14 5.04 12 5.04z"
    />
    <path
      fill="#4285F4"
      d="M23.25 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.68 2.86c2.15-1.99 3.5-4.92 3.5-8.68z"
    />
    <path
      fill="#FBBC05"
      d="M5.82 14.36c-.25-.74-.39-1.53-.39-2.36s.14-1.62.39-2.36L2.18 6.81C1.43 8.33 1 10.04 1 11.88s.43 3.55 1.18 5.07l3.64-2.59z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.68-2.86c-1.02.69-2.36 1.09-3.6 1.09-2.86 0-5.29-1.93-6.18-4.55l-3.64 2.83C3.99 20.55 7.7 23 12 23z"
    />
  </svg>
);

function Field({
  icon: IconComp,
  name,
  placeholder,
  type = "text",
  value,
  onChange,
  error,
}) {
  return (
    <div className={`field-wrap${error ? " field-error" : ""}`}>
      <div className="input-row">
        <IconComp />
        <input
          type={type}
          placeholder={placeholder}
          autoComplete={name === "code" ? "one-time-code" : "email"}
          name={name}
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      </div>
      {error && (
        <span
          className="field-hint error-msg"
          id={`${name}-error`}
          role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

const COPY = {
  login: {
    title: "Welcome back. Your listings are waiting.",
    subtitle:
      "Log in to manage your properties, track inquiries, and keep your listings active.",
    submitLabel: "Log In",
    toggleQuestion: "Don't have an account?",
    toggleAction: "Create Account",
  },
  signup: {
    title: "Post your property. Start receiving inquiries.",
    subtitle:
      "You're steps away from meeting your first tenant. Let's get your property listed.",
    submitLabel: "Sign Up",
    toggleQuestion: "Already have an account?",
    toggleAction: "Log In",
  },
};

const RESEND_COOLDOWN_SECONDS = 30;

export default function AuthForm() {
  const router = useRouter();

  const {
    isLoaded: signUpLoaded,
    signUp,
    setActive: setActiveFromSignUp,
  } = useSignUp();
  const {
    isLoaded: signInLoaded,
    signIn,
    setActive: setActiveFromSignIn,
  } = useSignIn();
  const { user } = useUser();

  const [topTab, setTopTab] = useState("login");

  // ───────────────────────────────────────────────────────
  // PARKED — legacy sub-mode / fields state. Not deleted.
  // ───────────────────────────────────────────────────────
  // const [loginSubMode, setLoginSubMode] = useState('legacy');
  // const [loginFields, setLoginFields] = useState({ username: '', password: '' });

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(null);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Needed to re-issue signin.prepareFirstFactor on resend.
  const [emailFactorId, setEmailFactorId] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const toggleTopTab = useCallback(() => {
    setTopTab((value) => (value === "login" ? "signup" : "login"));
    setError(null);
    setEmailError(null);
    setCodeError(null);
    setPendingVerification(false);
    setCode("");
    setEmailFactorId(null);
    setResendCooldown(0);
  }, []);

  const handleEmailChange = useCallback((event) => {
    setEmail(event.target.value);
    setEmailError(null);
  }, []);

  const handleCodeChange = useCallback((event) => {
    setCode(event.target.value);
    setCodeError(null);
  }, []);

  // ───────────────────────────────────────────────────────
  // PARKED — legacy handleSubmit (username/password → /api/auth
  // → supabase.auth.signInWithPassword → role-based route).
  // Not deleted. Reference for future Clerk wiring.
  // ───────────────────────────────────────────────────────
  // const handleSubmit = async (event) => {
  //   event.preventDefault();
  //
  //   if (!(topTab === 'login' && loginSubMode === 'legacy')) return;
  //
  //   setError(null);
  //   const errors = validateLegacyLogin(loginFields);
  //
  //   if (Object.keys(errors).length > 0) {
  //     setFieldErrors(errors);
  //     return;
  //   }
  //
  //   setFieldErrors({});
  //   setLoading(true);
  //
  //   try {
  //     const response = await fetch('/api/auth', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ mode: 'login', ...loginFields }),
  //     });
  //     const data = await response.json();
  //
  //     if (!response.ok) {
  //       setError(data.error ?? 'Something went wrong.');
  //       return;
  //     }
  //
  //     const { error: signInError } = await supabase.auth.signInWithPassword({
  //       email: data.email,
  //       password: loginFields.password,
  //     });
  //
  //     if (signInError) {
  //       setError('Invalid username or password.');
  //       return;
  //     }
  //
  //     router.push(data.role === 'admin' ? '/Admin' : '/Lister');
  //   } catch {
  //     setError('Network error. Please try again.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("SUBMIT FIRED");
    console.log("topTab:", topTab);
    console.log("email:", email);
    console.log("signUpLoaded:", signUpLoaded);
    console.log("signInLoaded:", signInLoaded);

    setError(null);

    const validationError = validateEmail(email);

    if (validationError) {
      console.log("VALIDATION ERROR:", validationError);
      setEmailError(validationError);
      return;
    }

    setEmailError(null);
    setLoading(true);

    try {
      if (topTab === "signup") {
        console.log("STARTING CLERK SIGNUP");

        if (!signUpLoaded) {
          throw new Error("Clerk SignUp is not loaded yet.");
        }

        const result = await signUp.create({
          emailAddress: email.trim(),
        });

        console.log("SIGNUP CREATED:", result);

        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });

        console.log("VERIFICATION EMAIL PREPARED");

        setPendingVerification(true);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        console.log("STARTING CLERK SIGNIN");

        if (!signInLoaded) {
          throw new Error("Clerk SignIn is not loaded yet.");
        }

        const attempt = await signIn.create({
          identifier: email.trim(),
        });

        console.log("SIGNIN CREATED:", attempt);

        const emailFactor = attempt.supportedFirstFactors?.find(
          (factor) => factor.strategy === "email_code",
        );

        if (!emailFactor) {
          throw new Error(
            "Email code sign-in is not available for this account.",
          );
        }

        setEmailFactorId(emailFactor.emailAddressId);

        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        });

        console.log("SIGNIN VERIFICATION PREPARED");

        setPendingVerification(true);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch (err) {
      console.error("CLERK AUTH ERROR:", err);

      setError(
        err?.errors?.[0]?.longMessage ??
          err?.errors?.[0]?.message ??
          err?.message ??
          "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    setError(null);

    const validationError = validateCode(code);
    if (validationError) {
      setCodeError(validationError);
      return;
    }

    setCodeError(null);
    setLoading(true);

    try {
      if (topTab === "signup") {
        if (!signUpLoaded) return;

        const result = await signUp.attemptEmailAddressVerification({
          code: code.trim(),
        });

        if (result.status !== "complete") {
          setError("Verification incomplete. Please try again.");
          return;
        }

        await setActiveFromSignUp({ session: result.createdSessionId });

        const syncResponse = await fetch("/api/v1/auth/sync", {
          method: "POST",
        });

        if (!syncResponse.ok) {
          setError("Account sync failed. Contact support.");
          return;
        }

        await user?.reload();
        router.push("/Lister");
      } else {
        if (!signInLoaded) return;

        const result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code: code.trim(),
        });

        if (result.status !== "complete") {
          setError("Verification incomplete. Please try again.");
          return;
        }

        await setActiveFromSignIn({ session: result.createdSessionId });

        const syncResponse = await fetch("/api/v1/auth/sync", {
          method: "POST",
        });

        if (!syncResponse.ok) {
          setError("Account sync failed. Contact support.");
          return;
        }

        await user?.reload();
        router.push("/Lister");
      }
    } catch (err) {
      setError(err?.errors?.[0]?.message ?? "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;

    setError(null);
    setCodeError(null);
    setLoading(true);

    try {
      if (topTab === "signup") {
        if (!signUpLoaded) return;

        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
      } else {
        if (!signInLoaded || !emailFactorId) {
          throw new Error("Session expired. Restart sign in.");
        }

        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailFactorId,
        });
      }

      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(
        err?.errors?.[0]?.longMessage ??
          err?.errors?.[0]?.message ??
          err?.message ??
          "Could not resend code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setError(null);

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      "",
      "clerk-oauth",
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    const run = async () => {
      try {
        if (topTab === "signup") {
          if (!signUpLoaded) throw new Error("Clerk SignUp is not loaded yet.");

          await signUp.authenticateWithPopup({
            strategy: "oauth_google",
            redirectUrl: `${window.location.origin}/sso-callback`,
            redirectUrlComplete: `${window.location.origin}/sso-callback`,
            popup,
          });
        } else {
          if (!signInLoaded) throw new Error("Clerk SignIn is not loaded yet.");

          await signIn.authenticateWithPopup({
            strategy: "oauth_google",
            redirectUrl: `${window.location.origin}/sso-callback`,
            redirectUrlComplete: `${window.location.origin}/sso-callback`,
            popup,
          });
        }
      } catch (err) {
        setError(
          err?.errors?.[0]?.longMessage ??
            err?.errors?.[0]?.message ??
            err?.message ??
            "Google sign-in failed.",
        );
      }
    };

    run();
  };

  const copy = COPY[topTab];

  return (
    <main className="auth-scene-v2">
      <div className="auth-card-v2">
        <div className="photo-panel">
          <img
            src="/auth/login-building.png"
            alt=""
            className="photo-panel-img"
          />
        </div>

        <section className="form-panel-v2">
          <div className="form-content-v2">
            <div className="form-header-v2">
              <img
                src="/logo2.png"
                alt="Pedu Rentals"
                className="form-logo-v2"
              />
              <a href="/" className="back-link-v2">
                Back →
              </a>
            </div>
            <div className="auth-login-panel">
              {pendingVerification ? (
                <>
                  <h1 className="form-title-v2">Check your email</h1>
                  <p className="form-sub-v2">
                    We sent a verification code to {email.trim()}. Enter it
                    below to continue.
                  </p>

                  <form
                    className="login-form-v2"
                    onSubmit={handleVerifyCode}
                    noValidate>
                    <Field
                      icon={MailIcon}
                      name="code"
                      placeholder="Verification code"
                      type="text"
                      value={code}
                      onChange={handleCodeChange}
                      error={codeError}
                    />

                    {error && (
                      <p className="form-error-v2" role="alert">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="submit-btn-v2"
                      disabled={loading}>
                      {loading ? "Please wait…" : "Verify"}
                      <span aria-hidden="true">→</span>
                    </button>

                    <button
                      type="button"
                      className="toggle-link"
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || loading}>
                      {resendCooldown > 0
                        ? `Resend code (${resendCooldown}s)`
                        : "Resend code"}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <h1 className="form-title-v2">{copy.title}</h1>
                  <p className="form-sub-v2">{copy.subtitle}</p>

                  <form
                    className="login-form-v2"
                    onSubmit={handleSubmit}
                    noValidate>
                    <button
                      type="button"
                      disabled
                      className="google-btn-v2"
                      onClick={handleGoogleAuth}>
                      <GoogleIcon /> Continue with Google
                    </button>
                    <div className="or-divider-v2">Or</div>
                    <Field
                      icon={MailIcon}
                      name="email"
                      placeholder="Email"
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      error={emailError}
                    />

                    {error && (
                      <p className="form-error-v2" role="alert">
                        {error}
                      </p>
                    )}

                    <div id="clerk-captcha" />

                    <button
                      type="submit"
                      className="submit-btn-v2"
                      disabled={loading}>
                      {loading ? "Please wait…" : copy.submitLabel}
                      <span aria-hidden="true">→</span>
                    </button>
                  </form>
                </>
              )}
            </div>

            {!pendingVerification && (
              <p className="toggle-line">
                {copy.toggleQuestion}{" "}
                <button
                  type="button"
                  className="toggle-link"
                  onClick={toggleTopTab}>
                  {copy.toggleAction}
                </button>
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
