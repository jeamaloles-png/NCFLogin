import type { ReactNode } from "react";
import { ArrowUpRight, Gamepad2, ShieldCheck } from "lucide-react";

type AuthShellProps = {
  children: ReactNode;
  mode: "login" | "register";
};

export function AuthShell({ children, mode }: AuthShellProps) {
  const isLogin = mode === "login";

  return (
    <main className="auth-shell">
      <section className="auth-hero" aria-label="Naga College Foundation">
        <div className="auth-hero-orbit auth-hero-orbit-one" />
        <div className="auth-hero-orbit auth-hero-orbit-two" />
        <div className="auth-brand">
          <div className="auth-brand-mark" aria-hidden="true">NCF</div>
          <div>
            <p className="auth-brand-name">Naga College Foundation</p>
            <p className="auth-brand-subtitle">NCF GAME HUB</p>
          </div>
        </div>

        <div className="auth-hero-copy">
          <p className="auth-kicker"><span /> YOUR CAMPUS. YOUR ARENA.</p>
          <h1>Queue up for<br />what comes next.</h1>
          <p className="auth-hero-description">
            Keep your League of Legends and VALORANT identities together in one place.
          </p>
          <div className="auth-hero-rule" />
          <div className="auth-promise">
            <span className="auth-promise-icon"><Gamepad2 size={19} /></span>
            <div>
              <p>One hub. Every main.</p>
              <span>Your player profile, ready when you are.</span>
            </div>
            <ArrowUpRight className="auth-promise-arrow" size={18} />
          </div>
        </div>

        <div className="auth-hero-footer">
          <span>NAGA CITY, PHILIPPINES</span>
          <span>EST. 1947</span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-mobile-brand">
          <div className="auth-brand-mark" aria-hidden="true">NCF</div>
          <div>
            <p className="auth-brand-name">Naga College Foundation</p>
            <p className="auth-brand-subtitle">NCF GAME HUB</p>
          </div>
        </div>
        <div className="auth-form-wrap">
          <div className="auth-form-heading">
            <span className="auth-form-icon">
              {isLogin ? <ShieldCheck size={19} /> : <Gamepad2 size={20} />}
            </span>
            <p>{isLogin ? "PLAYER ACCESS" : "CREATE YOUR PLAYER PROFILE"}</p>
          </div>
          {children}
          <p className="auth-form-note">
            <span /> Queue up. Keep your accounts together.
          </p>
        </div>
        <footer className="auth-bottomline">
          <span>© Naga College Foundation</span>
          <span>PLAYER PORTAL</span>
        </footer>
      </section>
    </main>
  );
}
