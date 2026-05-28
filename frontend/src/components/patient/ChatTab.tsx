"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Send,
  Plus,
  Trash2,
  MessageCircle,
  ImagePlus,
  X,
  Bot,
  UserIcon,
  Sparkles,
  Mic,
  Volume2,
  Square,
} from "lucide-react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { ApiResponse, ChatSession, ChatMessage, SendMessageResult } from "@/types";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

const SUGGESTIONS = [
  "What could cause a persistent headache?",
  "How do I read my blood test report?",
  "Home remedies for seasonal cold",
  "When should I visit a doctor for fever?",
];

export default function ChatTab() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voiceMessageIds, setVoiceMessageIds] = useState<Set<string>>(new Set());
  const [voiceAudioUrls, setVoiceAudioUrls] = useState<Record<string, string>>({});
  const [expandedTextIds, setExpandedTextIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSendWasVoiceRef = useRef(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobResolveRef = useRef<((url: string) => void) | null>(null);
  const [playingRawId, setPlayingRawId] = useState<string | null>(null);
  const pendingAudioBlobRef = useRef<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchSessions() {
    setLoadingSessions(true);
    try {
      const res = await api.get<ApiResponse<ChatSession[]>>("/ai/sessions");
      if (res.data) {
        setSessions(res.data);
        if (res.data.length > 0 && !activeSessionId) {
          selectSession(res.data[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoadingSessions(false);
    }
  }

  async function selectSession(sessionId: string) {
    setActiveSessionId(sessionId);
    setLoadingMessages(true);
    setError("");
    try {
      const res = await api.get<ApiResponse<{ messages: ChatMessage[] }>>(
        `/ai/sessions/${sessionId}/messages`
      );
      if (res.data) setMessages(res.data.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }

  async function createSession() {
    setCreatingSession(true);
    try {
      const res = await api.post<ApiResponse<ChatSession>>("/ai/sessions", {});
      if (res.data) {
        setSessions((prev) => [res.data!, ...prev]);
        setActiveSessionId(res.data.id);
        setMessages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreatingSession(false);
    }
  }

  async function deleteSession(sessionId: string) {
    try {
      await api.delete<ApiResponse>(`/ai/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendText(text: string, sessionId: string, imageFile?: File | null, preview?: string | null) {
    if (sending) return;

    setSending(true);
    setError("");

    const optimisticUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId,
      role: "user",
      text: text || "Please analyze this image.",
      imageUrl: preview || null,
      audioUrl: null,
      createdAt: new Date().toISOString(),
    };
    if (lastSendWasVoiceRef.current) {
      setVoiceMessageIds((prev) => new Set(prev).add(optimisticUserMsg.id));
      if (pendingAudioBlobRef.current) {
        setVoiceAudioUrls((prev) => ({ ...prev, [optimisticUserMsg.id]: pendingAudioBlobRef.current! }));
      }
    }
    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInput("");
    clearImage();

    try {
      const formData = new FormData();
      if (text.trim()) formData.append("message", text.trim());
      if (imageFile) formData.append("image", imageFile);

      const res = await api.upload<ApiResponse<SendMessageResult>>(
        `/ai/sessions/${sessionId}/messages`,
        formData
      );

      if (res.data) {
        const wasVoice = lastSendWasVoiceRef.current;
        if (wasVoice) {
          setVoiceMessageIds((prev) => {
            const next = new Set(prev);
            next.delete(optimisticUserMsg.id);
            next.add(res.data!.userMessage.id);
            next.add(res.data!.assistantMessage.id);
            return next;
          });
          setVoiceAudioUrls((prev) => {
            const next = { ...prev };
            if (next[optimisticUserMsg.id]) {
              next[res.data!.userMessage.id] = next[optimisticUserMsg.id];
            }
            return next;
          });
        }
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== optimisticUserMsg.id);
          return [...filtered, res.data!.userMessage, res.data!.assistantMessage];
        });
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [res.data!.userMessage] }
              : s
          )
        );
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsg.id));
      setError(err instanceof Error ? err.message : "Failed to send message");
      setInput(text);
    } finally {
      lastSendWasVoiceRef.current = false;
      setSending(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && !image) || !activeSessionId || sending) return;
    sendText(input.trim(), activeSessionId, image, imagePreview);
  }

  async function handleSuggestion(text: string) {
    let sessionId = activeSessionId;
    if (!sessionId) {
      setCreatingSession(true);
      try {
        const res = await api.post<ApiResponse<ChatSession>>("/ai/sessions", {});
        if (res.data) {
          setSessions((prev) => [res.data!, ...prev]);
          setActiveSessionId(res.data.id);
          setMessages([]);
          sessionId = res.data.id;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create session");
        return;
      } finally {
        setCreatingSession(false);
      }
    }
    if (sessionId) sendText(text, sessionId);
  }

  function getSessionPreview(session: ChatSession) {
    const lastMsg = session.messages?.[0];
    if (!lastMsg) return "New conversation";
    const text = lastMsg.text || "";
    return text.length > 35 ? text.slice(0, 35) + "..." : text;
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  }

  async function toggleRecording() {
    if (isRecording) {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    let sessionId = activeSessionId;
    if (!sessionId) {
      setCreatingSession(true);
      try {
        const res = await api.post<ApiResponse<ChatSession>>("/ai/sessions", {});
        if (res.data) {
          setSessions((prev) => [res.data!, ...prev]);
          setActiveSessionId(res.data.id);
          setMessages([]);
          sessionId = res.data.id;
        }
      } catch {
        setError("Failed to create session");
        return;
      } finally {
        setCreatingSession(false);
      }
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied.");
      return;
    }

    audioChunksRef.current = [];
    const audioBlobPromise = new Promise<string>((resolve) => {
      audioBlobResolveRef.current = resolve;
    });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      audioBlobResolveRef.current?.(url);
    };
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.continuous = true;

    let fullTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i]?.[0]) {
          fullTranscript += event.results[i][0].transcript + " ";
        }
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      mediaRecorderRef.current?.stop();
    };

    recognition.onend = async () => {
      setIsRecording(false);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      const blobUrl = await audioBlobPromise;
      const text = fullTranscript.trim();
      if (text && sessionId) {
        pendingAudioBlobRef.current = blobUrl;
        lastSendWasVoiceRef.current = true;
        await sendText(text, sessionId);
        pendingAudioBlobRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
  }

  function playRawAudio(messageId: string, url: string) {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (playingRawId === messageId) {
      setPlayingRawId(null);
      return;
    }
    const audio = new Audio(url);
    audio.onended = () => { setPlayingRawId(null); audioPlayerRef.current = null; };
    audio.onerror = () => { setPlayingRawId(null); audioPlayerRef.current = null; };
    audioPlayerRef.current = audio;
    setPlayingRawId(messageId);
    audio.play();
  }

  function toggleTextExpand(messageId: string) {
    setExpandedTextIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }

  function speakText(messageId: string, text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (speakingId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const plain = text.replace(/[#*_~`>\-|[\]()]/g, "").replace(/\n{2,}/g, ". ").trim();
    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.rate = 1;
    utterance.pitch = 1;

    const hasHindi = /[ऀ-ॿ]/.test(plain);
    const voices = window.speechSynthesis.getVoices();

    if (hasHindi) {
      const hindiVoice = voices.find((v) => v.lang.startsWith("hi"));
      if (hindiVoice) {
        utterance.voice = hindiVoice;
        utterance.lang = "hi-IN";
      }
    } else {
      const enVoice = voices.find((v) => v.name.includes("Samantha")) ||
        voices.find((v) => v.lang.startsWith("en") && v.name.includes("Female")) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (enVoice) utterance.voice = enVoice;
    }

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(messageId);
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    if (!sending && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant" && voiceMessageIds.has(lastMsg.id)) {
        speakText(lastMsg.id, lastMsg.text);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sending]);

  return (
    <div className="flex h-[calc(100vh-180px)] rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Sessions sidebar */}
      <div className="w-80 border-r border-slate-200 flex-col shrink-0 hidden md:flex bg-slate-50/70">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <MessageCircle size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Conversations</h3>
              <p className="text-[11px] text-slate-400">{sessions.length} chat{sessions.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button
            onClick={createSession}
            disabled={creatingSession}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-all shadow-sm shadow-blue-600/20"
          >
            {creatingSession ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-3">
                <MessageCircle size={20} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-400">No conversations yet</p>
              <p className="text-xs text-slate-300 mt-1">Start one to begin</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => selectSession(session.id)}
                  className={`group flex items-center gap-3 px-3 py-3 cursor-pointer rounded-xl transition-all ${
                    activeSessionId === session.id
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                      : "hover:bg-white hover:shadow-sm text-slate-700"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      activeSessionId === session.id
                        ? "bg-white/20"
                        : "bg-blue-50"
                    }`}
                  >
                    <MessageCircle
                      size={16}
                      className={
                        activeSessionId === session.id
                          ? "text-white"
                          : "text-blue-500"
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">
                      {getSessionPreview(session)}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        activeSessionId === session.id
                          ? "text-blue-200"
                          : "text-slate-400"
                      }`}
                    >
                      {formatDate(session.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                      activeSessionId === session.id
                        ? "hover:bg-white/20 text-white"
                        : "hover:bg-red-50 text-slate-400 hover:text-red-500"
                    }`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Mobile: session selector */}
        <div className="md:hidden p-3 border-b border-slate-200 flex gap-2 bg-white">
          <button
            onClick={createSession}
            disabled={creatingSession}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {creatingSession ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            New
          </button>
          <select
            value={activeSessionId || ""}
            onChange={(e) => e.target.value && selectSession(e.target.value)}
            className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white"
          >
            <option value="" disabled>
              Select a conversation
            </option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {getSessionPreview(s)} - {formatDate(s.createdAt)}
              </option>
            ))}
          </select>
        </div>

        {!activeSessionId ? (
          /* Welcome / empty state */
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-600/20">
                <Sparkles size={36} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                SmartHealth AI
              </h2>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                Your personal health assistant. Ask questions, upload medical images, or get help understanding your reports.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="text-left px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={createSession}
                disabled={creatingSession}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-all shadow-sm shadow-blue-600/20"
              >
                {creatingSession ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                Start a conversation
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-3 bg-white">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">SmartHealth AI</h3>
                <p className="text-[11px] text-emerald-500 font-medium">Online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-5 bg-slate-50/50">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={22} className="animate-spin text-slate-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-sm">
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
                      <Bot size={26} className="text-blue-500" />
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                      Send a message or upload a medical image to get started.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {SUGGESTIONS.slice(0, 2).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSuggestion(s)}
                          className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 max-w-3xl mx-auto">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm mt-1">
                          <Bot size={15} className="text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white shadow-sm shadow-blue-600/10"
                            : "bg-white text-slate-700 shadow-sm border border-slate-100"
                        }`}
                      >
                        {msg.imageUrl && (
                          <img
                            src={msg.imageUrl}
                            alt="Uploaded"
                            className="max-w-full max-h-48 rounded-xl mb-2"
                          />
                        )}
                        {msg.role === "assistant" && voiceMessageIds.has(msg.id) ? (
                          <>
                            <div className="flex items-center gap-3 py-1 mb-1">
                              <button
                                type="button"
                                onClick={() => speakText(msg.id, msg.text)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                  speakingId === msg.id
                                    ? "bg-red-100 text-red-500"
                                    : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                                }`}
                              >
                                {speakingId === msg.id ? (
                                  <Square size={14} className="fill-current" />
                                ) : (
                                  <Volume2 size={18} />
                                )}
                              </button>
                              <div className="flex-1">
                                <div className="flex gap-0.5 items-center h-6">
                                  {Array.from({ length: 24 }).map((_, i) => (
                                    <div
                                      key={i}
                                      className={`w-1 rounded-full transition-all ${
                                        speakingId === msg.id
                                          ? "bg-blue-400 animate-pulse"
                                          : "bg-slate-300"
                                      }`}
                                      style={{ height: `${8 + Math.random() * 16}px` }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleTextExpand(msg.id)}
                              className="text-[11px] text-blue-500 hover:text-blue-700 transition-colors"
                            >
                              {expandedTextIds.has(msg.id) ? "Hide text" : "Show text"}
                            </button>
                            {expandedTextIds.has(msg.id) && (
                              <div className="text-sm leading-relaxed prose prose-sm prose-slate max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-slate-800 mt-2 pt-2 border-t border-slate-100">
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                              </div>
                            )}
                          </>
                        ) : msg.role === "assistant" ? (
                          <div className="text-sm leading-relaxed prose prose-sm prose-slate max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-slate-800">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          </div>
                        ) : voiceMessageIds.has(msg.id) ? (
                          <>
                            <div className="flex items-center gap-3 py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const blobUrl = voiceAudioUrls[msg.id];
                                  if (blobUrl) playRawAudio(msg.id, blobUrl);
                                }}
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                  playingRawId === msg.id
                                    ? "bg-white/30 text-white"
                                    : "bg-white/20 text-white hover:bg-white/30"
                                }`}
                              >
                                {playingRawId === msg.id ? (
                                  <Square size={12} className="fill-current" />
                                ) : (
                                  <Volume2 size={16} />
                                )}
                              </button>
                              <div className="flex-1">
                                <div className="flex gap-0.5 items-center h-5">
                                  {Array.from({ length: 20 }).map((_, i) => (
                                    <div
                                      key={i}
                                      className={`w-1 rounded-full ${
                                        playingRawId === msg.id
                                          ? "bg-white animate-pulse"
                                          : "bg-white/50"
                                      }`}
                                      style={{ height: `${4 + Math.random() * 12}px` }}
                                    />
                                  ))}
                                </div>
                              </div>
                              <Mic size={14} className="text-white/60 shrink-0" />
                            </div>
                          </>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {msg.text}
                          </p>
                        )}
                        <p
                          className={`text-[10px] mt-1.5 ${
                            msg.role === "user"
                              ? "text-blue-200"
                              : "text-slate-300"
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 mt-1">
                          <UserIcon size={15} className="text-slate-500" />
                        </div>
                      )}
                    </div>
                  ))}
                  {sending && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm mt-1">
                        <Bot size={15} className="text-white" />
                      </div>
                      <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-slate-100">
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mx-5 mb-2 bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {/* Image preview */}
            {imagePreview && (
              <div className="mx-5 mb-2">
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-20 rounded-xl border border-slate-200 shadow-sm"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Input area */}
            {isRecording ? (
              <div className="p-4 border-t border-slate-200 bg-white">
                <div className="flex items-center gap-4 max-w-3xl mx-auto bg-red-50 rounded-2xl px-5 py-4">
                  <div className="relative">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 w-3 h-3 bg-red-400 rounded-full animate-ping" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-600">Recording...</p>
                    <p className="text-xs text-red-400">
                      {Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:
                      {(recordingSeconds % 60).toString().padStart(2, "0")}
                    </p>
                  </div>
                  <div className="flex gap-0.5 items-center h-8">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-red-400 rounded-full animate-pulse"
                        style={{
                          height: `${6 + Math.random() * 20}px`,
                          animationDelay: `${i * 100}ms`,
                        }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-md shadow-red-500/30"
                  >
                    <Square size={18} className="fill-current" />
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSend}
                className="p-4 border-t border-slate-200 bg-white"
              >
                <div className="flex items-end gap-2 max-w-3xl mx-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="Attach image"
                  >
                    <ImagePlus size={20} />
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about your health..."
                      disabled={sending}
                      className="w-full px-4 py-3 bg-slate-100 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  {input.trim() || image ? (
                    <button
                      type="submit"
                      disabled={sending}
                      className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-30 transition-all shadow-sm shadow-blue-600/20"
                    >
                      {sending ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={toggleRecording}
                      disabled={sending}
                      className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-30 transition-all shadow-sm shadow-blue-600/20"
                      title="Hold to record voice message"
                    >
                      <Mic size={18} />
                    </button>
                  )}
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
