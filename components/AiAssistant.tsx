import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Paperclip, X, Image as ImageIcon, Loader2, FileText } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { ChatMessage } from '../types';

// Helper to format text with basic markdown-like features for cleaner reading
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  // Split by newlines to handle paragraphs
  const paragraphs = text.split('\n');
  
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {paragraphs.map((p, i) => {
        if (!p.trim()) return <div key={i} className="h-1" />; // Spacer for empty lines
        
        // Handle Bullet Points
        if (p.trim().startsWith('* ') || p.trim().startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2 ml-1">
              <span className="text-blue-500 font-bold mt-1.5 w-1.5 h-1.5 bg-current rounded-full shrink-0"></span>
              <span dangerouslySetInnerHTML={{ __html: formatBold(p.replace(/^[\*\-]\s/, '')) }} />
            </div>
          );
        }

        // Handle Headers (Simple logic)
        if (p.trim().startsWith('##')) {
          return <h4 key={i} className="font-bold text-slate-800 pt-2" dangerouslySetInnerHTML={{ __html: formatBold(p.replace(/^##\s/, '')) }} />;
        }

        // Standard Paragraph
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatBold(p) }} />;
      })}
    </div>
  );
};

// Simple bold formatter (**text**)
const formatBold = (text: string) => {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

export const AiAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello! I am your AI Health Assistant.\n\nI can help you with:\n* Explaining symptoms\n* Analyzing medical reports (PDF or Images)\n* Suggesting home remedies\n\nHow can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ file: File, preview: string, type: 'image' | 'pdf' } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        alert("File size too large. Please select a file under 20MB.");
        return;
      }
      
      const isPdf = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');
      
      if (!isPdf && !isImage) {
        alert("Please select a valid image or PDF file.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile({
          file,
          preview: reader.result as string,
          type: isPdf ? 'pdf' : 'image'
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || loading) return;

    const currentFile = selectedFile; // capture current state
    const currentInput = input;
    
    // Convert base64 for API (strip header)
    let attachmentData = undefined;
    if (currentFile) {
      const base64Data = currentFile.preview.split(',')[1];
      attachmentData = {
        mimeType: currentFile.file.type,
        data: base64Data,
        name: currentFile.file.name
      };
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: currentInput,
      timestamp: new Date(),
      attachment: attachmentData
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedFile(null);
    setLoading(true);

    try {
      const responseText = await GeminiService.chat(messages, currentInput, attachmentData);

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I encountered an error processing your request. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-100px)] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Chat Header */}
      <div className="bg-white p-4 border-b border-slate-100 flex items-center gap-3 shadow-sm z-10">
        <div className="bg-blue-600 p-2 rounded-lg text-white shadow-blue-200 shadow-lg">
          <Bot size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm md:text-base">AI Health Assistant</h3>
          <p className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            Online • Powered by Gemini
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 scrollbar-hide">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[95%] md:max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
              msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-blue-600 border border-slate-100'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>

            {/* Bubble */}
            <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-3.5 md:p-4 rounded-2xl shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
              }`}>
                {/* Render Attachment if exists */}
                {msg.attachment && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-white/20">
                     {msg.attachment.mimeType === 'application/pdf' ? (
                       <div className="bg-white/10 p-4 rounded-lg flex items-center gap-3 backdrop-blur-sm border border-white/20">
                          <FileText size={24} className="text-white" />
                          <div className="text-xs text-white">
                            <p className="font-medium truncate max-w-[150px]">{msg.attachment.name || "Document.pdf"}</p>
                            <p className="opacity-70">PDF Document</p>
                          </div>
                       </div>
                     ) : (
                       <img 
                         src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} 
                         alt="User upload" 
                         className="max-w-full h-auto max-h-48 object-cover"
                       />
                     )}
                  </div>
                )}
                
                {/* Render Text */}
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.text || (msg.attachment ? "Sent a file" : "")}</p>
                ) : (
                  <FormattedText text={msg.text} />
                )}
              </div>
              <span className="text-[10px] text-slate-400 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-white text-blue-600 border border-slate-100 flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
              <Loader2 className="animate-spin text-blue-600" size={16} />
              <span className="text-xs text-slate-500 font-medium">Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 md:p-4 bg-white border-t border-slate-100">
        {/* File Preview in Input */}
        {selectedFile && (
          <div className="mb-3 flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200 w-fit">
            <div className="w-12 h-12 rounded overflow-hidden relative border border-slate-300 flex items-center justify-center bg-white">
              {selectedFile.type === 'pdf' ? <FileText size={20} className="text-red-500"/> : <img src={selectedFile.preview} alt="Preview" className="w-full h-full object-cover" />}
            </div>
            <div className="text-xs">
              <p className="font-medium text-slate-700 max-w-[150px] truncate">{selectedFile.file.name}</p>
              <p className="text-slate-400">{(selectedFile.file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={removeFile} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
              <X size={14} className="text-slate-500" />
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
           {/* File Input */}
           <input 
             type="file" 
             ref={fileInputRef}
             className="hidden" 
             accept="image/*,application/pdf"
             onChange={handleFileSelect}
           />
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="mb-1 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
             title="Upload Medical Report (Image or PDF)"
           >
             <Paperclip size={20} />
           </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={selectedFile ? "Add a message about this file..." : "Type symptoms or ask a question..."}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm max-h-32 resize-none"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={loading || (!input.trim() && !selectedFile)}
            className="mb-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all shadow-md shadow-indigo-200"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2">
          AI generated. Not a diagnosis. In emergencies, call SOS.
        </p>
      </div>
    </div>
  );
};