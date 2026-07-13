import React from 'react';
import { Link } from 'wouter';
import { useGetMe } from '@workspace/api-client-react';
import { useClerk } from '@clerk/react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
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
  Bell
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  const { signOut } = useClerk();

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
      items.push({ label: 'My Courses', href: '/courses', icon: BookOpen });
      items.push({ label: 'Credentials', href: '/credentials', icon: Award });
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

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex-shrink-0 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2 font-serif font-bold text-xl tracking-tight text-foreground">
            <span className="bg-primary text-primary-foreground h-8 w-8 flex items-center justify-center rounded-sm">P</span>
            Synops Praxis
          </Link>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
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
          <Link href="/notifications" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors relative">
            <div className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </div>
            Notifications {unreadCount > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </Link>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground mt-1" onClick={() => signOut({ redirectUrl: '/' })}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 md:hidden">
          <Link href="/dashboard" className="font-serif font-bold text-lg">Praxis</Link>
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative p-2 text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 h-4 w-4 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </Link>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 md:p-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {import.meta.env.DEV && <DevRoleSwitcher />}
    </div>
  );
}
