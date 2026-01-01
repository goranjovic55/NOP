import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface RefreshableProvider {
    refresh(): void;
}

export class WorkflowWatcher implements vscode.Disposable {
    private watcher: fs.FSWatcher | undefined;
    private knowledgeWatcher: fs.FSWatcher | undefined;
    private sessionWatcher: fs.FSWatcher | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private workspaceFolder: vscode.WorkspaceFolder,
        private providers: RefreshableProvider[]
    ) {
        this.startWatching();
    }

    private startWatching() {
        const config = vscode.workspace.getConfiguration('akisMonitor');
        const autoRefresh = config.get<boolean>('autoRefresh', true);

        if (!autoRefresh) {
            return;
        }

        // Watch .akis-session.json (primary live session source)
        const sessionPath = path.join(this.workspaceFolder.uri.fsPath, '.akis-session.json');
        const sessionDir = path.dirname(sessionPath);
        
        // Watch the workspace root for .akis-session.json
        try {
            this.sessionWatcher = fs.watch(sessionDir, (eventType, filename) => {
                if (filename === '.akis-session.json') {
                    console.log('Session file changed');
                    this.notifyProviders();
                }
            });
        } catch (error) {
            console.error('Could not watch session file:', error);
        }

        // Watch workflow logs (fallback)
        const workflowPath = path.join(
            this.workspaceFolder.uri.fsPath,
            config.get<string>('workflowLogsPath', 'log/workflow')
        );

        if (fs.existsSync(workflowPath)) {
            this.watcher = fs.watch(workflowPath, (eventType, filename) => {
                if (filename && filename.endsWith('.md')) {
                    console.log(`Workflow file changed: ${filename}`);
                    this.notifyProviders();
                }
            });
        }

        // Watch knowledge file
        const knowledgePath = path.join(
            this.workspaceFolder.uri.fsPath,
            config.get<string>('knowledgeFilePath', 'project_knowledge.json')
        );

        if (fs.existsSync(knowledgePath)) {
            this.knowledgeWatcher = fs.watch(knowledgePath, (eventType) => {
                console.log('Knowledge file changed');
                this.notifyProviders();
            });
        }
    }

    private notifyProviders() {
        const config = vscode.workspace.getConfiguration('akisMonitor');
        const interval = config.get<number>('refreshInterval', 2000);

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
        this.disposables.forEach(d => d.dispose());
    }
}
