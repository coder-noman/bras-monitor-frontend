import React, { useState, useRef, useEffect } from "react";
import { api } from "../utils/api";
import logo from "../../assets/logo.svg";

export default function AskPage({ onBack }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: 'Hi! I\'m your BTS PDB Assistant. Ask me anything about your BTS — like "how many are down?", "which BTS has the highest downtime?".',
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const [speakingIndex, setSpeakingIndex] = useState(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Stop any speech when leaving the page
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  function startVoice() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognition.start();
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  // Text-to-speech: play/stop toggle per message, uses a male voice
  function speakText(text, index) {
    if (!window.speechSynthesis) {
      alert("Your browser does not support text-to-speech.");
      return;
    }
    // If this message is already speaking, stop it
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 0.9; // slightly lower pitch for a male tone

    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(
      (v) =>
        /male/i.test(v.name) ||
        /David|Daniel|Google UK English Male|Microsoft David|Alex|Fred/i.test(
          v.name
        )
    );
    if (maleVoice) utterance.voice = maleVoice;

    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  }

  async function handleSend(e) {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const data = await api.ask(q);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.answer, data: data.data },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, failed to get answer. Please try again.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function formatDownTime(seconds) {
    if (!seconds && seconds !== 0) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }

  return (
    <div className="min-h-screen bg-[#080c18] flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#0a0e1a]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 flex items-center justify-center ">
              <img src={logo} alt="Logo" width={50} height={150} />
            </div>
            <div>
              <div className="text-base font-black tracking-tight text-white">
                BTS PDB Assistant
              </div>
            </div>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-xl px-3 py-2 text-xs font-semibold transition-all"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Dashboard
          </button>
        </div>
      </nav>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-3xl mx-auto px-4 space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-10 h-10 rounded-full flex items-center justify-center ">
                  <img
                    className="rounded-full"
                    src={logo}
                    alt="Logo"
                    width={50}
                    height={50}
                  />
                </div>
              )}
              <div
                className={`max-w-[80%] ${msg.role === "user" ? "order-first" : ""}`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-tr-sm"
                      : msg.error
                        ? "bg-red-500/10 border border-red-500/25 text-red-300 rounded-tl-sm"
                        : "bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-sm"
                  }`}
                >
                  {msg.text}
                </div>

                {/* Voice playback button — assistant messages only */}
                {msg.role === "assistant" && !msg.error && (
                  <button
                    onClick={() => speakText(msg.text, i)}
                    className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-all ${
                      speakingIndex === i
                        ? "bg-purple-500/20 text-purple-300"
                        : "text-slate-500 hover:text-purple-400 hover:bg-slate-800/60"
                    }`}
                  >
                    {speakingIndex === i ? (
                      <>
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <rect x="6" y="5" width="4" height="14" rx="1" />
                          <rect x="14" y="5" width="4" height="14" rx="1" />
                        </svg>
                        Stop
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M6 8h2l4-4v16l-4-4H6a1 1 0 01-1-1V9a1 1 0 011-1z"
                          />
                        </svg>
                        Listen
                      </>
                    )}
                  </button>
                )}

                {/* Data table */}
                {msg.data && msg.data.length > 0 && (
                  <div className="mt-2 bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-800/60 text-slate-400">
                          <th className="text-left px-3 py-2 font-semibold">
                            #
                          </th>
                          <th className="text-left px-3 py-2 font-semibold">
                            BTS Name
                          </th>
                          <th className="text-left px-3 py-2 font-semibold">
                            IP
                          </th>
                          {msg.data[0].down_time !== undefined && (
                            <th className="text-left px-3 py-2 font-semibold">
                              Down Time
                            </th>
                          )}
                          {msg.data[0].up_time !== undefined &&
                            msg.data[0].down_time === undefined && (
                              <th className="text-left px-3 py-2 font-semibold">
                                Up Time
                              </th>
                            )}
                          {msg.data[0].status !== undefined && (
                            <th className="text-left px-3 py-2 font-semibold">
                              Status
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {msg.data.map((row, j) => (
                          <tr key={j} className="hover:bg-slate-800/30">
                            <td className="px-3 py-2 text-slate-500">
                              {j + 1}
                            </td>
                            <td className="px-3 py-2 text-slate-300">
                              {row.bts_name}
                            </td>
                            <td className="px-3 py-2 font-mono text-cyan-400/80">
                              {row.ip_address}
                            </td>
                            {row.down_time !== undefined && (
                              <td className="px-3 py-2 text-red-400 font-mono">
                                {formatDownTime(row.down_time)}
                              </td>
                            )}
                            {row.up_time !== undefined &&
                              row.down_time === undefined && (
                                <td className="px-3 py-2 text-emerald-400 font-mono">
                                  {formatDownTime(row.up_time)}
                                </td>
                              )}
                            {row.status !== undefined && (
                              <td className="px-3 py-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    row.status === "Up"
                                      ? "bg-emerald-500/15 text-emerald-400"
                                      : "bg-red-500/15 text-red-400"
                                  }`}
                                >
                                  {row.status}
                                </span>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                  <svg
                    className="w-4 h-4 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center shrink-0">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"
                  />
                </svg>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <span
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-[#080c18]/95 backdrop-blur border-t border-slate-800 p-4">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              listening ? "Listening... speak now" : "Ask about your BTS PDB..."
            }
            disabled={loading}
            className={`flex-1 bg-slate-800/60 border text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 placeholder-slate-500 disabled:opacity-50 transition-all ${
              listening
                ? "border-red-500/60 focus:border-red-500/70 focus:ring-red-500/20"
                : "border-slate-700/50 focus:border-purple-500/50 focus:ring-purple-500/20"
            }`}
          />
          {/* Mic button */}
          <button
            type="button"
            onClick={listening ? stopVoice : startVoice}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg ${
              listening
                ? "bg-red-500 hover:bg-red-400 shadow-red-500/25 animate-pulse"
                : "bg-slate-700 hover:bg-slate-600 shadow-slate-700/25"
            }`}
            title={listening ? "Stop listening" : "Speak"}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </button>
          {/* Send button */}
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/25"
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
        </form>
        <div className="max-w-3xl mx-auto mt-2 flex gap-2 flex-wrap">
          {[
            "How many are down?",
            "UPtime percentage for Ahmed Tower today?",
            "Downtime % of Daulatpur last 30 days?",
            "how many times is Ahmed Tower down today?",
          ].map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs bg-slate-800/60 hover:bg-slate-700 border border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg px-3 py-1.5 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
