import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Patient, MedicalReport } from '../types';
import { Search, MapPin, Phone, Mail, FileText, Pill, ChevronRight, ArrowLeft, FilePlus, Calendar } from 'lucide-react';
import { PrescriptionWriter } from './PrescriptionWriter';

export const PatientsTab: React.FC = () => {
  const { patients } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPrescriptionWriter, setShowPrescriptionWriter] = useState(false);

  // Filter patients based on search
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If writing prescription, show that component
  if (showPrescriptionWriter && selectedPatient) {
    return (
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => setShowPrescriptionWriter(false)}
          className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
        >
          <ArrowLeft size={16} /> Back to Patient Details
        </button>
        <PrescriptionWriter 
          patient={selectedPatient} 
          onClose={() => setShowPrescriptionWriter(false)} 
        />
      </div>
    );
  }

  // If a patient is selected, show details
  if (selectedPatient) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedPatient(null)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Patient Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Profile Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold mb-4">
                  {selectedPatient.name.charAt(0)}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{selectedPatient.name}</h2>
                <p className="text-slate-500 text-sm mb-4">ID: {selectedPatient.id.toUpperCase()}</p>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-6">
                  <div className="bg-slate-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Age</p>
                    <p className="text-lg font-semibold text-slate-800">{selectedPatient.age}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Blood</p>
                    <p className="text-lg font-semibold text-slate-800">{selectedPatient.bloodGroup}</p>
                  </div>
                </div>

                <div className="w-full space-y-3 text-left">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Mail size={16} className="shrink-0" />
                    <span className="truncate">{selectedPatient.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Phone size={16} className="shrink-0" />
                    <span className="truncate">{selectedPatient.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <MapPin size={16} className="shrink-0" />
                    <span className="truncate">{selectedPatient.address || 'N/A'}</span>
                  </div>
                </div>

                <button 
                  onClick={() => setShowPrescriptionWriter(true)}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <FilePlus size={18} /> New Prescription
                </button>
              </div>
            </div>

            {/* Allergies & Conditions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-4">Medical Profile</h3>
               <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chronic Conditions</p>
                    <div className="flex flex-wrap gap-2">
                       {selectedPatient.chronicConditions.length > 0 ? (
                         selectedPatient.chronicConditions.map(c => (
                           <span key={c} className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-100">{c}</span>
                         ))
                       ) : <span className="text-sm text-slate-400">None</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Allergies</p>
                    <div className="flex flex-wrap gap-2">
                       {selectedPatient.allergies.length > 0 ? (
                         selectedPatient.allergies.map(a => (
                           <span key={a} className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full border border-red-100">{a}</span>
                         ))
                       ) : <span className="text-sm text-slate-400">None</span>}
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Right Column: History & Reports */}
          <div className="lg:col-span-2 space-y-6">
             {/* Medical History */}
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                   <FileText size={18} className="text-slate-500" />
                   <h3 className="font-bold text-slate-800">Medical History</h3>
                </div>
                <div className="divide-y divide-slate-100">
                   {selectedPatient.history.length === 0 ? (
                     <div className="p-8 text-center text-slate-400">No medical history recorded.</div>
                   ) : (
                     selectedPatient.history.map(record => (
                       <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                             <p className="font-medium text-slate-800">{record.condition}</p>
                             <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{record.date}</span>
                          </div>
                          <p className="text-sm text-slate-600">{record.notes}</p>
                          <div className="mt-2 flex gap-2">
                             <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{record.type}</span>
                          </div>
                       </div>
                     ))
                   )}
                </div>
             </div>

             {/* Reports */}
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                   <FileText size={18} className="text-slate-500" />
                   <h3 className="font-bold text-slate-800">Uploaded Reports</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                   {(!selectedPatient.reports || selectedPatient.reports.length === 0) ? (
                      <div className="col-span-full p-6 text-center text-slate-400">No reports uploaded by patient.</div>
                   ) : (
                      selectedPatient.reports.map(report => (
                         <div key={report.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-400 transition-colors cursor-pointer bg-white">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${report.type === 'PDF' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                               {report.type === 'PDF' ? <FileText size={20} /> : <FileText size={20} />}
                            </div>
                            <div className="min-w-0">
                               <p className="text-sm font-medium text-slate-800 truncate">{report.name}</p>
                               <p className="text-xs text-slate-500">{report.date}</p>
                            </div>
                         </div>
                      ))
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients Directory</h1>
          <p className="text-slate-500 text-sm">Manage patient records and prescriptions</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 font-medium">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Name</th>
                <th className="px-6 py-4 whitespace-nowrap">Age/Sex</th>
                <th className="px-6 py-4 whitespace-nowrap">Conditions</th>
                <th className="px-6 py-4 whitespace-nowrap">Last Visit</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.map(patient => (
                <tr key={patient.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {patient.name.charAt(0)}
                      </div>
                      <div className="font-medium text-slate-900">{patient.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{patient.age} / {patient.bloodGroup}</td>
                  <td className="px-6 py-4 max-w-xs truncate">
                    {patient.chronicConditions.length > 0 
                      ? patient.chronicConditions.join(', ') 
                      : <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                    {patient.history[0]?.date || 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedPatient(patient)}
                      className="text-blue-600 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      View <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredPatients.map(patient => (
          <div key={patient.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {patient.name.charAt(0)}
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900">{patient.name}</h3>
                    <p className="text-xs text-slate-500">{patient.age} Yrs • {patient.bloodGroup}</p>
                 </div>
              </div>
              <button 
                 onClick={() => setSelectedPatient(patient)}
                 className="text-blue-600 bg-blue-50 p-2 rounded-lg"
              >
                 <ChevronRight size={20} />
              </button>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-lg">
               <p className="text-xs font-bold text-slate-400 uppercase mb-1">Conditions</p>
               <p className="text-sm text-slate-700">
                  {patient.chronicConditions.length > 0 ? patient.chronicConditions.join(', ') : 'None'}
               </p>
            </div>
          </div>
        ))}
      </div>

      {filteredPatients.length === 0 && (
          <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
             No patients found matching "{searchTerm}"
          </div>
      )}
    </div>
  );
};