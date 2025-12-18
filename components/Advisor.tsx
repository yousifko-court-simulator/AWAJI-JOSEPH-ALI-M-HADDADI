import React, { useState, useRef } from 'react';
import { getLegalAdvice } from '../services/geminiService';
import { FileData } from '../types';
import { ShieldCheck, Send, Bot, Paperclip, X, FileText } from 'lucide-react';

const Advisor: React.FC = () => {
  const [query, setQuery] = useState('');
  const [file, setFile] = useState<FileData | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1];
      
      setFile({
        name: selectedFile.name,
        data: base64Content,
        mimeType: selectedFile.type
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleAsk = async () => {
    if (!query.trim() && !file) return;
    setLoading(true);
    setResponse('');
    try {
      const result = await getLegalAdvice(query, file);
      setResponse(result);
    } catch (error) {
      setResponse("عذراً، حدث خطأ في الاتصال.");
    } finally {
      setLoading(false);
      setFile(null); // Clear file after sending
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800">المستشار القانوني الذكي</h2>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">اطرح سؤالك القانوني أو ارفع مستنداً للاستشارة وسيقوم النظام بالإجابة بناءً على الأنظمة السعودية.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <p className="text-sm opacity-90">مرحباً بك. أنا المستشار الآلي لمكتب اليوسفكو. كيف يمكنني خدمتك اليوم؟</p>
        </div>
        
        <div className="p-6 min-h-[300px] bg-slate-50">
          {response && (
            <div className="flex gap-4 animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                <Bot className="text-white" size={20} />
              </div>
              <div className="bg-white p-5 rounded-2xl rounded-tr-none shadow-sm border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap flex-1">
                {response}
              </div>
            </div>
          )}
          
          {loading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                <Bot className="text-white" size={20} />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tr-none shadow-sm border border-slate-200 w-24">
                 <div className="flex space-x-1 space-x-reverse justify-center">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                  </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
           {file && (
             <div className="mb-2 inline-flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
               <FileText size={14} className="text-emerald-600" />
               <span className="text-xs text-emerald-800 max-w-[200px] truncate">{file.name}</span>
               <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500 ml-1"><X size={14} /></button>
             </div>
           )}
           <div className="relative flex items-center gap-2">
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="p-3 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors"
               title="إرفاق ملف"
             >
               <Paperclip size={20} />
               <input ref={fileInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileChange} />
             </button>
             
             <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="اكتب سؤالك هنا..." 
              className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
            />
            
            <button 
              onClick={handleAsk}
              disabled={loading || (!query && !file)}
              className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Send size={20} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
            </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Advisor;