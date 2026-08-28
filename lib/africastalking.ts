import crypto from "node:crypto";
import https from "node:https";

// Africa's Talking's API servers require legacy TLS renegotiation. OpenSSL 3.0+
// (bundled with modern Node.js, same as modern Python) disables this by default,
// which surfaces as a handshake failure. This mirrors the ssl.OP_LEGACY_SERVER_CONNECT
// patch already used on the Python side of this project.
const legacyTlsAgent = new https.Agent({
  keepAlive: true,
  secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
});

const AT_ENV = process.env.AT_ENV === "production" ? "production" : "sandbox";
const AT_HOST =
  AT_ENV === "production" ? "api.africastalking.com" : "api.sandbox.africastalking.com";

export interface SendResult {
  number: string;
  status: string;
  statusCode: number;
  cost?: string;
  messageId?: string;
}

export class AfricasTalkingConfigError extends Error {}

function getCredentials() {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  if (!username || !apiKey) {
    throw new AfricasTalkingConfigError(
      "Missing AT_USERNAME / AT_API_KEY environment variables. Copy .env.local.example to .env.local and fill them in, then restart the dev server."
    );
  }
  return { username, apiKey };
}

/** Throws AfricasTalkingConfigError up front, before any batches are sent. */
export function assertConfigured(): void {
  getCredentials();
}

/** Sends one message to a batch of recipients in a single Africa's Talking API call. */
export async function sendBulkSms(params: {
  message: string;
  recipients: string[];
  senderId?: string;
}): Promise<SendResult[]> {
  const { username, apiKey } = getCredentials();

  const body = new URLSearchParams({
    username,
    to: params.recipients.join(","),
    message: params.message,
  });

  const sender = params.senderId?.trim() || process.env.AT_SENDER_ID?.trim();
  if (sender) body.set("from", sender);

  const bodyStr = body.toString();

  const responseText = await new Promise<string>((resolve, reject) => {
    const req = https.request(
      {
        method: "POST",
        hostname: AT_HOST,
        path: "/version1/messaging",
        agent: legacyTlsAgent,
        headers: {
          apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if ((res.statusCode ?? 500) >= 400) {
            reject(new Error(`Africa's Talking API error ${res.statusCode}: ${data}`));
          } else {
            resolve(data);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });

  let json: unknown;
  try {
    json = JSON.parse(responseText);
  } catch {
    throw new Error(`Unexpected response from Africa's Talking: ${responseText}`);
  }

  const recipients = (json as { SMSMessageData?: { Recipients?: SendResult[] } })?.SMSMessageData
    ?.Recipients;
  return recipients ?? [];
}
