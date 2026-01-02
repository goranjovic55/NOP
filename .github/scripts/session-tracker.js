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

class SessionTracker {
    constructor() {
        this.sessionPath = path.join(process.cwd(), SESSION_FILE);
        this.maxAgeHours = 24; // Auto-expire sessions older than this
    }

    /**
     * Check if existing session is stale (older than maxAgeHours)
     */
    isStale() {
        if (!fs.existsSync(this.sessionPath)) return false;
        try {
            const session = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
            const lastUpdate = new Date(session.lastUpdate || session.startTime);
            const ageHours = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
            return ageHours > this.maxAgeHours;
        } catch {
            return true; // Treat corrupt files as stale
        }
    }

    /**
     * Initialize a new session (with stale session auto-cleanup)
     */
    start(sessionData) {
        // Auto-cleanup stale sessions
        if (this.isStale()) {
            console.log('Auto-expiring stale session (>24h)');
            this.reset();
        }

        // Warn if active session exists (but allow override for flexibility)
        if (fs.existsSync(this.sessionPath)) {
            try {
                const existing = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
                if (existing.status === 'active') {
                    console.log(`Warning: Overwriting active session "${existing.task}" by ${existing.agent}`);
                }
            } catch {}
        }

        const session = {
            id: Date.now().toString(),
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
            decisions: [],
            emissions: [],
            delegations: [],
            skills: [],
            pauseStack: [], // Track PAUSE/RESUME balance
            awaitingReset: false,
            ...sessionData
        };

        session.phaseDisplay = `${session.agent || 'Unknown'} ${session.phase}`.trim();
        session.phaseAgent = session.agent || 'Unknown';
        session.phaseVerbose = `${session.phaseDisplay} | progress=${session.progress}`;
        session.lastUpdate = session.startTime;

        fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
        return session;
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

        const agentLabel = emission.agent || session.agent || 'Unknown';
        const isDelegated = Boolean(emission.agent && emission.agent !== session.agent);

        const emissionData = {
            timestamp: new Date().toISOString(),
            agent: agentLabel,
            ...emission
        };

        emissionData.isDelegated = isDelegated;
        if (isDelegated && emission.type === 'PHASE') {
            emissionData.type = 'SUBAGENT';
        }

        if (emission.type === 'PHASE') {
            const phaseLabelRaw = emission.phase || emission.content || session.phase || 'PHASE';
            const displayPhase = isDelegated ? 'SUBAGENT' : phaseLabelRaw;
            const phaseContent = isDelegated
                ? `[SUBAGENT] ${agentLabel}`
                : `${agentLabel} ${phaseLabelRaw}`;

            emissionData.phase = displayPhase;
            emissionData.content = phaseContent;
            emissionData.message = emission.message || '';
            session.phase = displayPhase;
            session.phaseDisplay = phaseContent;
            session.phaseAgent = agentLabel;
            session.phaseMessage = emission.message || '';

            if (emission.progress) {
                session.progress = emission.progress;
            } else if (!session.progress) {
                session.progress = this.getProgressFromPhase(displayPhase);
            }

            // Include message in verbose output if provided
            const messageText = emission.message ? ` - ${emission.message}` : '';
            session.phaseVerbose = `${phaseContent}${messageText} | progress=${session.progress}`;
        } else {
            // Update phase or progress for non-PHASE emissions
            if (emission.phase) {
                session.phase = emission.phase;
            }

            if (emission.progress) {
                session.progress = emission.progress;
            }

            session.phaseVerbose = `${session.phaseDisplay} | progress=${session.progress}`;
        }

        // Add to emissions timeline
        session.emissions.push(emissionData);

        // Add to specific collections based on type
        if (emission.type === 'DECISION' && emission.content) {
            session.decisions.push({
                description: emission.content,
                timestamp: emissionData.timestamp
            });
        }

        if (emission.type === 'DELEGATE' && emission.content) {
            session.delegations.push({
                agent: emission.agent || 'Unknown',
                task: emission.task || emission.content,
                timestamp: emissionData.timestamp
            });
        }

        if (emission.type === 'SKILL' && emission.content) {
            const skills = emission.content.split(',').map(s => s.trim());
            session.skills = [...new Set([...session.skills, ...skills])];
        }

        fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
        return session;
    }

    /**
     * Update session phase
     * @param {string} phaseName - The phase name (CONTEXT, PLAN, etc.)
     * @param {string} progress - Progress indicator (e.g., "1/7")
     * @param {string} message - Optional detailed message describing what's happening
     */
    phase(phaseName, progress, message) {
        this.emit({
            type: 'PHASE',
            phase: phaseName,
            progress: progress || this.getProgressFromPhase(phaseName),
            content: phaseName,
            message: message || ''
        });
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
     * Record a PAUSE (interrupt handling)
     */
    pause(task, phase) {
        if (!fs.existsSync(this.sessionPath)) {
            console.error('No active session to pause');
            return;
        }
        const session = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
        session.pauseStack = session.pauseStack || [];
        session.pauseStack.push({ task, phase, timestamp: new Date().toISOString() });
        session.lastUpdate = new Date().toISOString();
        fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
        this.emit({ type: 'PAUSE', content: `${task} at ${phase}` });
    }

    /**
     * Record a RESUME (return from interrupt)
     */
    resume() {
        if (!fs.existsSync(this.sessionPath)) {
            console.error('No active session to resume');
            return;
        }
        const session = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
        session.pauseStack = session.pauseStack || [];
        const resumed = session.pauseStack.pop();
        session.lastUpdate = new Date().toISOString();
        fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
        if (resumed) {
            this.emit({ type: 'RESUME', content: `${resumed.task} at ${resumed.phase}` });
        } else {
            console.warn('No paused task to resume');
        }
    }

    /**
     * Check PAUSE/RESUME balance
     */
    checkBalance() {
        if (!fs.existsSync(this.sessionPath)) return { balanced: true, depth: 0 };
        const session = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
        const depth = (session.pauseStack || []).length;
        return { balanced: depth === 0, depth };
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

            fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
            console.log('Session completed. Run "node .github/scripts/session-tracker.js reset" after committing to GitHub to clear.');
        }
    }

    /**
     * Remove session file after completion/commit
     */
    reset() {
        if (!fs.existsSync(this.sessionPath)) {
            console.log('No session file to reset.');
            return;
        }

        fs.unlinkSync(this.sessionPath);
        console.log(`Session tracking file removed: ${SESSION_FILE}`);
    }

    /**
     * Get current session data
     */
    get() {
        if (fs.existsSync(this.sessionPath)) {
            return JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
        }
        return null;
    }

    /**
     * Helper to map phase names to progress numbers
     */
    getProgressFromPhase(phaseName) {
        const phaseMap = {
            'CONTEXT': '1/0',
            'PLAN': '2/0',
            'COORDINATE': '3/0',
            'INTEGRATE': '4/0',
            'VERIFY': '5/0',
            'LEARN': '6/0',
            'COMPLETE': '7/0'
        };
        return phaseMap[phaseName] || '0/0';
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
                agent: args[2] || 'Agent'
            });
            console.log('Session started');
            break;

        case 'phase':
            // Support: phase PHASE progress "message"
            tracker.phase(args[1], args[2], args.slice(3).join(' '));
            console.log(`Phase updated: ${args[1]}${args[3] ? ' - ' + args.slice(3).join(' ') : ''}`);
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

        case 'pause':
            tracker.pause(args[1] || 'current', args[2] || 'INTEGRATE');
            console.log('Session paused');
            break;

        case 'resume':
            tracker.resume();
            console.log('Session resumed');
            break;

        case 'check':
            const balance = tracker.checkBalance();
            console.log(`PAUSE/RESUME balance: ${balance.balanced ? 'OK' : 'IMBALANCED'}, depth: ${balance.depth}`);
            break;

        case 'stale':
            console.log(`Session stale: ${tracker.isStale()}`);
            break;

        default:
            console.log(`
AKIS Session Tracker

Usage:
  node session-tracker.js start <task> <agent>
  node session-tracker.js phase <PHASE_NAME> [progress] [message...]
  node session-tracker.js decision <description>
  node session-tracker.js delegate <agent> <task>
  node session-tracker.js skills <skill1, skill2, ...>
  node session-tracker.js pause <task> <phase>
  node session-tracker.js resume
  node session-tracker.js check
  node session-tracker.js stale
  node session-tracker.js complete [workflow_log_path]
  node session-tracker.js reset
  node session-tracker.js get

Example:
  node session-tracker.js start "Add new feature" "_DevTeam"
  node session-tracker.js phase CONTEXT "1/7" "Examining codebase structure"
  node session-tracker.js pause "main-task" "INTEGRATE"
  node session-tracker.js resume
  node session-tracker.js check
  node session-tracker.js complete "log/workflow/2026-01-01_163900_task.md"
  node session-tracker.js reset
            `);
    }
}

module.exports = SessionTracker;
