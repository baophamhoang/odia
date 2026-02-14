"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/app/lib/constants";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  accent?: boolean;
}

function HomeIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? "0" : "2"}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
      <path
        d="M9 21V12h6v9"
        fill="none"
        stroke={filled ? "white" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function UserIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? "0" : "2"}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {filled ? (
        <>
          <circle cx="12" cy="7" r="4" />
          <path d="M4 21c0-4 3.582-7 8-7s8 3 8 7H4z" />
        </>
      ) : (
        <>
          <circle cx="12" cy="7" r="4" />
          <path d="M4 21c0-4 3.582-7 8-7s8 3 8 7" />
        </>
      )}
    </svg>
  );
}

function NavLink({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  if (item.accent) {
    return (
      <Link
        href={item.href}
        className="flex flex-col items-center justify-center gap-0.5"
        aria-label={item.label}
      >
        <span className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-white shadow-md active:scale-95 transition-transform">
          {item.icon}
        </span>
        <span className="text-[10px] font-medium text-accent">{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={`
        flex flex-col items-center justify-center gap-0.5 min-w-[64px]
        transition-colors
        ${isActive ? "text-accent" : "text-foreground-secondary"}
      `}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="w-6 h-6 flex items-center justify-center">
        {isActive && item.activeIcon ? item.activeIcon : item.icon}
      </span>
      <span className="text-[10px] font-medium">{item.label}</span>
    </Link>
  );
}

export function NavBar() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: "/feed",
      label: "Feed",
      icon: <HomeIcon />,
      activeIcon: <HomeIcon filled />,
    },
    {
      href: "/runs/new",
      label: "New Run",
      icon: <PlusIcon />,
      accent: true,
    },
    {
      href: "/me",
      label: "Me",
      icon: <UserIcon />,
      activeIcon: <UserIcon filled />,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/feed") return pathname === "/feed" || pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile: fixed bottom bar */}
      <nav
        className="
          fixed bottom-0 left-0 right-0 z-40
          bg-background border-t border-border
          flex items-center justify-around
          h-16 px-2 pb-[env(safe-area-inset-bottom)]
          md:hidden
        "
        aria-label="Main navigation"
      >
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
        ))}
      </nav>

      {/* Desktop: top bar */}
      <nav
        className="
          hidden md:flex
          fixed top-0 left-0 right-0 z-40
          bg-background border-b border-border
          h-14 items-center justify-center
        "
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-1 max-w-xl w-full px-4 justify-between">
          {/* Logo / app name */}
          <span className="text-accent font-bold text-lg tracking-tight">
            {APP_NAME}
          </span>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              if (item.accent) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-accent text-white rounded-full text-sm font-medium hover:bg-accent-hover transition-colors"
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              }

              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${
                      active
                        ? "text-accent bg-accent/10"
                        : "text-foreground-secondary hover:text-foreground hover:bg-border"
                    }
                  `}
                  aria-current={active ? "page" : undefined}
                >
                  {active && item.activeIcon ? item.activeIcon : item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
