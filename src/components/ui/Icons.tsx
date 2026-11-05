import type { ReactNode, SVGProps } from 'react';

/**
 * Small line icons (24×24, stroke = currentColor). Used instead of emoji so
 * they look the same on every phone and match the site's colours.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Rice bowl with steam and chopsticks. */
export function BowlIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 12h17a8.5 8.5 0 0 1-17 0Z" />
      <path d="M9 20.5h6" />
      <path d="M8.5 8.5c0-1 1-1.5 1-2.5s-1-1.5-1-2.5" />
      <path d="M12 8.5c0-1 1-1.5 1-2.5s-1-1.5-1-2.5" />
      <path d="m15.5 9 5-6.5" />
      <path d="m17.5 9.5 4.5-5" />
    </Svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
      <path d="M4 3.5V8h4.5" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
      <path d="M20 20.5V16h-4.5" />
    </Svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </Svg>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 3.5h2.2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1l1.8-7.3H6" />
      <circle cx="9.5" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

/** Brand mark: bowl icon on a rounded tile. */
export function LogoMark({ className = '', size = 32 }: { className?: string; size?: number }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-[#9B6035] text-white ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <BowlIcon size={Math.round(size * 0.62)} />
    </span>
  );
}
