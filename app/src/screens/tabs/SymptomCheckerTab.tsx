import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { colors } from "../../lib/colors";

interface Choice {
  choice_id: string;
  choice_label: string;
  qualifier?: string;
}

interface Question {
  qid: number;
  component_code: string;
  question_text: string;
  tip?: string;
  component_data?: {
    choices?: Choice[];
    autosuggest_static_choices?: {
      sections: { section_title: string; choices: { id: string; common_name: string }[] }[];
    };
  };
  is_mandatory?: boolean;
}

interface Likelihood {
  id: string;
  desc: string;
  text: string;
  likelihood: string;
  relevant_doctor_specialities?: string[];
}

type Phase = "idle" | "loading" | "questioning" | "submitting" | "result";

export default function SymptomCheckerTab() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [assessmentId, setAssessmentId] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [progress, setProgress] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qualifiers, setQualifiers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Likelihood[]>([]);
  const [error, setError] = useState("");

  const [searchText, setSearchText] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<{ id: string; name: string }[]>([]);
  const [searchResults, setSearchResults] = useState<{ id: string; common_name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchSymptoms = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get<any>(`/patient/assessment/symptoms?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimerRef.current = setTimeout(() => searchSymptoms(searchText), 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchText, searchSymptoms]);

  async function handleStart() {
    setPhase("loading");
    setError("");
    try {
      const res = await api.post<any>("/patient/assessment/init", {});
      setAssessmentId(res.assessmentId);
      const q = res.questions?.[0];
      if (q) {
        setQuestion(q);
        setProgress(parseFloat(res.progress || "0"));
        setIsLast(res.is_last_question || false);
        setPhase("questioning");
      }
    } catch {
      setError("Failed to start assessment");
      setPhase("idle");
    }
  }

  async function handleAnswer() {
    if (!question) return;
    setError("");

    let selectedChoices: any[];

    if (question.component_code === "I-ATSG") {
      if (selectedSymptoms.length === 0) return;
      selectedChoices = selectedSymptoms.map((s) => ({
        choice_id: s.id,
        choice_label: s.name,
      }));
    } else if (question.component_code === "I-RADG") {
      const choices = question.component_data?.choices || [];
      selectedChoices = choices.map((c) => ({
        choice_id: c.choice_id,
        choice_label: c.choice_label,
        qualifier: qualifiers[c.choice_id] || "u",
      }));
    } else {
      if (selected.size === 0) return;
      selectedChoices = Array.from(selected).map((id) => {
        const c = question.component_data?.choices?.find((ch) => ch.choice_id === id);
        return { choice_id: id, choice_label: c?.choice_label || "" };
      });
    }

    setPhase("loading");
    try {
      const res = await api.post<any>("/patient/assessment/answer", {
        assessmentId,
        qid: question.qid,
        selectedChoices,
      });

      setSelected(new Set());
      setQualifiers({});
      setProgress(parseFloat(res.progress || "0"));
      setIsLast(res.is_last_question || false);

      const nextQ = res.questions?.[0];
      if (nextQ) {
        setQuestion(nextQ);
        setPhase("questioning");
      } else {
        await handleSubmit();
      }
    } catch {
      setError("Failed to submit answer");
      setPhase("questioning");
    }
  }

  async function handleSubmit() {
    setPhase("submitting");
    try {
      const res = await api.post<any>("/patient/assessment/submit", { assessmentId });
      setResults(res.likelihood || []);
      setPhase("result");
    } catch {
      setError("Failed to get assessment results");
      setPhase("questioning");
    }
  }

  function handleReset() {
    setPhase("idle");
    setAssessmentId("");
    setQuestion(null);
    setProgress(0);
    setSelected(new Set());
    setQualifiers({});
    setResults([]);
    setError("");
    setSearchText("");
    setSelectedSymptoms([]);
    setIsLast(false);
  }

  function toggleChoice(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (question?.component_code === "I-RADO") {
        return new Set([id]);
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addSymptom(id: string, name: string) {
    if (selectedSymptoms.find((s) => s.id === id)) return;
    setSelectedSymptoms((prev) => [...prev, { id, name }]);
    setSearchText("");
  }

  function removeSymptom(id: string) {
    setSelectedSymptoms((prev) => prev.filter((s) => s.id !== id));
  }

  if (phase === "idle") {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.center}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="fitness" size={40} color={colors.blue[600]} />
          </View>
          <Text style={styles.heroTitle}>Symptom Checker</Text>
          <Text style={styles.heroDesc}>
            Answer a few questions about your symptoms to get a preliminary health assessment
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Ionicons name="play" size={18} color={colors.white} />
            <Text style={styles.startBtnText}>Start Assessment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (phase === "loading" || phase === "submitting") {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.blue[600]} />
        <Text style={styles.loadingText}>
          {phase === "submitting" ? "Analyzing your symptoms..." : "Loading..."}
        </Text>
      </View>
    );
  }

  if (phase === "result") {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.resultHeader}>
          <Ionicons name="checkmark-circle" size={40} color="#10b981" />
          <Text style={styles.resultTitle}>Assessment Complete</Text>
        </View>

        {results.length === 0 ? (
          <View style={styles.emptyResult}>
            <Text style={styles.emptyResultText}>No specific conditions identified. If symptoms persist, consult a doctor.</Text>
          </View>
        ) : (
          results.map((item, idx) => (
            <View key={idx} style={styles.resultCard}>
              <View style={styles.resultCardHeader}>
                <Text style={styles.resultName}>{item.text || item.desc}</Text>
                <View style={[styles.likelihoodBadge, getLikelihoodStyle(item.likelihood)]}>
                  <Text style={[styles.likelihoodText, getLikelihoodTextStyle(item.likelihood)]}>
                    {item.likelihood}
                  </Text>
                </View>
              </View>
              {item.desc && item.desc !== item.text && (
                <Text style={styles.resultDesc}>{item.desc}</Text>
              )}
              {item.relevant_doctor_specialities && item.relevant_doctor_specialities.length > 0 && (
                <View style={styles.specialitiesRow}>
                  <Ionicons name="medical" size={12} color={colors.blue[500]} />
                  <Text style={styles.specialitiesText}>
                    {item.relevant_doctor_specialities.join(", ")}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}

        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Ionicons name="refresh" size={16} color={colors.blue[600]} />
          <Text style={styles.resetBtnText}>Start New Assessment</Text>
        </TouchableOpacity>

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={14} color={colors.slate[400]} />
          <Text style={styles.disclaimerText}>
            This is not a medical diagnosis. Please consult a healthcare professional for proper evaluation.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  // Questioning phase
  const choices = question?.component_data?.choices || [];
  const staticSuggestions = question?.component_data?.autosuggest_static_choices?.sections || [];
  const isAutosuggest = question?.component_code === "I-ATSG";
  const isRadioGroup = question?.component_code === "I-RADG";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.progressRow}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>

      <Text style={styles.questionText}>{question?.question_text}</Text>
      {question?.tip && <Text style={styles.tipText}>{question.tip}</Text>}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isAutosuggest ? (
        <View>
          {selectedSymptoms.length > 0 && (
            <View style={styles.chipRow}>
              {selectedSymptoms.map((s) => (
                <TouchableOpacity key={s.id} style={styles.chip} onPress={() => removeSymptom(s.id)}>
                  <Text style={styles.chipText}>{s.name}</Text>
                  <Ionicons name="close" size={14} color={colors.slate[500]} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search symptoms..."
            placeholderTextColor={colors.slate[400]}
          />

          {searching && (
            <ActivityIndicator size="small" color={colors.blue[600]} style={{ marginVertical: 8 }} />
          )}

          {searchText.trim() && searchResults.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Search Results</Text>
              <View style={styles.suggestGrid}>
                {searchResults.map((c) => {
                  const isSelected = selectedSymptoms.some((s) => s.id === c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.suggestChip, isSelected && styles.suggestChipActive]}
                      onPress={() => isSelected ? removeSymptom(c.id) : addSymptom(c.id, c.common_name)}
                    >
                      <Text style={[styles.suggestChipText, isSelected && styles.suggestChipTextActive]}>
                        {c.common_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {!searchText.trim() && staticSuggestions.map((section) => (
            <View key={section.section_title}>
              <Text style={styles.sectionTitle}>{section.section_title}</Text>
              <View style={styles.suggestGrid}>
                {section.choices.map((c) => {
                    const isSelected = selectedSymptoms.some((s) => s.id === c.id);
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.suggestChip, isSelected && styles.suggestChipActive]}
                        onPress={() => isSelected ? removeSymptom(c.id) : addSymptom(c.id, c.common_name)}
                      >
                        <Text style={[styles.suggestChipText, isSelected && styles.suggestChipTextActive]}>
                          {c.common_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          ))}
        </View>
      ) : isRadioGroup ? (
        <View style={styles.choiceList}>
          {choices.map((c) => {
            const q = qualifiers[c.choice_id] || "u";
            return (
              <View key={c.choice_id} style={styles.radioGroupRow}>
                <Text style={styles.radioGroupLabel}>{c.choice_label}</Text>
                <View style={styles.radioGroupBtns}>
                  {[
                    { val: "p", label: "Yes", color: "#10b981" },
                    { val: "a", label: "No", color: "#ef4444" },
                    { val: "u", label: "?", color: colors.slate[400] },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.val}
                      style={[styles.radioGroupBtn, q === opt.val && { backgroundColor: opt.color }]}
                      onPress={() => setQualifiers((p) => ({ ...p, [c.choice_id]: opt.val }))}
                    >
                      <Text style={[styles.radioGroupBtnText, q === opt.val && { color: colors.white }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.choiceList}>
          {choices.map((c) => {
            const isSelected = selected.has(c.choice_id);
            return (
              <TouchableOpacity
                key={c.choice_id}
                style={[styles.choiceItem, isSelected && styles.choiceItemActive]}
                onPress={() => toggleChoice(c.choice_id)}
              >
                <View style={[styles.choiceCheck, isSelected && styles.choiceCheckActive]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color={colors.white} />}
                </View>
                <Text style={[styles.choiceText, isSelected && styles.choiceTextActive]}>
                  {c.choice_label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.actionRow}>
        {isLast ? (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Ionicons name="checkmark-circle" size={18} color={colors.white} />
            <Text style={styles.submitBtnText}>Get Results</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, (isAutosuggest ? selectedSymptoms.length === 0 : selected.size === 0 && !isRadioGroup) && styles.btnDisabled]}
            onPress={handleAnswer}
            disabled={isAutosuggest ? selectedSymptoms.length === 0 : selected.size === 0 && !isRadioGroup}
          >
            <Text style={styles.nextBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function getLikelihoodStyle(likelihood: string) {
  switch (likelihood?.toLowerCase()) {
    case "high": return { backgroundColor: "#fef2f2", borderColor: "#fecaca" };
    case "medium": return { backgroundColor: "#fffbeb", borderColor: "#fde68a" };
    default: return { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" };
  }
}

function getLikelihoodTextStyle(likelihood: string) {
  switch (likelihood?.toLowerCase()) {
    case "high": return { color: "#ef4444" };
    case "medium": return { color: "#d97706" };
    default: return { color: "#10b981" };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 30,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.slate[100],
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: { fontSize: 20, fontWeight: "700", color: colors.slate[800], marginBottom: 8 },
  heroDesc: { fontSize: 13, color: colors.slate[500], textAlign: "center", lineHeight: 20, marginBottom: 20 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.blue[600],
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  startBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  loadingText: { marginTop: 12, color: colors.slate[500], fontSize: 14 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  progressBar: { flex: 1, height: 6, backgroundColor: colors.slate[100], borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: colors.blue[600], borderRadius: 3 },
  progressText: { fontSize: 12, color: colors.slate[400], fontWeight: "600", width: 35 },
  questionText: { fontSize: 18, fontWeight: "600", color: colors.slate[800], marginBottom: 6 },
  tipText: { fontSize: 13, color: colors.slate[400], marginBottom: 16 },
  error: { color: colors.red[600], fontSize: 12, marginBottom: 10 },
  choiceList: { gap: 8, marginTop: 8 },
  choiceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    padding: 14,
  },
  choiceItemActive: { borderColor: colors.blue[400], backgroundColor: "#eff6ff" },
  choiceCheck: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.slate[300],
    alignItems: "center",
    justifyContent: "center",
  },
  choiceCheckActive: { backgroundColor: colors.blue[600], borderColor: colors.blue[600] },
  choiceText: { fontSize: 14, color: colors.slate[700], flex: 1 },
  choiceTextActive: { color: colors.blue[700], fontWeight: "500" },
  radioGroupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    padding: 12,
  },
  radioGroupLabel: { fontSize: 14, color: colors.slate[700], flex: 1 },
  radioGroupBtns: { flexDirection: "row", gap: 6 },
  radioGroupBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
  },
  radioGroupBtnText: { fontSize: 12, fontWeight: "600", color: colors.slate[600] },
  searchInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.slate[900],
    marginBottom: 12,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.blue[50],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.blue[200],
  },
  chipText: { fontSize: 12, color: colors.blue[700] },
  sectionTitle: { fontSize: 12, fontWeight: "600", color: colors.slate[500], marginBottom: 8, marginTop: 4 },
  suggestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  suggestChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  suggestChipActive: { backgroundColor: colors.blue[50], borderColor: colors.blue[400] },
  suggestChipText: { fontSize: 13, color: colors.slate[600] },
  suggestChipTextActive: { color: colors.blue[700], fontWeight: "500" },
  actionRow: { marginTop: 20 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.blue[600],
    paddingVertical: 14,
    borderRadius: 14,
  },
  nextBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
  resultHeader: { alignItems: "center", gap: 8, marginBottom: 20 },
  resultTitle: { fontSize: 20, fontWeight: "700", color: colors.slate[800] },
  resultCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[100],
    marginBottom: 10,
  },
  resultCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  resultName: { fontSize: 15, fontWeight: "600", color: colors.slate[800], flex: 1 },
  likelihoodBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  likelihoodText: { fontSize: 11, fontWeight: "600" },
  resultDesc: { fontSize: 13, color: colors.slate[500], marginTop: 6 },
  specialitiesRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  specialitiesText: { fontSize: 12, color: colors.blue[500] },
  emptyResult: { alignItems: "center", padding: 30 },
  emptyResultText: { fontSize: 14, color: colors.slate[500], textAlign: "center" },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.blue[200],
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  resetBtnText: { fontSize: 14, color: colors.blue[600], fontWeight: "500" },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.slate[50],
    borderRadius: 10,
  },
  disclaimerText: { fontSize: 11, color: colors.slate[400], flex: 1, lineHeight: 16 },
});
