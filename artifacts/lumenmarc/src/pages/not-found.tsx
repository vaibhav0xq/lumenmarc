import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center py-32 animate-in fade-in duration-500 bg-grain">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full pointer-events-none" />
        <FileQuestion className="size-20 text-muted-foreground/30 mb-8 relative z-10" />
      </div>
      <h1 className="font-serif italic text-5xl md:text-6xl tracking-tight mb-4">Not Found</h1>
      <p className="text-muted-foreground text-lg max-w-sm mb-10 font-light">
        The page you are looking for does not exist, or you entered an unknown ticker.
      </p>
      <Link href="/">
        <Button variant="outline" size="lg" className="font-mono text-sm tracking-widest uppercase">Return to Tape</Button>
      </Link>
    </div>
  );
}