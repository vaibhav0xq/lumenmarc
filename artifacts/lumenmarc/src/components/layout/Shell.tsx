import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Search, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MarketMarquee } from "./market-marquee";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-grain">
      <Navbar />
      <MarketMarquee />
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 flex-1 flex flex-col pt-8">
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </div>
    </div>
  );
}

function Navbar() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get("q") as string;
    if (q) {
      setLocation(`/check?q=${encodeURIComponent(q)}`);
      setIsOpen(false);
    }
  };

  return (
    <header className="h-16 flex items-center justify-between border-b border-border/40 shrink-0 px-4 md:px-8 bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-serif italic text-2xl tracking-wide hover:text-primary transition-colors flex items-center gap-3">
          <div className="size-2 bg-primary rounded-full shadow-[0_0_8px_rgba(0,82,255,0.8)]"></div>
          LumenMarc
        </Link>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/" className={cn("hover:text-foreground transition-colors", location === "/" && "text-foreground")}>Tape</Link>
          <Link href="/portfolio" className={cn("hover:text-foreground transition-colors", location.startsWith("/portfolio") && "text-foreground")}>Portfolio</Link>
          <Link href="/check" className={cn("hover:text-foreground transition-colors", location.startsWith("/check") && "text-foreground")}>Verify</Link>
          <Link href="/about" className={cn("hover:text-foreground transition-colors", location === "/about" && "text-foreground")}>About</Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <form className="relative hidden md:block w-64" onSubmit={onSubmit}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            name="q" 
            placeholder="0x... or Basename" 
            className="pl-9 bg-secondary border-border/50 focus-visible:ring-1 focus-visible:ring-primary rounded-full font-mono text-xs h-9"
          />
        </form>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-background border-l border-border/40 w-64 sm:w-80">
            <nav className="flex flex-col gap-6 mt-8">
              <Link href="/" onClick={() => setIsOpen(false)} className={cn("text-lg font-medium", location === "/" && "text-primary")}>Tape</Link>
              <Link href="/portfolio" onClick={() => setIsOpen(false)} className={cn("text-lg font-medium", location.startsWith("/portfolio") && "text-primary")}>Portfolio</Link>
              <Link href="/check" onClick={() => setIsOpen(false)} className={cn("text-lg font-medium", location.startsWith("/check") && "text-primary")}>Verify</Link>
              <Link href="/about" onClick={() => setIsOpen(false)} className={cn("text-lg font-medium", location === "/about" && "text-primary")}>About</Link>
              
              <form className="relative mt-4" onSubmit={onSubmit}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  name="q" 
                  placeholder="Address or Ticker..." 
                  className="pl-9 bg-secondary border-border/50 focus-visible:ring-1 focus-visible:ring-primary rounded-xl font-mono text-sm h-10 w-full"
                />
              </form>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="py-8 border-t border-border/40 mt-16 text-xs text-muted-foreground flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
      <div className="max-w-3xl">
        <p className="font-medium">
          Not available to US persons. Not an offer, solicitation or investment advice. Data may be delayed; verify onchain.
        </p>
        <p className="mt-1">
          LumenMarc provides read-only factual fair-value and integrity data for Coinbase Tokenized Stocks on Base.
        </p>
      </div>
      <div className="flex gap-4">
        <Link href="/about" className="hover:text-foreground transition-colors">API & Integrations</Link>
        <Link href="/about" className="hover:text-foreground transition-colors">How it Works</Link>
      </div>
    </footer>
  );
}