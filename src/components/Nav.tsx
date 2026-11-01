import { useEffect, useState } from "react";
import { initials, user } from "../data/mock";
import type { Route } from "../router";
import { Icon } from "./Icon";
import { Logo } from "./Logo";

export const NAV_LINKS = [
  { label: "Studios", href: "#/studios", section: "studios" },
  { label: "My Designs", href: "#/designs", section: "designs" },
  { label: "Orders", href: "#/orders", section: "orders" },
  { label: "Profile", href: "#/profile", section: "profile" },
];

export function Nav({ route }: { route: Route }) {
  const isHome = route.segments.length === 0;
  const section = route.segments[0];
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [route]);

  // Only the homepage has a hero behind the nav; every other page gets the solid style.
  const solid = !isHome || scrolled || menuOpen;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-500 ${
        solid ? "border-border bg-background/80 backdrop-blur-xl" : "border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-10 text-sm font-medium md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                aria-current={section === l.section ? "page" : undefined}
                className={`transition-colors hover:text-foreground ${
                  section === l.section ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <a
            href="#/profile"
            aria-label="Profile"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary font-display text-sm font-semibold transition-colors hover:border-primary"
          >
            {initials(user)}
          </a>
          <a
            href="#/create"
            className="hidden rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:scale-105 sm:inline-block"
          >
            Start creating
          </a>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary md:hidden"
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
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={section === l.section ? "page" : undefined}
                  className={`block border-b border-border py-4 font-display text-2xl font-semibold ${
                    section === l.section ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="pt-6 pb-2">
              <a
                href="#/create"
                className="block rounded-full bg-primary px-7 py-3.5 text-center font-semibold text-primary-foreground"
              >
                Start creating
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
