import { parseAbi } from "viem";

/** Minimal B20 (asset variant) read surface — verified live against NVDAc on Base mainnet. */
export const b20Abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function multiplier() view returns (uint256)",
  "function WAD_PRECISION() view returns (uint256)",
  "function scaledBalanceOf(address account) view returns (uint256)",
  "function isPaused(uint8 feature) view returns (bool)",
  "function extraMetadata(string key) view returns (string)",
  "function contractURI() view returns (string)",
  "function supplyCap() view returns (uint256)",
]);

/** PausableFeature enum order per the B20 spec (append-only). */
export const PausableFeature = { TRANSFER: 0, MINT: 1, BURN: 2, SEIZE: 3 } as const;

export const b20FactoryAbi = parseAbi(["function isB20(address token) view returns (bool)"]);

export const erc20Abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
]);

/** Chainlink AggregatorV3Interface (read through the proxy). */
export const aggregatorV3Abi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
  "function description() view returns (string)",
]);

export const basenameResolverAbi = parseAbi([
  "function addr(bytes32 node) view returns (address)",
  "function name(bytes32 node) view returns (string)",
]);
