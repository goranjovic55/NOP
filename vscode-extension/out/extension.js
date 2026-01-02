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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const DecisionViewProvider_1 = require("./providers/DecisionViewProvider");
const KnowledgeViewProvider_1 = require("./providers/KnowledgeViewProvider");
const LiveSessionViewProvider_1 = require("./providers/LiveSessionViewProvider");
const WorkflowWatcher_1 = require("./watchers/WorkflowWatcher");
function activate(context) {
    console.log('AKIS Monitor extension is now active');
    // Get workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('AKIS Monitor: No workspace folder found. Please open a workspace.');
        return;
    }
    // Initialize view providers
    const liveSessionProvider = new LiveSessionViewProvider_1.LiveSessionViewProvider(context.extensionUri, workspaceFolder);
    const decisionProvider = new DecisionViewProvider_1.DecisionViewProvider(context.extensionUri, workspaceFolder);
    const knowledgeProvider = new KnowledgeViewProvider_1.KnowledgeViewProvider(context.extensionUri, workspaceFolder);
    // Register webview providers
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('akis-live-session-view', liveSessionProvider));
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('akis-decisions-view', decisionProvider));
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('akis-knowledge-view', knowledgeProvider));
    // Initialize file watcher
    const watcher = new WorkflowWatcher_1.WorkflowWatcher(workspaceFolder, [
        liveSessionProvider,
        decisionProvider,
        knowledgeProvider
    ]);
    context.subscriptions.push(watcher);
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('akis-monitor.refreshLiveSession', () => {
        liveSessionProvider.refresh();
        vscode.window.showInformationMessage('Live session refreshed');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('akis-monitor.refreshDecisions', () => {
        decisionProvider.refresh();
        vscode.window.showInformationMessage('Historical diagram refreshed');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('akis-monitor.refreshKnowledge', () => {
        knowledgeProvider.refresh();
        vscode.window.showInformationMessage('Knowledge graph refreshed');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('akis-monitor.exportDiagram', async () => {
        const options = {
            saveLabel: 'Export',
            filters: {
                'PNG': ['png'],
                'SVG': ['svg'],
                'All Files': ['*']
            }
        };
        const uri = await vscode.window.showSaveDialog(options);
        if (uri) {
            vscode.window.showInformationMessage(`Diagram export to ${uri.fsPath} (feature coming soon)`);
        }
    }));
    // Show welcome message
    vscode.window.showInformationMessage('AKIS Monitor is ready! Open the AKIS panel in the activity bar.');
}
function deactivate() {
    console.log('AKIS Monitor extension is now deactivated');
}
//# sourceMappingURL=extension.js.map