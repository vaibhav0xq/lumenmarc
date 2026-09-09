import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { cn, sessionSummary } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand";
import { Arrow, Tick } from "@/components/motion";
import { useGetOverview, getGetOverviewQueryKey } from "@workspace/api-client-react";

export { Wordmark } from "@/components/brand";

/*
 * The frame around every page: a full-width instrument header (mark · pages · the one action)
 * and a full-width footer that states sources and disclosures in the same hairline grid.
 */

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col overflow-x-clip bg-background">
      <Navbar />
      <div className="relative z-10 flex w-full flex-1 flex-col">
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </div>
    </div>
  );
}

const NAV = [
  { href: "/readings", label: "Readings", active: (l: string) => l.startsWith("/readings") || l.startsWith("/s/") },
  { href: "/check", label: "Verify", active: (l: string) => l.startsWith("/check") || l.startsWith("/verify") },
  { href: "/portfolio", label: "Portfolio", active: (l: string) => l.startsWith("/portfolio") },
  { href: "/about", label: "About", active: (l: string) => l === "/about" },
];

function useOverview() {
  return useGetOverview({ query: { queryKey: getGetOverviewQueryKey(), refetchInterval: 30000 } });
}

/** Session, feed and block facts for the mobile menu, set as rows so nothing wraps mid-phrase on a narrow screen. */
function MenuFacts() {
  const { data: overview } = useOverview();
  if (!overview) return null;
  const s = sessionSummary(overview.market);
  const holding = !overview.market.isOpen && overview.feeds.held > 0;
  return (
    <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-3 font-mono text-[11px] leading-[1.4] tnum" data-testid="menu-facts">
      <dt className="text-foreground/50">session</dt>
      <dd className="flex items-baseline gap-2.5 text-foreground/80">
        <span className={cn("size-[5px] shrink-0 translate-y-[-1px]", overview.market.isOpen ? "bg-feed-live" : "bg-feed-held")} aria-hidden />
        <span>{s.label}{s.detail ? ` · ${s.detail}` : ""}</span>
      </dd>
      <dt className="text-foreground/50">feeds</dt>
      <dd className="text-foreground/80">{holding ? "holding the last print" : `${overview.feeds.live} live · ${overview.feeds.held} held`}</dd>
      <dt className="text-foreground/50">block</dt>
      <dd className="text-foreground/80"><Tick text={overview.blockNumber.toLocaleString("en-US")} /></dd>
    </dl>
  );
}

function Navbar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-[64px] w-full border-b bg-background transition-[border-color] duration-300",
        scrolled ? "border-foreground/20" : "border-foreground/10",
      )}
      data-testid="site-header"
    >
      {/* Three cells joined by hairlines: the mark, the pages, the one action. The cells run the full height, so the header reads as part of the instrument's frame rather than a bar laid over it. */}
      <div className="grid h-full w-full grid-cols-[auto_1fr_auto] items-stretch">
        <div className="flex h-full items-center pl-5 pr-6 sm:pl-8 sm:pr-8 md:border-r md:border-foreground/10 xl:pl-12 xl:pr-10">
          <Wordmark />
        </div>

        <nav className="hidden h-full items-stretch pl-2 md:flex xl:pl-4" aria-label="Primary">
          {NAV.map((item) => {
            const active = item.active(location);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex h-full items-center px-5 font-mono text-[11.5px] hover-quiet focus-visible:-outline-offset-4 lg:px-6",
                  active ? "text-foreground" : "text-foreground/58 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
                <span
                  className={cn(
                    "absolute inset-x-5 -bottom-px h-px transition-colors duration-200 lg:inset-x-6",
                    active ? "bg-transparent" : "bg-foreground/0 group-hover:bg-foreground/30",
                  )}
                  aria-hidden
                />
                {active && (
                  <motion.span
                    layoutId="nav-active-rule"
                    className="absolute inset-x-5 -bottom-px h-px bg-foreground lg:inset-x-6"
                    transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 40 }}
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex h-full items-stretch justify-end">
          <Link
            href="/check"
            className="group hidden h-full items-center gap-3 border-l border-foreground/10 px-7 font-mono text-[11.5px] text-foreground hover-quiet hover:bg-foreground hover:text-background focus-visible:-outline-offset-4 md:inline-flex xl:px-10"
            data-testid="nav-verify"
          >
            Verify a stock <Arrow className="text-current opacity-60 group-hover:opacity-100" />
          </Link>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex h-full w-16 items-center justify-center border-l border-foreground/10 text-foreground hover-quiet hover:bg-foreground/[0.05] focus-visible:-outline-offset-4 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5 stroke-[1.5]" />
              </button>
            </SheetTrigger>
            <SheetContent side="top" className="flex h-[100dvh] w-full flex-col border-none bg-background p-0 sm:h-auto sm:border-b sm:border-foreground/15">
              <div className="grid h-[64px] grid-cols-[1fr_auto] items-stretch border-b border-foreground/10">
                <div className="flex items-center px-5 sm:px-8">
                  <Wordmark />
                </div>
                <Button variant="ghost" className="h-full w-16 rounded-none border-l border-foreground/10 text-foreground hover:bg-foreground/5" onClick={() => setIsOpen(false)}>
                  <span className="sr-only">Close</span>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                  </svg>
                </Button>
              </div>
              <nav className="flex flex-col" aria-label="Primary">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center justify-between border-b border-foreground/10 px-5 py-5 font-display text-[26px] leading-none tracking-[-0.01em] hover-quiet sm:px-8",
                      item.active(location) ? "text-foreground" : "text-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground",
                    )}
                  >
                    {item.label}
                    {item.active(location) ? <span className="size-[5px] bg-foreground" aria-hidden /> : null}
                  </Link>
                ))}
                <Link
                  href="/check"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between border-b border-foreground/10 bg-foreground px-5 py-5 font-mono text-[13px] text-background hover:bg-foreground/90 sm:px-8"
                >
                  Verify a stock <Arrow />
                </Link>
              </nav>
              <div className="mt-auto border-t border-foreground/10 p-5 sm:mt-0 sm:border-t-0 sm:px-8">
                <MenuFacts />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { data: overview, isError } = useOverview();
  const pending = isError ? "unavailable" : "loading";
  return (
    <footer className="w-full shrink-0 border-t border-foreground/15" data-testid="site-footer">
      <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Description & Credit */}
        <div className="border-b border-foreground/15 p-6 sm:p-8 md:border-b-0 lg:border-r">
          <Wordmark />
          <p className="mt-8 max-w-[42ch] font-sans text-[14px] leading-[1.6] text-foreground/60">
            A clear market mark for tokenized stocks: each Coinbase-issued token on Base read against its Chainlink reference, at the current block, with the contract verified first.
          </p>
          <div className="mt-10 flex flex-col gap-2 font-mono text-[10.5px] leading-[1.6] text-foreground/60">
            {overview?.disclosures.map((disc, i) => <p key={i}>{disc}</p>)}
            {!overview && <p>Informational only · Not investment advice · Issued by Coinbase · Not available to US persons.</p>}
            <p className="pt-2 text-foreground/50">
              Built by vaibhav0xq ·{" "}
              <a href="https://github.com/vaibhav0xq" target="_blank" rel="noreferrer" className="text-foreground/60 underline underline-offset-4 hover-quiet hover:text-foreground">github.com/vaibhav0xq</a>
            </p>
          </div>
        </div>

        {/* Facts */}
        <div className="border-b border-foreground/15 p-6 sm:p-8 md:border-b-0 md:border-r">
          <p className="font-mono text-[11px] text-foreground/50">This reading</p>
          <dl className="mt-6 grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-3.5 font-mono text-[11.5px] tnum">
            <dt className="text-foreground/50">block</dt>
            <dd className="text-foreground/80">{overview ? <Tick text={overview.blockNumber.toLocaleString("en-US")} /> : pending}</dd>
            <dt className="text-foreground/50">tokens</dt>
            <dd className="text-foreground/80">{overview ? `${overview.tokensLive} live of ${overview.tokensTotal}` : pending}</dd>
            <dt className="text-foreground/50">feeds</dt>
            <dd className="text-foreground/80">{overview ? `${overview.feeds.live} live · ${overview.feeds.held} held` : pending}</dd>
            <dt className="text-foreground/50">session</dt>
            <dd className="text-foreground/80">{overview ? sessionSummary(overview.market).label : pending}</dd>
          </dl>
          
          <p className="mt-10 font-mono text-[11px] text-foreground/50">Sources</p>
          {overview ? (
            <ul className="mt-6 flex flex-col gap-3 font-mono text-[11.5px] text-foreground/80">
              {overview.dataSources.map((ds, i) => (
                <li key={i}>{ds}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 font-mono text-[11px] text-foreground/60">waiting for the current block</p>
          )}
        </div>

        {/* Links */}
        <div className="p-6 sm:p-8">
          <p className="font-mono text-[11px] text-foreground/50">Navigation</p>
          <nav className="mt-6 flex flex-col gap-3 font-mono text-[11.5px]" aria-label="Footer">
            <Link href="/readings" className="text-foreground/70 transition-colors hover:text-foreground">Readings</Link>
            <Link href="/check" className="text-foreground/70 transition-colors hover:text-foreground">Verify a stock</Link>
            <Link href="/portfolio" className="text-foreground/70 transition-colors hover:text-foreground">Portfolio</Link>
            <Link href="/about" className="text-foreground/70 transition-colors hover:text-foreground">About and API</Link>
            <a href="https://github.com/vaibhav0xq/lumenmarc" target="_blank" rel="noreferrer" className="text-foreground/70 transition-colors hover:text-foreground">Source</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
