import type { Address } from "viem";

/**
 * LumenMarc address book — Coinbase Tokenized Stocks (B20) on Base mainnet.
 *
 * Source of truth for "Coinbase-issued": the official list published by Coinbase / Base
 * (coinbase.com/tokenize and docs.base.org → Tokenized stocks on Base), pinned here on
 * 2026-09-07. Tokens are identified by ADDRESS, never by ticker or name — B20 metadata is
 * mutable and the 0xB200… prefix is available to anyone who deploys a B20 token.
 */

export const OFFICIAL_LIST_SOURCE =
  "Coinbase / Base official address list (coinbase.com/tokenize, docs.base.org tokenized-stocks), pinned 2026-09-07";

export interface StockDefinition {
  /** Onchain symbol, e.g. NVDAc */
  ticker: string;
  /** Underlying equity ticker, e.g. NVDA */
  underlying: string;
  /** Issuer's onchain name */
  name: string;
  address: Address;
  /** Chainlink "Coinbase <TICKER>" total-return feed proxy (8 decimals) */
  feed: Address;
}

export const STOCKS: readonly StockDefinition[] = [
  { ticker: "NVDAc", underlying: "NVDA", name: "NVIDIA Corporation", address: "0xb20000000000000000000078ee7ce2fE4908108C", feed: "0x04689a41629776563E6822F76f2e57D148d28513" },
  { ticker: "AAPLc", underlying: "AAPL", name: "Apple Inc.", address: "0xb200000000000000000000C2e324d24d7eEcd1fb", feed: "0x787f13dEa48Db0897CbCDD985de77809D837F988" },
  { ticker: "GOOGLc", underlying: "GOOGL", name: "Alphabet Inc.", address: "0xb2000000000000000000002D0BA3164cc74f58B7", feed: "0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2" },
  { ticker: "METAc", underlying: "META", name: "Meta Platforms Inc.", address: "0xb2000000000000000000008bC8786B856E61707C", feed: "0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D" },
  { ticker: "MSFTc", underlying: "MSFT", name: "Microsoft Corporation", address: "0xB200000000000000000000Ab99cFa739E253872B", feed: "0xeB10A6c9aa7E537aEd766C08c35Dae35B321b18c" },
  { ticker: "AMZNc", underlying: "AMZN", name: "Amazon.com Inc.", address: "0xb200000000000000000000d9192b6B456483C2E8", feed: "0x06A8E4b3aBB3B7543d8396FB2B763d22820cB295" },
  { ticker: "TSLAc", underlying: "TSLA", name: "Tesla Inc.", address: "0xb2000000000000000000001e800a7f5189430cD0", feed: "0xFaf869185383a24F8cb00e27BdA6b63B9905DCb4" },
  { ticker: "MSTRc", underlying: "MSTR", name: "Strategy Inc.", address: "0xb2000000000000000000004884b426556b92883d", feed: "0xB3cE282CD188b35DA0E38D8Bc7d58e33173D202a" },
  { ticker: "SNDKc", underlying: "SNDK", name: "Sandisk Corporation", address: "0xb200000000000000000000397293Cb8cda9a10c5", feed: "0x388b0dC46C0Fb05A74BeE0994fa5b02c6Fcca2eA" },
  { ticker: "SPCXc", underlying: "SPCX", name: "Space Exploration Technologies Corp.", address: "0xb2000000000000000000007b9fcbd005511aCBd5", feed: "0x6A634B235903C4ad6376892180d6fF8612e3Fa68" },
  { ticker: "COINc", underlying: "COIN", name: "Coinbase Global Inc.", address: "0xb200000000000000000000c85a31389D71F3ecfb", feed: "0x408e44f504A7371a345F03a73dDC96A4b48e8aa7" },
  { ticker: "CRCLc", underlying: "CRCL", name: "Circle Internet Group Inc.", address: "0xB20000000000000000000019f6E7C675b73C2e4D", feed: "0x0231cF2635D1E17bB5c2462cc7504Ba1fBd61f33" },
  { ticker: "INTCc", underlying: "INTC", name: "Intel Corporation", address: "0xB2000000000000000000004AFF16039bA04bdFBc", feed: "0xAB657C39bac0D5886250D70849e2E3E008F2EECB" },
];

export const B20_FACTORY: Address = "0xB20f000000000000000000000000000000000000";
export const B20_POLICY_REGISTRY: Address = "0x8453000000000000000000000000000000000002";
/** Coinbase's onchain oracle registry (multiplier + pause flag consumed by the Chainlink feeds). ABI not public. */
export const COINBASE_ORACLE_REGISTRY: Address = "0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD";

export const USDC: Address = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const WETH: Address = "0x4200000000000000000000000000000000000006";

/** Basenames L2 resolver on Base mainnet (forward addr() and reverse name()). */
export const BASENAME_L2_RESOLVER: Address = "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD";

/** Address prefix shared by every B20 token (10-byte prefix + 1 variant byte for ASSET = 0x00). */
export const B20_ASSET_PREFIX = "0xb2000000000000000000";

const byAddress = new Map<string, StockDefinition>(STOCKS.map((s) => [s.address.toLowerCase(), s]));
const byTicker = new Map<string, StockDefinition>();
for (const s of STOCKS) {
  byTicker.set(s.ticker.toLowerCase(), s);
  byTicker.set(s.underlying.toLowerCase(), s);
}

export function findStockByAddress(address: string): StockDefinition | undefined {
  return byAddress.get(address.toLowerCase());
}

export function findStockByTicker(ticker: string): StockDefinition | undefined {
  return byTicker.get(ticker.trim().toLowerCase());
}

export function isOfficialStock(address: string): boolean {
  return byAddress.has(address.toLowerCase());
}

/** Native ETH as represented by Uniswap v4 (currency address zero). */
export const NATIVE_ETH: Address = "0x0000000000000000000000000000000000000000";

export const KNOWN_QUOTE_TOKENS: Record<string, { symbol: string; isStablecoin: boolean }> = {
  [USDC.toLowerCase()]: { symbol: "USDC", isStablecoin: true },
  [WETH.toLowerCase()]: { symbol: "WETH", isStablecoin: false },
  [NATIVE_ETH.toLowerCase()]: { symbol: "ETH", isStablecoin: false },
};
