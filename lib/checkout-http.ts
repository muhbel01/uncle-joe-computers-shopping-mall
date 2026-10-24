export const MAX_CHECKOUT_BODY_BYTES = 64 * 1024;

export type CheckoutJsonReadResult =
  | { ok: true; body: unknown }
  | { ok: false; status: 400 | 413 | 415; error: string };

const tooLargeMessage = "Your checkout request is too large. Please reduce the cart and try again.";

export async function readCheckoutJson(request: Request): Promise<CheckoutJsonReadResult> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return { ok: false, status: 415, error: "Submit checkout details using JSON." };
  }

  const declaredLengthHeader = request.headers.get("content-length");
  if (declaredLengthHeader !== null) {
    const declaredLength = Number(declaredLengthHeader);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_CHECKOUT_BODY_BYTES) {
      return { ok: false, status: 413, error: tooLargeMessage };
    }
  }

  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400, error: "Please submit valid checkout details." };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_CHECKOUT_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413, error: tooLargeMessage };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return { ok: true, body };
  } catch {
    return { ok: false, status: 400, error: "Please submit valid checkout details." };
  }
}
