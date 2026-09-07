Source: https://docs.base.org/sdks/base-account/overview
Title: Base Account SDK
Fetched: 2026-09-07T11:13:57.232Z

> ## Documentation Index
> 
> Fetch the complete documentation index at: https://docs.base.org/llms.txt
> Use this file to discover all available pages before exploring further.

# Base Account SDK

> Add universal sign-in and one-tap USDC payments to any app with the Base Account SDK — the onchain account layer powering the Base App.

The Base Account SDK connects your app to the onchain accounts that power the Base App — over one hundred thousand users with a passkey-backed Smart Wallet. Add sign-in and USDC payments in a few lines; users hold their own keys and you never touch private data or funds.

## Universal Sign-In

One passkey works across every Base-enabled app — no installs, seed phrases, or network switches.

## One-Tap Payments

A single `pay()` call handles gas and USDC settlement.

## Base Verify

Prove verified account ownership and add Sybil-resistant identity checks.

## Recurring Payments

Create and charge USDC subscriptions with the Base Account SDK.

## Install

```bash
npm install @base-org/account

```

```bash
pnpm add @base-org/account

```

```bash
yarn add @base-org/account

```

## Quickstart

## Accept a Payment

Call `pay()` with an amount and a recipient to collect USDC.

```typescript
import { pay } from '@base-org/account';

const payment = await pay({ amount: "5.00", to: "0xRecipient" });
console.log(`Sent — transaction ID: ${payment.id}`);

```

## Sign a User In

Use Sign in with Base to authenticate with a passkey — no password, no email round-trip.

## Authenticate Users

Wire up Sign in with Base in your web or React app.

## Go Deeper

Pick a framework or explore the full API surface below.

## Explore

## Get Started

Build and run in five minutes on web, React, or mobile.

## Framework Integrations

Drop into Wagmi, Privy, RainbowKit, Reown, or thirdweb.

## Base Pay Reference

Every method — `pay`, `getPaymentStatus`, subscriptions, and charges.

## Provider RPC Methods

The EIP-1193 provider surface exposed by the SDK.