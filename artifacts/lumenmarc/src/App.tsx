import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { pageTransition } from '@/lib/motion';

import { Shell } from '@/components/layout/Shell';
import Landing from '@/pages/landing';
import Readings from '@/pages/readings';
import Label from '@/pages/label';
import Check from '@/pages/check';
import Portfolio from '@/pages/portfolio';
import Embed from '@/pages/embed';
import About from '@/pages/about';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}

/* Client-side navigation keeps the previous scroll position; start each page at the top or at the anchor it was linked to. */
function useScrollOnNavigate(location: string) {
  useEffect(() => {
    let hash = '';
    try {
      hash = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      hash = '';
    }
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      const target = document.getElementById(hash);
      if (target) target.scrollIntoView({ block: 'start' });
      else if (tries++ < 20) timer = setTimeout(settle, 60);
    };
    settle();
    return () => { if (timer) clearTimeout(timer); };
  }, [location]);
}

function Router() {
  const [location] = useLocation();
  useScrollOnNavigate(location);

  // Embeds render bare (no navbar/footer) so they can be iframed.
  if (location.startsWith('/embed/')) {
    return (
      <Switch>
        <Route path="/embed/:ticker" component={Embed} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Shell>
      <AnimatePresence mode="wait">
        <Switch key={location}>
          <Route path="/">
            <AnimatedPage><Landing /></AnimatedPage>
          </Route>
          <Route path="/readings">
            <AnimatedPage><Readings /></AnimatedPage>
          </Route>
          <Route path="/s/:ticker">
            <AnimatedPage><Label /></AnimatedPage>
          </Route>
          <Route path="/check">
            <AnimatedPage><Check /></AnimatedPage>
          </Route>
          <Route path="/verify">
            <AnimatedPage><Check /></AnimatedPage>
          </Route>
          <Route path="/portfolio">
            <AnimatedPage><Portfolio /></AnimatedPage>
          </Route>
          <Route path="/portfolio/:account">
            <AnimatedPage><Portfolio /></AnimatedPage>
          </Route>
          <Route path="/about">
            <AnimatedPage><About /></AnimatedPage>
          </Route>
          <Route>
            <AnimatedPage><NotFound /></AnimatedPage>
          </Route>
        </Switch>
      </AnimatePresence>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <MotionConfig reducedMotion="user">
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '') || ''}>
            <Router />
          </WouterRouter>
        </MotionConfig>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
