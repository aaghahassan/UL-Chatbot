export type ExportMessage = {
  role: string;
  content: string;
  createdAt?: string;
};

export type ExportConversation = {
  id: number;
  title: string;
  messages: ExportMessage[];
};

function safeFileName(title: string): string {
  const base = title.replace(/[<>:"/\\|?*]+/g, " ").replace(/\s+/g, " ").trim() || "chat";
  return base.slice(0, 60);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function markdownToHtml(raw: string): string {
  const escaped = escapeHtml(raw);
  const lines = escaped.split("\n");
  const out: string[] = [];
  let inList = false;

  const flushList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  const inline = (line: string) =>
    line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/`(.*?)`/g, "<code>$1</code>");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (/^[-*] /.test(trimmed)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(trimmed.replace(/^[-*] /, ""))}</li>`);
      continue;
    }
    flushList();
    if (/^### /.test(trimmed)) {
      out.push(`<h3>${inline(trimmed.slice(4))}</h3>`);
    } else if (/^## /.test(trimmed)) {
      out.push(`<h2>${inline(trimmed.slice(3))}</h2>`);
    } else if (/^---$/.test(trimmed)) {
      out.push("<hr />");
    } else {
      out.push(`<p>${inline(trimmed)}</p>`);
    }
  }
  flushList();
  return out.join("\n");
}

function conversationHtml(conv: ExportConversation): string {
  const blocks = conv.messages
    .map((msg) => {
      const who = msg.role === "user" ? "You" : "AI Assistant";
      const when = formatTime(msg.createdAt);
      return `<article class="${msg.role === "user" ? "user" : "assistant"}">
  <header><span>${who}</span>${when ? `<time>${escapeHtml(when)}</time>` : ""}</header>
  <div class="body">${markdownToHtml(msg.content)}</div>
</article>`;
    })
    .join("\n");

  return `<section class="chat">
  <h2>${escapeHtml(conv.title || "Untitled chat")}</h2>
  ${blocks || "<p>No messages in this chat.</p>"}
</section>`;
}

function wrapDocument(title: string, body: string): string {
  const generated = new Date().toLocaleString();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; max-width: 44rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; color: #222; background: #f7f7f7; line-height: 1.55; }
    header.top { border-bottom: 2px solid #e89b16; padding-bottom: 1rem; margin-bottom: 2rem; }
    header.top h1 { font-family: Arial, sans-serif; font-size: 1.35rem; margin: 0 0 0.25rem; }
    header.top p { margin: 0; color: #555; font-size: 0.9rem; font-family: Arial, sans-serif; }
    .chat { background: #fff; border: 1px solid #e6e6e6; border-radius: 12px; padding: 1.25rem 1.25rem 0.5rem; margin-bottom: 1.5rem; }
    .chat h2 { font-family: Arial, sans-serif; font-size: 1.1rem; margin: 0 0 1rem; }
    article { margin: 0 0 1rem; padding: 0.85rem 1rem; border-radius: 10px; }
    article.user { background: #fff7ea; border-left: 4px solid #e89b16; }
    article.assistant { background: #f3faf6; border-left: 4px solid #1f8a4d; }
    article header { display: flex; justify-content: space-between; gap: 1rem; font-family: Arial, sans-serif; font-size: 0.75rem; letter-spacing: 0.04em; text-transform: uppercase; color: #666; margin-bottom: 0.4rem; }
    .body p, .body li { margin: 0.35rem 0; }
    .body ul { margin: 0.4rem 0 0.4rem 1.2rem; padding: 0; }
    .body h2, .body h3 { font-family: Arial, sans-serif; margin: 0.8rem 0 0.35rem; }
    a { color: #1f8a4d; }
    hr { border: 0; border-top: 1px solid #ddd; margin: 1rem 0; }
  </style>
</head>
<body>
  <header class="top">
    <h1>University of Layyah AI Assistant</h1>
    <p>Saved chat history for offline reading. Generated ${escapeHtml(generated)}.</p>
  </header>
  ${body}
</body>
</html>`;
}

function triggerDownload(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function fetchMessages(id: number): Promise<ExportMessage[]> {
  const res = await fetch(`/api/gemini/conversations/${id}/messages`, { credentials: "include" });
  if (!res.ok) throw new Error("Could not load that chat.");
  const data = (await res.json()) as ExportMessage[];
  return Array.isArray(data) ? data : [];
}

export async function downloadConversation(id: number, title: string): Promise<void> {
  const messages = await fetchMessages(id);
  const html = wrapDocument(
    `${title || "Chat"} - University of Layyah`,
    conversationHtml({ id, title, messages }),
  );
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(`UL-chat-${safeFileName(title)}-${stamp}.html`, html);
}

export async function downloadAllConversations(
  conversations: Array<{ id: number; title: string }>,
): Promise<void> {
  if (!conversations.length) throw new Error("There are no chats to download.");
  const exported: ExportConversation[] = [];
  for (const conv of conversations) {
    exported.push({
      id: conv.id,
      title: conv.title,
      messages: await fetchMessages(conv.id),
    });
  }
  const body = exported.map(conversationHtml).join("\n");
  const html = wrapDocument("University of Layyah chat history", body);
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(`UL-chat-history-${stamp}.html`, html);
}
