"use strict";
// Chat Output Monitor for AKIS Session Tracking
// Watches for AKIS markers in editor/chat and auto-updates session state
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatOutputMonitor = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
class ChatOutputMonitor {
    constructor(workspaceRoot) {
        this.lastProcessedContent = '';
        this.disposables = [];
        // Regex patterns for markers
        this.patterns = {
            session: /\[SESSION:\s*([^\]]+)\]\s*@(\w+)/g,
            akis: /\[AKIS\]\s*entities=(\d+)\s*\|\s*skills=([\w,-]*)\s*\|\s*patterns=([\w,-]*)/g,
            phase: /\[PHASE:\s*(\w+)\s*\|\s*(\d+\/\d+)\]/g,
            decision: /\[DECISION\]\s*([^\n]+)/g,
            delegate: /\[DELEGATE\]\s*(\w+)\s*"([^"]+)"/g,
            skill: /\[SKILL\]\s*([\w,\s-]+)/g,
            complete: /\[COMPLETE\]\s*([^\n]*)/g
        };
        this.sessionTrackerPath = path.join(workspaceRoot, '.github', 'scripts', 'session-tracker.js');
        this.startMonitoring();
    }
    startMonitoring() {
        // Approach 1: Monitor active text editor changes
        // This catches when user/copilot writes to files or chat inline
        this.disposables.push(vscode.workspace.onDidChangeTextDocument((event) => {
            // Only process visible editors (where Copilot outputs)
            const visibleEditor = vscode.window.visibleTextEditors.find(e => e.document === event.document);
            if (visibleEditor) {
                this.processContent(event.document.getText());
            }
        }));
        // Approach 2: Monitor chat files in workspace
        // Copilot may write to .chat files or markdown
        const chatPattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], '**/*.{chat,md}');
        const watcher = vscode.workspace.createFileSystemWatcher(chatPattern);
        this.disposables.push(watcher);
        watcher.onDidChange((uri) => {
            this.processFileContent(uri);
        });
        watcher.onDidCreate((uri) => {
            this.processFileContent(uri);
        });
        // Approach 3: Poll active editor periodically (fallback)
        // Some chat interactions don't trigger document events
        const pollInterval = setInterval(() => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                this.processContent(activeEditor.document.getText());
            }
        }, 1000); // Poll every second
        this.disposables.push({
            dispose: () => clearInterval(pollInterval)
        });
        console.log('[AKIS Monitor] Chat output monitoring started');
    }
    async processFileContent(uri) {
        try {
            const content = await vscode.workspace.fs.readFile(uri);
            this.processContent(content.toString());
        }
        catch (error) {
            // File may be locked or deleted
        }
    }
    processContent(content) {
        // Avoid re-processing same content
        if (content === this.lastProcessedContent) {
            return;
        }
        // Only process new additions (incremental)
        const newContent = content.substring(this.lastProcessedContent.length);
        if (newContent.length === 0) {
            return;
        }
        this.lastProcessedContent = content;
        // Extract markers from new content
        const markers = this.extractMarkers(newContent);
        // Update session tracker automatically
        this.updateSessionFromMarkers(markers);
    }
    extractMarkers(text) {
        const markers = {
            decisions: [],
            delegations: [],
            skills: []
        };
        // Extract SESSION marker
        const sessionMatch = text.match(this.patterns.session);
        if (sessionMatch) {
            const [, task, agent] = sessionMatch;
            markers.session = { task: task.trim(), agent };
        }
        // Extract AKIS marker
        const akisMatch = text.match(this.patterns.akis);
        if (akisMatch) {
            const [, entities, skills, patterns] = akisMatch;
            markers.akis = {
                entities: parseInt(entities) || 0,
                skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [],
                patterns: patterns ? patterns.split(',').map(p => p.trim()).filter(Boolean) : []
            };
        }
        // Extract PHASE marker
        const phaseMatch = text.match(this.patterns.phase);
        if (phaseMatch) {
            const [, name, progress] = phaseMatch;
            markers.phase = { name, progress };
        }
        // Extract all DECISION markers
        const decisionMatches = [...text.matchAll(this.patterns.decision)];
        markers.decisions = decisionMatches.map(m => m[1].trim());
        // Extract all DELEGATE markers
        const delegateMatches = [...text.matchAll(this.patterns.delegate)];
        markers.delegations = delegateMatches.map(m => ({
            agent: m[1],
            task: m[2]
        }));
        // Extract SKILL markers
        const skillMatches = [...text.matchAll(this.patterns.skill)];
        markers.skills = skillMatches.flatMap(m => m[1].split(',').map(s => s.trim()).filter(Boolean));
        // Extract COMPLETE marker
        const completeMatch = text.match(this.patterns.complete);
        if (completeMatch) {
            markers.complete = completeMatch[1] || 'Session completed';
        }
        return markers;
    }
    async updateSessionFromMarkers(markers) {
        // Check if session tracker exists
        if (!fs.existsSync(this.sessionTrackerPath)) {
            console.warn('[AKIS Monitor] Session tracker not found:', this.sessionTrackerPath);
            return;
        }
        try {
            // Start session if detected
            if (markers.session) {
                await this.runSessionCommand('start', [
                    markers.session.task,
                    markers.session.agent
                ]);
                console.log(`[AKIS Monitor] Auto-started session: ${markers.session.task}`);
            }
            // Update phase if detected
            if (markers.phase) {
                await this.runSessionCommand('phase', [
                    markers.phase.name,
                    markers.phase.progress
                ]);
                console.log(`[AKIS Monitor] Auto-updated phase: ${markers.phase.name}`);
            }
            // Add decisions
            for (const decision of markers.decisions) {
                await this.runSessionCommand('decision', [decision]);
                console.log(`[AKIS Monitor] Auto-recorded decision`);
            }
            // Add delegations
            for (const delegation of markers.delegations) {
                await this.runSessionCommand('delegate', [
                    delegation.agent,
                    delegation.task
                ]);
                console.log(`[AKIS Monitor] Auto-recorded delegation to ${delegation.agent}`);
            }
            // Add skills
            if (markers.skills.length > 0) {
                await this.runSessionCommand('skills', [markers.skills.join(', ')]);
                console.log(`[AKIS Monitor] Auto-recorded skills`);
            }
            // Add AKIS context
            if (markers.akis) {
                const contextArgs = [
                    '--entities', markers.akis.entities.toString(),
                    '--skills', markers.akis.skills.join(','),
                    '--patterns', markers.akis.patterns.join(',')
                ];
                await this.runSessionCommand('context', contextArgs);
                console.log(`[AKIS Monitor] Auto-updated AKIS context`);
            }
            // Complete session if detected
            if (markers.complete) {
                await this.runSessionCommand('complete', []);
                console.log(`[AKIS Monitor] Auto-completed session`);
            }
        }
        catch (error) {
            console.error('[AKIS Monitor] Error updating session:', error);
        }
    }
    runSessionCommand(command, args) {
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)('node', [this.sessionTrackerPath, command, ...args], {
                cwd: path.dirname(this.sessionTrackerPath)
            });
            let stderr = '';
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            proc.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`Session tracker failed: ${stderr}`));
                }
            });
        });
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
exports.ChatOutputMonitor = ChatOutputMonitor;
//# sourceMappingURL=ChatOutputMonitor.js.map