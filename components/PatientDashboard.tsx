import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { AlertTriangle, FileText, Pill, Upload, X, Plus, File } from 'lucide-react';
import { Patient, MedicalReport } from '../types';

export const PatientDashboard: React.FC = () => {
  const { currentUser, triggerSOS, addReport } = useAppStore();
  const patient = currentUser as Patient;
  const [sosActive, setSosActive] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleSOS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          triggerSOS({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          activateSosAnimation();
        },
        () => {
           // Handle denied permission
           triggerSOS({ lat: 0, lng: 0 });
           activateSosAnimation();
        }
      );
    } else {
      triggerSOS({ lat: 0, lng: 0 });
      activateSosAnimation();
    }
  };

  const activateSosAnimation = () => {
    setSosActive(true);
    setTimeout(() => setSosActive(false), 5000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    e.preventDefault();
    let file: File | undefined;

    if ('dataTransfer' in e) {
       file = e.dataTransfer.files[0];
    } else if ('target' in e) {
       file = (e.target as HTMLInputElement).files?.[0];
    }

    if (file) {
      // Simulate file upload delay
      setTimeout(() => {
        const newReport: MedicalReport = {
           id: `rep-${Date.now()}`,
           name: file!.name,
           date: new Date().toISOString().split('T')[0],
           type: file!.type === 'application/pdf' ? 'PDF' : 'IMAGE',
           url: URL.createObjectURL(file!) // In real app, this would be cloud URL
        };
        addReport(patient.id, newReport);
        setShowUploadModal(false);
        alert("Report uploaded successfully!");
      }, 800);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hello, {patient.name} 👋</h1>
          <p className="text-slate-500 text-sm">Here is your daily health summary.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium border border-blue-100">
           ID: <span className="font-mono">{patient.id.toUpperCase()}</span>
        </div>
      </div>

      {/* SOS Section */}
      <div className="bg-gradient-to-r from-red-50 to-white border border-red-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-red-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="space-y-2 text-center sm:text-left z-10">
          <h2 className="text-xl font-bold text-red-700 flex items-center justify-center sm:justify-start gap-2">
            <AlertTriangle className="fill-red-100 stroke-red-600" />
            Emergency SOS
          </h2>
          <p className="text-slate-600 text-sm max-w-md">
            Tap below to instantly alert your doctor and emergency contacts with your live location.
          </p>
        </div>
        <button
          onClick={handleSOS}
          className={`relative shrink-0 group rounded-full w-24 h-24 md:w-28 md:h-28 flex items-center justify-center transition-all duration-300 shadow-xl shadow-red-200 ${
            sosActive ? 'bg-red-700 scale-95' : 'bg-red-600 hover:bg-red-700 hover:scale-105'
          }`}
        >
          <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-20"></div>
          <span className="relative z-10 text-white font-bold text-lg md:text-xl tracking-wider">SOS</span>
        </button>
      </div>

      {sosActive && (
        <div className="bg-green-100 border border-green-200 text-green-800 p-4 rounded-xl text-center animate-bounce shadow-sm font-medium">
          Alert Sent Successfully! Help is on the way.
        </div>
      )}

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Recent Prescriptions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Pill className="text-blue-500" size={18} />
              Medications
            </h3>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{patient.prescriptions.length} Active</span>
          </div>
          
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] scrollbar-hide">
            {patient.prescriptions.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-center border-2 border-dashed border-slate-100 rounded-lg">
                 <Pill size={32} className="mb-2 opacity-20" />
                 <p className="text-sm">No active prescriptions.</p>
               </div>
            ) : (
              patient.prescriptions.map(p => (
                <div key={p.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                     <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{p.date}</span>
                     <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{p.doctorName}</span>
                  </div>
                  <ul className="space-y-2 mt-2">
                    {p.medications.map((m, i) => (
                      <li key={i} className="text-sm text-slate-700 flex justify-between items-center">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100">{m.dosage}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Medical History */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col h-full">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="text-purple-500" size={18} />
            Recent History
          </h3>
          <div className="flex-1 space-y-4">
            {patient.history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-center border-2 border-dashed border-slate-100 rounded-lg">
                   <FileText size={32} className="mb-2 opacity-20" />
                   <p className="text-sm">No records found.</p>
                </div>
            ) : (
                patient.history.slice(0, 4).map(h => (
                  <div key={h.id} className="flex gap-3 items-start relative pb-4 last:pb-0">
                    <div className="w-2 h-2 mt-1.5 bg-purple-400 rounded-full shrink-0 ring-4 ring-purple-50"></div>
                    {/* Vertical Line */}
                    <div className="absolute left-[3px] top-4 bottom-0 w-0.5 bg-slate-100 last:hidden"></div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{h.condition}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{h.date} • <span className="text-purple-600">{h.type}</span></p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Reports & Documents */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col h-full">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <Upload className="text-emerald-500" size={18} />
               Reports
             </h3>
             <button 
                onClick={() => setShowUploadModal(true)}
                className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full font-medium hover:bg-emerald-100 transition-colors flex items-center gap-1"
             >
                <Plus size={12} /> Upload
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] scrollbar-hide">
              {(!patient.reports || patient.reports.length === 0) ? (
                 <div className="flex flex-col items-center justify-center h-40 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50 p-4">
                    <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400 mb-2">
                      <FileText size={18} />
                    </div>
                    <p className="text-xs font-medium text-slate-900">No Reports</p>
                    <button 
                       onClick={() => setShowUploadModal(true)}
                       className="mt-1 text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      Upload PDF/Image
                    </button>
                 </div>
              ) : (
                patient.reports.map(report => (
                  <div key={report.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-emerald-200 transition-all">
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${report.type === 'PDF' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {report.type === 'PDF' ? <FileText size={20} /> : <File size={20} />}
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{report.name}</p>
                        <p className="text-[10px] text-slate-500">{report.date} • {report.type}</p>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div 
             className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl transform transition-all scale-100"
             onDragEnter={() => setDragActive(true)}
          >
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-slate-800">Upload Report</h3>
               <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
             </div>
             
             <div 
                className={`border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center text-slate-400 transition-all cursor-pointer relative ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50 hover:border-blue-300'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { handleFileUpload(e); setDragActive(false); }}
                onClick={() => uploadInputRef.current?.click()}
             >
                <input 
                  type="file" 
                  ref={uploadInputRef} 
                  className="hidden" 
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                />
                <Upload size={32} className={`mb-3 ${dragActive ? 'text-blue-500' : 'text-slate-300'}`} />
                <span className="text-sm font-medium text-slate-600">Click to upload</span>
                <span className="text-xs text-slate-400 mt-1">PDF, JPG, or PNG (Max 10MB)</span>
             </div>
             
             <button 
                onClick={() => setShowUploadModal(false)}
                className="w-full mt-4 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
             >
               Cancel
             </button>
          </div>
        </div>
      )}

    </div>
  );
};