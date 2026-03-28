// Reusable UI style constants using design tokens

export const UI = {
  card: "rounded-2xl border border-[var(--color-border)] bg-white shadow-sm",
  cardElevated: "rounded-2xl border border-[var(--color-border)] bg-white shadow-md",
  notice: "flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-3 shadow-sm",
  buttonPrimary: "rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer bg-[var(--color-primary)] text-white hover:opacity-90",
  buttonSecondary: "rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]/80",
  buttonAccent: "rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer bg-[var(--color-accent)] text-[var(--color-text-primary)] hover:opacity-90",
  buttonGhost: "rounded-md border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-xs font-semibold cursor-pointer text-[var(--color-text-muted)]",
  input: "w-full rounded-xl px-4 py-2 border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]",
};
