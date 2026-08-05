import type { ToolContext } from "@lovable.dev/mcp-js";

export function notAuthenticated() {
  return {
    content: [{ type: "text" as const, text: "Nicht angemeldet. Bitte verbinde dich erneut über OAuth." }],
    isError: true,
  };
}

export function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function ok(text: string, structuredContent?: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text }], ...(structuredContent ? { structuredContent } : {}) };
}

export function requireAuth(ctx: ToolContext) {
  return ctx.isAuthenticated();
}
