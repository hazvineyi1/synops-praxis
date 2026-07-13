import React, { useEffect, useRef } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DevSessionProvider, useDevSession } from '@/context/DevSessionContext';

// Pages
import NotFound from '@/pages/not-found';
import { Home } from '@/pages/Home';
import { Dashboard } from '@/pages/Dashboard';
import { LearnSession } from '@/pages/LearnSession';
import { Studio } from '@/pages/Studio';
import { StudioNew } from '@/pages/StudioNew';
import { StudioEdit } from '@/pages/StudioEdit';
import { Courses } from '@/pages/Courses';
import { CourseDetail } from '@/pages/CourseDetail';
import { AssignmentDetail } from '@/pages/AssignmentDetail';
import { DiscussionThread } from '@/pages/DiscussionThread';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { CourseGradebook } from '@/pages/CourseGradebook';
import { DevLogin } from '@/pages/DevLogin';
import { ModuleViewer } from '@/pages/ModuleViewer';
import { Assess } from '@/pages/Assess';
import { Credentials } from '@/pages/Credentials';
import { Verify } from '@/pages/Verify';
import { CoachLearners } from '@/pages/CoachLearners';
import { CoachSubmissions } from '@/pages/CoachSubmissions';
import { AdminPartners } from '@/pages/AdminPartners';
import { PartnerTheme } from '@/pages/PartnerTheme';
import { Reports } from '@/pages/Reports';
import { CoachSettings } from '@/pages/CoachSettings';
import { OrgMembers } from '@/pages/OrgMembers';

// Layout
import { AppLayout } from '@/components/layout/AppLayout';

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
  },
  variables: {
    colorPrimary: "hsl(222, 47%, 11%)",
    colorForeground: "hsl(222, 47%, 11%)",
    colorMutedForeground: "hsl(215, 16%, 47%)",
    colorDanger: "hsl(0, 84.2%, 60.2%)",
    colorBackground: "white",
    colorInput: "hsl(214.3, 31.8%, 91.4%)",
    colorInputForeground: "hsl(222, 47%, 11%)",
    colorNeutral: "hsl(214.3, 31.8%, 91.4%)",
    fontFamily: "'Outfit', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-serif font-bold text-foreground",
    headerSubtitle: "text-muted-foreground text-sm",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary font-semibold hover:underline",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground text-xs uppercase",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-green-600",
    alertText: "text-destructive",
    logoBox: "mb-6 flex justify-center",
    logoImage: "h-8 w-auto",
    socialButtonsBlockButton: "border border-border hover:bg-muted/50 rounded-md transition-colors",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2 rounded-md transition-colors",
    formFieldInput: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    footerAction: "mt-6 text-sm text-center",
    dividerLine: "bg-border h-px",
    alert: "bg-destructive/10 border border-destructive/20 text-destructive rounded-md p-3 text-sm",
    otpCodeFieldInput: "border border-input rounded-md",
    formFieldRow: "space-y-4",
    main: "px-8 py-6",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  const { isDevSession } = useDevSession();
  if (isDevSession) return <Redirect to="/dashboard" />;
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

/**
 * ProtectedRoute: renders inside AppLayout.
 * Accepts both Clerk sign-in AND dev session cookie.
 */
function ProtectedRoute({ component: Component, path }: { component: React.ComponentType<any>; path: string }) {
  const { isDevSession, loading } = useDevSession();

  return (
    <Route path={path}>
      {(params) => {
        // Dev session bypasses Clerk entirely
        if (isDevSession) {
          return (
            <AppLayout>
              <Component params={params} />
            </AppLayout>
          );
        }
        if (loading) return null;
        return (
          <>
            <Show when="signed-in">
              <AppLayout>
                <Component params={params} />
              </AppLayout>
            </Show>
            <Show when="signed-out">
              <Redirect to="/sign-in" />
            </Show>
          </>
        );
      }}
    </Route>
  );
}

/**
 * FocusRoute: full-screen protected route (no sidebar layout).
 */
function FocusRoute({ component: Component, path }: { component: React.ComponentType<any>; path: string }) {
  const { isDevSession, loading } = useDevSession();

  return (
    <Route path={path}>
      {(params) => {
        if (isDevSession) {
          return <Component params={params} />;
        }
        if (loading) return null;
        return (
          <>
            <Show when="signed-in">
              <Component params={params} />
            </Show>
            <Show when="signed-out">
              <Redirect to="/sign-in" />
            </Show>
          </>
        );
      }}
    </Route>
  );
}

function PublicRoute({ component: Component, path }: { component: React.ComponentType<any>; path: string }) {
  return (
    <Route path={path}>
      {(params) => <Component params={params} />}
    </Route>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />

          {/* Dev demo login — public, no Clerk required */}
          <PublicRoute path="/dev-login" component={DevLogin} />

          {/* Public routes */}
          <PublicRoute path="/verify/:credentialId" component={Verify} />

          {/* Full-screen focus routes */}
          <FocusRoute path="/learn/:sessionId" component={LearnSession} />

          {/* App layout routes */}
          <ProtectedRoute path="/dashboard" component={Dashboard} />
          <ProtectedRoute path="/studio/new" component={StudioNew} />
          <ProtectedRoute path="/studio/:draftId" component={StudioEdit} />
          <ProtectedRoute path="/studio" component={Studio} />
          <ProtectedRoute path="/courses/:courseId/assignments/:assignmentId" component={AssignmentDetail} />
          <ProtectedRoute path="/courses/:courseId/discussions/:discussionId" component={DiscussionThread} />
          <ProtectedRoute path="/courses/:courseId/gradebook" component={CourseGradebook} />
          <ProtectedRoute path="/courses/:courseId/modules/:moduleId" component={ModuleViewer} />
          <ProtectedRoute path="/courses/:courseId" component={CourseDetail} />
          <ProtectedRoute path="/courses" component={Courses} />
          <ProtectedRoute path="/notifications" component={NotificationsPage} />
          <ProtectedRoute path="/assess/:assessmentId" component={Assess} />
          <ProtectedRoute path="/credentials" component={Credentials} />
          <ProtectedRoute path="/coach-settings" component={CoachSettings} />
          <ProtectedRoute path="/coach/submissions" component={CoachSubmissions} />
          <ProtectedRoute path="/coach" component={CoachLearners} />
          <ProtectedRoute path="/org/members" component={OrgMembers} />
          <ProtectedRoute path="/admin/partners" component={AdminPartners} />
          <ProtectedRoute path="/partner/theme" component={PartnerTheme} />
          <ProtectedRoute path="/reports" component={Reports} />

          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <DevSessionProvider>
          <ClerkProviderWithRoutes />
        </DevSessionProvider>
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
