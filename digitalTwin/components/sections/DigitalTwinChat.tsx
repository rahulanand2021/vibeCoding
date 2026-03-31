"use client";

import { useMemo, useState } from "react";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { profile } from "@/lib/profile";

type MessageRole = "user" | "assistant";

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};

function nowISOString() {
  return new Date().toISOString();
}

export function DigitalTwinChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const history = useMemo(() =>
    messages.map((msg) => ({ role: msg.role, content: msg.content })),
    [messages]
  );

  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      createdAt: nowISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);
    setError(null);
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, history }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Chat API request failed.");
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.content || "",
        createdAt: nowISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("DigitalTwinChat send error", err);
      setError((err as Error).message || "Unexpected error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Section id="digital-twin" aria-labelledby="digital-twin-heading" className="py-20 md:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-border glass px-6 py-14 md:px-14 md:py-16">
          <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl" aria-hidden />
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Digital Twin</p>
            <h2 id="digital-twin-heading" className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Ask about my career and experience
            </h2>
            <p className="mt-4 max-w-2xl text-base text-muted">
              Chat with a digital twin trained on my profile for tailored career & technical answers.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mt-8 grid gap-4">
              <div className="min-h-[240px] max-h-[420px] overflow-y-auto rounded-xl border border-base bg-surface p-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted">Ask me anything about my career history, leadership, architecture, or mentorship.</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`mb-3 rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-foreground/10 text-foreground self-end"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-wide text-muted">
                        {message.role === "user" ? profile.name : "Digital Twin"}
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                    </div>
                  ))
                )}
              </div>

              {error && <p className="text-sm text-error">{error}</p>}

              <form className="flex gap-3" onSubmit={send}>
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Type a question about my career..."
                  className="flex-1 rounded-lg border border-border px-4 py-2 bg-background text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-canvas transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSending || input.trim().length === 0}
                >
                  {isSending ? "Sending..." : "Send"}
                </button>
              </form>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
