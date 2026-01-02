#!/usr/bin/env node
/**
 * AKIS Session Tracker
 * 
 * Utility for agents to emit real-time session state to .akis-session.json
 * This enables the VSCode extension to monitor live sessions without waiting for workflow logs.
 * 
 * Usage in agent responses:
 * - Call after each significant emission ([PHASE], [DECISION], [DELEGATE], etc.)
 * - Clears session file only when reset is called after commit
 */

const fs = require('fs');
const path = require('path');

const SESSION_FILE = '.akis-session.json';
const MULTI_SESSION_FILE = '.akis-sessions.json';

class SessionTracker {
    constructor() {
        this.sessionPath = path.join(process.cwd(), SESSION_FILE);
        this.multiSessionPath = path.join(process.cwd(), MULTI_SESSION_FILE);
    }

    /**
     * Get all active sessions
     */
    getAllSessions() {
        if (!fs.existsSync(this.multiSessionPath)) {
            return { sessions: [], currentSessionId: null };
        }
        return JSON.parse(fs.readFileSync(this.multiSessionPath, 'utf-8'));
    }

    /**
     * Save all sessions (atomic write to prevent corruption)
     */
    saveAllSessions(data) {
        const tempPath = this.multiSessionPath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
        fs.renameSync(tempPath, this.multiSessionPath);  // Atomic rename
        
        // Create backup for recovery
        fs.writeFileSync(this.multiSessionPath + '.backup', JSON.stringify(data, null, 2));
    }

    /**
     * Initialize a new session
     * Enforces max vertical depth of 3 to prevent runaway nesting
     * @param {Object} sessionData - Session initialization data
     * @param {string} sessionData.task - Task name/identifier
     * @param {string} sessionData.agent - Agent name
     * @param {Object} sessionData.context - Optional context to restore from
     */
    start(sessionData) {
        // Check max depth (prevent runaway nesting)
        const allSessions = this.getAllSessions();
        const activeSessions = (allSessions.sessions || []).filter(s => s.status === 'active');
        if (activeSessions.length >= 3) {
            console.warn('Warning: Max concurrent sessions (3) reached. Consider completing existing sessions.');
        }
        
        const session = {
            id: Date.now().toString(),
            name: sessionData.name || sessionData.task || 'Unnamed Session',
            startTime: new Date().toISOString(),
            task: sessionData.task || 'Unknown task',
            agent: sessionData.agent || 'Unknown',
            status: 'active',
            phase: 'CONTEXT',
            phaseDisplay: 'Unknown CONTEXT',
            phaseAgent: sessionData.agent || 'Unknown',
            phaseMessage: '',
            phaseVerbose: 'Unknown CONTEXT | progress=1/0',
            progress: '1/0',
            
            // Context data (SSOT)
            context: sessionData.context || {
                entities: [],
                skills: [],
                patterns: [],
                files: [],
                changes: []
            },
            
            // Chronological actions for tree view
            actions: [
                {
                    id: '0',
                    timestamp: new Date().toISOString(),
                    type: 'SESSION_START',
                    phase: 'CONTEXT',
                    title: 'Session Started',
                    description: `Started ${sessionData.task || 'task'} with ${sessionData.agent || 'agent'}`,
                    reason: 'Initialize new work session',
                    details: {
                        task: sessionData.task,
                        agent: sessionData.agent
                    }
                }
            ],
            
            // Timeline data (legacy)
            decisions: [],
            emissions: [],
            delegations: [],
            skills: [],
            
            // Phases for grouping actions
            phases: {
                'CONTEXT': {
                    name: 'CONTEXT',
                    status: 'active',
                    startTime: new Date().toISOString(),
                    message: '',
                    actionIds: ['0']
                }
            },
            
            awaitingReset: false,
            ...sessionData
        };

        session.phaseDisplay = `${session.agent || 'Unknown'} ${session.phase}`.trim();
        session.phaseAgent = session.agent || 'Unknown';
        session.phaseVerbose = `${session.phaseDisplay} | progress=${session.progress}`;
        session.lastUpdate = session.startTime;

        // Save to single session file (for backwards compatibility)
        fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));

        // Add to multi-session tracking
        const allSessions = this.getAllSessions();
        allSessions.sessions = allSessions.sessions || [];
        allSessions.sessions.push(session);
        allSessions.currentSessionId = session.id;
        allSessions.lastUpdate = session.startTime;
        this.saveAllSessions(allSessions);

        return session;
    }

    /**
     * Update specific session by ID (for parallel updates)
     * @param {string} sessionId - Session ID to update
     * @param {Object} updateData - Data to update
     */
    updateSession(sessionId, updateData) {
        const allSessions = this.getAllSessions();
        const sessionIndex = allSessions.sessions.findIndex(s => s.id === sessionId);
        
        if (sessionIndex < 0) {
            console.error(`Session ${sessionId} not found`);
            return null;
        }

        const session = allSessions.sessions[sessionIndex];
        Object.assign(session, updateData);
        session.lastUpdate = new Date().toISOString();

        // Update in multi-session file
        allSessions.sessions[sessionIndex] = session;
        allSessions.lastUpdate = session.lastUpdate;
        this.saveAllSessions(allSessions);

        // Update single session file if this is current session
        if (allSessions.currentSessionId === sessionId) {
            fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
        }

        return session;
    }

    /**
     * Get session by ID or name
     * @param {string} identifier - Session ID or name
     */
    getSession(identifier) {
        const allSessions = this.getAllSessions();
        return allSessions.sessions.find(s => 
            s.id === identifier || s.name === identifier || s.task === identifier
        );
    }

    /**
     * Update session with new emission
     */
    emit(emission) {
        if (!fs.existsSync(this.sessionPath)) {
            console.error('No active session. Call start() first.');
            return;
        }

        const session = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
        session.lastUpdate = new Date().toISOString();
        
        // Mark session as active on any emission (unless it's a COMPLETE emission)
        if (emission.type === 'COMPLETE' || emission.phase === 'COMPLETE') {
            session.status = 'completed';
        } else if (session.status !== 'completed') {
            session.status = 'active';
        }

        // Initialize structures if migrating from old format
        if (!session.actions) session.actions = [];
        if (!session.phases || Array.isArray(session.phases)) {
            session.phases = {};
        }
        if (!session.context) {
            session.context = { entities: [], skills: [], patterns: [], files: [], changes: [] };
        }

        const agentLabel = emission.agent || session.agent || 'Unknown';
        const isDelegated = Boolean(emission.agent && emission.agent !== session.agent);
        const actionId = session.actions.length.toString();
        const timestamp = new Date().toISOString();

        // Create action entry with full details
        const action = {
            id: actionId,
            timestamp: timestamp,
            type: emission.type || 'UNKNOWN',
            phase: session.phase,
            agent: agentLabel,
            title: '',
            description: '',
            reason: emission.reason || '',
            details: emission.details || {}
        };

        if (emission.type === 'PHASE') {
            const phaseLabelRaw = emission.phase || emission.content || session.phase || 'PHASE';
            const displayPhase = isDelegated ? 'SUBAGENT' : phaseLabelRaw;
            const phaseContent = isDelegated
                ? `[SUBAGENT] ${agentLabel}`
                : `${agentLabel} ${phaseLabelRaw}`;

            session.phase = displayPhase;
            session.phaseDisplay = phaseContent;
            session.phaseAgent = agentLabel;
            session.phaseMessage = emission.message || '';

            if (emission.progress) {
                session.progress = emission.progress;
            } else if (!session.progress) {
                session.progress = this.getProgressFromPhase(displayPhase);
            }

            const messageText = emission.message ? ` - ${emission.message}` : '';
            session.phaseVerbose = `${phaseContent}${messageText} | progress=${session.progress}`;

            // Create phase change action
            action.type = 'PHASE_CHANGE';
            action.phase = phaseLabelRaw;
            action.title = `Phase: ${phaseLabelRaw}`;
            action.description = emission.message || `Entered ${phaseLabelRaw} phase`;
            action.reason = emission.reason || 'Phase transition in workflow';
            action.details = {
                from: session.phases[session.phase]?.name || 'NONE',
                to: phaseLabelRaw,
                progress: session.progress,
                message: emission.message
            };

            // Update phase tracking
            if (session.phases[phaseLabelRaw]) {
                // Reactivate existing phase
                session.phases[phaseLabelRaw].status = 'active';
                session.phases[phaseLabelRaw].actionIds.push(actionId);
            } else {
                // Create new phase
                session.phases[phaseLabelRaw] = {
                    name: phaseLabelRaw,
                    status: 'active',
                    startTime: timestamp,
                    message: emission.message || '',
                    actionIds: [actionId]
                };
            }

            // Mark previous phase as completed
            Object.keys(session.phases).forEach(phaseName => {
                if (phaseName !== phaseLabelRaw && session.phases[phaseName].status === 'active') {
                    session.phases[phaseName].status = 'completed';
                    session.phases[phaseName].endTime = timestamp;
                }
            });

        } else if (emission.type === 'DECISION') {
            action.title = 'Decision Made';
            action.description = emission.content || 'Decision recorded';
            action.reason = emission.reason || 'Strategic choice point';
            action.details = {
                decision: emission.content,
                alternatives: emission.alternatives || [],
                rationale: emission.rationale || ''
            };

            session.decisions.push({
                description: emission.content,
                timestamp: timestamp
            });

        } else if (emission.type === 'DELEGATE') {
            action.title = `Delegated to ${emission.agent || 'Agent'}`;
            action.description = emission.task || emission.content || 'Task delegated';
            action.reason = emission.reason || 'Specialized agent required';
            action.details = {
                toAgent: emission.agent,
                task: emission.task || emission.content,
                expectedResult: emission.expectedResult || ''
            };

            session.delegations.push({
                agent: emission.agent || 'Unknown',
                task: emission.task || emission.content,
                timestamp: timestamp
            });

        } else if (emission.type === 'SKILL') {
            const skills = emission.content.split(',').map(s => s.trim());
            action.title = 'Skills Applied';
            action.description = `Using: ${skills.join(', ')}`;
            action.reason = emission.reason || 'Technical pattern implementation';
            action.details = {
                skills: skills,
                patterns: emission.patterns || []
            };

            session.skills = [...new Set([...session.skills, ...skills])];
            session.context.skills = [...new Set([...session.context.skills, ...skills])];

        } else if (emission.type === 'FILE_CHANGE') {
            action.title = `File ${emission.changeType || 'Modified'}`;
            action.description = emission.file || 'File changed';
            action.reason = emission.reason || 'Code implementation';
            action.details = {
                file: emission.file,
                changeType: emission.changeType || 'modified',
                linesChanged: emission.linesChanged || 0,
                summary: emission.summary || ''
            };

            session.context.changes.push({
                file: emission.file,
                type: emission.changeType || 'modified',
                timestamp: timestamp
            });

        } else if (emission.type === 'CONTEXT') {
            const contextItems = [];
            if (emission.entities?.length) {
                session.context.entities = [...new Set([...session.context.entities, ...emission.entities])];
                contextItems.push(`${emission.entities.length} entities`);
            }
            if (emission.files?.length) {
                session.context.files = [...new Set([...session.context.files, ...emission.files])];
                contextItems.push(`${emission.files.length} files`);
            }
            if (emission.patterns?.length) {
                session.context.patterns = [...new Set([...session.context.patterns, ...emission.patterns])];
                contextItems.push(`${emission.patterns.length} patterns`);
            }

            action.title = 'Context Updated';
            action.description = `Added ${contextItems.join(', ')}`;
            action.reason = emission.reason || 'Building session knowledge';
            action.details = {
                entities: emission.entities || [],
                files: emission.files || [],
                patterns: emission.patterns || []
            };

        } else if (emission.type === 'DETAIL') {
            action.title = 'Detail';
            action.description = emission.detail || emission.content || 'Detail added';
            action.reason = emission.reason || 'Progress update';
            action.details = {
                text: emission.detail || emission.content
            };

        } else {
            // Generic action
            action.title = emission.type || 'Action';
            action.description = emission.content || emission.message || 'Action performed';
            action.reason = emission.reason || 'Workflow step';
            action.details = emission.details || {};
        }

        // Add action to session
        session.actions.push(action);

        // Action rotation to prevent unbounded growth (max 500 actions)
        const MAX_ACTIONS = 500;
        if (session.actions.length > MAX_ACTIONS) {
            const archiveCount = session.actions.length - MAX_ACTIONS;
            session.archivedActionCount = (session.archivedActionCount || 0) + archiveCount;
            session.actions = session.actions.slice(-MAX_ACTIONS);
        }

        // Add action to current phase
        const currentPhase = session.phases[session.phase];
        if (currentPhase && !currentPhase.actionIds.includes(actionId)) {
            currentPhase.actionIds.push(actionId);
        }

        // Legacy emissions for backwards compatibility
        session.emissions.push({
            timestamp: timestamp,
            agent: agentLabel,
            isDelegated: isDelegated,
            ...emission
        });

        // Rotate emissions too
        if (session.emissions.length > MAX_ACTIONS) {
            session.emissions = session.emissions.slice(-MAX_ACTIONS);
        }

        // Save to single session file
        fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));

        // Update in multi-session tracking
        const allSessions = this.getAllSessions();
        const sessionIndex = allSessions.sessions.findIndex(s => s.id === session.id);
        if (sessionIndex >= 0) {
            allSessions.sessions[sessionIndex] = session;
            allSessions.lastUpdate = session.lastUpdate;
            this.saveAllSessions(allSessions);
        }

        return session;
    }

    /**
     * Update session phase
     * @param {string} phaseName - The phase name (CONTEXT, PLAN, etc.)
     * @param {string} progress - Progress indicator (e.g., "1/7")
     * @param {string} message - Optional detailed message describing what's happening
     * @param {string} detail - Optional detail to add to phase tree
     */
    phase(phaseName, progress, message, detail) {
        this.emit({
            type: 'PHASE',
            phase: phaseName,
            progress: progress || this.getProgressFromPhase(phaseName),
            content: phaseName,
            message: message || '',
            detail: detail || message || ''
        });
    }

    /**
     * Add detail to current phase (for tree view)
     */
    addDetail(detail) {
        this.emit({
            type: 'DETAIL',
            detail: detail
        });
    }

    /**
     * Track context information (entities, files, patterns)
     */
    addContext(contextData) {
        this.emit({
            type: 'CONTEXT',
            entities: contextData.entities || [],
            files: contextData.files || [],
            patterns: contextData.patterns || []
        });
    }

    /**
     * Track file changes
     */
    fileChange(filePath, changeType = 'modified') {
        this.emit({
            type: 'FILE_CHANGE',
            file: filePath,
            changeType: changeType
        });
    }

    /**
     * Get session context for resumption
     * @param {string} identifier - Session ID or name
     */
    getContext(identifier) {
        const session = identifier ? this.getSession(identifier) : this.get();
        if (!session) {
            return null;
        }

        return {
            task: session.task,
            agent: session.agent,
            phase: session.phase,
            progress: session.progress,
            context: session.context,
            skills: session.skills,
            decisions: session.decisions,
            delegations: session.delegations,
            files: session.context.files || [],
            changes: session.context.changes || [],
            lastPhase: session.phases[session.phases.length - 1],
            summary: this.generateContextSummary(session)
        };
    }

    /**
     * Generate terse context summary for agent to restore state
     */
    generateContextSummary(session) {
        const summary = [];
        
        summary.push(`Task: ${session.task}`);
        summary.push(`Phase: ${session.phase} (${session.progress})`);
        
        if (session.context.entities && session.context.entities.length > 0) {
            summary.push(`Entities: ${session.context.entities.slice(0, 5).join(', ')}${session.context.entities.length > 5 ? '...' : ''}`);
        }
        
        if (session.context.files && session.context.files.length > 0) {
            summary.push(`Files: ${session.context.files.slice(0, 3).join(', ')}${session.context.files.length > 3 ? ` +${session.context.files.length - 3} more` : ''}`);
        }
        
        if (session.context.skills && session.context.skills.length > 0) {
            summary.push(`Skills: ${session.context.skills.join(', ')}`);
        }
        
        if (session.decisions && session.decisions.length > 0) {
            summary.push(`Decisions made: ${session.decisions.length}`);
            session.decisions.slice(-2).forEach(d => {
                summary.push(`  - ${d.description}`);
            });
        }
        
        if (session.context.changes && session.context.changes.length > 0) {
            summary.push(`Changes: ${session.context.changes.length} files modified`);
        }
        
        return summary.join('\n');
    }

    /**
     * Add a decision to the session
     */
    decision(description) {
        this.emit({
            type: 'DECISION',
            content: description
        });
    }

    /**
     * Record a delegation
     */
    delegate(agent, task) {
        this.emit({
            type: 'DELEGATE',
            agent,
            task,
            content: `Delegate to ${agent}: ${task}`
        });
    }

    /**
     * Record skills used
     */
    skills(skillList) {
        this.emit({
            type: 'SKILL',
            content: Array.isArray(skillList) ? skillList.join(', ') : skillList
        });
    }

    /**
     * Complete the session and clean up
     */
    complete(workflowLogPath) {
        if (fs.existsSync(this.sessionPath)) {
            const session = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
            session.status = 'completed';
            session.endTime = new Date().toISOString();
            session.workflowLog = workflowLogPath;
            session.phase = session.phase || 'COMPLETE';
            session.phaseDisplay = `${session.agent || 'Unknown'} ${session.phase}`.trim();
            session.phaseAgent = session.agent || 'Unknown';
            session.phaseVerbose = `${session.phaseDisplay} | progress=${session.progress || this.getProgressFromPhase(session.phase)}`;
            session.awaitingReset = true;

            // Save to single session file
            fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));

            // Update in multi-session tracking
            const allSessions = this.getAllSessions();
            const sessionIndex = allSessions.sessions.findIndex(s => s.id === session.id);
            if (sessionIndex >= 0) {
                allSessions.sessions[sessionIndex] = session;
                allSessions.lastUpdate = session.endTime;
                this.saveAllSessions(allSessions);
            }

            console.log('Session completed. Run "node .github/scripts/session-tracker.js reset" after committing to GitHub to clear.');
        }
    }

    /**
     * Remove session file after completion/commit
     */
    reset() {
        if (!fs.existsSync(this.sessionPath) && !fs.existsSync(this.multiSessionPath)) {
            console.log('No session files to reset.');
            return;
        }

        // Remove single session file
        if (fs.existsSync(this.sessionPath)) {
            fs.unlinkSync(this.sessionPath);
        }

        // Remove multi-session file
        if (fs.existsSync(this.multiSessionPath)) {
            fs.unlinkSync(this.multiSessionPath);
        }

        console.log(`Session tracking files removed: ${SESSION_FILE}, ${MULTI_SESSION_FILE}`);
    }

    /**
     * Get current session data (single session for backwards compatibility)
     */
    get() {
        if (fs.existsSync(this.sessionPath)) {
            return JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
        }
        return null;
    }

    /**
     * Get session status with formatted output including workflow mapping
     * Includes stale session detection (>1 hour without updates)
     */
    status() {
        const session = this.get();
        if (!session) {
            return { active: false, message: 'No active session' };
        }
        
        // Session stays active until COMPLETE emission
        const now = new Date();
        const lastUpdate = new Date(session.lastUpdate);
        const secondsSinceUpdate = (now.getTime() - lastUpdate.getTime()) / 1000;
        const isCompleted = session.status === 'completed' || session.phase === 'COMPLETE';
        const isStale = secondsSinceUpdate > 3600; // 1 hour = stale
        const isActive = session.status === 'active' && !isCompleted && !isStale;
        const isIdle = secondsSinceUpdate > 30; // For UI display only
        
        return {
            active: isActive,
            completed: isCompleted,
            stale: isStale,
            idle: isIdle,
            staleSinceHours: isStale ? Math.floor(secondsSinceUpdate / 3600) : 0,
            session: session.task,
            agent: session.agent,
            phase: `${session.phase} ${session.progress}`,
            display: session.phaseVerbose,
            
            // Workflow mapping
            workflow: {
                currentPhase: session.phase,
                progress: session.progress,
                phaseStatus: Object.keys(session.phases || {}).map(phaseName => ({
                    name: phaseName,
                    status: session.phases[phaseName].status,
                    actionCount: session.phases[phaseName].actionIds?.length || 0
                }))
            },
            
            // Context for agent understanding
            context: {
                entities: session.context?.entities?.length || 0,
                skills: session.context?.skills || [],
                files: session.context?.files?.length || 0,
                changes: session.context?.changes?.length || 0,
                patterns: session.context?.patterns || []
            },
            
            // Recent actions (last 5)
            recentActions: (session.actions || []).slice(-5).map(a => ({
                type: a.type,
                description: a.description,
                timestamp: a.timestamp
            })),
            
            // Decisions and delegations
            decisions: session.decisions?.length || 0,
            delegations: session.delegations?.length || 0,
            
            // Timing
            startTime: session.startTime,
            lastUpdate: session.lastUpdate,
            secondsSinceUpdate: Math.floor(secondsSinceUpdate)
        };
    }

    /**
     * Get all sessions status
     */
    allStatus() {
        const allSessions = this.getAllSessions();
        if (!allSessions.sessions || allSessions.sessions.length === 0) {
            return { active: false, message: 'No active sessions', sessions: [] };
        }

        return {
            active: true,
            count: allSessions.sessions.length,
            currentSessionId: allSessions.currentSessionId,
            sessions: allSessions.sessions.map(s => ({
                id: s.id,
                task: s.task,
                agent: s.agent,
                status: s.status,
                phase: s.phase,
                progress: s.progress,
                display: s.phaseVerbose,
                startTime: s.startTime,
                endTime: s.endTime,
                isCurrent: s.id === allSessions.currentSessionId
            })),
            lastUpdate: allSessions.lastUpdate
        };
    }

    /**
     * Export all sessions to standardized workflow log
     * Format: AKIS-compliant with session status + action tree + context
     */
    exportToWorkflowLog(outputPath) {
        const allSessions = this.getAllSessions();
        if (!allSessions.sessions || allSessions.sessions.length === 0) {
            console.log('No sessions to export');
            return;
        }

        const logDir = path.dirname(outputPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        // Build standardized workflow log
        let content = this.generateStandardizedWorkflowLog(allSessions);

        fs.writeFileSync(outputPath, content);
        console.log(`Exported ${allSessions.sessions.length} sessions to ${outputPath}`);
        return outputPath;
    }

    /**
     * Generate standardized workflow log combining session status and chat history
     * @param {Object} allSessions - All session data from .akis-sessions.json
     * @returns {string} Formatted markdown workflow log
     */
    generateStandardizedWorkflowLog(allSessions) {
        const now = new Date();
        const timestamp = now.toISOString();
        
        // Calculate total duration
        const firstSession = allSessions.sessions[0];
        const lastSession = allSessions.sessions[allSessions.sessions.length - 1];
        const startTime = new Date(firstSession.startTime);
        const endTime = lastSession.endTime ? new Date(lastSession.endTime) : now;
        const durationMinutes = Math.round((endTime - startTime) / 60000);

        let content = `# AKIS Workflow Log\n\n`;
        content += `**Generated**: ${timestamp}\n`;
        content += `**Duration**: ${durationMinutes} minutes\n`;
        content += `**Sessions**: ${allSessions.sessions.length}\n`;
        content += `**Status**: ${lastSession.status === 'completed' ? '✅ Complete' : '🔄 In Progress'}\n\n`;

        content += `---\n\n`;

        // Executive Summary
        content += `## Executive Summary\n\n`;
        content += `This workflow log documents ${allSessions.sessions.length} session(s) completed over ${durationMinutes} minutes. `;
        
        const allTasks = allSessions.sessions.map(s => s.task);
        content += `Primary objectives: ${allTasks.join(', ')}.\n\n`;

        // Extract all unique skills and patterns
        const allSkills = new Set();
        const allPatterns = new Set();
        const allFiles = new Set();
        
        allSessions.sessions.forEach(session => {
            (session.skills || []).forEach(s => allSkills.add(s));
            (session.context?.skills || []).forEach(s => allSkills.add(s));
            (session.context?.patterns || []).forEach(p => allPatterns.add(p));
            (session.context?.files || []).forEach(f => allFiles.add(f));
        });

        if (allSkills.size > 0) {
            content += `**Skills Applied**: ${Array.from(allSkills).join(', ')}\n`;
        }
        if (allPatterns.size > 0) {
            content += `**Patterns Used**: ${Array.from(allPatterns).join(', ')}\n`;
        }
        if (allFiles.size > 0) {
            content += `**Files Modified**: ${allFiles.size} file(s)\n`;
        }

        content += `\n---\n\n`;

        // Session Details
        allSessions.sessions.forEach((session, index) => {
            content += `## Session ${index + 1}: ${session.task}\n\n`;
            content += `**Agent**: ${session.agent}\n`;
            content += `**Status**: ${session.status}\n`;
            content += `**Started**: ${new Date(session.startTime).toLocaleString()}\n`;
            if (session.endTime) {
                const sessionDuration = Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000);
                content += `**Completed**: ${new Date(session.endTime).toLocaleString()} (${sessionDuration}min)\n`;
            }
            content += `**Final Phase**: ${session.phase} (${session.progress})\n\n`;

            // Context (SSOT)
            if (session.context) {
                content += `### Context\n\n`;
                if (session.context.entities && session.context.entities.length > 0) {
                    content += `- **Entities**: ${session.context.entities.length} loaded\n`;
                }
                if (session.context.skills && session.context.skills.length > 0) {
                    content += `- **Skills**: ${session.context.skills.join(', ')}\n`;
                }
                if (session.context.patterns && session.context.patterns.length > 0) {
                    content += `- **Patterns**: ${session.context.patterns.join(', ')}\n`;
                }
                if (session.context.files && session.context.files.length > 0) {
                    content += `- **Files**: ${session.context.files.join(', ')}\n`;
                }
                if (session.context.changes && session.context.changes.length > 0) {
                    content += `- **Changes**: ${session.context.changes.join(', ')}\n`;
                }
                content += `\n`;
            }

            // Action Tree (chronological)
            if (session.actions && session.actions.length > 0) {
                content += `### Actions\n\n`;
                
                session.actions.forEach((action, actionIndex) => {
                    const time = new Date(action.timestamp).toLocaleTimeString();
                    content += `${actionIndex + 1}. **[${action.type}]** ${action.description}\n`;
                    if (action.reason) {
                        content += `   - *Reason*: ${action.reason}\n`;
                    }
                    if (action.details && Object.keys(action.details).length > 0) {
                        content += `   - *Details*: ${JSON.stringify(action.details)}\n`;
                    }
                    content += `   - *Time*: ${time}\n\n`;
                });
            }

            // Decisions Summary
            if (session.decisions && session.decisions.length > 0) {
                content += `### Key Decisions\n\n`;
                session.decisions.forEach((d, idx) => {
                    content += `${idx + 1}. ${d.description}\n`;
                });
                content += `\n`;
            }

            // Delegations
            if (session.delegations && session.delegations.length > 0) {
                content += `### Delegations\n\n`;
                session.delegations.forEach((d, idx) => {
                    content += `${idx + 1}. **${d.agent}**: ${d.task}\n`;
                });
                content += `\n`;
            }

            // Phase Breakdown
            if (session.phases) {
                content += `### Phase Breakdown\n\n`;
                Object.keys(session.phases).forEach(phaseName => {
                    const phase = session.phases[phaseName];
                    const phaseActions = (session.actions || []).filter(a => a.phase === phaseName);
                    content += `- **${phaseName}**: ${phase.status} (${phaseActions.length} actions)\n`;
                });
                content += `\n`;
            }

            content += `---\n\n`;
        });

        // Completion Summary
        content += `## Completion Summary\n\n`;
        content += `All ${allSessions.sessions.length} session(s) processed successfully.\n\n`;
        
        if (allFiles.size > 0) {
            content += `### Files Changed\n\n`;
            Array.from(allFiles).forEach(file => {
                content += `- \`${file}\`\n`;
            });
            content += `\n`;
        }

        content += `**Total Duration**: ${durationMinutes} minutes\n`;
        content += `**Workflow Log Generated**: ${timestamp}\n\n`;
        content += `---\n\n`;
        content += `*Generated by AKIS Session Tracker v2.0*\n`;

        return content;
    }

    /**
     * Resume session - show full context
     */
    resume() {
        const session = this.get();
        if (!session) {
            return 'No active session to resume';
        }
        return {
            task: session.task,
            agent: session.agent,
            phase: session.phase,
            progress: session.progress,
            skills: session.skills,
            decisions: session.decisions,
            delegations: session.delegations,
            lastUpdate: session.lastUpdate
        };
    }

    /**
     * Validate response has required AKIS headers
     */
    validate(response) {
        const hasSession = response.includes('[SESSION:');
        const hasAKIS = response.includes('[AKIS]');
        const hasPhase = response.includes('[PHASE:');
        
        return {
            valid: hasSession && hasAKIS,
            hasSession,
            hasAKIS,
            hasPhase,
            message: hasSession && hasAKIS ? 'Valid AKIS response' : 'Missing required headers'
        };
    }

    /**
     * Recover from last known state
     */
    recover() {
        const session = this.get();
        if (!session) {
            return null;
        }
        
        // Create checkpoint of current state
        const checkpoint = {
            ...session,
            recoveredAt: new Date().toISOString()
        };
        
        return checkpoint;
    }

    /**
     * Create checkpoint of current state
     */
    checkpoint() {
        const session = this.get();
        if (!session) {
            return null;
        }
        
        const checkpointPath = path.join(process.cwd(), '.akis-checkpoint.json');
        fs.writeFileSync(checkpointPath, JSON.stringify(session, null, 2));
        return session;
    }

    /**
     * Helper to map phase names to progress numbers
     */
    /**
     * Helper to map phase names to progress numbers
     * Uses N/7 format consistently for 7-phase workflow
     */
    getProgressFromPhase(phaseName) {
        const phaseMap = {
            'CONTEXT': '1/7',
            'PLAN': '2/7',
            'COORDINATE': '3/7',
            'INTEGRATE': '4/7',
            'VERIFY': '5/7',
            'LEARN': '6/7',
            'COMPLETE': '7/7'
        };
        return phaseMap[phaseName] || '0/7';
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    const tracker = new SessionTracker();

    switch (command) {
        case 'start':
            tracker.start({
                task: args[1] || 'Task',
                agent: args[2] || 'Agent',
                name: args[3] || args[1] || 'Task'
            });
            console.log('Session started');
            break;

        case 'phase':
            // Support: phase PHASE progress "message" "detail"
            tracker.phase(args[1], args[2], args[3], args[4]);
            console.log(`Phase updated: ${args[1]}${args[3] ? ' - ' + args[3] : ''}`);
            break;

        case 'detail':
            tracker.addDetail(args.slice(1).join(' '));
            console.log('Detail added to current phase');
            break;

        case 'context':
            // context --entities "E1,E2" --files "F1,F2" --patterns "P1,P2"
            const contextData = {};
            for (let i = 1; i < args.length; i += 2) {
                if (args[i] === '--entities') contextData.entities = args[i + 1].split(',');
                if (args[i] === '--files') contextData.files = args[i + 1].split(',');
                if (args[i] === '--patterns') contextData.patterns = args[i + 1].split(',');
            }
            tracker.addContext(contextData);
            console.log('Context updated');
            break;

        case 'file-change':
            tracker.fileChange(args[1], args[2] || 'modified');
            console.log(`File change tracked: ${args[1]}`);
            break;

        case 'get-context':
            const ctx = tracker.getContext(args[1]);
            console.log(ctx ? ctx.summary : 'No context available');
            break;

        case 'get-session':
            const sess = tracker.getSession(args[1]);
            console.log(JSON.stringify(sess, null, 2));
            break;

        case 'update-session':
            // update-session <sessionId> <key> <value>
            const updateData = {};
            updateData[args[2]] = args[3];
            tracker.updateSession(args[1], updateData);
            console.log(`Session ${args[1]} updated`);
            break;

        case 'decision':
            tracker.decision(args.slice(1).join(' '));
            console.log('Decision recorded');
            break;

        case 'delegate':
            tracker.delegate(args[1], args.slice(2).join(' '));
            console.log(`Delegation recorded: ${args[1]}`);
            break;

        case 'skills':
            tracker.skills(args.slice(1).join(', '));
            console.log('Skills recorded');
            break;

        case 'complete':
            tracker.complete(args[1]);
            console.log('Session completed');
            break;

        case 'reset':
            tracker.reset();
            break;

        case 'get':
            console.log(JSON.stringify(tracker.get(), null, 2));
            break;

        case 'status':
            console.log(JSON.stringify(tracker.status(), null, 2));
            break;

        case 'all-status':
        case 'all':
            console.log(JSON.stringify(tracker.allStatus(), null, 2));
            break;

        case 'export':
            const exportPath = args[1] || `log/workflow/${new Date().toISOString().split('T')[0]}_combined_sessions.md`;
            tracker.exportToWorkflowLog(exportPath);
            break;

        case 'resume':
            console.log(JSON.stringify(tracker.resume(), null, 2));
            break;

        case 'validate':
            const testResponse = args.slice(1).join(' ');
            console.log(JSON.stringify(tracker.validate(testResponse), null, 2));
            break;

        case 'recover':
            console.log(JSON.stringify(tracker.recover(), null, 2));
            break;

        case 'checkpoint':
            tracker.checkpoint();
            console.log('Checkpoint saved to .akis-checkpoint.json');
            break;

        default:
            console.log(`
AKIS Session Tracker - Multi-Session SSOT

Usage:
  node session-tracker.js start <task> <agent> [name]
  node session-tracker.js phase <PHASE_NAME> [progress] [message] [detail]
  node session-tracker.js detail <text>
  node session-tracker.js context --entities "E1,E2" --files "F1,F2" --patterns "P1"
  node session-tracker.js file-change <path> [type]
  node session-tracker.js decision <description>
  node session-tracker.js delegate <agent> <task>
  node session-tracker.js skills <skill1, skill2, ...>
  node session-tracker.js complete [workflow_log_path]
  node session-tracker.js reset
  node session-tracker.js get
  node session-tracker.js get-context [sessionId]
  node session-tracker.js get-session <sessionId|name>
  node session-tracker.js update-session <sessionId> <key> <value>
  node session-tracker.js status
  node session-tracker.js all-status (or 'all')
  node session-tracker.js export [output_path]
  node session-tracker.js resume
  node session-tracker.js validate <response>
  node session-tracker.js recover
  node session-tracker.js checkpoint

SSOT Features:
  - Sessions contain all context needed to restore agent state
  - Track entities, files, patterns, changes in session.context
  - Phase details for extension tree view
  - Parallel session updates by ID
  - Named sessions for easy identification
  - Terse context summaries for quick restoration

Multi-Session Features:
  - Multiple concurrent sessions tracked in .akis-sessions.json
  - Export all sessions to combined workflow log
  - View all sessions with 'all-status'
  - Reset clears all sessions after commit
  - Update specific session by ID or name

Example:
  node session-tracker.js start "Add feature" "_DevTeam" "feature-123"
  node session-tracker.js context --entities "Module.Component" --files "src/app.ts"
  node session-tracker.js phase CONTEXT "1/7" "Loading entities" "Found 15 entities"
  node session-tracker.js detail "Analyzed dependencies"
  node session-tracker.js file-change "src/app.ts" "modified"
  node session-tracker.js get-context  # Get terse summary to restore state
  node session-tracker.js all-status   # View all parallel sessions
  node session-tracker.js export "log/workflow/2026-01-02_sessions.md"
  node session-tracker.js reset        # Clear all after commit
            `);
    }
}

module.exports = SessionTracker;
