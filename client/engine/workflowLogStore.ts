import { create } from 'zustand';
import type { WorkflowData } from './types';

interface LogEntry {
  timestamp: string;
  eventType: string;
  flowType: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  fullState: WorkflowData;
}

interface WorkflowLogStore {
  logs: LogEntry[];
  addLog: (entry: Omit<LogEntry, 'timestamp'>) => void;
  clear: () => void;
  getLogs: () => LogEntry[];
}

export const useWorkflowLogStore = create<WorkflowLogStore>((set, get) => ({
  logs: [],
  addLog: (entry) => {
    const newEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toLocaleTimeString(),
    };
    // Keep only the last 50 logs in memory
    set((state) => ({
      logs: [...state.logs, newEntry].slice(-50),
    }));
  },
  clear: () => set({ logs: [] }),
  getLogs: () => get().logs,
}));
