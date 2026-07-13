import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useGetMe } from '@workspace/api-client-react';
import { useClerk } from '@clerk/react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useDevSession } from '@/context/DevSessionContext';
import { DevRoleSwitcher } from '@/components/DevRoleSwitcher';
import { 
  LayoutDashboard, 
  BookOpen, 
  Award, 
  PenTool, 
  Users, 
  Settings, 
  LogOut,
  FileText,
  Building,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  const { signOut } = useClerk();
  const { isDevSession, clearDevSession } = useDevSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  const handleSignOut = () => {
    if (isDevSession) {
      clearDevSession();
    } else {
      signOut({ redirectUrl: '/' });
    }
  };

  const { data: notifCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => apiFetch<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 30000,
    enabled: !!user,
  });
  const unreadCount = notifCount?.count ?? 0;

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-32 bg-muted rounded"></div>
          <div className="h-4 w-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const role = user.role;

  const getNavItems = () => {
    const items = [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    ];

    if (role === 'learner') {
      items[0] = { label: 'Today', href: '/dashboard', icon: LayoutDashboard };
      items.push({ label: 'My Courses', href: '/courses', icon: BookOpen });
      items.push({ label: 'Credentials', href: '/credentials', icon: Award });
      items.push({ label: 'My Coach', href: '/coach-settings', icon: Settings });
    }

    if (role === 'coach') {
      items.push({ label: 'Learners', href: '/coach', icon: Users });
      items.push({ label: 'Submissions', href: '/coach/submissions', icon: FileText });
    }

    if (role === 'org_admin') {
      items.push({ label: 'Workforce', href: '/dashboard', icon: Users });
      items.push({ label: 'Reports', href: '/reports', icon: FileText });
    }

    if (role === 'partner_admin') {
      items.push({ label: 'Organisations', href: '/dashboard', icon: Building });
      items.push({ label: 'Course Catalog', href: '/courses', icon: BookOpen });
      items.push({ label: 'Studio', href: '/studio', icon: PenTool });
      items.push({ label: 'Brand Theme', href: '/partner/theme', icon: Settings });
    }

    if (role === 'super_admin') {
      items.push({ label: 'Partners', href: '/admin/partners', icon: Building });
      items.push({ label: 'Platform Settings', href: '/partner/theme', icon: Settings });
    }

    return items;
  };

  const navItems = getNavItems();

  // Bottom-tab items: first 4 nav items + notifications
  const bottomItems = navItems.slice(0, 4).map(item => ({
    ...item,
    isActive: location === item.href || location.startsWith(item.href + '/'),
  }));

  const isNavActive = (href: string) =>
    location === href || location.startsWith(href + '/');

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="w-64 border-r border-border bg-card flex-shrink-0 flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2 font-serif font-bold text-xl tracking-tight text-foreground">
            <span className="bg-primary text-primary-foreground h-8 w-8 flex items-center justify-center rounded-sm">P</span>
            Synops Praxis
          </Link>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isNavActive(item.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">{user.firstName?.[0] || user.email[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none text-foreground">{user.firstName} {user.lastName}</span>
              <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{user.role.replace('_', ' ')}</span>
            </div>
          </div>
          <Link href="/notifications" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <div className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </div>
            Notifications {unreadCount > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </Link>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground mt-1" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* ── Mobile full-screen menu drawer ──────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col bg-background">
          {/* Drawer header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-border shrink-0">
            <Link
              href="/dashboard"
              className="font-serif font-bold text-lg text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Synops Praxis
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User info */}
          <div className="px-5 py-4 border-b border-border shrink-0 flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">{user.firstName?.[0] || user.email[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{user.role.replace('_', ' ')}</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  isNavActive(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}

            <Link
              href="/notifications"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <div className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </div>
              Notifications
              {unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </Link>
          </nav>

          {/* Sign out */}
          <div className="px-4 pb-6 pt-2 border-t border-border shrink-0">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile top header */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 md:hidden shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/dashboard" className="font-serif font-bold text-base text-foreground">
            Synops Praxis
          </Link>

          <Link href="/notifications" className="relative p-2 -mr-2 text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </Link>
        </header>

        {/* Page content — bottom-padded on mobile for tab bar */}
        <div className="flex-1 overflow-auto p-4 pb-24 md:p-10 md:pb-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* ── Mobile bottom tab bar ────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border">
        <div className="flex items-stretch h-16">
          {bottomItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                item.isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className={`h-5 w-5 ${item.isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
              <span className="leading-none">{item.label}</span>
            </Link>
          ))}

          {/* More / hamburger tab */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground"
          >
            <Menu className="h-5 w-5 stroke-[1.5]" />
            <span className="leading-none">More</span>
          </button>
        </div>

        {/* iOS safe-area padding */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </nav>

      {import.meta.env.DEV && <DevRoleSwitcher />}
    </div>
  );
}
