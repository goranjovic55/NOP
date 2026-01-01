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
            userRequest: sessionData.userRequest || sessionData.task || 'Unknown request',
            agent: sessionData.agent || 'Unknown',
            status: 'active',
            phase: 'CONTEXT',
            progress: '1/0',
            stackDepth: 0,
            decisions: [],
            emissions: [],
            delegations: [],
            skills: [],
            interrupts: [],
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
    phase(phaseName, progress, description) {
        this.emit({
            type: 'PHASE',
            phase: phaseName,
            progress: progress || this.getProgressFromPhase(phaseName),
            content: phaseName,
            description: description || this.getPhaseDescription(phaseName)
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
     * Push interrupt (stack-based vertical workflow)
     */
    push(reason) {
        if (!fs.existsSync(this.sessionPath)) {
            console.error('No active session. Call start() first.');
            return;
        }

        const session = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
        session.stackDepth = (session.stackDepth || 0) + 1;
        
        if (!session.interrupts) session.interrupts = [];
        session.interrupts.push({
            type: 'PUSH',
            depth: session.stackDepth,
            reason,
            timestamp: new Date().toISOString()
        });
        // Save session with updated stackDepth before emitting
        fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
        this.emit({
            type: 'INTERRUPT',
            content: `[STACK: push] ${reason}`,
            depth: session.stackDepth
        });

        console.log(`Interrupt pushed (depth: ${session.stackDepth})`);
    }

    /**
     * Pop interrupt (return from vertical workflow)
     */
    pop(result) {
        if (!fs.existsSync(this.sessionPath)) {
            console.error('No active session. Call start() first.');
            return;
        }

        const session = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
        const currentDepth = session.stackDepth || 0;
        
        if (currentDepth === 0) {
            console.warn('Cannot pop: stack is empty');
            return;
        }

        session.stackDepth = currentDepth - 1;
        
        if (!session.interrupts) session.interrupts = [];
        session.interrupts.push({
            type: 'POP',
            depth: session.stackDepth,
            result,
            timestamp: new Date().toISOString()
        });

        // Save session with updated stackDepth before emitting
        fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));

        this.emit({
            type: 'INTERRUPT',
            content: `[STACK: pop] ${result || 'Resumed'}`,
            depth: session.stackDepth
        });

        console.log(`Interrupt popped (depth: ${session.stackDepth})`);
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

    /**
     * Get human-readable phase description
     */
    getPhaseDescription(phaseName) {
        const descriptions = {
            'CONTEXT': 'Loading knowledge, skills, and understanding requirements',
            'PLAN': 'Designing approach and selecting appropriate patterns',
            'COORDINATE': 'Delegating to specialists or preparing tools',
            'INTEGRATE': 'Executing implementation and making changes',
            'VERIFY': 'Testing, validating, and checking for errors',
            'LEARN': 'Updating knowledge base and documenting changes',
            'COMPLETE': 'Finalizing work and awaiting user verification'
        };
        return descriptions[phaseName] || 'Working on task';
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
                userRequest: args[3]
            });
            console.log('Session started');
            break;

        case 'phase':
            tracker.phase(args[1], args[2], args[3]);
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

        case 'push':
            tracker.push(args.slice(1).join(' '));
            break;

        case 'pop':
            tracker.pop(args.slice(1).join(' '));
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
  node session-tracker.js start <task> <agent> [userRequest]
  node session-tracker.js phase <PHASE_NAME> [progress] [description]
  node session-tracker.js decision <description>
  node session-tracker.js delegate <agent> <task>
  node session-tracker.js skills <skill1, skill2, ...>
  node session-tracker.js push <reason>
  node session-tracker.js pop [result]
  node session-tracker.js complete [workflow_log_path]
  node session-tracker.js get

Example:
  node session-tracker.js start "Add new feature" "_DevTeam" "User wants X"
  node session-tracker.js phase CONTEXT "1/0" "Loading project knowledge"
  node session-tracker.js decision "Use session tracking file"
  node session-tracker.js push "Handle urgent bug fix"
  node session-tracker.js pop "Bug fixed, resuming"
  node session-tracker.js complete "log/workflow/2026-01-01_163900_task.md"
            `);
    }
}

module.exports = SessionTracker;
