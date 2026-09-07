# On-chain + DEX snapshot — Base mainnet, 2026-09-07 11:14 UTC (Sunday; US markets closed)

Method: viem multicall against public Base RPCs (mainnet.base.org, base-rpc.publicnode.com) at block 50995152; DexScreener public API (tokens/v1/base). Scripts: /tmp/chain/probe2.mjs, dex2.mjs, stc.mjs.

## B20 tokens (all 13 exist; all multipliers = 1.000000000000000000 → no corporate action processed yet)

| Token | Name (onchain) | Decimals | totalSupply (tokens) | Multiplier |
|---|---|---|---|---|
| NVDAc | NVIDIA Corporation | 8 | 13,731.0802 | 1.0 |
| AAPLc | Apple Inc. | 8 | 6,194.0299 | 1.0 |
| GOOGLc | Alphabet Inc. | 8 | 6,113.6938 | 1.0 |
| SPCXc | Space Exploration Technologies Corp. | 8 | 5,723.45 | 1.0 |
| AMZNc | Amazon.com Inc. | 8 | 2,974.54 | 1.0 |
| METAc | Meta Platforms Inc. | 8 | 2,228.8851 | 1.0 |
| TSLAc | Tesla Inc. | 8 | 1,727.44 | 1.0 |
| MSTRc | Strategy Inc. | 8 | 1,527.6344 | 1.0 |
| MSFTc | Microsoft Corporation | 8 | 559.70 | 1.0 |
| SNDKc | Sandisk Corporation | 8 | 141.44 | 1.0 |
| COINc | Coinbase Global Inc. | 8 | 0 | 1.0 |
| CRCLc | Circle Internet Group Inc. | 8 | 0 | 1.0 |
| INTCc | Intel Corporation | 8 | 0 | 1.0 |

Implied onchain float at Chainlink reference prices ≈ $11.5M (NVDAc ≈ $3.16M, GOOGLc ≈ $2.07M, AAPLc ≈ $1.98M, METAc ≈ $1.37M, SPCXc ≈ $0.85M, AMZNc ≈ $0.77M, TSLAc ≈ $0.61M, MSFTc ≈ $0.28M, SNDKc ≈ $0.25M, MSTRc ≈ $0.22M).

Note: base.org/stocks still labels AMZNc/MSFTc/MSTRc/SNDKc/SPCXc/TSLAc "Coming soon", but they have circulating supply and live pools → the page lags reality. COINc/CRCLc/INTCc have zero supply.

Contract code: B20 tokens return 0x (no bytecode) — they are precompiles, so Basescan shows no verified source. Registry 0x3f3E…5CaD has bytecode (3,098 hex chars).

## Chainlink "Coinbase <TICKER>" total-return feeds (8 decimals) — all last updated Friday 2026-09-04 (frozen over the weekend, as documented)

| Feed | Price | updatedAt (UTC) |
|---|---|---|
| Coinbase NVDA | 229.9573 | 2026-09-04 18:04 |
| Coinbase AAPL | 320.08 | 2026-09-04 19:58 |
| Coinbase GOOGL | 338.71195 | 2026-09-04 14:24 |
| Coinbase META | 615.23 | 2026-09-04 19:10 |
| Coinbase MSFT | 499.778 | 2026-09-04 15:38 |
| Coinbase AMZN | 257.69395 | 2026-09-04 20:07 |
| Coinbase TSLA | 353.33495 | 2026-09-04 20:02 |
| Coinbase MSTR | 142.63235 | 2026-09-04 21:29 |
| Coinbase SNDK | 1732.8674 | 2026-09-04 20:17 |
| Coinbase SPCX | 148.10 | 2026-09-04 19:53 |
| Coinbase COIN | 184.735 | 2026-09-04 20:01 |
| Coinbase CRCL | 101.65745 | 2026-09-04 19:03 |
| Coinbase INTC | 95.61505 | 2026-09-04 19:55 |

## DEX venues (DexScreener, same timestamp) — premium/discount vs the Chainlink reference

| Token | Venue / pair | Pool | Price | Premium vs ref | Liquidity | 24h volume | 24h txns |
|---|---|---|---|---|---|---|---|
| NVDAc | Aerodrome NVDAc/USDC | 0x853F5f1B92b16714Fe6CDA67CAad0856B83C7ab9 | $232.38 | +1.05% | $2.49M | $3.04M | 6,039 |
| GOOGLc | Aerodrome GOOGLc/USDC | 0xB1987CAD1682841b4b641d50E520777eC5Ab5542 | $339.24 | +0.16% | $1.64M | $2.86M | 2,975 |
| AAPLc | Aerodrome AAPLc/USDC | 0xA3b1E3f9747065e2073722Ff4c9027d3eA4994F0 | $320.74 | +0.21% | $1.42M | $2.67M | 2,569 |
| METAc | Aerodrome METAc/USDC | 0xEAF57753BC382E0324a1D43F72E7027705a2273E | $613.22 | −0.33% | $1.27M | $2.42M | 2,740 |
| MSFTc | Aerodrome MSFTc/USDC | 0x7103eB3c9590d1281f7dc03b2A9EE27C39dF5D54 | $504.69 | +0.98% | $118K | $488K | 3,754 |
| SNDKc | Aerodrome SNDKc/USDC | 0x5A8236f575471e7BfCA2C8462a200c28f737246E | $1,784.69 | +2.99% | $175K | $333K | 1,000 |
| SPCXc | Uniswap v3 SPCXc/USDC | 0x127a12FC0953ab2ab89558c67Ba6D597D7140431 | $151.37 | +2.21% | $28K | $503 | 21 |
| MSTRc | Uniswap v4 MSTRc/USDC | (v4 pool id 0x17ec…df8d) | $148.51 | +4.12% | $3.9K | $800 | 27 |
| AMZNc | Uniswap v4 AMZNc/ETH | (v4 pool id 0x893d…c635) | $284.91 | +10.56% | $3.7K | $68 | 7 |
| TSLAc | Uniswap v4 TSLAc/STC | (v4 pool id 0xfef5…39f5) | $1,274.94 | +261% | $110K | $7.7K | 32 |

Findings that matter for product design:
- Four Aerodrome pools (NVDAc, GOOGLc, AAPLc, METAc) carry ~$2.4–3.0M/day each; the long tail is thin or dislocated.
- Weekend premium exists even on deep pools (NVDAc +1.05%), because the reference is Friday's close while the pool trades 24/7.
- Lookalike risk is real: the TSLAc "pair" quotes 3.6× the reference against **STC = "StudentCoin"** at 0xB200000000000000000000CfCD1d711EEf213b01 — a third-party B20 token (18 decimals, 1B supply). The 0xB2000… prefix does **not** mean Coinbase issued it; only the addresses on coinbase.com/tokenize / docs.base.org are Coinbase's.
- Standard DEX slippage protection compares you with the pool's own quote, so it cannot protect a buyer from paying a 10% or 261% premium to the real stock.
