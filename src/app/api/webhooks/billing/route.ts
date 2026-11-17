import { NextResponse } from "next/server";
import { BillingEventRejectedError, BillingWebhookRejectedError, getBillingProvider, type NormalizedBillingEvent } from "@/lib/billing/provider";
import { processVerifiedBillingEvent } from "@/lib/billing/process-event";

export const dynamic = "force-dynamic";
const MAX_WEBHOOK_BYTES = 1024 * 1024;

async function readRawBody(request: Request): Promise<Uint8Array | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0 || declaredLength > MAX_WEBHOOK_BYTES) return null;
  }

  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_WEBHOOK_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function POST(request: Request) {
  const selection = getBillingProvider();
  if (!selection.available) {
    return NextResponse.json({ error: "BILLING_PROVIDER_UNAVAILABLE" }, { status: 503 });
  }

  let rawBody: Uint8Array | null;
  try {
    rawBody = await readRawBody(request);
  } catch {
    return NextResponse.json({ error: "BILLING_WEBHOOK_BODY_INVALID" }, { status: 400 });
  }
  if (!rawBody) return NextResponse.json({ error: "BILLING_WEBHOOK_TOO_LARGE" }, { status: 413 });

  let event: NormalizedBillingEvent;
  try {
    // The adapter verifies the exact received bytes; never parse and re-serialize before verification.
    event = await selection.provider.verifyWebhook(rawBody, request.headers);
  } catch (error) {
    if (error instanceof BillingWebhookRejectedError) {
      return NextResponse.json({ error: "BILLING_WEBHOOK_REJECTED" }, { status: 400 });
    }
    return NextResponse.json({ error: "BILLING_WEBHOOK_VERIFICATION_UNAVAILABLE" }, { status: 500 });
  }

  try {
    const outcome = await processVerifiedBillingEvent(selection.provider.id, event);
    return NextResponse.json({ received: true, duplicate: outcome.duplicate, result: outcome.result });
  } catch (error) {
    if (error instanceof BillingEventRejectedError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    // A retryable status lets the provider redeliver after transient persistence failures.
    return NextResponse.json({ error: "BILLING_WEBHOOK_PROCESSING_FAILED" }, { status: 500 });
  }
}
