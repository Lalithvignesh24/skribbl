import { useState } from "react";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";

export default function ChatPanel({ messages, onSend }) {
  const [input, setInput] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <section className="flex h-full flex-col rounded-2xl bg-slate-100 text-slate-900 shadow-xl">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {!messages.length ? (
          <EmptyState text="No messages yet. Start guessing!" />
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-xl px-3 py-2 text-sm ${
                message.type === "system" ? "bg-amber-100 text-amber-900" : "bg-white"
              }`}
            >
              <span className="mr-1 font-semibold">{message.playerName}:</span>
              <span>{message.text}</span>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-200 p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your guess..."
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-400"
        />
        <Button type="submit" className="bg-sky-600 text-white hover:bg-sky-500">
          Send
        </Button>
      </form>
    </section>
  );
}
