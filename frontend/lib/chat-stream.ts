import { env } from "@/lib/env";

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return undefined;
  }

  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));
  return match?.split("=")[1];
}

export async function streamAssistantChat(
  payload: {
    query: string;
    model: "llama3" | "mistral";
    top_k?: number;
    hybrid?: boolean;
    conversation_id?: string;
    document_ids?: string[];
  },
  handlers: {
    onContext?: (data: any) => void;
    onToken?: (token: string) => void;
    onDone?: (data: any) => void;
  }
) {
  const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/assistant/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": decodeURIComponent(readCookie("csrf_access_token") ?? "")
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(errorText || "Unable to stream assistant response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const line = event.split("\n").find((entry) => entry.startsWith("data: "));
      if (!line) {
        continue;
      }

      const data = JSON.parse(line.slice(6));
      if (data.type === "context") {
        handlers.onContext?.(data);
      }
      if (data.type === "token") {
        handlers.onToken?.(data.content);
      }
      if (data.type === "done") {
        handlers.onDone?.(data);
      }
    }
  }
}
