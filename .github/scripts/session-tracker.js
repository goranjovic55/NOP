#!/usr/bin/env node
/**
 * AKIS Session Tracker
 * 
 * Utility for agents to emit real-time session state to .akis-session.json
 * This enables the VSCode extension to monitor live sessions without waiting for workflow logs.
 * 
 * Usage in agent responses:
 * - Call after each significant emission ([PHASE], [DECISION], [DELEGATE], etc.)
 * - Automatically clears session file when workflow log is written
 */

const fs = require('fs');
const path = require('path');

const SESSION_FILE = '.akis-session.json';

class SessionTracker {
    constructor() {
        this.sessionPath = path.join(process.cwd(), SESSION_FILE);
    }

    /**
     * Initialize a new session
     */
    start(sessionData) {
        const session = {
            id: Date.now().toString(),
            startTime: new Date().toISOString(),
            task: sessionData.task || 'Unknown task',
            agent: sessionData.agent || 'Unknown',
            status: 'active',
            phase: 'CONTEXT',
            progress: '1/0',
            decisions: [],
            emissions: [],
            delegations: [],
            skills: [],
            ...sessionData
        };

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

        const emissionData = {
            timestamp: new Date().toISOString(),
            ...emission
        };

        // Update phase if provided
        if (emission.phase) {
            session.phase = emission.phase;
        }

        // Update progress if provided
        if (emission.progress) {
            session.progress = emission.progress;
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
     */
    phase(phaseName, progress) {
        this.emit({
            type: 'PHASE',
            phase: phaseName,
            progress: progress || this.getProgressFromPhase(phaseName),
            content: phaseName
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
     * Complete the session and save final state
     * Note: File is NOT deleted and will be committed with the workflow
     */
    complete(workflowLogPath) {
        if (fs.existsSync(this.sessionPath)) {
            const session = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
            session.status = 'completed';
            session.endTime = new Date().toISOString();
            session.workflowLog = workflowLogPath;

            // Write final state - file persists for commit
            fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
            console.log(`Session completed and saved to ${SESSION_FILE}`);
        }
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
            tracker.phase(args[1], args[2]);
            console.log(`Phase updated: ${args[1]}`);
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

        case 'get':
            console.log(JSON.stringify(tracker.get(), null, 2));
            break;

        default:
            console.log(`
AKIS Session Tracker

Usage:
  node session-tracker.js start <task> <agent>
  node session-tracker.js phase <PHASE_NAME> [progress]
  node session-tracker.js decision <description>
  node session-tracker.js delegate <agent> <task>
  node session-tracker.js skills <skill1, skill2, ...>
  node session-tracker.js complete [workflow_log_path]
  node session-tracker.js get

Example:
  node session-tracker.js start "Add new feature" "_DevTeam"
  node session-tracker.js phase CONTEXT "1/0"
  node session-tracker.js decision "Use session tracking file"
  node session-tracker.js complete "log/workflow/2026-01-01_163900_task.md"
            `);
    }
}

module.exports = SessionTracker;
