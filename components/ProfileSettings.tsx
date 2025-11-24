import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Patient } from '../types';
import { Save, User, MapPin, Phone, AlertTriangle, Activity, Plus, X } from 'lucide-react';

export const ProfileSettings: React.FC = () => {
  const { currentUser, updatePatientProfile } = useAppStore();
  const patient = currentUser as Patient;

  const [formData, setFormData] = useState({
    name: patient.name,
    age: patient.age,
    bloodGroup: patient.bloodGroup,
    phone: patient.phone || '',
    address: patient.address || '',
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [allergies, setAllergies] = useState<string[]>(patient.allergies);
  const [conditions, setConditions] = useState<string[]>(patient.chronicConditions);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePatientProfile({
      ...formData,
      allergies,
      chronicConditions: conditions
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addTag = (type: 'allergy' | 'condition') => {
    if (type === 'allergy' && newAllergy.trim()) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
    if (type === 'condition' && newCondition.trim()) {
      setConditions([...conditions, newCondition.trim()]);
      setNewCondition('');
    }
  };

  const removeTag = (type: 'allergy' | 'condition', tag: string) => {
    if (type === 'allergy') {
      setAllergies(allergies.filter(t => t !== tag));
    } else {
      setConditions(conditions.filter(t => t !== tag));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
          <p className="text-slate-500 text-sm">Update your personal and medical details.</p>
        </div>
        {saved && (
           <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg text-sm font-medium animate-fade-in border border-green-200">
             Changes Saved Successfully!
           </div>
        )}
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Personal Details Column */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
               <User size={18} className="text-blue-500" />
               Personal Information
             </h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                 <input 
                   type="text" 
                   value={formData.name}
                   onChange={e => setFormData({...formData, name: e.target.value})}
                   className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                 />
               </div>
               <div>
                 <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email (Read Only)</label>
                 <input 
                   type="text" 
                   value={patient.email}
                   disabled
                   className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-sm cursor-not-allowed"
                 />
               </div>
               <div>
                 <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                 <div className="relative">
                   <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                     type="tel" 
                     value={formData.phone}
                     onChange={e => setFormData({...formData, phone: e.target.value})}
                     placeholder="+1 (000) 000-0000"
                     className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                   />
                 </div>
               </div>
               <div>
                 <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Blood Group</label>
                 <select 
                   value={formData.bloodGroup}
                   onChange={e => setFormData({...formData, bloodGroup: e.target.value})}
                   className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                 >
                   {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                     <option key={g} value={g}>{g}</option>
                   ))}
                 </select>
               </div>
               <div className="sm:col-span-2">
                 <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Address</label>
                 <div className="relative">
                   <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                   <textarea 
                     value={formData.address}
                     onChange={e => setFormData({...formData, address: e.target.value})}
                     placeholder="Enter your full address"
                     rows={2}
                     className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none"
                   />
                 </div>
               </div>
             </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <Activity size={18} className="text-amber-500" />
                   Chronic Conditions
                </h3>
             </div>
             
             <div className="flex flex-wrap gap-2 mb-4">
               {conditions.map(c => (
                 <span key={c} className="flex items-center gap-1 pl-3 pr-2 py-1.5 bg-amber-50 text-amber-700 text-sm font-medium rounded-full border border-amber-100">
                   {c}
                   <button type="button" onClick={() => removeTag('condition', c)} className="p-0.5 hover:bg-amber-100 rounded-full transition-colors">
                     <X size={14} />
                   </button>
                 </span>
               ))}
               {conditions.length === 0 && <span className="text-sm text-slate-400 italic">No conditions listed.</span>}
             </div>

             <div className="flex gap-2">
               <input 
                 type="text"
                 value={newCondition}
                 onChange={e => setNewCondition(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('condition'))}
                 placeholder="Add new condition (e.g. Diabetes)"
                 className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
               />
               <button 
                 type="button"
                 onClick={() => addTag('condition')}
                 className="bg-amber-100 text-amber-700 p-2 rounded-lg hover:bg-amber-200 transition-colors"
               >
                 <Plus size={20} />
               </button>
             </div>
          </div>
        </div>

        {/* Right Column: Allergies & Save */}
        <div className="space-y-6">
           {/* Allergies Card */}
           <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <AlertTriangle size={18} className="text-red-500" />
                   Allergies
                </h3>
             </div>
             
             <div className="flex flex-wrap gap-2 mb-4">
               {allergies.map(a => (
                 <span key={a} className="flex items-center gap-1 pl-3 pr-2 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded-full border border-red-100">
                   {a}
                   <button type="button" onClick={() => removeTag('allergy', a)} className="p-0.5 hover:bg-red-100 rounded-full transition-colors">
                     <X size={14} />
                   </button>
                 </span>
               ))}
               {allergies.length === 0 && <span className="text-sm text-slate-400 italic">No known allergies.</span>}
             </div>

             <div className="flex gap-2">
               <input 
                 type="text"
                 value={newAllergy}
                 onChange={e => setNewAllergy(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('allergy'))}
                 placeholder="Add allergy (e.g. Peanuts)"
                 className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
               />
               <button 
                 type="button"
                 onClick={() => addTag('allergy')}
                 className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 transition-colors"
               >
                 <Plus size={20} />
               </button>
             </div>
          </div>

          {/* Sticky Save Button (Mobile Friendly) */}
          <div className="sticky top-4">
             <button 
               type="submit"
               className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
             >
               <Save size={20} />
               Save Changes
             </button>
             <p className="text-xs text-center text-slate-400 mt-2">
                Last updated: {new Date().toLocaleDateString()}
             </p>
          </div>
        </div>

      </form>
    </div>
  );
};