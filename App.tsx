import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MemoBuilder from './components/MemoBuilder';
import Simulation from './components/Simulation';
import Analyzer from './components/Analyzer';
import Advisor from './components/Advisor';
import Settings from './components/Settings';
import CaseManager from './components/CaseManager';
import GlobalAssistant from './components/GlobalAssistant';
import { AppView, SavedCaseSession } from './types';
import { Menu } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [restoredSession, setRestoredSession] = useState<SavedCaseSession | null>(null);

  const handleRestoreSession = (session: SavedCaseSession) => {
    setRestoredSession(session);
    setCurrentView(AppView.SIMULATION);
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard onNavigate={setCurrentView} />;
      case AppView.SIMULATION:
        // Pass restored session if available, reset it after mounting if needed, 
        // but simple prop passing works well here since Simulation uses useEffect[initialSession]
        return <Simulation initialSession={restoredSession} />;
      case AppView.MEMO_BUILDER:
        return <MemoBuilder />;
      case AppView.JUDGMENT_ANALYZER:
        return <Analyzer />;
      case AppView.LEGAL_ADVISOR:
        return <Advisor />;
      case AppView.CASE_MANAGER:
        return <CaseManager onLoadCase={handleRestoreSession} />;
      case AppView.SETTINGS:
        return <Settings />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  // Simulation view handles its own scrolling internally
  const isFixedView = currentView === AppView.SIMULATION;

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden font-sans">
      <Sidebar 
        currentView={currentView} 
        onChangeView={(view) => {
          setCurrentView(view);
          setSidebarOpen(false);
          // If moving away from simulation, clear restored session so it doesn't reload old state if we go back
          if (view !== AppView.SIMULATION) {
              setRestoredSession(null);
          }
        }}
        isOpen={sidebarOpen}
      />
      
      <main className={`flex-1 flex flex-col h-full relative ${isFixedView ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {/* Mobile Header */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center z-40 shrink-0 shadow-md">
           <h1 className="font-bold text-gold-400">اليوسفكو</h1>
           <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
             <Menu className="text-white" />
           </button>
        </div>

        {/* Content Area */}
        <div className={`flex-1 ${isFixedView ? 'h-full overflow-hidden' : ''}`}>
          {renderContent()}
        </div>

        <GlobalAssistant />
      </main>
    </div>
  );
};

export default App;