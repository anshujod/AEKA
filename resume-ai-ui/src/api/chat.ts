const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function sendMessage(message: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  if (!res.ok) {
    const errorText = await safeText(res);
    throw new Error(errorText || `Request failed with status ${res.status}`);
  }

  // If server streams, fall back to full text here.
  return safeText(res);
}

export async function sendMessageStream(
  message: string,
  onToken: (token: string) => void
): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  if (!res.ok) {
    const errorText = await safeText(res);
    throw new Error(errorText || `Request failed with status ${res.status}`);
  }

  // If streaming not supported, fall back to full text
  if (!res.body) {
    const fullText = await safeText(res);
    onToken(fullText);
    return fullText;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      full += chunk;
      onToken(chunk);
    }
  }

  // Flush any remaining decoded text.
  const tail = decoder.decode();
  if (tail) {
    full += tail;
    onToken(tail);
  }

  return full.trim();
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text())?.trim();
  } catch {
    return "";
  }
}
