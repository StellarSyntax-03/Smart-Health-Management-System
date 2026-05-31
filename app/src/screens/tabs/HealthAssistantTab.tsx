import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  createAudioPlayer,
  RecordingPresets,
} from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { ApiResponse, ChatSession, ChatMessage, SendMessageResult } from "../../types";
import { colors } from "../../lib/colors";

const SUGGESTIONS = [
  "What could cause a persistent headache?",
  "How do I read my blood test report?",
  "Home remedies for seasonal cold",
  "When should I visit a doctor for fever?",
];

export default function HealthAssistantTab() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [error, setError] = useState("");
  const [showSessions, setShowSessions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
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
    setShowSessions(false);
    setLoadingMessages(true);
    setError("");
    try {
      const res = await api.get<ApiResponse<{ messages: ChatMessage[] }>>(
        `/ai/sessions/${sessionId}/messages`,
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
        setShowSessions(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreatingSession(false);
    }
  }

  async function deleteSession(sessionId: string) {
    Alert.alert("Delete Chat", "Delete this conversation?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete<ApiResponse>(`/ai/sessions/${sessionId}`);
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
            if (activeSessionId === sessionId) {
              setActiveSessionId(null);
              setMessages([]);
            }
          } catch {
          }
        },
      },
    ]);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function sendMessage(text: string, sessionId: string) {
    if (sending) return;
    setSending(true);
    setError("");

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId,
      role: "user",
      text: text || "Please analyze this image.",
      imageUrl: imageUri,
      audioUrl: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput("");
    const sentImageUri = imageUri;
    setImageUri(null);

    try {
      const formData = new FormData();
      if (text.trim()) formData.append("message", text.trim());
      if (sentImageUri) {
        const filename = sentImageUri.split("/").pop() || "image.jpg";
        const ext = filename.split(".").pop()?.toLowerCase();
        const mimeType = ext === "png" ? "image/png" : "image/jpeg";
        formData.append("image", {
          uri: sentImageUri,
          name: filename,
          type: mimeType,
        } as any);
      }

      const res = await api.upload<ApiResponse<SendMessageResult>>(
        `/ai/sessions/${sessionId}/messages`,
        formData,
      );

      if (res.data) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== optimisticMsg.id);
          return [...filtered, res.data!.userMessage, res.data!.assistantMessage];
        });
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, messages: [res.data!.userMessage] } : s,
          ),
        );
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setError(err instanceof Error ? err.message : "Failed to send message");
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    if ((!input.trim() && !imageUri) || !activeSessionId || sending) return;
    sendMessage(input.trim(), activeSessionId);
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
      } catch {
        setError("Failed to create session");
        return;
      } finally {
        setCreatingSession(false);
      }
    }
    if (sessionId) sendMessage(text, sessionId);
  }

  async function toggleRecording() {
    if (isRecording) {
      setIsRecording(false);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) return;

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
        if (!sessionId) return;

        setSending(true);
        setError("");

        const audioForm = new FormData();
        audioForm.append("audio", {
          uri,
          name: "recording.m4a",
          type: "audio/mp4",
        } as any);
        audioForm.append("languageCode", "hi-IN");

        const transcribeRes = await api.upload<ApiResponse<{ transcript: string }>>(
          "/ai/transcribe",
          audioForm,
        );
        const transcript = transcribeRes.data?.transcript?.trim();
        if (!transcript) {
          setError("Could not transcribe audio. Try again.");
          setSending(false);
          return;
        }

        setSending(false);
        sendVoiceMessage(transcript, sessionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Recording failed");
        setSending(false);
      }
      return;
    }

    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone permission denied");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      recorder.record();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording");
    }
  }

  async function sendVoiceMessage(text: string, sessionId: string) {
    if (sending) return;
    setSending(true);
    setError("");

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId,
      role: "user",
      text,
      imageUrl: null,
      audioUrl: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const formData = new FormData();
      formData.append("message", text);
      formData.append("isVoice", "true");
      formData.append("voiceLang", "hi-IN");

      const res = await api.upload<ApiResponse<SendMessageResult>>(
        `/ai/sessions/${sessionId}/messages`,
        formData,
      );

      if (res.data) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== optimisticMsg.id);
          return [...filtered, res.data!.userMessage, res.data!.assistantMessage];
        });
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, messages: [res.data!.userMessage] } : s,
          ),
        );
        if (res.data.assistantMessage.audioUrl) {
          playAudio(res.data.assistantMessage.id, res.data.assistantMessage.audioUrl);
        }
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setError(err instanceof Error ? err.message : "Failed to send voice message");
    } finally {
      setSending(false);
    }
  }

  async function playAudio(messageId: string, url: string) {
    if (playerRef.current) {
      playerRef.current.release();
      playerRef.current = null;
    }
    if (playingAudioId === messageId) {
      setPlayingAudioId(null);
      return;
    }
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      const player = createAudioPlayer({ uri: url });
      playerRef.current = player;
      setPlayingAudioId(messageId);
      player.addListener("playbackStatusUpdate", (status) => {
        if (status.didJustFinish) {
          setPlayingAudioId(null);
          player.release();
          playerRef.current = null;
        }
      });
      player.play();
    } catch {
      setPlayingAudioId(null);
    }
  }

  function getSessionPreview(session: ChatSession) {
    const lastMsg = session.messages?.[0];
    if (!lastMsg) return "New conversation";
    const text = lastMsg.text || "";
    return text.length > 30 ? text.slice(0, 30) + "..." : text;
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  if (!activeSessionId && !showSessions) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.welcomeContent}>
        <View style={styles.welcomeIcon}>
          <Ionicons name="sparkles" size={36} color={colors.white} />
        </View>
        <Text style={styles.welcomeTitle}>Health Assistant</Text>
        <Text style={styles.welcomeSubtitle}>
          Your personal health assistant. Ask questions, upload medical images, or get help understanding your reports.
        </Text>

        <View style={styles.suggestionsGrid}>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity key={s} style={styles.suggestionBtn} onPress={() => handleSuggestion(s)}>
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.welcomeActions}>
          <TouchableOpacity style={styles.newChatBtn} onPress={createSession} disabled={creatingSession}>
            {creatingSession ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={styles.newChatText}>Start a conversation</Text>
              </>
            )}
          </TouchableOpacity>

          {sessions.length > 0 && (
            <TouchableOpacity style={styles.historyBtn} onPress={() => setShowSessions(true)}>
              <Ionicons name="chatbubbles-outline" size={16} color={colors.blue[600]} />
              <Text style={styles.historyText}>Previous chats ({sessions.length})</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  }

  if (showSessions) {
    return (
      <View style={styles.container}>
        <View style={styles.sessionsHeader}>
          <Text style={styles.sessionsTitle}>Conversations</Text>
          <View style={styles.sessionsActions}>
            <TouchableOpacity style={styles.newSessionBtn} onPress={createSession} disabled={creatingSession}>
              {creatingSession ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="add" size={16} color={colors.white} />
                  <Text style={styles.newSessionText}>New</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSessions(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.slate[500]} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.sessionsList}>
          {loadingSessions ? (
            <ActivityIndicator size="large" color={colors.blue[600]} style={{ marginTop: 40 }} />
          ) : sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles" size={32} color={colors.slate[300]} />
              <Text style={styles.emptyText}>No conversations yet</Text>
            </View>
          ) : (
            sessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={[styles.sessionItem, activeSessionId === session.id && styles.sessionItemActive]}
                onPress={() => selectSession(session.id)}
              >
                <View style={styles.sessionIcon}>
                  <Ionicons name="chatbubbles" size={16} color={colors.blue[500]} />
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionPreview} numberOfLines={1}>{getSessionPreview(session)}</Text>
                  <Text style={styles.sessionDate}>
                    {new Date(session.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </Text>
                </View>
                <TouchableOpacity style={styles.deleteSessionBtn} onPress={() => deleteSession(session.id)}>
                  <Ionicons name="trash-outline" size={16} color={colors.slate[400]} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 140 : 0}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setShowSessions(true)} style={styles.backBtn}>
          <Ionicons name="chatbubbles-outline" size={18} color={colors.blue[600]} />
        </TouchableOpacity>
        <View style={styles.chatHeaderIcon}>
          <Ionicons name="medical" size={16} color={colors.white} />
        </View>
        <View>
          <Text style={styles.chatHeaderTitle}>Health Assistant</Text>
          <Text style={styles.chatHeaderStatus}>Online</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messagesArea}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {loadingMessages ? (
          <ActivityIndicator size="large" color={colors.blue[600]} style={{ marginTop: 40 }} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyChatState}>
            <View style={styles.emptyChatIcon}>
              <Ionicons name="medical" size={28} color={colors.blue[500]} />
            </View>
            <Text style={styles.emptyChatText}>Send a message to get started</Text>
            <View style={styles.miniSuggestions}>
              {SUGGESTIONS.slice(0, 2).map((s) => (
                <TouchableOpacity key={s} style={styles.miniSuggestionBtn} onPress={() => handleSuggestion(s)}>
                  <Text style={styles.miniSuggestionText} numberOfLines={1}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          messages.map((msg) => (
            <View
              key={msg.id}
              style={[styles.msgRow, msg.role === "user" ? styles.msgRowUser : styles.msgRowAssistant]}
            >
              {msg.role === "assistant" && (
                <View style={styles.assistantAvatar}>
                  <Ionicons name="medical" size={14} color={colors.white} />
                </View>
              )}
              <View
                style={[styles.msgBubble, msg.role === "user" ? styles.msgBubbleUser : styles.msgBubbleAssistant]}
              >
                {msg.imageUrl && (
                  <Image source={{ uri: msg.imageUrl }} style={styles.msgImage} resizeMode="cover" />
                )}
                {msg.role === "assistant" && msg.audioUrl && (
                  <TouchableOpacity
                    style={styles.audioPlayRow}
                    onPress={() => playAudio(msg.id, msg.audioUrl!)}
                  >
                    <View style={[styles.audioPlayBtn, playingAudioId === msg.id && styles.audioPlayBtnActive]}>
                      <Ionicons
                        name={playingAudioId === msg.id ? "stop" : "play"}
                        size={16}
                        color={playingAudioId === msg.id ? "#ef4444" : colors.blue[600]}
                      />
                    </View>
                    <View style={styles.audioWaveform}>
                      {Array.from({ length: 20 }).map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.audioBar,
                            { height: 4 + Math.random() * 14 },
                            playingAudioId === msg.id && styles.audioBarActive,
                          ]}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                )}
                <Text style={[styles.msgText, msg.role === "user" && styles.msgTextUser]}>
                  {msg.text}
                </Text>
                <Text style={[styles.msgTime, msg.role === "user" ? styles.msgTimeUser : styles.msgTimeAssistant]}>
                  {formatTime(msg.createdAt)}
                </Text>
              </View>
              {msg.role === "user" && (
                <View style={styles.userAvatar}>
                  <Ionicons name="person" size={14} color={colors.slate[500]} />
                </View>
              )}
            </View>
          ))
        )}

        {sending && (
          <View style={[styles.msgRow, styles.msgRowAssistant]}>
            <View style={styles.assistantAvatar}>
              <Ionicons name="medical" size={14} color={colors.white} />
            </View>
            <View style={[styles.msgBubble, styles.msgBubbleAssistant]}>
              <View style={styles.typingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {error ? (
        <View style={styles.chatError}>
          <Text style={styles.chatErrorText}>{error}</Text>
        </View>
      ) : null}

      {imageUri && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <TouchableOpacity style={styles.removeImage} onPress={() => setImageUri(null)}>
            <Ionicons name="close" size={12} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {isRecording ? (
        <View style={styles.recordingBar}>
          <View style={styles.recordingDot} />
          <View style={styles.recordingInfo}>
            <Text style={styles.recordingLabel}>Recording...</Text>
            <Text style={styles.recordingTimer}>
              {Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:
              {(recordingSeconds % 60).toString().padStart(2, "0")}
            </Text>
          </View>
          <View style={styles.recordingWave}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View
                key={i}
                style={[styles.recordingWaveBar, { height: 6 + Math.random() * 18 }]}
              />
            ))}
          </View>
          <TouchableOpacity style={styles.stopRecordBtn} onPress={toggleRecording}>
            <Ionicons name="stop" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
            <Ionicons name="image-outline" size={22} color={colors.slate[400]} />
          </TouchableOpacity>
          <TextInput
            style={styles.chatInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your health..."
            placeholderTextColor={colors.slate[400]}
            editable={!sending}
            multiline
            maxLength={2000}
          />
          {input.trim() || imageUri ? (
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="send" size={18} color={colors.white} />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={toggleRecording}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="mic" size={20} color={colors.white} />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate[50] },
  welcomeContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  welcomeIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.blue[600],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  welcomeTitle: { fontSize: 24, fontWeight: "700", color: colors.slate[800], marginBottom: 8 },
  welcomeSubtitle: { fontSize: 14, color: colors.slate[500], textAlign: "center", lineHeight: 20, marginBottom: 24, paddingHorizontal: 20 },
  suggestionsGrid: { width: "100%", gap: 8, marginBottom: 24 },
  suggestionBtn: {
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  suggestionText: { fontSize: 13, color: colors.slate[600] },
  welcomeActions: { gap: 12, alignItems: "center" },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.blue[600],
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  newChatText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  historyBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  historyText: { fontSize: 13, color: colors.blue[600], fontWeight: "500" },
  sessionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
    backgroundColor: colors.white,
  },
  sessionsTitle: { fontSize: 16, fontWeight: "700", color: colors.slate[800] },
  sessionsActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  newSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.blue[600],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newSessionText: { color: colors.white, fontSize: 12, fontWeight: "600" },
  closeBtn: { padding: 4 },
  sessionsList: { flex: 1, padding: 8 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: colors.slate[400] },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  sessionItemActive: { backgroundColor: colors.blue[50] },
  sessionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.blue[50], alignItems: "center", justifyContent: "center" },
  sessionInfo: { flex: 1 },
  sessionPreview: { fontSize: 13, fontWeight: "500", color: colors.slate[700] },
  sessionDate: { fontSize: 11, color: colors.slate[400], marginTop: 2 },
  deleteSessionBtn: { padding: 6 },
  chatContainer: { flex: 1, backgroundColor: colors.white },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
    backgroundColor: colors.white,
  },
  backBtn: { padding: 4 },
  chatHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.blue[600],
    alignItems: "center",
    justifyContent: "center",
  },
  chatHeaderTitle: { fontSize: 14, fontWeight: "600", color: colors.slate[800] },
  chatHeaderStatus: { fontSize: 11, color: "#10b981", fontWeight: "500" },
  messagesArea: { flex: 1, backgroundColor: colors.slate[50] },
  messagesContent: { padding: 16, paddingBottom: 8 },
  emptyChatState: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyChatIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.blue[100], alignItems: "center", justifyContent: "center" },
  emptyChatText: { fontSize: 13, color: colors.slate[500] },
  miniSuggestions: { gap: 6, marginTop: 8, width: "100%" },
  miniSuggestionBtn: {
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
    alignSelf: "center",
  },
  miniSuggestionText: { fontSize: 12, color: colors.slate[500] },
  msgRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAssistant: { justifyContent: "flex-start" },
  assistantAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.blue[600],
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.slate[200],
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  msgBubble: {
    maxWidth: "70%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  msgBubbleUser: { backgroundColor: colors.blue[600] },
  msgBubbleAssistant: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[100],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  msgImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 8 },
  msgText: { fontSize: 14, lineHeight: 20, color: colors.slate[700] },
  msgTextUser: { color: colors.white },
  msgTime: { fontSize: 10, marginTop: 4 },
  msgTimeUser: { color: "rgba(255,255,255,0.6)" },
  msgTimeAssistant: { color: colors.slate[300] },
  typingDots: { flexDirection: "row", gap: 4, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.blue[400] },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.8 },
  chatError: {
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: colors.red[50],
    borderRadius: 10,
    padding: 10,
  },
  chatErrorText: { fontSize: 12, color: colors.red[600] },
  imagePreview: { marginHorizontal: 16, marginBottom: 4, flexDirection: "row" },
  previewImage: { width: 60, height: 60, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200] },
  removeImage: {
    position: "absolute",
    top: -6,
    left: 54,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.red[500],
    alignItems: "center",
    justifyContent: "center",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
    backgroundColor: colors.white,
  },
  attachBtn: { padding: 8 },
  chatInput: {
    flex: 1,
    backgroundColor: colors.slate[100],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.slate[900],
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.blue[600],
    alignItems: "center",
    justifyContent: "center",
  },
  audioPlayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  audioPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.blue[100],
    alignItems: "center",
    justifyContent: "center",
  },
  audioPlayBtnActive: { backgroundColor: "#fee2e2" },
  audioWaveform: { flexDirection: "row", alignItems: "center", gap: 2, flex: 1 },
  audioBar: { width: 3, borderRadius: 2, backgroundColor: colors.slate[300] },
  audioBarActive: { backgroundColor: colors.blue[400] },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
    backgroundColor: "#fef2f2",
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
  },
  recordingInfo: { gap: 2 },
  recordingLabel: { fontSize: 13, fontWeight: "600", color: "#dc2626" },
  recordingTimer: { fontSize: 11, color: "#f87171" },
  recordingWave: { flexDirection: "row", alignItems: "center", gap: 2, flex: 1 },
  recordingWaveBar: { width: 3, borderRadius: 2, backgroundColor: "#f87171" },
  stopRecordBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
