import { useEffect, useRef, useState } from "react";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";

export default function ChatPanel({
  messages,
  onSend,
  disabled,
  disabledReason,
  chatLocked = false,
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-slate-100 text-slate-900 shadow-xl">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-3"
      >
        {!messages.length ? (
          <EmptyState text="No messages yet. Start guessing!" />
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-xl px-3 py-2 text-sm ${
                message.isCorrect
                  ? "border border-emerald-400 bg-emerald-100 font-semibold text-emerald-900"
                  : message.isHidden
                    ? "border border-slate-300 bg-slate-200 italic text-slate-600"
                    : message.type === "system"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-white"
              }`}
            >
              {message.isCorrect || message.isHidden ? (
                <span>{message.text}</span>
              ) : (
                <>
                  <span className="mr-1 font-semibold">{message.playerName}:</span>
                  <span>{message.text}</span>
                </>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 flex flex-col gap-1 border-t border-slate-200 bg-slate-100 p-2"
      >
        {disabled && disabledReason && (
          <p className="text-xs font-semibold text-slate-600">{disabledReason}</p>
        )}
        {chatLocked && !disabled && (
          <p className="text-xs font-semibold text-emerald-700">
            You guessed correctly — chat freely, but don&apos;t spoil the answer!
          </p>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              disabled
                ? disabledReason || "Chat unavailable"
                : chatLocked
                  ? "Chat with others..."
                  : "Type your guess..."
            }
            disabled={disabled}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-200"
          />
          <Button
            type="submit"
            disabled={disabled}
            className="bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50"
          >
            Send
          </Button>
        </div>
      </form>
    </section>
  );
}
