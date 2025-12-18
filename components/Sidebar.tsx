
import React from 'react';
import { AppView } from '../types';
import { 
  LayoutDashboard, 
  Gavel, 
  FileText, 
  Scale, 
  FolderKanban, 
  ShieldCheck,
  Settings
} from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen }) => {
  
  const menuItems = [
    { id: AppView.DASHBOARD, label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: AppView.SIMULATION, label: 'المحاكاة القضائية', icon: Gavel },
    { id: AppView.MEMO_BUILDER, label: 'صانع المذكرات', icon: FileText },
    { id: AppView.JUDGMENT_ANALYZER, label: 'تحليل الأحكام', icon: Scale },
    { id: AppView.LEGAL_ADVISOR, label: 'المستشار الذكي', icon: ShieldCheck },
    { id: AppView.CASE_MANAGER, label: 'سجلات القضايا', icon: FolderKanban },
    { id: AppView.SETTINGS, label: 'الإعدادات', icon: Settings },
  ];

  const sidebarClass = `
    fixed top-0 right-0 h-full bg-slate-900 text-white shadow-xl transition-all duration-300 z-50
    ${isOpen ? 'w-64' : 'w-0 overflow-hidden'} md:w-64 md:static flex flex-col
  `;

  return (
    <div className={sidebarClass}>
      <div className="p-6 border-b border-slate-700 flex items-center justify-center flex-col shrink-0">
        <div className="w-16 h-16 bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-gold-500/20 transform rotate-3">
          <Scale className="text-slate-900 w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-gold-400 tracking-wide">اليوسفكو</h1>
        <p className="text-[10px] text-slate-400 mt-1 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">للذكاء القانوني</p>
      </div>

      <nav className="mt-6 px-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-gold-500 text-slate-900 shadow-lg shadow-gold-500/20 font-bold' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <item.icon size={20} className={`transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-slate-900 font-bold text-xs">
            AL
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">مكتب اليوسفكو</p>
            <p className="text-[10px] text-slate-500 truncate">جميع الحقوق محفوظة © 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
