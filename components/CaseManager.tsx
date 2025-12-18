import React, { useState, useEffect, useRef } from 'react';
import { SavedCaseSession } from '../types';
import { 
  FolderOpen, 
  UploadCloud, 
  Clock, 
  FileText, 
  Trash2, 
  Play, 
  Search,
  AlertCircle
} from 'lucide-react';

interface CaseManagerProps {
  onLoadCase: (session: SavedCaseSession) => void;
}

const CaseManager: React.FC<CaseManagerProps> = ({ onLoadCase }) => {
  const [savedCases, setSavedCases] = useState<SavedCaseSession[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load cases from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('saved_cases');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Sort by lastUpdated descending (newest first)
          const sorted = parsed.sort((a: SavedCaseSession, b: SavedCaseSession) => 
            new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
          );
          setSavedCases(sorted);
        }
      }
    } catch (e) {
      console.error("Failed to load saved cases", e);
    }
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("هل أنت متأكد من حذف هذه القضية من السجلات؟")) {
      const updated = savedCases.filter(c => c.id !== id);
      setSavedCases(updated);
      localStorage.setItem('saved_cases', JSON.stringify(updated));
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Basic validation
        if (!json.config || !json.messages) {
          alert("صيغة الملف غير صحيحة.");
          return;
        }
        onLoadCase(json as SavedCaseSession);
      } catch (err) {
        alert("فشل قراءة ملف القضية.");
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredCases = savedCases.filter(c => 
    c.config.courtName.includes(searchTerm) || 
    c.title?.includes(searchTerm) ||
    c.config.caseType.includes(searchTerm)
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <FolderOpen className="text-gold-500" />
            سجلات القضايا
          </h2>
          <p className="text-slate-500 mt-2">إدارة القضايا المحفوظة واستكمال المرافعة من حيث توقفت</p>
        </div>
        
        <div className="flex gap-3">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
            >
                <UploadCloud size={18} />
                استيراد ملف قضية
                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
            </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="mb-6 relative">
          <input 
            type="text" 
            placeholder="بحث في السجلات (اسم المحكمة، نوع القضية...)" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-4 pl-12 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-gold-400 focus:outline-none shadow-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
      </div>

      {/* Cases Grid */}
      {filteredCases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCases.map((session) => (
                <div 
                    key={session.id} 
                    onClick={() => onLoadCase(session)}
                    className="group bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-lg hover:border-gold-300 transition-all relative overflow-hidden"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={`
                            px-3 py-1 rounded-full text-xs font-bold 
                            ${session.config.caseType === 'Commercial' ? 'bg-blue-100 text-blue-800' : ''}
                            ${session.config.caseType === 'Criminal' ? 'bg-rose-100 text-rose-800' : ''}
                            ${session.config.caseType === 'Civil' ? 'bg-emerald-100 text-emerald-800' : ''}
                            ${session.config.caseType === 'Personal' ? 'bg-purple-100 text-purple-800' : ''}
                        `}>
                            {session.config.caseType}
                        </div>
                        <button 
                            onClick={(e) => handleDelete(session.id, e)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                            title="حذف السجل"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>

                    <h3 className="font-bold text-slate-800 text-lg mb-2 truncate">
                        {session.title || session.config.courtName || 'قضية بدون عنوان'}
                    </h3>

                    <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <Clock size={14} />
                            <span>آخر تحديث: {new Date(session.lastUpdated).toLocaleDateString('ar-SA')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <FileText size={14} />
                            <span>المرحلة: {session.currentPhase}</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-auto">
                        <span className="text-xs font-bold text-slate-400">{session.messages.length} رسالة</span>
                        <span className="flex items-center gap-1 text-gold-600 font-bold text-sm group-hover:translate-x-[-4px] transition-transform">
                            استكمال <Play size={14} className="rotate-180" />
                        </span>
                    </div>
                </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-slate-300" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-400 mb-2">لا توجد قضايا محفوظة</h3>
            <p className="text-slate-400 max-w-md mx-auto mb-6">يمكنك حفظ القضايا أثناء المحاكاة وستظهر هنا، أو قم باستيراد ملف قضية من جهازك.</p>
        </div>
      )}
    </div>
  );
};

export default CaseManager;