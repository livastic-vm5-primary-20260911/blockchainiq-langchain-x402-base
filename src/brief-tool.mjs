import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const ENDPOINT = "https://www.blockchainiq.co/api/x402/v1/brief";
export const SAMPLE = "https://www.blockchainiq.co/api/x402/v1/sample";
const MAX_JSON_BYTES = 256_000;

// This is a genuine LangChain tool. Callers explicitly inject a fetch function;
// default plain fetch is read-only (returns HTTP 402) and cannot sign payment.
export function createBlockchainIQBriefTool({
  fetchImpl = globalThis.fetch,
  endpoint = ENDPOINT,
} = {}) {
  if (endpoint !== ENDPOINT) {
    throw new Error("Endpoint must remain the pinned Blockchain IQ brief URL.");
  }
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  return new DynamicStructuredTool({
    name: "blockchain_iq_crypto_market_brief",
    description: "Fetch one Blockchain IQ crypto market brief covering BTC, ETH, SOL, XRP and market/event risks. Paid cost is 0.01 USDC on Base via a separately authorized x402 fetch. Not trading advice.",
    schema: z.object({}).strict(),
    func: async () => {
      const response = await fetchImpl(ENDPOINT, {
        method: "GET", headers: { accept: "application/json" },
        signal: AbortSignal.timeout(20_000), redirect: "error",
      });
      if (response.status === 402) {
        throw new Error("PAYMENT_REQUIRED: HTTP 402; this invocation did not purchase data. Inject an authorized x402 paid fetch.");
      }
      if (!response.ok) throw new Error("Blockchain IQ HTTP " + response.status);
      if (Number(response.headers.get("content-length") ?? 0) > MAX_JSON_BYTES) {
        throw new Error("Oversize response");
      }
      const body = await response.text();
      if (Buffer.byteLength(body, "utf8") > MAX_JSON_BYTES) {
        throw new Error("Oversize response body");
      }
      let parsed;
      try { parsed = JSON.parse(body); }
      catch { throw new Error("Expected JSON, received malformed body"); }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Expected JSON object");
      }
      return JSON.stringify({
        source: "Blockchain IQ",
        resource: "brief",
        hasSettlementReceipt: !!response.headers.get("payment-response"),
        data: parsed.data ?? parsed,
      });
    },
  });
}
