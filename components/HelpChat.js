import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { Portal } from "@/components/ui/Portal";

// Quick prompt suggestions based on current page
const getQuickPrompts = (path) => {
  const normalizedPath = path?.replace(/^\/app\/[^/]+/, "") || "/dashboard";

  const basePrompts = ["What can I do here?", "How do I get started?"];

  const pagePrompts = {
    "/dashboard": ["Show me key metrics", "How do I change the date range?"],
    "/stock-book": ["How do I add a vehicle?", "Explain VAT calculations"],
    "/prep": ["How does the prep board work?", "What do the labels mean?"],
    "/sales": ["How do I create a sale?", "Explain part exchanges"],
    "/aftersales": ["How do cases get created?", "What are the statuses?"],
    "/appraisals": ["How do I appraise a vehicle?", "Can I convert to stock?"],
    "/reports": ["What reports are available?", "How do I export data?"],
    "/settings": ["How do I add team members?", "Where do I set VAT?"],
  };

  return [...basePrompts, ...(pagePrompts[normalizedPath] || [])];
};

export default function HelpChat() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSeenChat, setHasSeenChat] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load messages from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("helpChatMessages");
      if (saved) {
        setMessages(JSON.parse(saved));
      }
      const seen = localStorage.getItem("helpChatSeen");
      setHasSeenChat(!!seen);
    } catch {
      // Storage not available
    }
  }, []);

  // Save messages to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("helpChatMessages", JSON.stringify(messages));
    } catch {
      // Storage not available
    }
  }, [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      // Mark as seen
      try {
        localStorage.setItem("helpChatSeen", "true");
        setHasSeenChat(true);
      } catch {
        // Storage not available
      }
    }
  }, [isOpen]);

  const sendMessage = async (messageText) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;

    setInputValue("");

    // Add user message
    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get history (excluding the message we just added)
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/help-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          path: router.asPath,
          history,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      // Add empty assistant message that we'll update
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                assistantContent += data.text;
                // Update the last message
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return newMessages;
                });
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Help chat error:", error);
      setMessages((prev) => [
        ...prev.slice(0, -1), // Remove the empty assistant message
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    try {
      sessionStorage.removeItem("helpChatMessages");
    } catch {
      // Storage not available
    }
  };

  const quickPrompts = getQuickPrompts(router.asPath);

  return (
    <Portal>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-[9999] flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-105 ${
          isOpen
            ? "bg-slate-600 hover:bg-slate-700"
            : "bg-[#0066CC] hover:bg-[#0055AA]"
        }`}
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
          right: "16px",
        }}
        title={isOpen ? "Close help" : "Get help"}
      >
        {isOpen ? (
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <>
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {/* Pulse animation for first-time users */}
            {!hasSeenChat && (
              <span className="absolute inset-0 rounded-full bg-[#0066CC] animate-ping opacity-30" />
            )}
          </>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed z-[9998] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 160px)",
            right: "16px",
            width: "min(380px, calc(100vw - 32px))",
            height: "min(500px, calc(100vh - 200px))",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#0066CC] to-[#0055AA] text-white">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-semibold">Help Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Clear chat"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-[#0066CC]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-[#0066CC]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium mb-1">
                  How can I help?
                </p>
                <p className="text-slate-400 text-sm">
                  Ask me anything about DealerHQ
                </p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-[#0066CC] text-white rounded-br-md"
                        : "bg-slate-100 text-slate-800 rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.content === "" && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-800 px-4 py-2.5 rounded-2xl rounded-bl-md">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length === 0 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-2">
                {quickPrompts.slice(0, 4).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                    disabled={isLoading}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 transition-all"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 bg-[#0066CC] hover:bg-[#0055AA] disabled:bg-slate-300 text-white rounded-xl transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </Portal>
  );
}
