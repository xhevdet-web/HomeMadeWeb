import { Logo } from "./Logo";
import { NAV_LINKS } from "./Nav";

export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 sm:flex-row sm:items-center">
        <Logo />
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} HomeCreator. Handmade with care.
        </p>
      </div>
    </footer>
  );
}
