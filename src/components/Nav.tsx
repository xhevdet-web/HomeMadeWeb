import { useEffect, useRef, useState } from "react";
import { unreadCount } from "../api/notifications";
import { useAuth } from "../auth/AuthContext";
import { initialsOf } from "../lib/format";
import { navigate, type Route } from "../router";
import { useTheme } from "../theme";
import { Icon } from "./Icon";
import { Logo } from "./Logo";

const PUBLIC_LINKS = [
  { label: "Home", href: "#/", section: "" },
  { label: "Studios", href: "#/studios", section: "studios" },
];
const ACCOUNT_LINKS = [
  { label: "My Designs", href: "#/designs", section: "designs" },
  { label: "Orders", href: "#/orders", section: "orders" },
];

/** Footer and menus: account pages ask to sign in when signed out. */
export const NAV_LINKS = [...PUBLIC_LINKS, ...ACCOUNT_LINKS, { label: "Profile", href: "#/profile", section: "profile" }];

/** Tells the bell to refresh its count (e.g. after marking notifications read). */
export const refreshUnread = () => window.dispatchEvent(new Event("hc:notifications"));

/** The bell badge: polled every 60 s while the tab is visible. */
function useUnreadCount(enabled: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    let controller = new AbortController();
    const load = () => {
      if (document.visibilityState !== "visible") return;
      controller.abort();
      controller = new AbortController();
      unreadCount(controller.signal).then(setCount).catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 60_000);
    document.addEventListener("visibilitychange", load);
    window.addEventListener("hc:notifications", load);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
      window.removeEventListener("hc:notifications", load);
    };
  }, [enabled]);
  return count;
}

const roundButton = "flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary";

export function Nav({ route }: { route: Route }) {
  const isHome = route.segments.length === 0;
  const section = route.segments[0] ?? "";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { status, user, openLogin, signOut } = useAuth();
  const signedIn = status === "signedIn" && !!user;
  const unread = useUnreadCount(signedIn);
  const links = signedIn ? [...PUBLIC_LINKS, ...ACCOUNT_LINKS] : PUBLIC_LINKS;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [route]);

  useEffect(() => {
    if (!accountOpen) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [accountOpen]);

  const doSignOut = async () => {
    setAccountOpen(false);
    setMenuOpen(false);
    await signOut().catch(() => {});
    navigate("#/");
  };

  // Only the homepage has a hero behind the nav; every other page gets the solid style.
  const solid = !isHome || scrolled || menuOpen;

  return (
    <header
      data-theme={solid ? undefined : "dark"}
      className={`fixed inset-x-0 top-0 z-50 border-b text-foreground transition-all duration-500 ${
        solid ? "border-border bg-background/80 backdrop-blur-xl" : "border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-4" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-10 text-sm font-medium md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                aria-current={section === l.section ? "page" : undefined}
                className={`transition-colors hover:text-foreground ${section === l.section ? "text-foreground" : "text-muted-foreground"}`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            className={`${roundButton} hidden sm:flex`}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </button>

          {signedIn ? (
            <>
              <a href="#/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className={`${roundButton} relative`}>
                <Icon name="bell" size={18} />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </a>
              <div ref={accountRef} className="relative">
                <button
                  type="button"
                  aria-label="Account menu"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  onClick={() => setAccountOpen((o) => !o)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary font-display text-sm font-semibold transition-colors hover:border-primary"
                >
                  {initialsOf(user)}
                </button>
                {accountOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card py-2 shadow-glow">
                    <p className="truncate px-4 pt-1 pb-2 text-xs text-muted-foreground">{user.email}</p>
                    {[
                      ["Profile", "#/profile"],
                      ["My Designs", "#/designs"],
                      ["Orders", "#/orders"],
                      ["Notifications", "#/notifications"],
                    ].map(([label, href]) => (
                      <a key={href} role="menuitem" href={href} className="block px-4 py-2.5 text-sm transition-colors hover:bg-secondary">
                        {label}
                      </a>
                    ))}
                    <button type="button" role="menuitem" onClick={() => void doSignOut()} className="block w-full border-t border-border px-4 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-secondary">
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            status === "signedOut" && (
              <button type="button" onClick={() => openLogin()} className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary">
                Sign in
              </button>
            )
          )}

          <a
            href="#/create"
            className="hidden rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:scale-105 lg:inline-block"
          >
            Start creating
          </a>
          <button
            type="button"
            className={`${roundButton} md:hidden`}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name={menuOpen ? "close" : "menu"} size={18} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-border md:hidden">
          <ul className="mx-auto flex max-w-7xl flex-col px-6 py-4">
            {(signedIn ? NAV_LINKS : PUBLIC_LINKS).map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={section === l.section ? "page" : undefined}
                  className={`block border-b border-border py-4 font-display text-2xl font-semibold ${section === l.section ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="border-b border-border py-4">
              <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="flex items-center gap-3 text-muted-foreground">
                <Icon name={theme === "dark" ? "sun" : "moon"} size={18} /> {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            </li>
            <li className="flex flex-col gap-3 pt-6 pb-2">
              <a href="#/create" className="block rounded-full bg-primary px-7 py-3.5 text-center font-semibold text-primary-foreground">
                Start creating
              </a>
              {signedIn && (
                <button type="button" onClick={() => void doSignOut()} className="rounded-full border border-border px-7 py-3.5 font-semibold text-destructive">
                  Sign out
                </button>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
