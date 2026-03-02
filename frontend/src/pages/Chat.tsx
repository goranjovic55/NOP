import React, { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "falke";
  content: string;
  timestamp: Date;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, session_id: sessionId }),
      });

      if (!res.ok) throw new Error("Chat failed");

      const data = await res.json();
      const falkeMsg: Message = {
        id: crypto.randomUUID(),
        role: "falke",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, falkeMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "falke",
        content: "[ERROR] Connection failed. Falke unreachable.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-cyber-gray pb-4 mb-4">
        <h2 className="text-cyber-red text-2xl font-bold tracking-wider cyber-glow-red">
          ◈ FALKE
        </h2>
        <p className="text-cyber-gray-light text-sm mt-1 font-mono">
          Direct neural link. No filters.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="text-cyber-gray text-center mt-20 font-mono">
            <div className="text-4xl mb-4">◈</div>
            <div>Falke is listening.</div>
            <div className="text-xs mt-2 text-cyber-gray-light">
              Type your query below.
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 font-mono text-sm ${
                msg.role === "user"
                  ? "bg-cyber-darker border border-cyber-purple text-cyber-purple"
                  : "bg-cyber-darker border border-cyber-red text-cyber-gray-light"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-bold ${
                    msg.role === "user" ? "text-cyber-purple" : "text-cyber-red"
                  }`}
                >
                  {msg.role === "user" ? "▸ YOU" : "◈ FALKE"}
                </span>
                <span className="text-cyber-gray text-xs">
                  {msg.timestamp.toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-cyber-darker border border-cyber-red p-3 font-mono text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-cyber-red text-xs font-bold">◈ FALKE</span>
                <span className="text-cyber-gray text-xs animate-pulse">typing...</span>
              </div>
              <div className="text-cyber-gray">_</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-cyber-gray pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter message..."
            className="flex-1 bg-cyber-darker border border-cyber-gray p-3 text-cyber-gray-light font-mono text-sm focus:border-cyber-red focus:outline-none focus:cyber-glow-red"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-cyber-red border border-cyber-red px-6 py-3 text-cyber-black font-bold font-mono text-sm hover:bg-cyber-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ▸ SEND
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
