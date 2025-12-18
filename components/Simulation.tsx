
import React from 'react';
import { SimulationModule } from './simulation/SimulationModule';
import { SavedCaseSession } from '../types';

interface SimulationProps {
  initialSession?: SavedCaseSession | null;
}

const Simulation: React.FC<SimulationProps> = ({ initialSession }) => {
  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <SimulationModule initialSession={initialSession} />
    </div>
  );
};

export default Simulation;
