import React, { useState, useEffect } from 'react';
import { Patient, PrescriptionAnalysisResult } from '../types';
import { Mic, MicOff, Check, AlertTriangle, Loader2, FileDown, CheckCircle } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { useAppStore } from '../store';

interface Props {
  patient: Patient;
  onClose: () => void;
}

export const PrescriptionWriter: React.FC<Props> = ({ patient, onClose }) => {
  const { addPrescription, currentUser } = useAppStore();
  const [isListening, setIsListening] = useState(false);
  const [dictationText, setDictationText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PrescriptionAnalysisResult | null>(null);
  const [recognition, setRecognition] = useState<any | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        // Append to existing text only when finalized or show interim in UI if needed
        // For simplicity, we just update state with current accumulated result from this session
        // But to allow manual editing + voice, we need to be careful. 
        // Simplest approach: Append final results.
        if (finalTranscript) {
             setDictationText(prev => prev + ' ' + finalTranscript);
        }
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      alert("Voice recognition not supported in this browser.");
      return;
    }
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const handleAnalyze = async () => {
    if (!dictationText.trim()) return;
    setAnalyzing(true);
    const result = await GeminiService.analyzePrescription(dictationText, patient);
    setAnalysis(result);
    setAnalyzing(false);
  };

  const handleFinalize = () => {
    if (!analysis) return;
    addPrescription(patient.id, {
      id: `pr-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      doctorName: currentUser?.name || 'Unknown Doctor',
      medications: analysis.structuredPrescription,
      notes: 'Generated via AI Assistant'
    });
    onClose();
    alert("Prescription saved and sent to patient portal.");
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 max-w-3xl mx-auto">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-800">New Prescription for {patient.name}</h2>
        <p className="text-sm text-slate-500">
           Allergies: <span className="text-red-500 font-medium">{patient.allergies.join(', ') || 'None'}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-700">Dictation / Notes</label>
            <button
              onClick={toggleListening}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
                isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              {isListening ? <><MicOff size={14} /> Recording...</> : <><Mic size={14} /> Start Dictation</>}
            </button>
          </div>
          <textarea
            value={dictationText}
            onChange={(e) => setDictationText(e.target.value)}
            className="w-full h-48 p-4 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none text-slate-700"
            placeholder="e.g., Prescribe Amoxicillin 500mg three times a day for 7 days..."
          ></textarea>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !dictationText.trim()}
            className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {analyzing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            Analyze & Check Safety
          </button>
        </div>

        {/* Analysis Result Section */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
           {!analysis ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
               <FileDown size={32} />
               <p className="text-sm text-center">Dictate and analyze to see<br/>structured preview here.</p>
             </div>
           ) : (
             <div className="space-y-4 h-full flex flex-col">
                <div className={`p-3 rounded-lg border ${analysis.safe ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="flex items-start gap-3">
                    {analysis.safe 
                      ? <CheckCircle className="text-green-600 shrink-0" size={20} /> 
                      : <AlertTriangle className="text-orange-600 shrink-0" size={20} />
                    }
                    <div>
                      <h4 className={`font-bold text-sm ${analysis.safe ? 'text-green-800' : 'text-orange-800'}`}>
                        {analysis.safe ? 'Safety Check Passed' : 'Safety Warnings Detected'}
                      </h4>
                      {!analysis.safe && (
                        <ul className="mt-1 text-xs text-orange-700 list-disc pl-4 space-y-1">
                          {analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prescription Preview</h4>
                   {analysis.structuredPrescription.map((med, idx) => (
                     <div key={idx} className="bg-white p-3 rounded border border-slate-200 text-sm shadow-sm">
                        <div className="font-bold text-slate-800">{med.name}</div>
                        <div className="text-slate-500 text-xs grid grid-cols-2 gap-2 mt-1">
                          <span>Dosage: {med.dosage}</span>
                          <span>Freq: {med.frequency}</span>
                          <span className="col-span-2">Duration: {med.duration}</span>
                        </div>
                     </div>
                   ))}
                </div>

                <button
                  onClick={handleFinalize}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  Confirm & Save
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};