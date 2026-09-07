import { formatUnits, isAddress, type Address } from "viem";
import { getBaseClient } from "./chain";
import { aggregatorV3Abi, b20Abi, b20FactoryAbi, erc20Abi, PausableFeature } from "./abi";
import { B20_FACTORY, STOCKS, type StockDefinition } from "./addresses";

const WAD = 10n ** 18n;

export interface FeedRaw {
  feedAddress: Address;
  description: string;
  decimals: number;
  roundId: string;
  answerRaw: string;
  price: number;
  updatedAtUtc: string;
  updatedAtUnix: number;
  ok: boolean;
  error?: string;
}

export interface TokenRaw {
  def: StockDefinition;
  decimals: number;
  totalSupplyRaw: bigint;
  totalSupply: number;
  multiplierRaw: bigint;
  multiplier: number;
  shareEquivalents: number;
  paused: { transfer: boolean | null; mint: boolean | null; burn: boolean | null };
  isin: string | null;
  cusip: string | null;
  contractUri: string | null;
  imageUrl: string | null;
  onchainName: string | null;
  onchainSymbol: string | null;
  factoryIsB20: boolean | null;
  ok: boolean;
}

export interface ChainSnapshot {
  blockNumber: number;
  readAtUtc: string;
  tokens: Map<string, TokenRaw>;
  feeds: Map<string, FeedRaw>;
}

function wadToNumber(raw: bigint): number {
  return Number(raw) / Number(WAD);
}

function parseContractUriImage(uri: string | null): string | null {
  if (!uri) return null;
  try {
    const prefix = "data:application/json;base64,";
    if (uri.startsWith(prefix)) {
      const json = JSON.parse(Buffer.from(uri.slice(prefix.length), "base64").toString("utf8")) as { image?: unknown };
      return typeof json.image === "string" ? json.image : null;
    }
  } catch {
    return null;
  }
  return null;
}

type MulticallResult<T> = { status: "success"; result: T } | { status: "failure"; error: Error };

function ok<T>(r: MulticallResult<T> | undefined): T | undefined {
  return r && r.status === "success" ? r.result : undefined;
}

/** One multicall round-trip for every official token + every reference feed. */
export async function readChainSnapshot(): Promise<ChainSnapshot> {
  const client = getBaseClient();
  const perToken = 12;
  const tokenContracts = STOCKS.flatMap((s) => [
    { address: s.address, abi: b20Abi, functionName: "decimals" as const },
    { address: s.address, abi: b20Abi, functionName: "totalSupply" as const },
    { address: s.address, abi: b20Abi, functionName: "multiplier" as const },
    { address: s.address, abi: b20Abi, functionName: "isPaused" as const, args: [PausableFeature.TRANSFER] as const },
    { address: s.address, abi: b20Abi, functionName: "isPaused" as const, args: [PausableFeature.MINT] as const },
    { address: s.address, abi: b20Abi, functionName: "isPaused" as const, args: [PausableFeature.BURN] as const },
    { address: s.address, abi: b20Abi, functionName: "extraMetadata" as const, args: ["isin"] as const },
    { address: s.address, abi: b20Abi, functionName: "extraMetadata" as const, args: ["cusip"] as const },
    { address: s.address, abi: b20Abi, functionName: "contractURI" as const },
    { address: s.address, abi: b20Abi, functionName: "name" as const },
    { address: s.address, abi: b20Abi, functionName: "symbol" as const },
    { address: B20_FACTORY, abi: b20FactoryAbi, functionName: "isB20" as const, args: [s.address] as const },
  ]);
  const feedContracts = STOCKS.flatMap((s) => [
    { address: s.feed, abi: aggregatorV3Abi, functionName: "latestRoundData" as const },
    { address: s.feed, abi: aggregatorV3Abi, functionName: "decimals" as const },
    { address: s.feed, abi: aggregatorV3Abi, functionName: "description" as const },
  ]);

  // Sequential, un-chunked multicalls: three RPC requests per tick keeps public RPCs happy.
  const blockNumber = await client.getBlockNumber();
  const tokenResults = await client.multicall({ contracts: tokenContracts, allowFailure: true, batchSize: 0 });
  const feedResults = await client.multicall({ contracts: feedContracts, allowFailure: true, batchSize: 0 });

  const tokens = new Map<string, TokenRaw>();
  STOCKS.forEach((def, i) => {
    const r = tokenResults.slice(i * perToken, (i + 1) * perToken);
    const decimals = Number(ok(r[0] as MulticallResult<number>) ?? 8);
    const totalSupplyRaw = (ok(r[1] as MulticallResult<bigint>) ?? 0n) as bigint;
    const multiplierRaw = (ok(r[2] as MulticallResult<bigint>) ?? WAD) as bigint;
    const totalSupply = Number(formatUnits(totalSupplyRaw, decimals));
    const multiplier = wadToNumber(multiplierRaw);
    const isinRaw = ok(r[6] as MulticallResult<string>);
    const cusipRaw = ok(r[7] as MulticallResult<string>);
    const contractUri = ok(r[8] as MulticallResult<string>) ?? null;
    const pausedOf = (x: MulticallResult<boolean> | undefined): boolean | null => {
      const v = ok(x);
      return typeof v === "boolean" ? v : null;
    };
    tokens.set(def.ticker, {
      def,
      decimals,
      totalSupplyRaw,
      totalSupply,
      multiplierRaw,
      multiplier,
      shareEquivalents: totalSupply * multiplier,
      paused: {
        transfer: pausedOf(r[3] as MulticallResult<boolean>),
        mint: pausedOf(r[4] as MulticallResult<boolean>),
        burn: pausedOf(r[5] as MulticallResult<boolean>),
      },
      isin: isinRaw ? isinRaw : null,
      cusip: cusipRaw ? cusipRaw : null,
      contractUri: contractUri ? contractUri : null,
      imageUrl: parseContractUriImage(contractUri),
      onchainName: ok(r[9] as MulticallResult<string>) ?? null,
      onchainSymbol: ok(r[10] as MulticallResult<string>) ?? null,
      factoryIsB20: (() => {
        const v = ok(r[11] as MulticallResult<boolean>);
        return typeof v === "boolean" ? v : null;
      })(),
      ok: r[1]?.status === "success" && r[2]?.status === "success",
    });
  });

  // A reverted decimals/totalSupply/multiplier read must not turn into "8 decimals, zero supply, 1.0x":
  // fail the whole tick so the previous real snapshot is kept (or the API reports 503 before the first one).
  const failedTokens = [...tokens.values()].filter((t) => !t.ok).map((t) => t.def.ticker);
  if (failedTokens.length > 0) {
    throw new Error(`Onchain token reads failed for ${failedTokens.join(", ")} at block ${blockNumber}`);
  }

  const feeds = new Map<string, FeedRaw>();
  STOCKS.forEach((def, i) => {
    const r = feedResults.slice(i * 3, (i + 1) * 3);
    const round = ok(r[0] as MulticallResult<readonly [bigint, bigint, bigint, bigint, bigint]>);
    const decimals = Number(ok(r[1] as MulticallResult<number>) ?? 8);
    const description = ok(r[2] as MulticallResult<string>) ?? `Coinbase ${def.underlying}`;
    if (!round) {
      const err = r[0] && r[0].status === "failure" ? r[0].error.message : "no data";
      feeds.set(def.ticker, {
        feedAddress: def.feed,
        description,
        decimals,
        roundId: "0",
        answerRaw: "0",
        price: 0,
        updatedAtUtc: new Date(0).toISOString(),
        updatedAtUnix: 0,
        ok: false,
        error: err,
      });
      return;
    }
    const [roundId, answer, , updatedAt] = round;
    feeds.set(def.ticker, {
      feedAddress: def.feed,
      description,
      decimals,
      roundId: roundId.toString(),
      answerRaw: answer.toString(),
      price: Number(formatUnits(answer, decimals)),
      updatedAtUtc: new Date(Number(updatedAt) * 1000).toISOString(),
      updatedAtUnix: Number(updatedAt),
      ok: true,
    });
  });

  return { blockNumber: Number(blockNumber), readAtUtc: new Date().toISOString(), tokens, feeds };
}

export interface BalanceRaw {
  def: StockDefinition;
  rawBalance: number;
  scaledBalance: number;
  multiplier: number;
}

/** balanceOf + scaledBalanceOf for every official token, for one account. */
export async function readBalances(account: Address, decimalsByTicker: Map<string, number>): Promise<BalanceRaw[]> {
  const client = getBaseClient();
  const contracts = STOCKS.flatMap((s) => [
    { address: s.address, abi: b20Abi, functionName: "balanceOf" as const, args: [account] as const },
    { address: s.address, abi: b20Abi, functionName: "scaledBalanceOf" as const, args: [account] as const },
    { address: s.address, abi: b20Abi, functionName: "multiplier" as const },
  ]);
  const results = await client.multicall({ contracts, allowFailure: true, batchSize: 0 });
  const failed = STOCKS.filter((_, i) => results.slice(i * 3, i * 3 + 3).some((r) => r.status !== "success")).map((s) => s.ticker);
  if (failed.length > 0) {
    throw new Error(`Onchain balance reads failed for ${failed.join(", ")}`);
  }
  return STOCKS.map((def, i) => {
    const decimals = decimalsByTicker.get(def.ticker);
    if (decimals === undefined) throw new Error(`No decimals known for ${def.ticker}`);
    const raw = (ok(results[i * 3] as MulticallResult<bigint>) ?? 0n) as bigint;
    const scaled = (ok(results[i * 3 + 1] as MulticallResult<bigint>) ?? 0n) as bigint;
    const mult = (ok(results[i * 3 + 2] as MulticallResult<bigint>) ?? WAD) as bigint;
    return {
      def,
      rawBalance: Number(formatUnits(raw, decimals)),
      scaledBalance: Number(formatUnits(scaled, decimals)),
      multiplier: wadToNumber(mult),
    };
  });
}

export interface ArbitraryTokenFacts {
  address: Address;
  hasCode: boolean;
  isB20: boolean;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: number | null;
}

/** Facts about any address: is it a contract, is it a B20 token, and its ERC-20 metadata if any. */
export async function readArbitraryToken(address: Address): Promise<ArbitraryTokenFacts> {
  if (!isAddress(address)) throw new Error("invalid address");
  const client = getBaseClient();
  const [code, results] = await Promise.all([
    client.getCode({ address }),
    client.multicall({
      contracts: [
        { address: B20_FACTORY, abi: b20FactoryAbi, functionName: "isB20", args: [address] },
        { address, abi: erc20Abi, functionName: "name" },
        { address, abi: erc20Abi, functionName: "symbol" },
        { address, abi: erc20Abi, functionName: "decimals" },
        { address, abi: erc20Abi, functionName: "totalSupply" },
      ],
      allowFailure: true,
      batchSize: 0,
    }),
  ]);
  const isB20 = ok(results[0] as MulticallResult<boolean>) === true;
  const name = ok(results[1] as MulticallResult<string>) ?? null;
  const symbol = ok(results[2] as MulticallResult<string>) ?? null;
  const decimalsRaw = ok(results[3] as MulticallResult<number>);
  const decimals = typeof decimalsRaw === "number" ? decimalsRaw : null;
  const supplyRaw = ok(results[4] as MulticallResult<bigint>);
  const totalSupply = typeof supplyRaw === "bigint" && decimals !== null ? Number(formatUnits(supplyRaw, decimals)) : null;
  return {
    address,
    // B20 tokens are precompiles and return no bytecode, so "no code" does not imply "no token".
    hasCode: !!code && code !== "0x",
    isB20,
    name,
    symbol,
    decimals,
    totalSupply,
  };
}
