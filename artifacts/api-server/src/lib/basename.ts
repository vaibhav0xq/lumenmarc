import { concat, getAddress, isAddress, keccak256, namehash, stringToBytes, type Address } from "viem";
import { normalize } from "viem/ens";
import { basenameResolverAbi } from "./b20/abi";
import { BASENAME_L2_RESOLVER } from "./b20/addresses";
import { getBaseClient } from "./b20/chain";

const ZERO = "0x0000000000000000000000000000000000000000";
/** Reverse namespace for Base mainnet (chain id 8453 → coinType 0x80002105). */
const BASE_REVERSE_NODE = namehash("80002105.reverse");

export interface ResolvedAccount {
  address: Address;
  basename: string | null;
}

export function looksLikeBasename(input: string): boolean {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.base\.eth$/i.test(input.trim());
}

export async function resolveBasename(name: string): Promise<Address | null> {
  const client = getBaseClient();
  const node = namehash(normalize(name.trim()));
  const addr = await client.readContract({ address: BASENAME_L2_RESOLVER, abi: basenameResolverAbi, functionName: "addr", args: [node] });
  if (!addr || addr.toLowerCase() === ZERO) return null;
  return getAddress(addr);
}

export async function reverseBasename(address: Address): Promise<string | null> {
  const client = getBaseClient();
  const labelHash = keccak256(stringToBytes(address.toLowerCase().slice(2)));
  const node = keccak256(concat([BASE_REVERSE_NODE, labelHash]));
  try {
    const name = await client.readContract({ address: BASENAME_L2_RESOLVER, abi: basenameResolverAbi, functionName: "name", args: [node] });
    if (!name) return null;
    // Only trust the reverse record if it resolves forward to the same address.
    const forward = await resolveBasename(name).catch(() => null);
    return forward && forward.toLowerCase() === address.toLowerCase() ? name : null;
  } catch {
    return null;
  }
}

/** Accepts a 0x address or a Basename; returns the checksummed address plus the primary Basename if any. */
export async function resolveAccount(input: string): Promise<ResolvedAccount | null> {
  const trimmed = input.trim();
  if (isAddress(trimmed)) {
    const address = getAddress(trimmed);
    return { address, basename: await reverseBasename(address) };
  }
  if (looksLikeBasename(trimmed)) {
    const address = await resolveBasename(trimmed);
    return address ? { address, basename: trimmed.toLowerCase() } : null;
  }
  return null;
}

