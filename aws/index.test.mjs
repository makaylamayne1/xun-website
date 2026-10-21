import test from "node:test";
import assert from "node:assert/strict";
import backend from "./index.js";
const { createHandler } = backend;

const env = {
  ALLOWED_ORIGINS: "http://localhost:3000,https://www.example.com",
  CONTACT_FROM: "website@example.com",
  CONTACT_TO: "owner@example.com",
  TURNSTILE_SECRET_KEY: "fake-secret-for-unit-tests",
  SES_REGION: "us-east-2",
};
const form = { name: "Visitor", email: "visitor@example.org", message: "Hello.", turnstileToken: "fresh-token" };

function event(data = form) {
  return {
    version: "2.0",
    headers: { origin: "http://localhost:3000", "content-type": "application/json" },
    requestContext: { http: { method: "POST", sourceIp: "192.0.2.10" } },
    body: JSON.stringify(data),
  };
}

function setup(overrides = {}) {
  const sent = [];
  const verified = [];
  const handler = createHandler({
    env,
    verifyToken: async (input) => {
      verified.push(input);
      return { success: true, action: "contact", hostname: "localhost" };
    },
    sendEmail: async (input, region) => { sent.push({ input, region }); },
    logError: () => {},
    ...overrides,
  });
  return { handler, sent, verified };
}

test("validates the token and sends from the fixed verified identity to the fixed recipient", async () => {
  const { handler, sent, verified } = setup();
  const result = await handler(event({ ...form, to: "attacker@example.org", from: "spoofed@example.org" }));
  assert.equal(result.statusCode, 200);
  assert.equal(JSON.parse(result.body).success, true);
  assert.equal(verified[0].secret, env.TURNSTILE_SECRET_KEY);
  assert.equal(sent[0].input.FromEmailAddress, env.CONTACT_FROM);
  assert.deepEqual(sent[0].input.Destination.ToAddresses, [env.CONTACT_TO]);
  assert.deepEqual(sent[0].input.ReplyToAddresses, [form.email]);
  assert.equal(sent[0].region, "us-east-2");
  assert.equal(result.headers["Access-Control-Allow-Origin"], undefined);
});

test("rejects an unapproved origin before verification or email", async () => {
  const { handler, sent, verified } = setup();
  const input = event(); input.headers.origin = "https://attacker.example";
  assert.equal((await handler(input)).statusCode, 403);
  assert.equal(sent.length + verified.length, 0);
});

test("rejects missing origin", async () => {
  const { handler } = setup();
  const input = event(); delete input.headers.origin;
  assert.equal((await handler(input)).statusCode, 403);
});

test("rejects invalid or missing server configuration", async () => {
  for (const config of [{ ...env, ALLOWED_ORIGINS: "*" }, { ...env, ALLOWED_ORIGINS: "not-a-url" }, { ...env, TURNSTILE_SECRET_KEY: "" }]) {
    assert.equal((await setup({ env: config }).handler(event())).statusCode, 503);
  }
});

test("rejects malformed JSON and arrays", async () => {
  const { handler } = setup();
  const input = event(); input.body = "{bad json";
  assert.equal((await handler(input)).statusCode, 400);
  assert.equal((await handler(event([]))).statusCode, 400);
});

test("limits input sizes and rejects a newline in the subject name", async () => {
  const { handler, sent } = setup();
  for (const data of [
    { ...form, name: "Visitor\nInjected header" },
    { ...form, message: "x".repeat(5001) },
    { ...form, email: "a@example.com,other@example.com" },
  ]) assert.equal((await handler(event(data))).statusCode, 400);
  const input = event(); input.body = "x".repeat(32769);
  assert.equal((await handler(input)).statusCode, 413);
  assert.equal(sent.length, 0);
});

test("rejects missing verification without sending email", async () => {
  const { handler, sent } = setup();
  assert.equal((await handler(event({ ...form, turnstileToken: "" }))).statusCode, 400);
  assert.equal(sent.length, 0);
});

test("rejects failed verification, the wrong action, and the wrong hostname", async () => {
  for (const result of [
    { success: false },
    { success: true, action: "login", hostname: "localhost" },
    { success: true, action: "contact", hostname: "other.example" },
  ]) {
    const { handler, sent } = setup({ verifyToken: async () => result });
    assert.equal((await handler(event())).statusCode, 403);
    assert.equal(sent.length, 0);
  }
});

test("fails closed when Cloudflare is unavailable", async () => {
  const { handler, sent } = setup({ verifyToken: async () => { throw new Error("timeout"); } });
  assert.equal((await handler(event())).statusCode, 503);
  assert.equal(sent.length, 0);
});

test("does not report success when SES rejects the message", async () => {
  const { handler } = setup({ sendEmail: async () => { throw new Error("SES unavailable"); } });
  const result = await handler(event());
  assert.equal(result.statusCode, 502);
  assert.equal(JSON.parse(result.body).success, false);
});

test("accepts a base64-encoded API Gateway request", async () => {
  const { handler, sent } = setup();
  const input = event();
  input.body = Buffer.from(input.body).toString("base64"); input.isBase64Encoded = true;
  assert.equal((await handler(input)).statusCode, 200);
  assert.equal(sent.length, 1);
});

test("responds to preflight and rejects an unsupported method", async () => {
  const { handler, sent } = setup();
  const input = event(); input.requestContext.http.method = "OPTIONS";
  assert.equal((await handler(input)).statusCode, 204);
  input.requestContext.http.method = "GET";
  assert.equal((await handler(input)).statusCode, 405);
  assert.equal(sent.length, 0);
});
