import { useGetStockHistory, getGetStockHistoryQueryKey } from "@workspace/api-client-react";
import { apiErrorMessage } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, YAxis, ReferenceLine, ReferenceArea, XAxis, Tooltip } from 'recharts';

export function HistoryChart({ ticker }: { ticker: string }) {
  const { data, error, isLoading } = useGetStockHistory(
    { ticker, window: '24h' },
    { query: { queryKey: getGetStockHistoryQueryKey({ ticker, window: '24h' }), retry: false, refetchInterval: 30000 } }
  );

  if (isLoading) {
    return <div className="h-48 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-muted-foreground animate-pulse">Loading chart...</div>;
  }

  if (error) {
    const detail = apiErrorMessage(error);
    return (
      <div className="h-48 flex items-center justify-center px-4 text-center font-mono text-xs text-muted-foreground" data-testid="text-history-error">
        {detail}
      </div>
    );
  }

  if (!data || data.points.length === 0) {
    return <div className="h-48 flex items-center justify-center font-mono text-xs text-muted-foreground">No history available</div>;
  }

  // Format data for Recharts
  const chartData = data.points
    .filter(p => p.premiumBps !== null)
    .map(p => ({
      time: new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: '2-digit',
        hour12: false
      }).format(new Date(p.tUtc)),
      bps: p.premiumBps
    }));

  if (chartData.length === 0) return <div className="h-48 flex items-center justify-center font-mono text-xs text-muted-foreground">No priced history</div>;

  const minBps = Math.min(...chartData.map(d => d.bps as number));
  const maxBps = Math.max(...chartData.map(d => d.bps as number));
  const maxAbs = Math.max(Math.abs(minBps), Math.abs(maxBps), 50);
  const outerBound = Math.ceil(maxAbs / 50) * 50;

  const ticks = Array.from(new Set([-outerBound, -50, 0, 50, outerBound])).sort((a, b) => a - b);

  return (
    <div className="h-48 w-full relative">
      <ResponsiveContainer width="100%" height="100%" className="relative z-10">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBps" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }} 
            dy={10}
            minTickGap={50}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }} 
            tickFormatter={(val: number) => val === 0 ? 'REF' : `${val > 0 ? '+' : ''}${val}`}
            ticks={ticks}
            domain={[-outerBound, outerBound]}
            axisLine={false}
            tickLine={false}
            width={60}
            orientation="right"
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
            itemStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'var(--font-mono)' }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
            formatter={(value: number) => [`${value > 0 ? '+' : ''}${value} bps`, 'Premium']}
            labelFormatter={(label) => `${label} ET`}
          />
          <ReferenceArea y1={-50} y2={50} fill="hsl(var(--dev-fair))" fillOpacity={0.05} />
          <ReferenceLine y={0} stroke="hsl(var(--cyan-glow))" strokeOpacity={0.8} />
          <ReferenceLine y={50} stroke="hsl(var(--dev-elevated))" strokeOpacity={0.2} strokeDasharray="3 3" />
          <ReferenceLine y={-50} stroke="hsl(var(--dev-elevated))" strokeOpacity={0.2} strokeDasharray="3 3" />
          
          <Area 
            type="monotone" 
            dataKey="bps" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorBps)" 
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="absolute bottom-1 right-2 text-[10px] font-mono text-muted-foreground opacity-50 z-20 pointer-events-none">ET</div>
    </div>
  );
}
