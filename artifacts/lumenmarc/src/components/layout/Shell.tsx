import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col w-full max-w-7xl mx-auto px-4 md:px-8">
      <Navbar />
      <main className="flex-1 py-8 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}

function Navbar() {
  const [location, setLocation] = useLocation();

  return (
    <header className="h-16 flex items-center justify-between border-b border-border/40 shrink-0">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-mono font-bold text-lg tracking-tight hover:text-primary transition-colors flex items-center gap-2">
          <div className="size-4 bg-primary rounded-full"></div>
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
        <form 
          className="relative hidden md:block w-64"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const q = formData.get("q") as string;
            if (q) setLocation(`/check?q=${encodeURIComponent(q)}`);
          }}
        >
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            name="q" 
            placeholder="0x... or Basename" 
            className="pl-8 bg-secondary/30 border-transparent focus-visible:bg-transparent"
          />
        </form>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="py-8 border-t border-border/40 mt-16 text-xs text-muted-foreground flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
      <div className="max-w-3xl">
        <p>
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
