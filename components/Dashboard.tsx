
import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AppView } from '../types';
import { 
  FileText, Clock, CheckCircle, AlertTriangle, Settings, Key, 
  Gavel, Scale, ShieldCheck, PenTool, ArrowLeft, Zap
} from 'lucide-react';

const mockData = [
  { name: 'يناير', cases: 4 },
  { name: 'فبراير', cases: 7 },
  { name: 'مارس', cases: 5 },
  { name: 'أبريل', cases: 12 },
  { name: 'مايو', cases: 9 },
];

const pieData = [
  { name: 'تجارية', value: 40 },
  { name: 'عمالية', value: 30 },
  { name: 'جزائية', value: 20 },
  { name: 'أحوال', value: 10 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow group">
    <div className={`p-4 rounded-xl ${color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  </div>
);

const ActionCard = ({ title, desc, icon: Icon, color, onClick, badge }: any) => (
  <button 
    onClick={onClick}
    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-start text-right hover:shadow-xl hover:border-gold-300 transition-all group relative overflow-hidden w-full"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-5 rounded-bl-full -mr-4 -mt-4 transition-opacity group-hover:opacity-10`}></div>
    
    <div className="flex justify-between w-full mb-4">
      <div className={`p-3 rounded-xl bg-slate-50 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors`}>
        <Icon size={24} />
      </div>
      {badge && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full h-fit">{badge}</span>}
    </div>
    
    <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-gold-600 transition-colors">{title}</h3>
    <p className="text-xs text-slate-500 leading-relaxed mb-4">{desc}</p>
    
    <div className="mt-auto flex items-center text-xs font-bold text-slate-400 group-hover:text-slate-800 transition-colors">
      ابدأ الآن <ArrowLeft size={14} className="mr-2 group-hover:-translate-x-1 transition-transform" />
    </div>
  </button>
);

interface DashboardProps {
  onNavigate: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in pb-20">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <span className="bg-slate-900 text-gold-500 p-2 rounded-lg"><Scale size={24}/></span>
            منصة اليوسفكو للذكاء القانوني
          </h2>
          <p className="text-slate-500 mt-2 text-sm">نظام المحاكاة والتحليل القانوني المتكامل - الإصدار 2.0</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate(AppView.SETTINGS)}
            className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Key size={16} className="text-gold-500" />
            إدارة المفاتيح
          </button>
          <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2">
            <Clock size={16} className="text-gold-500"/>
            {currentDate}
          </div>
        </div>
      </header>

      {/* Quick Access Grid (The Core Features) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard 
          title="المحاكاة القضائية"
          desc="تدريب عملي على جلسات المحاكمة وتقمص الأدوار أمام قاضٍ افتراضي."
          icon={Gavel}
          color="from-slate-900 to-slate-700"
          onClick={() => onNavigate(AppView.SIMULATION)}
          badge="الأساسية"
        />
        <ActionCard 
          title="صانع المذكرات"
          desc="صياغة المذكرات القانونية والعقود بدقة عالية وتحديد النواقص."
          icon={PenTool}
          color="from-emerald-600 to-emerald-400"
          onClick={() => onNavigate(AppView.MEMO_BUILDER)}
        />
        <ActionCard 
          title="مدقق الأحكام العليا"
          desc="تحليل الصكوك واكتشاف ثغرات النقض والاستئناف ونسب النجاح."
          icon={ShieldCheck}
          color="from-blue-600 to-blue-400"
          onClick={() => onNavigate(AppView.JUDGMENT_ANALYZER)}
          badge="جديد"
        />
        <ActionCard 
          title="المستشار الذكي"
          desc="إجابات فورية على الاستفسارات القانونية بناءً على الأنظمة."
          icon={Zap}
          color="from-gold-500 to-gold-300"
          onClick={() => onNavigate(AppView.LEGAL_ADVISOR)}
        />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="القضايا النشطة" value="24" icon={FileText} color="bg-blue-500" />
        <StatCard title="الجلسات المحاكية" value="8" icon={Gavel} color="bg-slate-800" />
        <StatCard title="مذكرات منجزة" value="12" icon={CheckCircle} color="bg-emerald-500" />
        <StatCard title="تنبيهات ومواعيد" value="3" icon={AlertTriangle} color="bg-amber-500" />
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-slate-800">نشاط المكتب الشهري</h3>
             <select className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1 outline-none">
               <option>آخر 6 أشهر</option>
               <option>هذا العام</option>
             </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="cases" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6">توزيع القضايا</h3>
          <div className="h-64 flex-1 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
               <span className="text-3xl font-bold text-slate-800">100</span>
               <span className="text-xs text-slate-400">قضية</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></span>
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
