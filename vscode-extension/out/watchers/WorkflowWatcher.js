"use strict";
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
exports.WorkflowWatcher = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class WorkflowWatcher {
    constructor(workspaceFolder, providers) {
        this.workspaceFolder = workspaceFolder;
        this.providers = providers;
        this.disposables = [];
        this.startWatching();
    }
    startWatching() {
        const config = vscode.workspace.getConfiguration('akisMonitor');
        const autoRefresh = config.get('autoRefresh', true);
        if (!autoRefresh) {
            return;
        }
        // Watch both .akis-session.json and .akis-sessions.json (multi-session support)
        const sessionPath = path.join(this.workspaceFolder.uri.fsPath, '.akis-session.json');
        const multiSessionPath = path.join(this.workspaceFolder.uri.fsPath, '.akis-sessions.json');
        const sessionDir = path.dirname(sessionPath);
        // Watch the workspace root for session files
        try {
            // Use both fs.watch and fs.watchFile for better cross-platform support
            this.sessionWatcher = fs.watch(sessionDir, { persistent: false }, (eventType, filename) => {
                if (filename === '.akis-session.json' || filename === '.akis-sessions.json') {
                    console.log(`Session file changed (${eventType}):`, filename);
                    this.notifyProviders();
                }
            });
            // Also use polling as fallback for both files
            fs.watchFile(sessionPath, { interval: 1000 }, (curr, prev) => {
                if (curr.mtime !== prev.mtime) {
                    console.log('Session file modified (polling): .akis-session.json');
                    this.notifyProviders();
                }
            });
            fs.watchFile(multiSessionPath, { interval: 1000 }, (curr, prev) => {
                if (curr.mtime !== prev.mtime) {
                    console.log('Session file modified (polling): .akis-sessions.json');
                    this.notifyProviders();
                }
            });
        }
        catch (error) {
            console.error('Could not watch session file:', error);
        }
        // Watch workflow logs (fallback)
        const workflowPath = path.join(this.workspaceFolder.uri.fsPath, config.get('workflowLogsPath', 'log/workflow'));
        if (fs.existsSync(workflowPath)) {
            this.watcher = fs.watch(workflowPath, (eventType, filename) => {
                if (filename && filename.endsWith('.md')) {
                    console.log(`Workflow file changed: ${filename}`);
                    this.notifyProviders();
                }
            });
        }
        // Watch knowledge file
        const knowledgePath = path.join(this.workspaceFolder.uri.fsPath, config.get('knowledgeFilePath', 'project_knowledge.json'));
        if (fs.existsSync(knowledgePath)) {
            this.knowledgeWatcher = fs.watch(knowledgePath, (eventType) => {
                console.log('Knowledge file changed');
                this.notifyProviders();
            });
        }
    }
    notifyProviders() {
        const config = vscode.workspace.getConfiguration('akisMonitor');
        const interval = config.get('refreshInterval', 500);
        // Debounce rapid changes (reduced from 2000ms to 500ms for faster updates)
        setTimeout(() => {
            this.providers.forEach(provider => provider.refresh());
        }, interval);
    }
    dispose() {
        // Unwatch polling file watchers
        const sessionPath = path.join(this.workspaceFolder.uri.fsPath, '.akis-session.json');
        const multiSessionPath = path.join(this.workspaceFolder.uri.fsPath, '.akis-sessions.json');
        fs.unwatchFile(sessionPath);
        fs.unwatchFile(multiSessionPath);
        if (this.watcher) {
            this.watcher.close();
        }
        if (this.knowledgeWatcher) {
            this.knowledgeWatcher.close();
        }
        if (this.sessionWatcher) {
            this.sessionWatcher.close();
        }
        this.disposables.forEach(d => d.dispose());
    }
}
exports.WorkflowWatcher = WorkflowWatcher;
//# sourceMappingURL=WorkflowWatcher.js.map