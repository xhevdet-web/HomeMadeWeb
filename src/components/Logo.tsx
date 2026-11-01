export function Logo() {
  return (
    <a href="#/" className="flex items-center gap-2.5" aria-label="HomeCreator home">
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
        aria-hidden="true"
      >
        <path d="M3 13 14 4l11 9" />
        <path d="M6 11v13h16V11" />
        <path d="M11.5 24v-7h5v7" />
      </svg>
      <span className="font-display text-xl font-semibold tracking-tight">
        Home<em className="font-normal text-primary">Creator</em>
      </span>
    </a>
  );
}
