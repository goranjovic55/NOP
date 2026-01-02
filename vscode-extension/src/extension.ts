import * as vscode from 'vscode';
import { KnowledgeGraphProvider } from './providers/KnowledgeGraphProvider';
import { WorkflowWatcher } from './watchers/WorkflowWatcher';

export function activate(context: vscode.ExtensionContext) {
    console.log('AKIS Monitor extension is now active');

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('AKIS Monitor: No workspace folder found');
        return;
    }

    // Create providers
    const knowledgeGraphProvider = new KnowledgeGraphProvider(context, workspaceFolder);

    // Register webview providers
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'akis-knowledge-view',
            knowledgeGraphProvider,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('akis-monitor.refreshKnowledge', () => {
            knowledgeGraphProvider.refresh();
        })
    );

    // Setup file watchers
    const watcher = new WorkflowWatcher(workspaceFolder, [knowledgeGraphProvider]);
    context.subscriptions.push(watcher);

    console.log('AKIS Monitor: All providers registered');
}

export function deactivate() {
    console.log('AKIS Monitor extension is now deactivated');
}
