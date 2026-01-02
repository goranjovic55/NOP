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
const KnowledgeGraphProvider_1 = require("./providers/KnowledgeGraphProvider");
const WorkflowWatcher_1 = require("./watchers/WorkflowWatcher");
function activate(context) {
    console.log('AKIS Monitor extension is now active');
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('AKIS Monitor: No workspace folder found');
        return;
    }
    // Create providers
    const knowledgeGraphProvider = new KnowledgeGraphProvider_1.KnowledgeGraphProvider(context, workspaceFolder);
    // Register webview providers
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('akis-knowledge-view', knowledgeGraphProvider, { webviewOptions: { retainContextWhenHidden: true } }));
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('akis-monitor.refreshKnowledge', () => {
        knowledgeGraphProvider.refresh();
    }));
    // Setup file watchers
    const watcher = new WorkflowWatcher_1.WorkflowWatcher(workspaceFolder, [knowledgeGraphProvider]);
    context.subscriptions.push(watcher);
    console.log('AKIS Monitor: All providers registered');
}
function deactivate() {
    console.log('AKIS Monitor extension is now deactivated');
}
//# sourceMappingURL=extension.js.map