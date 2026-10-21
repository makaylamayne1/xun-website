// AWS Lambda Node.js 24.x. Handler: index.handler.
// Use API Gateway HTTP API, payload format 2.0, with CORS configured there.
// No secret keys belong in the React application.

let sesClient;

function reply(statusCode, message, success = false) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
    body: JSON.stringify({ success, message }),
  };
}

function header(event, name) {
  const match = Object.entries(event.headers || {}).find(([key]) => key.toLowerCase() === name);
  return typeof match?.[1] === "string" ? match[1] : "";
}

function isEmail(value) {
  return typeof value === "string" && value.length <= 254 &&
    /^[\x21-\x7E]+$/.test(value) &&
    /^[^@\s<>,;:"()[\]\\]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value) &&
    !value.split("@")[0].startsWith(".") && !value.split("@")[0].endsWith(".") &&
    !value.includes("..");
}

async function verifyWithCloudflare({ token, secret, ip }) {
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("TurnstileServiceUnavailable");
  return response.json();
}

async function sendWithSes(input, region) {
  // The supported AWS Lambda Node.js runtimes include AWS SDK v3.
  // Import only when sending; local tests use a fake sender.
  const { SESv2Client, SendEmailCommand } = await import("@aws-sdk/client-sesv2");
  if (!sesClient) sesClient = new SESv2Client({ region, maxAttempts: 1 });
  return sesClient.send(new SendEmailCommand(input));
}

function createHandler({
  env = process.env,
  verifyToken = verifyWithCloudflare,
  sendEmail = sendWithSes,
  logError = (name) => console.error(JSON.stringify({ error: name })),
} = {}) {
  return async function handle(event = {}) {
    const method = event.requestContext?.http?.method || event.httpMethod;
    const allowedOrigins = (env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
    const origin = header(event, "origin");
    const originsValid = allowedOrigins.length > 0 && allowedOrigins.every((value) => {
      try {
        const url = new URL(value);
        return ["https:", "http:"].includes(url.protocol) && url.origin === value;
      } catch {
        return false;
      }
    });
    if (!originsValid) {
      return reply(503, "The contact service is not configured.");
    }
    if (!origin || !allowedOrigins.includes(origin)) return reply(403, "This website is not allowed.");
    if (method === "OPTIONS") return { statusCode: 204, body: "" };
    if (method !== "POST") return reply(405, "Use POST for this endpoint.");
    if (!header(event, "content-type").toLowerCase().startsWith("application/json")) {
      return reply(415, "Send JSON data.");
    }
    if (!env.TURNSTILE_SECRET_KEY || !isEmail(env.CONTACT_FROM) || !isEmail(env.CONTACT_TO)) {
      return reply(503, "The contact service is not configured.");
    }

    let data;
    try {
      if (typeof event.body !== "string") return reply(400, "The message is missing.");
      const body = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
      if (Buffer.byteLength(body, "utf8") > 32768) return reply(413, "The message is too large.");
      data = JSON.parse(body);
      if (!data || typeof data !== "object" || Array.isArray(data)) return reply(400, "Invalid form data.");
    } catch {
      return reply(400, "Invalid JSON data.");
    }

    const name = typeof data.name === "string" ? data.name.trim() : "";
    const email = typeof data.email === "string" ? data.email.trim() : "";
    const message = typeof data.message === "string" ? data.message.trim() : "";
    const token = typeof data.turnstileToken === "string" ? data.turnstileToken : "";
    if (!name || name.length > 100 || /[\r\n\0]/.test(name) || !isEmail(email) ||
        !message || message.length > 5000 || message.includes("\0")) {
      return reply(400, "Check your name, email, and message.");
    }
    if (!token || token.length > 2048) return reply(400, "Please complete the verification again.");

    let verification;
    try {
      verification = await verifyToken({
        token,
        secret: env.TURNSTILE_SECRET_KEY,
        ip: event.requestContext?.http?.sourceIp || event.requestContext?.identity?.sourceIp,
      });
    } catch (error) {
      logError(error.name || "TurnstileServiceUnavailable");
      return reply(503, "Verification is temporarily unavailable. Please try again.");
    }
    if (verification?.success !== true || verification.action !== "contact" ||
        verification.hostname !== new URL(origin).hostname) {
      return reply(403, "Verification failed or expired. Please complete it again.");
    }

    try {
      await sendEmail({
        FromEmailAddress: env.CONTACT_FROM,
        Destination: { ToAddresses: [env.CONTACT_TO] },
        ReplyToAddresses: [email],
        Content: {
          Simple: {
            Subject: { Data: "Website message from " + name, Charset: "UTF-8" },
            Body: {
              Text: {
                Data: message + "\n\nName: " + name + "\nReply email: " + email,
                Charset: "UTF-8",
              },
            },
          },
        },
      }, env.SES_REGION || env.AWS_REGION);
      return reply(200, "Your message has been submitted.", true);
    } catch (error) {
      // Log an error name, never the message body, visitor email, or token.
      logError(error.name || "EmailServiceUnavailable");
      return reply(502, "Your message could not be sent. Please try again later.");
    }
  };
}

exports.createHandler = createHandler;
exports.handler = createHandler();
