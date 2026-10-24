import assert from "node:assert/strict";
import test from "node:test";
import { createBlockchainIQBriefTool, ENDPOINT } from "../src/brief-tool.mjs";

function mockResponse(status, content, headers = {}) {
  return new Response(typeof content === "string" ? content : JSON.stringify(content), {
    status, headers: { "content-type": "application/json", ...headers },
  });
}
test("pinned endpoint prevents arbitrary paid URL use", () => {
  assert.throws(() => createBlockchainIQBriefTool({ endpoint: "https://other.example/pay" }), /pinned/);
});
test("real LangChain tool interface with injected paid fetch", async () => {
  const calls = [];
  const tool = createBlockchainIQBriefTool({ fetchImpl: async (...args) => {
    calls.push(args);
    return mockResponse(200, { data: { markets: [{coin:"btc",price:1}] } }, { "payment-response": "mock" });
  } });
  assert.equal(tool.name, "blockchain_iq_crypto_market_brief");
  const parsed = JSON.parse(await tool.invoke({}));
  assert.deepEqual(parsed.data, { markets: [{coin:"btc",price:1}] });
  assert.equal(parsed.hasSettlementReceipt, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], ENDPOINT);
  assert.equal(calls[0][1].method, "GET");
});
test("HTTP 402 without paid fetch fails closed", async () => {
  const tool = createBlockchainIQBriefTool({
    fetchImpl: async () => mockResponse(402, { error: "Payment Required" }, { "payment-required": "mock" }),
  });
  await assert.rejects(() => tool.invoke({}), /PAYMENT_REQUIRED/);
});
test("HTTP 404 fails closed", async () => {
  await assert.rejects(() => createBlockchainIQBriefTool({
    fetchImpl: async () => mockResponse(404, {error:"Not Found"}),
  }).invoke({}), /HTTP 404/);
});
test("invalid JSON fails without claiming success", async () => {
  await assert.rejects(() => createBlockchainIQBriefTool({
    fetchImpl: async () => mockResponse(200, "not json"),
  }).invoke({}), /Expected JSON/);
});
test("nonobject JSON envelope fails", async () => {
  await assert.rejects(() => createBlockchainIQBriefTool({
    fetchImpl: async () => mockResponse(200, "[1,2]"),
  }).invoke({}), /Expected JSON object/);
});
test("oversized responses bounded", async () => {
  await assert.rejects(() => createBlockchainIQBriefTool({
    fetchImpl: async () => mockResponse(200, {big:"x".repeat(300_000)}),
  }).invoke({}), /Oversize/);
});
