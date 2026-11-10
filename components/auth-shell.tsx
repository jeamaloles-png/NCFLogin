import type { ReactNode } from "react";
import { ArrowUpRight, BookOpen, GraduationCap, ShieldCheck } from "lucide-react";

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
            <p className="auth-brand-subtitle">STUDENT PORTAL</p>
          </div>
        </div>

        <div className="auth-hero-copy">
          <p className="auth-kicker"><span /> YOUR CAMPUS, CONNECTED</p>
          <h1>Make room for<br />what comes next.</h1>
          <p className="auth-hero-description">
            Sign in to continue your journey with the NCF community.
          </p>
          <div className="auth-hero-rule" />
          <div className="auth-promise">
            <span className="auth-promise-icon"><BookOpen size={19} /></span>
            <div>
              <p>Truth and Wisdom</p>
              <span>A tradition of learning since 1947</span>
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
            <p className="auth-brand-subtitle">STUDENT PORTAL</p>
          </div>
        </div>
        <div className="auth-form-wrap">
          <div className="auth-form-heading">
            <span className="auth-form-icon">
              {isLogin ? <ShieldCheck size={19} /> : <GraduationCap size={20} />}
            </span>
            <p>{isLogin ? "WELCOME BACK" : "JOIN THE NCF COMMUNITY"}</p>
          </div>
          {children}
          <p className="auth-form-note">
            <span /> A place to learn, grow, and move forward.
          </p>
        </div>
        <footer className="auth-bottomline">
          <span>© Naga College Foundation</span>
          <span>TRUTH AND WISDOM</span>
        </footer>
      </section>
    </main>
  );
}
