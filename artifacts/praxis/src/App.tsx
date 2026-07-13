import React, { useEffect, useRef } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

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
import { Assess } from '@/pages/Assess';
import { Credentials } from '@/pages/Credentials';
import { Verify } from '@/pages/Verify';
import { CoachLearners } from '@/pages/CoachLearners';
import { CoachSubmissions } from '@/pages/CoachSubmissions';
import { AdminPartners } from '@/pages/AdminPartners';
import { PartnerTheme } from '@/pages/PartnerTheme';
import { Reports } from '@/pages/Reports';

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
    // We will use a text logo or abstract shape
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

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
      {(params) => (
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
      )}
    </Route>
  );
}

function FocusRoute({ component: Component, ...rest }: any) {
  // Like ProtectedRoute but no AppLayout
  return (
    <Route {...rest}>
      {(params) => (
        <>
          <Show when="signed-in">
            <Component params={params} />
          </Show>
          <Show when="signed-out">
            <Redirect to="/sign-in" />
          </Show>
        </>
      )}
    </Route>
  );
}

function PublicRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
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
          
          {/* Public Verification */}
          <PublicRoute path="/verify/:credentialId" component={Verify} />

          {/* Full Screen Focus */}
          <FocusRoute path="/learn/:sessionId" component={LearnSession} />

          {/* App Layout */}
          <ProtectedRoute path="/dashboard" component={Dashboard} />
          <ProtectedRoute path="/studio" component={Studio} />
          <ProtectedRoute path="/studio/new" component={StudioNew} />
          <ProtectedRoute path="/studio/:draftId" component={StudioEdit} />
          <ProtectedRoute path="/courses" component={Courses} />
          <ProtectedRoute path="/courses/:courseId" component={CourseDetail} />
          <ProtectedRoute path="/assess/:assessmentId" component={Assess} />
          <ProtectedRoute path="/credentials" component={Credentials} />
          
          <ProtectedRoute path="/coach" component={CoachLearners} />
          <ProtectedRoute path="/coach/submissions" component={CoachSubmissions} />
          
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
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
