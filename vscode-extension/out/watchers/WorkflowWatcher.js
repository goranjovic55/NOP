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
        const workspaceRoot = this.workspaceFolder.uri.fsPath;
        // Watch .akis-sessions.json (multi-session file - primary)
        try {
            this.multiSessionWatcher = fs.watch(workspaceRoot, (eventType, filename) => {
                if (filename === '.akis-sessions.json') {
                    console.log('Multi-session file changed');
                    this.notifyProviders();
                }
            });
        }
        catch (error) {
            console.error('Could not watch multi-session file:', error);
        }
        // Watch .akis-session.json (single session - backwards compatible)
        try {
            this.sessionWatcher = fs.watch(workspaceRoot, (eventType, filename) => {
                if (filename === '.akis-session.json') {
                    console.log('Session file changed');
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
        const interval = config.get('refreshInterval', 2000);
        // Debounce rapid changes
        setTimeout(() => {
            this.providers.forEach(provider => provider.refresh());
        }, interval);
    }
    dispose() {
        if (this.watcher) {
            this.watcher.close();
        }
        if (this.knowledgeWatcher) {
            this.knowledgeWatcher.close();
        }
        if (this.sessionWatcher) {
            this.sessionWatcher.close();
        }
        if (this.multiSessionWatcher) {
            this.multiSessionWatcher.close();
        }
        this.disposables.forEach(d => d.dispose());
    }
}
exports.WorkflowWatcher = WorkflowWatcher;
//# sourceMappingURL=WorkflowWatcher.js.map