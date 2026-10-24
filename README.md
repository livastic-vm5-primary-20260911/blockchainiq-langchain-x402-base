# Blockchain IQ + LangChain x402 on Base (independent integration)

Original minimal **LangChain DynamicStructuredTool** that fetches the Blockchain IQ crypto market brief through x402 v2 on **Base mainnet**. The official API currently asks **0.01 USDC** for this call. Built as an independent submission candidate for [Blockchain IQ's USDC builder bounty](https://www.blockchainiq.co/blog/x402-build-bounties). Not affiliated with Blockchain IQ. No award guaranteed.

## Zero-spend tests (Node.js 20+)

```sh
npm ci
npm test           # mocked success, 402, 404, malformed, oversize, URL pinning
npm run sample     # real free endpoint; no payment
npm run probe      # real x402 402 challenge; no payment
```

The source exports `createBlockchainIQBriefTool({ fetchImpl })`, a working LangChain tool accepting an injected HTTP client. It never holds private keys. Ordinary fetch cannot buy data and fails closed on HTTP 402.

## Optional paid call

The paid CLI uses the documented official `@x402/fetch` and `@x402/evm` clients and `viem` signer in an explicitly initiated call.

- Exactly pinned HTTPS domain and `/api/x402/v1/brief` path.
- Exact `eip155:8453` Base mainnet network.
- Max single payment `0.01` USD equivalent.
- Explicit CLI `--paid` and `BLOCKCHAINIQ_CONFIRM_0_01_USDC=YES` guards.
- Dedicated disposable signer injected privately at runtime using `BLOCKCHAINIQ_TEST_WALLET_PRIVATE_KEY`.
- No trading, withdrawals, ERC20 unlimited approvals, autonomous repeat loop or secret storage.
- Outputs the transaction hash only if a settlement header was returned.

**Do not** use a main wallet/private key. Never commit, print or paste a key into source, GitHub, CI or shell history. The paid mode spends real USDC; it must only be run with specific user approval for the purchase and verified payee.

```sh
# After securely configuring a disposable wallet and specifically authorizing the payment:
npm run paid
```

## Verified evidence and bounty status

| Check | As of 2026-10-24 |
| --- | --- |
| Node deterministic tests | 7 pass |
| Real free API sample | HTTP 200 |
| Real unpaid brief challenge | HTTP 402 with PAYMENT-REQUIRED |
| Real USDC x402 paid call | **NOT EXECUTED** |
| Settlement transaction hash | **NONE** |
| Claim email submitted | **NO** |
| Earned bounty | **0 USDC** |

The sponsor requires a public source repository, a genuine Base settlement transaction hash from a paid call made by this integration, the framework and credited name, and a recipient wallet address. Send those to `partnerships@blockchainiq.co` only when they actually exist. The first passing code+payment claim wins the available slot; a code repository alone does not qualify.

Sources: [official bounty](https://www.blockchainiq.co/blog/x402-build-bounties), [agent docs](https://www.blockchainiq.co/agents), [live catalog](https://www.blockchainiq.co/api/x402/v1).

Licensed MIT. Market data, not investment advice.
