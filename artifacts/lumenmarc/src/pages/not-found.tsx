import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center py-20">
      <FileQuestion className="size-16 text-muted-foreground/30 mb-6" />
      <h1 className="text-4xl font-bold tracking-tight mb-2">Not Found</h1>
      <p className="text-muted-foreground max-w-sm mb-8">
        The page you are looking for does not exist, or you entered an unknown ticker.
      </p>
      <Link href="/">
        <Button variant="outline">Return to Tape</Button>
      </Link>
    </div>
  );
}
