import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  api_calls?: ApiCall[];
}

interface ApiCall {
  id: string;
  method: string;
  endpoint: string;
  request: object;
  response?: object;
  status?: number;
}

interface Session {
  id: string;
  name: string;
  updated_at: string;
}

const Chat: React.FC = () => {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("MiniMax-M2.5");
  const [showConfig, setShowConfig] = useState(false);
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);
  const [config, setConfig] = useState({
    provider: "minimax",
    api_endpoint: "https://api.minimax.io/v1/text/chatcompletion_v2",
    api_key: "",
    model: "MiniMax-M2.5",
    max_tokens: 4096,
    temperature: 0.7,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
    loadConfig();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch("/api/v1/llm/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/v1/llm/config", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        // API key is masked as '***xxxx' when set, or empty when not set
        setApiConfigured(!!(data.api_key && !data.api_key.startsWith("***") ? true : data.api_key?.length > 0));
      }
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  };

  const saveConfig = async () => {
    try {
      const res = await fetch("/api/v1/llm/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setShowConfig(false);
        await loadConfig();
      }
    } catch (err) {
      console.error("Failed to save config:", err);
    }
  };

  const createNewSession = () => {
    const newSession: Session = {
      id: crypto.randomUUID(),
      name: `Session ${sessions.length + 1}`,
      updated_at: new Date().toISOString(),
    };
    setSessions([newSession, ...sessions]);
    setActiveSession(newSession.id);
    setMessages([]);
  };

  const deleteSession = async (id: string) => {
    try {
      await fetch(`/api/v1/llm/sessions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(sessions.filter((s) => s.id !== id));
      if (activeSession === id) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const loadSession = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/llm/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(id);
        setMessages(
          data.messages.map((m: { role: string; content: string }, i: number) => ({
            id: `${id}-${i}`,
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(),
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  };

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

    // Add API call to inspector
    const callId = crypto.randomUUID();
    const newCall: ApiCall = {
      id: callId,
      method: "POST",
      endpoint: "/api/v1/llm/chat",
      request: { message: userMsg.content, session_id: activeSession, model },
    };
    setApiCalls((prev) => [...prev, newCall]);

    try {
      const res = await fetch("/api/v1/llm/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMsg.content,
          session_id: activeSession,
          model,
        }),
      });

      // Update API call with response
      const responseBody = res.ok ? await res.clone().json().catch(() => null) : await res.clone().text().catch(() => null);
      setApiCalls((prev) =>
        prev.map((c) =>
          c.id === callId
            ? { ...c, status: res.status, response: responseBody }
            : c
        )
      );

      if (!res.ok) throw new Error("Chat failed");

      const data = await res.json();
      const falkeMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, falkeMsg]);

      // Refresh sessions
      loadSessions();
    } catch (err) {
      setApiCalls((prev) =>
        prev.map((c) =>
          c.id === callId
            ? { ...c, status: 500, response: { error: String(err) } }
            : c
        )
      );
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "[ERROR] Connection failed. LLM unreachable.",
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
    <div className="flex flex-col h-full" style={{ backgroundColor: "#0a0a0a", color: "#e0e0e0", fontFamily: "monospace" }}>
      {/* API NOT CONFIGURED BANNER */}
      {apiConfigured === false && (
        <div
          className="flex items-center justify-between px-4 py-2 text-sm"
          style={{ backgroundColor: "rgba(255,0,64,0.12)", borderBottom: "1px solid rgba(255,0,64,0.4)" }}
        >
          <span style={{ color: "#ff0040" }}>
            ⚠ LLM API provider not configured. Chat will not work until an API key is set.
          </span>
          <button
            onClick={() => navigate("/settings")}
            className="ml-4 px-3 py-1 text-xs font-bold hover:opacity-80"
            style={{ backgroundColor: "#ff0040", color: "#0a0a0a" }}
          >
            Configure in Settings →
          </button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
      {/* LEFT COLUMN: Session Folders */}
      <div
        className="w-64 flex flex-col border-r"
        style={{ borderColor: "rgba(255,0,64,0.3)" }}
      >
        <div className="p-4 border-b" style={{ borderColor: "rgba(255,0,64,0.3)" }}>
          <h2 className="text-lg font-bold" style={{ color: "#ff0040" }}>
            ◈ SESSIONS
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 && (
            <div className="text-sm p-2 opacity-50">No sessions</div>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              className="group flex items-center justify-between p-2 mb-1 cursor-pointer hover:bg-white/5"
              style={{
                backgroundColor: activeSession === session.id ? "rgba(255,0,64,0.2)" : "transparent",
              }}
              onClick={() => loadSession(session.id)}
            >
              <span className="text-sm truncate flex-1">{session.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-xs hover:text-red-500 px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="p-2 border-t" style={{ borderColor: "rgba(255,0,64,0.3)" }}>
          <button
            onClick={createNewSession}
            className="w-full py-2 text-sm font-bold hover:bg-white/5"
            style={{ color: "#ff0040" }}
          >
            + NEW SESSION
          </button>
        </div>
      </div>

      {/* CENTER COLUMN: Message Thread + Model Selector */}
      <div className="flex-1 flex flex-col">
        {/* Header with model selector */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: "rgba(255,0,64,0.3)" }}
        >
          <h2 className="text-xl font-bold tracking-wider" style={{ color: "#ff0040" }}>
            ◈ FALKE
          </h2>
          <div className="flex items-center gap-4">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-black border text-sm px-3 py-1 focus:outline-none"
              style={{
                borderColor: "rgba(255,0,64,0.3)",
                color: "#e0e0e0",
              }}
            >
              <option value="MiniMax-M2.5">MiniMax-M2.5</option>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
              <option value="claude-opus-4-6">Claude Opus 4.6</option>
              <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
            </select>
            <button
              onClick={() => {
                loadConfig();
                setShowConfig(true);
              }}
              className="text-sm hover:text-white/70"
            >
              ⚙
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center mt-20 opacity-50">
              <div className="text-4xl mb-4">◈</div>
              <div>Falke is listening.</div>
              <div className="text-xs mt-2">Type your query below.</div>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[80%] p-3 text-sm"
                style={{
                  backgroundColor: "#111",
                  border: `1px solid ${msg.role === "user" ? "rgba(147,51,234,0.5)" : "rgba(255,0,64,0.3)"}`,
                  color: msg.role === "user" ? "#a78bfa" : "#e0e0e0",
                }}
              >
                <div className="flex items-center gap-2 mb-1 text-xs opacity-70">
                  <span>{msg.role === "user" ? "▸ YOU" : "◈ FALKE"}</span>
                  <span>
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
              <div
                className="p-3 text-sm"
                style={{
                  backgroundColor: "#111",
                  border: "1px solid rgba(255,0,64,0.3)",
                }}
              >
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <span style={{ color: "#ff0040" }}>◈ FALKE</span>
                  <span className="animate-pulse">typing...</span>
                </div>
                <div className="opacity-50">_</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="p-4 border-t"
          style={{ borderColor: "rgba(255,0,64,0.3)" }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter message..."
              className="flex-1 p-3 text-sm focus:outline-none"
              style={{
                backgroundColor: "#111",
                border: "1px solid rgba(255,0,64,0.3)",
                color: "#e0e0e0",
              }}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-50"
              style={{ backgroundColor: "#ff0040", color: "#0a0a0a" }}
            >
              ▸ SEND
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Live API Inspector */}
      <div
        className="w-80 flex flex-col border-l"
        style={{ borderColor: "rgba(255,0,64,0.3)" }}
      >
        <div className="p-4 border-b" style={{ borderColor: "rgba(255,0,64,0.3)" }}>
          <h2 className="text-lg font-bold" style={{ color: "#ff0040" }}>
            ◈ API INSPECTOR
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {apiCalls.length === 0 && (
            <div className="text-sm p-2 opacity-50">No API calls yet</div>
          )}
          {apiCalls.map((call, idx) => (
            <div
              key={idx}
              className="mb-3 p-2 text-xs"
              style={{ backgroundColor: "#111", border: "1px solid rgba(255,0,64,0.2)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="px-1 py-0.5"
                  style={{
                    backgroundColor: call.method === "POST" ? "rgba(34,197,94,0.2)" : "rgba(59,130,246,0.2)",
                    color: call.method === "POST" ? "#22c55e" : "#3b82f6",
                  }}
                >
                  {call.method}
                </span>
                <span className="opacity-70 truncate flex-1">{call.endpoint}</span>
                {call.status && (
                  <span
                    style={{
                      color: call.status >= 200 && call.status < 300 ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {call.status}
                  </span>
                )}
              </div>
              {call.request && (
                <div className="mb-2">
                  <div className="opacity-50 mb-1">REQUEST:</div>
                  <pre className="whitespace-pre-wrap break-all opacity-70">
                    {JSON.stringify(call.request, null, 2)}
                  </pre>
                </div>
              )}
              {call.response && (
                <div>
                  <div className="opacity-50 mb-1">RESPONSE:</div>
                  <pre className="whitespace-pre-wrap break-all opacity-70">
                    {typeof call.response === "string"
                      ? call.response
                      : JSON.stringify(call.response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-2 border-t" style={{ borderColor: "rgba(255,0,64,0.3)" }}>
          <button
            onClick={() => setApiCalls([])}
            className="w-full py-2 text-sm hover:bg-white/5"
          >
            CLEAR LOGS
          </button>
        </div>
      </div>

      {/* Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div
            className="w-[500px] p-6"
            style={{ backgroundColor: "#111", border: "1px solid rgba(255,0,64,0.3)" }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: "#ff0040" }}>
              ◈ LLM CONFIG
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs opacity-70 block mb-1">Provider</label>
                <select
                  value={config.provider}
                  onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                  className="w-full p-2 text-sm focus:outline-none"
                  style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,0,64,0.3)" }}
                >
                  <option value="minimax">MiniMax</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>

              <div>
                <label className="text-xs opacity-70 block mb-1">API Endpoint</label>
                <input
                  type="text"
                  value={config.api_endpoint}
                  onChange={(e) => setConfig({ ...config, api_endpoint: e.target.value })}
                  className="w-full p-2 text-sm focus:outline-none"
                  style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,0,64,0.3)" }}
                />
              </div>

              <div>
                <label className="text-xs opacity-70 block mb-1">API Key</label>
                <input
                  type="password"
                  value={config.api_key}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  className="w-full p-2 text-sm focus:outline-none"
                  style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,0,64,0.3)" }}
                />
              </div>

              <div>
                <label className="text-xs opacity-70 block mb-1">Model</label>
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full p-2 text-sm focus:outline-none"
                  style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,0,64,0.3)" }}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs opacity-70 block mb-1">Max Tokens</label>
                  <input
                    type="number"
                    value={config.max_tokens}
                    onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
                    className="w-full p-2 text-sm focus:outline-none"
                    style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,0,64,0.3)" }}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs opacity-70 block mb-1">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={config.temperature}
                    onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                    className="w-full p-2 text-sm focus:outline-none"
                    style={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,0,64,0.3)" }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={saveConfig}
                className="flex-1 py-2 text-sm font-bold hover:bg-white/10"
                style={{ backgroundColor: "#ff0040", color: "#0a0a0a" }}
              >
                SAVE
              </button>
              <button
                onClick={() => setShowConfig(false)}
                className="flex-1 py-2 text-sm font-bold hover:bg-white/10"
                style={{ border: "1px solid rgba(255,0,64,0.3)" }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Chat;
