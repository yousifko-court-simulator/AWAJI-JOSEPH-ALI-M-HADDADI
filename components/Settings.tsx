
import React, { useState, useEffect } from 'react';
import { Save, Key, RefreshCw, ShieldCheck, CheckCircle } from 'lucide-react';

const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('GEMINI_API_KEY');
    if (storedKey) setApiKey(storedKey);
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl border-4 border-gold-500">
          <Key className="w-10 h-10 text-gold-500" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800">الإعدادات</h2>
        <p className="text-slate-500 mt-2">إدارة مفاتيح الربط واعدادات النظام</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <ShieldCheck className="text-blue-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800 mb-1">مفتاح Google Gemini API</h3>
              <p className="text-sm text-slate-500 mb-4">
                يستخدم النظام هذا المفتاح للتواصل مع نماذج الذكاء الاصطناعي. يتم تخزين المفتاح محلياً في متصفحك ولا يتم مشاركته مع أي طرف ثالث.
              </p>
              
              <div className="relative">
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full p-4 pl-12 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none font-mono text-sm transition-all"
                />
                <Key className="absolute left-4 top-4 text-slate-400" size={20} />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button 
              onClick={() => {
                localStorage.removeItem('GEMINI_API_KEY');
                setApiKey('');
                alert('تم استعادة الإعدادات الافتراضية');
              }}
              className="px-6 py-3 rounded-xl text-slate-500 hover:bg-slate-50 font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw size={18} />
              مسح المفتاح
            </button>
            
            <button 
              onClick={handleSave}
              className={`
                px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2
                ${saved ? 'bg-green-600 shadow-green-600/20' : 'bg-slate-900 shadow-slate-900/20 hover:bg-slate-800'}
              `}
            >
              {saved ? <CheckCircle size={18}/> : <Save size={18} />}
              {saved ? 'تم الحفظ بنجاح' : 'حفظ التغييرات'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
