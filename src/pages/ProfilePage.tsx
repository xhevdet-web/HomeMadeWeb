import { useState, type ReactNode } from "react";
import { Button } from "../components/Button";
import { Toggle, inputClass } from "../components/Controls";
import { Icon, type IconName } from "../components/Icon";
import { SectionLabel } from "../components/Page";
import { initials, user } from "../data/mock";

const rise = (delay: number) => ({ animationDelay: `${delay}ms` });

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("English");

  return (
    <div className="mx-auto max-w-7xl px-6 pt-32 pb-24">
      <p className="eyebrow animate-rise" style={rise(0)}>
        Profile
      </p>
      <h1 className="animate-rise mt-5 font-display text-5xl leading-[1.02] font-semibold tracking-tight sm:text-6xl" style={rise(150)}>
        Hello, <em className="font-normal text-primary">{user.firstName}.</em>
      </h1>

      <div className="mt-12 grid items-start gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Profile card */}
        <aside className="animate-rise rounded-[2rem] border border-border bg-card p-8 lg:sticky lg:top-28" style={rise(300)}>
          <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary font-display text-xl font-bold text-primary-foreground">
            {initials(user)}
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold">
            {user.firstName} {user.lastName}
          </h2>
          <p className="mt-2 text-muted-foreground">{user.email}</p>
          <p className="text-muted-foreground">@{user.userName}</p>
          <Button variant="secondary" size="sm" className="mt-6" aria-expanded={editing} onClick={() => setEditing((e) => !e)}>
            <Icon name="pencil" size={15} /> {editing ? "Close editor" : "Edit details"}
          </Button>
        </aside>

        <div className="animate-rise flex min-w-0 flex-col gap-8" style={rise(450)}>
          {/* Conditional notice */}
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Conditional state · shown when phone or address is missing
            </p>
            <div className="flex items-start gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-5">
              <Icon name="alert" className="mt-0.5 text-primary" />
              <p className="flex-1">Add your phone and address so you can order in one tap.</p>
              <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold whitespace-nowrap text-primary hover:underline">
                Add now
              </button>
            </div>
          </div>

          {editing && <DetailsForm onSave={() => setEditing(false)} />}

          <Group title="Account">
            <Row icon="user" title="Personal details" subtitle={user.phone} onClick={() => setEditing(true)} />
            <Row
              icon="mapPin"
              title="Delivery address"
              subtitle={`${user.address.street}, ${user.address.postalCode}, ${user.address.country}`}
              onClick={() => setEditing(true)}
            />
            <Row icon="lock" title="Change password" />
          </Group>

          <Group title="My activity">
            <Row icon="layers" title="My Designs" href="#/designs" />
            <Row icon="package" title="My Orders" href="#/orders" />
          </Group>

          <Group title="Preferences">
            <Row icon="moon" title="Dark mode" trailing={<Toggle checked={darkMode} onChange={setDarkMode} label="Dark mode" />} />
            <Row
              icon="bell"
              title="Notifications"
              subtitle="Order updates and news"
              trailing={<Toggle checked={notifications} onChange={setNotifications} label="Notifications" />}
            />
            <Row
              icon="globe"
              title="Language"
              trailing={
                <>
                  <label htmlFor="language" className="sr-only">
                    Language
                  </label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground focus:border-primary focus:outline-none"
                  >
                    <option>English</option>
                    <option>Shqip</option>
                  </select>
                </>
              }
            />
          </Group>

          <Group title="Support">
            <Row icon="help" title="Help & FAQ" />
            <Row icon="mail" title="Contact us" />
            <Row icon="file" title="Terms of service" />
            <Row icon="shield" title="Privacy policy" />
          </Group>

          <Group title="Session">
            <Row icon="logout" title="Sign out" danger />
          </Group>

          <p className="text-center text-sm text-muted-foreground">HomeCreator · Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Settings rows ---------------- */

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <SectionLabel as="h2">{title}</SectionLabel>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{children}</ul>
    </section>
  );
}

function Row({ icon, title, subtitle, href, onClick, trailing, danger }: {
  icon: IconName;
  title: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  danger?: boolean;
}) {
  const content = (
    <>
      <span
        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${
          danger ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
        }`}
      >
        <Icon name={icon} size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold ${danger ? "text-destructive" : ""}`}>{title}</span>
        {subtitle && <span className="block truncate text-sm text-muted-foreground">{subtitle}</span>}
      </span>
      {!trailing && !danger && <Icon name="chevronRight" size={18} className="text-muted-foreground" />}
    </>
  );
  const rowClass = "flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/50";

  return (
    <li>
      {trailing ? (
        <div className="flex items-center gap-4 px-5 py-4">
          {content}
          {trailing}
        </div>
      ) : href ? (
        <a href={href} className={rowClass}>
          {content}
        </a>
      ) : (
        <button type="button" onClick={onClick} className={rowClass}>
          {content}
        </button>
      )}
    </li>
  );
}

/* ---------------- Personal details form ---------------- */

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}

function DetailsForm({ onSave }: { onSave: () => void }) {
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <SectionLabel as="h2">Personal information</SectionLabel>
        <div className="mt-2 grid gap-5 sm:grid-cols-2">
          <Field id="first-name" label="First name">
            <input id="first-name" defaultValue={user.firstName} autoComplete="given-name" className={inputClass} />
          </Field>
          <Field id="last-name" label="Last name">
            <input id="last-name" defaultValue={user.lastName} autoComplete="family-name" className={inputClass} />
          </Field>
          <Field id="phone" label="Phone">
            <input id="phone" type="tel" defaultValue={user.phone} autoComplete="tel" className={inputClass} />
          </Field>
          <Field id="email" label="Email">
            <input id="email" type="email" value={user.email} readOnly className={`${inputClass} cursor-not-allowed text-muted-foreground`} />
          </Field>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <SectionLabel as="h2">Delivery address</SectionLabel>
        <div className="mt-2 grid gap-5 sm:grid-cols-2">
          <Field id="country" label="Country">
            <select id="country" defaultValue={user.address.country} autoComplete="country-name" className={inputClass}>
              <option>Kosovo</option>
              <option>Albania</option>
              <option>North Macedonia</option>
              <option>Montenegro</option>
            </select>
          </Field>
          <Field id="postal-code" label="Postal code">
            <input id="postal-code" defaultValue={user.address.postalCode} autoComplete="postal-code" className={inputClass} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="address" label="Address">
              <textarea id="address" rows={2} defaultValue={user.address.street} autoComplete="street-address" className={`${inputClass} resize-none`} />
            </Field>
          </div>
        </div>
      </section>

      <div>
        <Button type="submit" glow>
          Save
        </Button>
      </div>
    </form>
  );
}
