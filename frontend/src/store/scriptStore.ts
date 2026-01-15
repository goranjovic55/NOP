import { create } from 'zustand';

export type ScriptStepType = 
  | 'login_ssh' 
  | 'login_rdp' 
  | 'login_vnc'
  | 'port_scan'
  | 'vuln_scan'
  | 'exploit'
  | 'command'
  | 'ping_test'
  | 'port_disable'
  | 'port_enable'
  | 'delay'
  | 'agent_download'
  | 'agent_execute';

export interface ScriptStep {
  id: string;
  type: ScriptStepType;
  name: string;
  params: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface Script {
  id: string;
  name: string;
  description: string;
  steps: ScriptStep[];
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  currentStepIndex: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  outputs: string[];
}

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'network' | 'security' | 'automation';
  steps: Omit<ScriptStep, 'id' | 'status'>[];
}

interface ScriptState {
  scripts: Script[];
  templates: ScriptTemplate[];
  activeScriptId: string | null;
  
  // Script management
  createScript: (name: string, description: string, template?: ScriptTemplate) => Script;
  deleteScript: (id: string) => void;
  duplicateScript: (id: string) => Script;
  
  // Script execution
  startScript: (id: string) => void;
  pauseScript: (id: string) => void;
  resumeScript: (id: string) => void;
  stopScript: (id: string) => void;
  
  // Step management
  addStep: (scriptId: string, step: Omit<ScriptStep, 'id' | 'status'>) => void;
  removeStep: (scriptId: string, stepId: string) => void;
  updateStep: (scriptId: string, stepId: string, updates: Partial<ScriptStep>) => void;
  moveStep: (scriptId: string, stepId: string, direction: 'up' | 'down') => void;
  
  // Step execution
  updateStepStatus: (scriptId: string, stepId: string, status: ScriptStep['status'], output?: string, error?: string) => void;
  setCurrentStep: (scriptId: string, stepIndex: number) => void;
  
  // Output management
  addOutput: (scriptId: string, output: string) => void;
  clearOutput: (scriptId: string) => void;
  
  // Active script
  setActiveScript: (id: string | null) => void;
  getActiveScript: () => Script | null;
}

// Predefined script templates
const defaultTemplates: ScriptTemplate[] = [
  {
    id: 'rep-ring-test',
    name: 'REP Ring Test',
    description: 'Test network redundancy by disabling ports and monitoring rep-ring status',
    category: 'network',
    steps: [
      {
        type: 'login_ssh',
        name: 'Login to Switch',
        params: { target: '', username: 'admin', password: '' }
      },
      {
        type: 'port_disable',
        name: 'Disable Port',
        params: { port: '' }
      },
      {
        type: 'ping_test',
        name: 'Test Network Connectivity',
        params: { targets: ['neighbor1', 'neighbor2'], count: 5 }
      },
      {
        type: 'command',
        name: 'Check REP Ring Status',
        params: { command: 'show rep topology' }
      },
      {
        type: 'delay',
        name: 'Wait for convergence',
        params: { seconds: 10 }
      },
      {
        type: 'port_enable',
        name: 'Re-enable Port',
        params: { port: '' }
      },
      {
        type: 'command',
        name: 'Verify REP Ring Recovery',
        params: { command: 'show rep topology' }
      }
    ]
  },
  {
    id: 'vulnerability-exploit-chain',
    name: 'Vulnerability Scan & Exploit',
    description: 'Scan for vulnerabilities, exploit them, and deploy NOP agent',
    category: 'security',
    steps: [
      {
        type: 'port_scan',
        name: 'Scan Ports',
        params: { target: '', ports: '1-1000' }
      },
      {
        type: 'vuln_scan',
        name: 'Scan for Vulnerabilities',
        params: { target: '' }
      },
      {
        type: 'exploit',
        name: 'Exploit Vulnerability',
        params: { target: '', exploit_type: 'auto' }
      },
      {
        type: 'agent_download',
        name: 'Download NOP Agent',
        params: { url: 'http://nop-server/agent' }
      },
      {
        type: 'agent_execute',
        name: 'Execute NOP Agent',
        params: { args: '--connect-back' }
      }
    ]
  },
  {
    id: 'network-discovery',
    name: 'Network Discovery & Scan',
    description: 'Discover assets and perform comprehensive port and vulnerability scans',
    category: 'network',
    steps: [
      {
        type: 'ping_test',
        name: 'Ping Sweep',
        params: { targets: ['192.168.1.0/24'], count: 1 }
      },
      {
        type: 'port_scan',
        name: 'Port Scan All Hosts',
        params: { target: 'discovered', ports: 'common' }
      },
      {
        type: 'vuln_scan',
        name: 'Vulnerability Scan',
        params: { target: 'discovered' }
      }
    ]
  },
  {
    id: 'custom-automation',
    name: 'Custom Automation Script',
    description: 'Create a custom automation script from scratch',
    category: 'automation',
    steps: []
  }
];

export const useScriptStore = create<ScriptState>((set, get) => ({
  scripts: [],
  templates: defaultTemplates,
  activeScriptId: null,
  
  createScript: (name, description, template) => {
    const newScript: Script = {
      id: `script-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name,
      description,
      steps: template ? template.steps.map((step, index) => ({
        ...step,
        id: `step-${Date.now()}-${index}`,
        status: 'pending' as const
      })) : [],
      status: 'idle',
      currentStepIndex: 0,
      createdAt: new Date(),
      outputs: []
    };
    
    set(state => ({
      scripts: [...state.scripts, newScript],
      activeScriptId: newScript.id
    }));
    
    return newScript;
  },
  
  deleteScript: (id) => set(state => ({
    scripts: state.scripts.filter(s => s.id !== id),
    activeScriptId: state.activeScriptId === id ? null : state.activeScriptId
  })),
  
  duplicateScript: (id) => {
    const state = get();
    const script = state.scripts.find(s => s.id === id);
    if (!script) return script as any;
    
    const newScript: Script = {
      ...script,
      id: `script-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: `${script.name} (Copy)`,
      status: 'idle',
      currentStepIndex: 0,
      createdAt: new Date(),
      startedAt: undefined,
      completedAt: undefined,
      outputs: [],
      steps: script.steps.map((step, index) => ({
        ...step,
        id: `step-${Date.now()}-${index}`,
        status: 'pending' as const,
        output: undefined,
        error: undefined,
        startTime: undefined,
        endTime: undefined
      }))
    };
    
    set(state => ({
      scripts: [...state.scripts, newScript]
    }));
    
    return newScript;
  },
  
  startScript: (id) => set(state => ({
    scripts: state.scripts.map(s => 
      s.id === id ? { ...s, status: 'running' as const, startedAt: new Date() } : s
    )
  })),
  
  pauseScript: (id) => set(state => ({
    scripts: state.scripts.map(s => 
      s.id === id ? { ...s, status: 'paused' as const } : s
    )
  })),
  
  resumeScript: (id) => set(state => ({
    scripts: state.scripts.map(s => 
      s.id === id ? { ...s, status: 'running' as const } : s
    )
  })),
  
  stopScript: (id) => set(state => ({
    scripts: state.scripts.map(s => 
      s.id === id ? { ...s, status: 'idle' as const } : s
    )
  })),
  
  addStep: (scriptId, step) => set(state => ({
    scripts: state.scripts.map(s => 
      s.id === scriptId ? {
        ...s,
        steps: [...s.steps, {
          ...step,
          id: `step-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          status: 'pending' as const
        }]
      } : s
    )
  })),
  
  removeStep: (scriptId, stepId) => set(state => ({
    scripts: state.scripts.map(s => 
      s.id === scriptId ? {
        ...s,
        steps: s.steps.filter(step => step.id !== stepId)
      } : s
    )
  })),
  
  updateStep: (scriptId, stepId, updates) => set(state => ({
    scripts: state.scripts.map(s => 
      s.id === scriptId ? {
        ...s,
        steps: s.steps.map(step => 
          step.id === stepId ? { ...step, ...updates } : step
        )
      } : s
    )
  })),
  
  moveStep: (scriptId, stepId, direction) => set(state => ({
    scripts: state.scripts.map(s => {
      if (s.id !== scriptId) return s;
      
      const stepIndex = s.steps.findIndex(step => step.id === stepId);
      if (stepIndex === -1) return s;
      
      const newIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
      if (newIndex < 0 || newIndex >= s.steps.length) return s;
      
      const newSteps = [...s.steps];
      [newSteps[stepIndex], newSteps[newIndex]] = [newSteps[newIndex], newSteps[stepIndex]];
      
      return { ...s, steps: newSteps };
    })
  })),
  
  updateStepStatus: (scriptId, stepId, status, output, error) => set(state => ({
    scripts: state.scripts.map(s => 
      s.id === scriptId ? {
        ...s,
        steps: s.steps.map(step => 
          step.id === stepId ? {
            ...step,
            status,
            output,
            error,
            startTime: status === 'running' ? new Date() : step.startTime,
            endTime: (status === 'completed' || status === 'failed') ? new Date() : step.endTime
          } : step
        )
      } : s
    )
  })),
  
  setCurrentStep: (scriptId, stepIndex) => set(state => ({
    scripts: state.scripts.map(s => 
      s.id === scriptId ? { ...s, currentStepIndex: stepIndex } : s
    )
  })),
  
  addOutput: (scriptId, output) => set(state => ({
    scripts: state.scripts.map(s => 
      s.id === scriptId ? { ...s, outputs: [...s.outputs, output] } : s
    )
  })),
  
  clearOutput: (scriptId) => set(state => ({
    scripts: state.scripts.map(s => 
      s.id === scriptId ? { ...s, outputs: [] } : s
    )
  })),
  
  setActiveScript: (id) => set({ activeScriptId: id }),
  
  getActiveScript: () => {
    const state = get();
    return state.scripts.find(s => s.id === state.activeScriptId) || null;
  }
}));
