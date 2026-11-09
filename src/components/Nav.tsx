import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { unreadCount } from "../api/notifications";
import { useAuth } from "../auth/AuthContext";
import { initialsOf } from "../lib/format";
import { navigate, type Route } from "../router";
// Light mode is switched off for now (see theme.tsx); the toggles below are commented out.
// import { useTheme } from "../theme";
import { Icon, type IconName } from "./Icon";
import { LanguageToggle } from "./LanguageToggle";
import { Logo } from "./Logo";

// Labels are translation keys; the text is translated when the menu renders.
type NavKey = "nav.home" | "nav.products" | "nav.studios" | "nav.about" | "nav.myDesigns" | "nav.orders" | "nav.profile" | "nav.notifications" | "nav.contact";
interface NavLink {
  label: NavKey;
  href: string;
  section?: string;
}

const HOME_LINK: NavLink = { label: "nav.home", href: "#/", section: "" };
const PUBLIC_LINKS: NavLink[] = [
  HOME_LINK,
  { label: "nav.products", href: "#/products", section: "products" },
  { label: "nav.studios", href: "#/studios", section: "studios" },
  { label: "nav.about", href: "#/about", section: "about" },
];
const ACCOUNT_LINKS: NavLink[] = [
  { label: "nav.myDesigns", href: "#/designs", section: "designs" },
  { label: "nav.orders", href: "#/orders", section: "orders" },
];

/** Footer and menus: account pages ask to sign in when signed out. */
export const NAV_LINKS: NavLink[] = [...PUBLIC_LINKS, ...ACCOUNT_LINKS, { label: "nav.profile", href: "#/profile", section: "profile" }];
const CONTACT_LINK: NavLink = { label: "nav.contact", href: "#/contact", section: "contact" };
export const FOOTER_LINKS: NavLink[] = [...NAV_LINKS, CONTACT_LINK];
/** Icons beside each link in the phone menu and the account menu. */
const NAV_ICONS: Record<NavKey, IconName> = {
  "nav.home": "home",
  "nav.products": "bag",
  "nav.studios": "layers",
  "nav.about": "sparkle",
  "nav.myDesigns": "bookmark",
  "nav.orders": "package",
  "nav.profile": "user",
  "nav.notifications": "bell",
  "nav.contact": "mail",
};
const ACCOUNT_MENU: NavLink[] = [
  { label: "nav.profile", href: "#/profile", section: "profile" },
  { label: "nav.myDesigns", href: "#/designs", section: "designs" },
  { label: "nav.orders", href: "#/orders", section: "orders" },
  { label: "nav.notifications", href: "#/notifications", section: "notifications" },
  CONTACT_LINK,
];

/** The shared active look: a soft orange pill with orange text (and a dot where there is room). */
export const activeLink = "bg-primary/10 text-primary";
export const ActiveDot = () => <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />;

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

// Used by the light-mode button, which is commented out for now.
// const roundButton = "flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary";
/** Borderless round button for the header toolbar (bell, menu). */
const iconButton = "relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

export function Nav({ route }: { route: Route }) {
  const { t } = useTranslation();
  const isHome = route.segments.length === 0;
  const section = route.segments[0] ?? "";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  // const { theme, setTheme } = useTheme();
  const { status, user, openLogin, signOut } = useAuth();
  const signedIn = status === "signedIn" && !!user;
  const unread = useUnreadCount(signedIn);
  // Signed in, the bar is full: Contact moves to the account menu (and the mobile menu).
  // The desktop bar leaves out Home (the logo goes there); the phone menu and footer keep it.
  const barLinks = PUBLIC_LINKS.filter((l) => l !== HOME_LINK);
  const links = signedIn ? [...barLinks, ...ACCOUNT_LINKS] : [...barLinks, CONTACT_LINK];
  // The bar shows its links only where they fit (Albanian labels are the longest); the menu button below that.
  const wide = signedIn ? { show: "xl:flex", hide: "xl:hidden" } : { show: "lg:flex", hide: "lg:hidden" };

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
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6" aria-label={t("nav.main")}>
        <Logo variant="header" />
        <ul className={`hidden items-center gap-1 text-sm font-medium ${wide.show}`}>
          {links.map((l) => {
            const active = section === l.section;
            return (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-full px-3.5 py-2 whitespace-nowrap transition-colors ${
                    active ? `${activeLink} font-semibold` : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {active && <ActiveDot />}
                  {t(l.label)}
                </a>
              </li>
            );
          })}
        </ul>
        {/* Toolbar: language | account (or sign in) and the main call to action. One height, few borders. */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <LanguageToggle ghost className="hidden sm:flex" />
          <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-border sm:block" />
          {/* Light mode is off for now. To bring it back, restore this button and useTheme above.
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? t("nav.switchToLight") : t("nav.switchToDark")}
            title={theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
            className={`${roundButton} hidden sm:flex`}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </button>
          */}

          {signedIn ? (
            <>
              <a
                href="#/notifications"
                aria-label={unread ? t("nav.notificationsUnread", { count: unread }) : t("nav.notifications")}
                aria-current={section === "notifications" ? "page" : undefined}
                className={`${iconButton} ${section === "notifications" ? "bg-primary/10 text-primary" : ""}`}
              >
                <Icon name="bell" size={18} />
                {unread > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-primary-foreground ring-2 ring-background">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </a>
              <div ref={accountRef} className="relative">
                <button
                  type="button"
                  aria-label={t("nav.accountMenu")}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  onClick={() => setAccountOpen((o) => !o)}
                  className={`flex h-9 items-center gap-1 rounded-full border p-0.5 transition-colors sm:pr-2 ${
                    accountOpen ? "border-primary/60 bg-secondary" : "border-border hover:border-primary/60 hover:bg-secondary"
                  }`}
                >
                  <span className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-primary text-[11px] font-bold tracking-wide text-primary-foreground">
                    {initialsOf(user)}
                  </span>
                  <Icon name="chevronDown" size={14} className={`hidden text-muted-foreground transition-transform duration-200 sm:block ${accountOpen ? "rotate-180" : ""}`} />
                </button>
                {accountOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-glow">
                    <div className="mb-1 flex items-center gap-3 border-b border-border px-2.5 pt-1.5 pb-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{initialsOf(user)}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{`${user.firstName} ${user.lastName}`.trim() || user.email}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    {ACCOUNT_MENU.map(({ label, href, section: s }) => {
                      const active = section === s;
                      return (
                        <a
                          key={href}
                          role="menuitem"
                          href={href}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
                            active ? `${activeLink} font-semibold` : "text-foreground/85 hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            <Icon name={NAV_ICONS[label]} size={15} />
                          </span>
                          <span className="flex-1">{t(label)}</span>
                          {active && <ActiveDot />}
                        </a>
                      );
                    })}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void doSignOut()}
                      className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-border px-2.5 pt-3 pb-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-secondary"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                        <Icon name="logout" size={15} />
                      </span>
                      {t("nav.signOut")}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            status === "signedOut" && (
              <button
                type="button"
                onClick={() => openLogin()}
                className="flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold text-foreground/90 transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Icon name="user" size={16} className="text-muted-foreground" />
                {t("nav.signIn")}
              </button>
            )
          )}

          <a
            href="#/create"
            className="ml-1.5 hidden h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow transition-transform duration-300 hover:scale-[1.03] lg:inline-flex"
          >
            <Icon name="sparkle" size={15} />
            {t("nav.startCreating")}
          </a>
          <button
            type="button"
            className={`${iconButton} ${wide.hide} ${menuOpen ? "bg-secondary text-foreground" : ""}`}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name={menuOpen ? "close" : "menu"} size={18} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div id="mobile-menu" className={`max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background shadow-2xl ${wide.hide}`}>
          <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 pt-4 pb-2">
            {[...(signedIn ? NAV_LINKS : PUBLIC_LINKS), CONTACT_LINK].map((l) => {
              const active = section === l.section;
              return (
                <li key={l.href}>
                  <a
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-base font-semibold transition-colors ${
                      active ? activeLink : "text-foreground/85 hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Icon name={NAV_ICONS[l.label]} size={16} />
                    </span>
                    <span className="flex-1">{t(l.label)}</span>
                    {active ? (
                      <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                    ) : (
                      <Icon name="chevronRight" size={16} className="text-muted-foreground" />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
          <div className="mx-auto max-w-7xl px-4 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 pt-4 pb-5">
              {/* Light mode is off for now.
              <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                <Icon name={theme === "dark" ? "sun" : "moon"} size={18} /> {theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
              </button>
              */}
              <LanguageToggle label />
            </div>
            <div className="flex flex-col gap-2.5">
              <a href="#/create" className="block rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-primary-foreground shadow-glow">
                {t("nav.startCreating")}
              </a>
              {signedIn && (
                <button type="button" onClick={() => void doSignOut()} className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-secondary">
                  {t("nav.signOut")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
