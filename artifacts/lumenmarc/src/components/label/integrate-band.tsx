import { Copy, Terminal, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { StockLabel } from "@workspace/api-client-react";

export function IntegrateBand({ stock }: { stock: StockLabel }) {
  const { toast } = useToast();
  const ticker = stock.summary.ticker;
  const baseUrl = import.meta.env.BASE_URL;
  
  const jsonUrl = `${baseUrl}api/stocks/${ticker}`;
  const embedUrl = `${window.location.origin}${baseUrl}embed/${ticker}`;
  const iframeSnippet = `<iframe src="${embedUrl}" width="100%" height="400" frameborder="0"></iframe>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(iframeSnippet);
    toast({ title: "Snippet copied", description: "Ready to paste." });
  };

  return (
    <section className="space-y-6 relative border-t border-border/40 pt-8">
      <div className="flex items-baseline gap-4 border-b border-border/40 pb-4">
        <h2 className="text-2xl font-serif italic tracking-wide">Integrate</h2>
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground hidden sm:inline">JSON API & Embed</span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border/40 rounded-2xl p-6 font-mono text-sm space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Terminal className="size-4" /> <span>API Endpoint</span>
          </div>
          <a href={jsonUrl} target="_blank" rel="noreferrer" className="block p-3 bg-background border border-border/50 rounded-xl text-primary hover:bg-primary/5 transition-colors overflow-hidden text-ellipsis whitespace-nowrap">
            {jsonUrl}
          </a>
        </div>
        
        <div className="bg-card border border-border/40 rounded-2xl p-6 font-mono text-sm space-y-4 flex flex-col">
          <div className="flex justify-between items-center text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              <Code className="size-4" /> <span>Embed Snippet</span>
            </div>
            <Button variant="ghost" size="sm" onClick={copySnippet} className="h-8 gap-2 text-xs uppercase tracking-widest hover:bg-background">
              <Copy className="size-3" /> Copy
            </Button>
          </div>
          <div className="p-3 bg-background border border-border/50 rounded-xl overflow-x-auto text-xs text-muted-foreground">
            {iframeSnippet}
          </div>
        </div>
      </div>
    </section>
  );
}
