import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Paperclip, FileText, Minimize2, Maximize2, Loader2, Trash2 } from 'lucide-react';
import { askGlobalAssistant } from '../services/geminiService';

interface FileUpload {
  name: string;
  data: string; // base64
  mimeType: string;
}

const GlobalAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [file, setFile] = useState<FileUpload | null>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', content: string, file?: string}[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      // Remove data url prefix
      const base64Content = base64String.split(',')[1];
      
      setFile({
        name: selectedFile.name,
        data: base64Content,
        mimeType: selectedFile.type
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSend = async () => {
    if ((!input.trim() && !file) || loading) return;

    const currentInput = input;
    const currentFile = file;

    // Add user message
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: currentInput || (currentFile ? `قام برفع ملف: ${currentFile.name}` : ''),
      file: currentFile?.name 
    }]);

    setInput('');
    setFile(null);
    setLoading(true);

    try {
      const response = await askGlobalAssistant(currentInput, currentFile);
      
      setMessages(prev => [...prev, {
        role: 'model',
        content: response
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'model',
        content: "حدث خطأ في المعالجة."
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 w-16 h-16 bg-slate-900 rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-slate-800 hover:scale-105 transition-all border-4 border-gold-500 animate-bounce-slow"
        title="المساعد الذكي"
      >
        <Bot size={32} />
      </button>
    );
  }

  return (
    <div className={`fixed z-50 transition-all duration-300 shadow-2xl bg-white border border-slate-200 overflow-hidden flex flex-col
      ${isMinimized 
        ? 'bottom-6 left-6 w-72 h-16 rounded-2xl' 
        : 'bottom-6 left-6 w-[90vw] md:w-[450px] h-[600px] max-h-[80vh] rounded-2xl'
      }
    `}>
      {/* Header */}
      <div 
        className="bg-slate-900 text-white p-4 flex justify-between items-center cursor-pointer"
        onClick={() => !isMinimized && setIsMinimized(true)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-gold-500 p-1.5 rounded-lg text-slate-900">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm">مساعد اليوسفكو</h3>
            {!isMinimized && <span className="text-[10px] text-slate-400 block">متصل الآن - جاهز للتحليل</span>}
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <>
          <div className="flex-1 bg-slate-50 p-4 overflow-y-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 mt-10">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">أنا جاهز لمساعدتك.</p>
                <p className="text-xs mt-1">يمكنك رفع ملف PDF أو صورة لتحليلها فوراً.</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-slate-800 text-white rounded-br-none' 
                      : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.file && (
                    <div className="flex items-center gap-2 bg-slate-700/50 p-2 rounded-lg mb-2 text-xs">
                      <FileText size={14} className="text-gold-400" />
                      <span className="truncate max-w-[150px]">{msg.file}</span>
                    </div>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-gold-500" />
                  <span className="text-xs text-slate-500">جاري التحليل...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer */}
          <div className="p-3 bg-white border-t border-slate-200">
            {file && (
              <div className="flex items-center justify-between bg-blue-50 p-2 rounded-lg mb-2 border border-blue-100 animate-fade-in">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText size={16} className="text-blue-600 shrink-0" />
                  <span className="text-xs font-medium text-blue-900 truncate">{file.name}</span>
                </div>
                <button 
                  onClick={() => setFile(null)} 
                  className="p-1 hover:bg-blue-100 rounded-full text-blue-700 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
            
            <div className="flex items-end gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="application/pdf,image/*,text/plain"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors shrink-0"
                title="إرفاق ملف"
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
                placeholder="اكتب استفسارك أو ارفع ملف..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-32 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
                rows={1}
              />
              
              <button 
                onClick={handleSend}
                disabled={(!input.trim() && !file) || loading}
                className="p-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/10"
              >
                <Send size={20} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GlobalAssistant;