import Image from "next/image";
import styles from "./css/design.module.css";

export type AuthTransitionVariant = "callback" | "finalizing";

type AuthTransitionShellProps = {
  variant: AuthTransitionVariant;
  eyebrow: string;
  heading: string;
  description: string;
  status: string;
  statusDetail: string;
};

export default function AuthTransitionShell({
  variant,
  eyebrow,
  heading,
  description,
  status,
  statusDetail,
}: AuthTransitionShellProps) {
  const finalizing = variant === "finalizing";

  return (
    <main
      className={styles.screen}
      aria-label="Pedu Rentals authentication transition">
      <Image
        src="/pedu-site-interior.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className={styles.backgroundImage}
        />
        
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <Image
            className={styles.logo}
            src="/logo2.png"
            alt=""
            width={34}
            height={34}
            priority
          />
          <span>Pedu Rentals</span>
        </div>
        <div className={styles.secureNote}>
          <span className={styles.lock} aria-hidden="true" />
          <span>Secure sign-in</span>
        </div>
      </header>

      <section className={styles.copyPanel}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{heading}</h1>
          <p className={styles.description}>{description}</p>

          {!finalizing && (
            <section
              className={styles.securityCard}
              aria-labelledby="pedu-security-heading">
              <h2 id="pedu-security-heading" className={styles.securityTitle}>
                <span className={styles.shield} aria-hidden="true">
                  ✓
                </span>
                <span>Security check</span>
              </h2>
              <div id="clerk-captcha" className={styles.captchaMount} />
            </section>
          )}

          <div className={styles.progress} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            <span className={styles.progressCopy}>
              <span className={styles.progressTitle}>{status}</span>
              <span className={styles.progressDetail}>{statusDetail}</span>
            </span>
          </div>

          <div className={styles.stepTrack} aria-hidden="true">
            <span>Sign-in</span>
            <i className={`${styles.bar} ${styles.active}`} />
            <i className={`${styles.bar} ${finalizing ? styles.active : ""}`} />
            <i className={styles.bar} />
            <span>Ready</span>
          </div>
        </div>
      </section>
    </main>
  );
}
