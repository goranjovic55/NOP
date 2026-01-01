import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DecisionViewProvider } from './providers/DecisionViewProvider';
import { KnowledgeViewProvider } from './providers/KnowledgeViewProvider';
import { LiveSessionViewProvider } from './providers/LiveSessionViewProvider';
import { WorkflowWatcher } from './watchers/WorkflowWatcher';

export function activate(context: vscode.ExtensionContext) {
    console.log('AKIS Monitor extension is now active');

    // Get workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('AKIS Monitor: No workspace folder found. Please open a workspace.');
        return;
    }

    // Initialize view providers
    const liveSessionProvider = new LiveSessionViewProvider(context.extensionUri, workspaceFolder);
    const decisionProvider = new DecisionViewProvider(context.extensionUri, workspaceFolder);
    const knowledgeProvider = new KnowledgeViewProvider(context.extensionUri, workspaceFolder);

    // Register webview providers
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('akis-live-session-view', liveSessionProvider)
    );
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('akis-decisions-view', decisionProvider)
    );
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('akis-knowledge-view', knowledgeProvider)
    );

    // Initialize file watcher
    const watcher = new WorkflowWatcher(workspaceFolder, [
        liveSessionProvider,
        decisionProvider,
        knowledgeProvider
    ]);
    context.subscriptions.push(watcher);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('akis-monitor.refreshLiveSession', () => {
            liveSessionProvider.refresh();
            vscode.window.showInformationMessage('Live session refreshed');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('akis-monitor.refreshDecisions', () => {
            decisionProvider.refresh();
            vscode.window.showInformationMessage('Historical diagram refreshed');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('akis-monitor.refreshKnowledge', () => {
            knowledgeProvider.refresh();
            vscode.window.showInformationMessage('Knowledge graph refreshed');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('akis-monitor.exportDiagram', async () => {
            const options: vscode.SaveDialogOptions = {
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
        })
    );

    // Show welcome message
    vscode.window.showInformationMessage('AKIS Monitor is ready! Open the AKIS panel in the activity bar.');
}

export function deactivate() {
    console.log('AKIS Monitor extension is now deactivated');
}
