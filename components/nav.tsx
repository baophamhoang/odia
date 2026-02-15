"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { motion } from "motion/react";
import { Images, CalendarDays, User, Shield, LogOut, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_NAME } from "@/app/lib/constants";

const navItems = [
  { href: "/vault", label: "Vault", icon: Images },
  { href: "/timeline", label: "Timeline", icon: CalendarDays },
  { href: "/me", label: "My Photos", icon: User },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const isAdmin = session?.user?.role === "admin";

  const allNavItems = isAdmin
    ? [...navItems, { href: "/admin", label: "Admin", icon: Shield }]
    : navItems;

  return (
    <>
      {/* Desktop top bar — floating glass island */}
      <header className="hidden md:flex fixed top-3 left-1/2 -translate-x-1/2 z-40 items-center gap-1 rounded-full bg-background/80 backdrop-blur-2xl backdrop-saturate-200 border border-border/50 shadow-lg shadow-black/5 px-2 py-1.5">
        {/* Logo */}
        <Link
          href="/vault"
          className="flex items-center gap-2 px-3 py-1"
        >
          <motion.div
            className="h-2 w-2 rounded-full bg-primary"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-sm font-bold tracking-tighter">
            {APP_NAME}
          </span>
        </Link>

        <div className="w-px h-5 bg-border/50 mx-1" />

        {/* Nav items */}
        <nav className="flex items-center gap-0.5 relative">
          {allNavItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-full bg-primary/10 dark:bg-primary/15"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <motion.span
                    animate={{ scale: active ? 1.1 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <item.icon className={cn("h-4 w-4", active && "text-primary")} />
                  </motion.span>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="w-px h-5 bg-border/50 mx-1" />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 hidden dark:block" />
          <Moon className="h-4 w-4 block dark:hidden" />
        </button>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center rounded-full p-0.5 hover:ring-2 hover:ring-primary/20 transition-all duration-200">
              <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback className="text-xs bg-accent">
                  {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/me">My Photos</Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin">Admin</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Mobile bottom nav — floating dock */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 flex items-center justify-around rounded-2xl bg-background/80 backdrop-blur-2xl backdrop-saturate-200 border border-border/50 shadow-lg shadow-black/10 px-2 py-1.5 safe-area-bottom">
        {allNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-[10px] font-medium transition-all duration-200",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              {active && (
                <>
                  <motion.div
                    layoutId="mobile-nav-active"
                    className="absolute inset-0 rounded-xl bg-primary/10 dark:bg-primary/15"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                  <motion.div
                    layoutId="mobile-nav-dot"
                    className="absolute top-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 600, damping: 20 }}
                  />
                </>
              )}
              <motion.span
                className="relative z-10 flex flex-col items-center gap-0.5"
                whileTap={{ scale: 0.92 }}
              >
                <motion.span
                  animate={{ scale: active ? 1.15 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <item.icon className={cn("h-5 w-5", active && "text-primary")} />
                </motion.span>
                {item.label}
              </motion.span>
            </Link>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-[10px] font-medium text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback className="text-[7px]">
                  {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              Me
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end">
            <DropdownMenuItem
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-4 w-4 mr-2 hidden dark:block" />
              <Moon className="h-4 w-4 mr-2 block dark:hidden" />
              Toggle theme
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </>
  );
}
