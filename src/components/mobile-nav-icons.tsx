import type { ReactNode } from "react";

function Icon({
  children,
  className = "h-6 w-6",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Compact tab icons for bottom navigation (stroke, currentColor). */
export function NavTabIcon({ href }: { href: string }): ReactNode {
  const p = href;
  if (p === "/retail" || p.endsWith("/dashboard")) {
    return (
      <Icon>
        <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z" />
      </Icon>
    );
  }
  if (p.includes("/place-order")) {
    return (
      <Icon>
        <path d="M6 8h15l-1.5 9h-12z" />
        <path d="M6 8 5 3H2" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </Icon>
    );
  }
  if (p.includes("/deliveries") || p.includes("/to-deliver")) {
    return (
      <Icon>
        <path d="M1 3h15v13H1z" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </Icon>
    );
  }
  if (p.includes("/orders")) {
    return (
      <Icon>
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </Icon>
    );
  }
  if (p.includes("/pay") || p.includes("/payments")) {
    return (
      <Icon>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </Icon>
    );
  }
  if (p.includes("/account")) {
    return (
      <Icon>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c1.5-4 4-6 8-6s6.5 2 8 6" />
      </Icon>
    );
  }
  if (p.includes("/catalog") || p.includes("/warehouse")) {
    return (
      <Icon>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.27 6.96 12 12.01l8.73-5.05" />
        <path d="M12 22.08V12" />
      </Icon>
    );
  }
  if (p.includes("/shops")) {
    return (
      <Icon>
        <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" />
        <path d="M9 21V12h6v9" />
      </Icon>
    );
  }
  if (p.includes("/analytics")) {
    return (
      <Icon>
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </Icon>
    );
  }
  if (p.includes("/team")) {
    return (
      <Icon>
        <circle cx="9" cy="7" r="3" />
        <circle cx="17" cy="7" r="3" />
        <path d="M3 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
        <path d="M17 21v-1a4 4 0 0 0-2-3.47" />
      </Icon>
    );
  }
  if (p.includes("/summary")) {
    return (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </Icon>
    );
  }
  if (p.includes("/transactions")) {
    return (
      <Icon>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h8" />
      </Icon>
    );
  }
  if (p.includes("/office")) {
    return (
      <Icon>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h6v6H9z" />
      </Icon>
    );
  }
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </Icon>
  );
}
