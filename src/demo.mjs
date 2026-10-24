import { createBlockchainIQBriefTool, ENDPOINT, SAMPLE } from "./brief-tool.mjs";

const flags = process.argv.slice(2);
if (flags.length !== 1 || !["--probe", "--sample", "--paid"].includes(flags[0])) {
  console.error("Usage: node src/demo.mjs --sample|--probe|--paid");
  process.exitCode = 2;
} else if (flags[0] === "--sample") {
  const response = await fetch(SAMPLE, { signal: AbortSignal.timeout(20_000), redirect: "error" });
  if (!response.ok) throw new Error("Free sample HTTP " + response.status);
  const envelope = await response.json();
  console.log(JSON.stringify({source: "Blockchain IQ", type: "free_sample",
    ok: true, fields: Object.keys(envelope).slice(0,15)}, null, 2));
} else if (flags[0] === "--probe") {
  const response = await fetch(ENDPOINT, { signal: AbortSignal.timeout(20_000), redirect: "error" });
  console.log(JSON.stringify({
    endpoint: ENDPOINT, httpStatus: response.status,
    advertisedX402: response.status === 402 && !!response.headers.get("payment-required"),
    paid: false,
  }, null, 2));
  if (response.status !== 402 || !response.headers.get("payment-required")) process.exitCode = 1;
} else {
  if (process.env.BLOCKCHAINIQ_CONFIRM_0_01_USDC !== "YES") {
    throw new Error("Not authorized: --paid requires BLOCKCHAINIQ_CONFIRM_0_01_USDC=YES for one paid call.");
  }
  const rawKey = process.env.BLOCKCHAINIQ_TEST_WALLET_PRIVATE_KEY;
  if (!/^0x[a-fA-F0-9]{64}$/.test(rawKey || "")) {
    throw new Error("Inject a dedicated low-balance test wallet key privately via environment.");
  }
  const { privateKeyToAccount } = await import("viem/accounts");
  const { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } = await import("@x402/fetch");
  const { ExactEvmScheme } = await import("@x402/evm/exact/client");
  const account = privateKeyToAccount(rawKey);
  const client = x402Client.fromConfig({
    schemes: [{ network: "eip155:8453", client: new ExactEvmScheme(account) }],
    spendControls: { maxAmountPerPayment: 0.01 },
  });
  let settleReceipt = null;
  const paidFetch = wrapFetchWithPayment(async (...args) => {
    const r = await fetch(...args);
    const responseHeader = r.headers.get("payment-response");
    if (responseHeader) settleReceipt = decodePaymentResponseHeader(responseHeader);
    return r;
  }, client);
  const tool = createBlockchainIQBriefTool({ fetchImpl: paidFetch });
  const result = JSON.parse(await tool.invoke({}));
  if (!result.hasSettlementReceipt || !settleReceipt || !settleReceipt.transaction) {
    throw new Error("No valid settlement receipt: do not claim qualifying paid call.");
  }
  console.log(JSON.stringify({
    tool: tool.name, settled: true,
    network: settleReceipt.network, txHash: settleReceipt.transaction,
    payer: account.address, payloadSource: result.source,
  }, null, 2));
}
