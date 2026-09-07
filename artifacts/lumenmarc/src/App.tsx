import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';

import { Shell } from '@/components/layout/Shell';
import Home from '@/pages/home';
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

function Router() {
  const [location] = useLocation();

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
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/s/:ticker" component={Label} />
        <Route path="/check" component={Check} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/portfolio/:account" component={Portfolio} />
        <Route path="/about" component={About} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '') || ''}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
