export function ChapterHead({ index, title, lede }: { index: string; title: string; lede: string }) {
  return (
    <header className="max-w-[760px]">
      <p className="font-mono text-[11px] text-foreground/58">{index}</p>
      <h2 className="mt-5 font-display text-[clamp(34px,3.5vw,48px)] leading-[1.05] tracking-[-0.01em] text-foreground">{title}</h2>
      <p className="mt-5 max-w-[65ch] text-[16px] leading-[1.6] text-foreground/70">{lede}</p>
    </header>
  );
}

