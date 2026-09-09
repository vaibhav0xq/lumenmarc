import { Link } from "wouter";
import { Reveal } from "@/components/motion";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center px-5 py-32 sm:px-8 xl:px-12" data-testid="not-found">
      <Reveal>
        <p className="font-mono text-[11px] text-foreground/52">404 &middot; no such page</p>
        <h1 className="mt-6 font-display text-[clamp(44px,5vw,72px)] leading-[1.02] tracking-[-0.015em] text-foreground">No reading here.</h1>
        <p className="mt-8 max-w-[52ch] text-[17px] leading-[1.65] text-foreground/70">
          Either the page does not exist or the ticker is not one of Coinbase&apos;s tokenized stocks on Base. Every listed token has a sheet under
          <span className="font-mono text-[0.9em] ml-1">/s/TICKER</span>.
        </p>
        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/readings" className="inline-flex h-14 items-center border border-foreground bg-foreground px-8 font-mono text-[13px] text-background hover-quiet hover:bg-foreground/90" data-testid="link-readings">
            Open readings
          </Link>
          <Link href="/check" className="inline-flex h-14 items-center border border-foreground/30 px-8 font-mono text-[13px] text-foreground hover-quiet hover:border-foreground/50 hover:bg-foreground/[0.035]" data-testid="link-verify">
            Verify a stock
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
