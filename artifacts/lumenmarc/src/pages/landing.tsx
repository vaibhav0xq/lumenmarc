import { useMemo } from "react";
import {
  useGetOverview,
  useListStocks,
  useGetStock,
  useGetStockHistory,
  getGetOverviewQueryKey,
  getListStocksQueryKey,
  getGetStockQueryKey,
  getGetStockHistoryQueryKey,
} from "@workspace/api-client-react";
import { apiErrorMessage } from "@/lib/utils";
import { Hero } from "@/components/landing/hero";
import { Verify, Compare, Market, Integrate } from "@/components/landing/sections";
import { pickWidest } from "./readings";

const REFETCH_MS = 30000;

export default function Landing() {
  const { data: overview, error: overviewError } = useGetOverview({
    query: { queryKey: getGetOverviewQueryKey(), refetchInterval: REFETCH_MS },
  });
  const { data: stocks, error: stocksError } = useListStocks({
    query: { queryKey: getListStocksQueryKey(), refetchInterval: REFETCH_MS },
  });
  const error = overviewError ?? stocksError;
  const errorText = error ? apiErrorMessage(error) : null;
  const status: "loading" | "failed" | "ready" = stocks ? "ready" : error ? "failed" : "loading";

  /* The hero token is the widest live deviation at this block. */
  const hero = useMemo(() => pickWidest(stocks), [stocks]);
  const ticker = hero?.ticker ?? "";

  const { data: detail, error: detailError } = useGetStock(ticker, {
    query: { enabled: !!ticker, queryKey: getGetStockQueryKey(ticker), refetchInterval: REFETCH_MS, retry: false },
  });
  const { data: history, error: historyError } = useGetStockHistory(
    { ticker, window: "24h" },
    { query: { enabled: !!ticker, queryKey: getGetStockHistoryQueryKey({ ticker, window: "24h" }), refetchInterval: 60000, retry: false } },
  );
  const range24h = useMemo(() => {
    if (!history || history.ticker !== ticker) return null;
    const v = history.points.filter((pt) => pt.premiumBps != null).map((pt) => pt.premiumBps!);
    return v.length ? { lo: Math.min(...v), hi: Math.max(...v) } : null;
  }, [history, ticker]);

  return (
    <div className="flex w-full flex-col" data-testid="page-landing">
      <Hero hero={hero} range24h={range24h} status={status} error={errorText} />
      <Verify overview={overview} hero={hero} detail={detail} detailError={detailError ? apiErrorMessage(detailError) : null} />
      <Compare hero={hero} history={history} historyError={historyError ? apiErrorMessage(historyError) : null} range24h={range24h} />
      <Market stocks={stocks} error={errorText} />
      <Integrate hero={hero} />
    </div>
  );
}
