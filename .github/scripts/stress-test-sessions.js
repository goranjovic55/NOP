#!/usr/bin/env node
/**
 * AKIS Session Resilience STRESS Test
 * 
 * High-volume randomized operations to test:
 * - Session tracking under heavy load
 * - Random context switches
 * - Unpredictable interrupt patterns
 * - State consistency across chaos
 * - Recovery from edge cases
 * 
 * Usage: node .github/scripts/stress-test-sessions.js [--operations=N] [--seed=N]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SESSION_FILE = '.akis-session.json';
const MULTI_SESSION_FILE = '.akis-sessions.json';

// Configuration
const OPERATION_COUNT = parseInt(process.argv.find(arg => arg.startsWith('--operations='))?.split('=')[1] || '100');
const SEED = parseInt(process.argv.find(arg => arg.startsWith('--seed='))?.split('=')[1] || Date.now());

class StressTestRunner {
    constructor() {
        this.operations = 0;
        this.errors = [];
        this.sessionPath = path.join(process.cwd(), SESSION_FILE);
        this.multiSessionPath = path.join(process.cwd(), MULTI_SESSION_FILE);
        this.random = this.seededRandom(SEED);
        this.activeTasks = [];
        this.completedTasks = [];
        
        console.log(`\n${'='.repeat(60)}`);
        console.log('AKIS SESSION STRESS TEST');
        console.log(`${'='.repeat(60)}`);
        console.log(`Operations: ${OPERATION_COUNT}`);
        console.log(`Random Seed: ${SEED}`);
        console.log(`${'='.repeat(60)}\n`);
    }

    // Seeded random number generator for reproducibility
    seededRandom(seed) {
        let state = seed;
        return () => {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }

    randomChoice(array) {
        return array[Math.floor(this.random() * array.length)];
    }

    randomInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    exec(command, label) {
        try {
            execSync(command, { 
                cwd: process.cwd(),
                encoding: 'utf-8',
                stdio: 'pipe'
            });
            return true;
        } catch (error) {
            this.errors.push({
                operation: this.operations,
                label,
                command,
                error: error.message
            });
            return false;
        }
    }

    getState() {
        try {
            if (!fs.existsSync(this.multiSessionPath)) {
                return { sessions: [], currentSessionId: null };
            }
            return JSON.parse(fs.readFileSync(this.multiSessionPath, 'utf-8'));
        } catch (error) {
            this.errors.push({
                operation: this.operations,
                label: 'getState',
                error: error.message
            });
            return { sessions: [], currentSessionId: null };
        }
    }

    getCurrent() {
        try {
            if (!fs.existsSync(this.sessionPath)) {
                return null;
            }
            return JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
        } catch (error) {
            return null;
        }
    }

    resetState() {
        [SESSION_FILE, MULTI_SESSION_FILE, `${MULTI_SESSION_FILE}.backup`].forEach(file => {
            const filePath = path.join(process.cwd(), file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
        this.activeTasks = [];
        this.completedTasks = [];
    }

    validateState() {
        const state = this.getState();
        const current = this.getCurrent();
        
        // Validation checks
        const checks = [];
        
        // Check 1: Current session exists in multi-session
        if (current && state.currentSessionId) {
            const exists = state.sessions.some(s => s.id === state.currentSessionId);
            checks.push({
                name: 'Current session in multi-session file',
                passed: exists
            });
        }
        
        // Check 2: Parent references are valid
        for (const session of state.sessions) {
            if (session.parentSessionId) {
                const parentExists = state.sessions.some(s => s.id === session.parentSessionId);
                checks.push({
                    name: `Parent ${session.parentSessionId} exists for ${session.id}`,
                    passed: parentExists
                });
            }
        }
        
        // Check 3: Depth values are consistent
        for (const session of state.sessions) {
            if (session.parentSessionId) {
                const parent = state.sessions.find(s => s.id === session.parentSessionId);
                if (parent) {
                    const depthCorrect = session.depth === (parent.depth || 0) + 1;
                    checks.push({
                        name: `Depth consistency for ${session.task}`,
                        passed: depthCorrect
                    });
                }
            }
        }
        
        // Check 4: No orphaned sessions (depth > 0 without parent)
        for (const session of state.sessions) {
            if (session.depth > 0 && !session.parentSessionId) {
                checks.push({
                    name: `No orphaned session ${session.id}`,
                    passed: false
                });
            }
        }
        
        return checks;
    }

    // ========== RANDOM OPERATIONS ==========

    op_startSession() {
        const taskNames = ['feature-impl', 'bugfix', 'refactor', 'review', 'research', 'design'];
        const agents = ['Developer', 'Architect', 'Reviewer', 'Researcher'];
        
        const taskName = `${this.randomChoice(taskNames)}-${this.randomInt(1000, 9999)}`;
        const agent = this.randomChoice(agents);
        
        const success = this.exec(
            `node .github/scripts/session-tracker.js start "${taskName}" "${agent}"`,
            `Start: ${taskName}`
        );
        
        if (success) {
            const current = this.getCurrent();
            if (current) {
                this.activeTasks.push({
                    id: current.id,
                    name: taskName,
                    agent,
                    depth: current.depth
                });
            }
        }
    }

    op_phaseTransition() {
        if (this.activeTasks.length === 0) return;
        
        const phases = ['CONTEXT', 'PLAN', 'COORDINATE', 'INTEGRATE', 'VERIFY', 'LEARN'];
        const phase = this.randomChoice(phases);
        const progress = `${this.randomInt(1, 7)}/7`;
        
        this.exec(
            `node .github/scripts/session-tracker.js phase "${phase}" "${progress}"`,
            `Phase: ${phase}`
        );
    }

    op_addContext() {
        if (this.activeTasks.length === 0) return;
        
        const current = this.getCurrent();
        if (!current) return;
        
        // Simulate adding context via emit
        const contextTypes = ['CONTEXT', 'DECISION', 'SKILL', 'FILE_CHANGE'];
        const type = this.randomChoice(contextTypes);
        
        if (type === 'DECISION') {
            this.exec(
                `node .github/scripts/session-tracker.js decision "Decision-${this.randomInt(1, 100)}"`,
                'Add Decision'
            );
        } else if (type === 'SKILL') {
            const skills = ['backend-api', 'frontend-react', 'testing', 'security'];
            const skill = this.randomChoice(skills);
            this.exec(
                `node .github/scripts/session-tracker.js skills "${skill}"`,
                `Add Skill: ${skill}`
            );
        }
    }

    op_completeSession() {
        if (this.activeTasks.length === 0) return;
        
        const current = this.getCurrent();
        if (!current) return;
        
        this.exec(
            'node .github/scripts/session-tracker.js complete',
            'Complete Session'
        );
        
        // Move to completed
        const taskIdx = this.activeTasks.findIndex(t => t.id === current.id);
        if (taskIdx >= 0) {
            this.completedTasks.push(this.activeTasks[taskIdx]);
            this.activeTasks.splice(taskIdx, 1);
        }
    }

    op_resumeRandom() {
        const state = this.getState();
        const activeSessions = state.sessions.filter(s => s.status === 'active');
        
        if (activeSessions.length === 0) return;
        
        const session = this.randomChoice(activeSessions);
        this.exec(
            `node .github/scripts/session-tracker.js resume "${session.id}"`,
            `Resume: ${session.task}`
        );
    }

    op_pauseSession() {
        if (this.activeTasks.length === 0) return;
        
        const current = this.getCurrent();
        if (!current) return;
        
        // Pause is automatic when starting new session
        // So we'll just record intent
        this.exec(
            `node .github/scripts/session-tracker.js emit '{"type":"PAUSE","content":"Manual pause"}'`,
            'Pause Session'
        );
    }

    op_interruptSession() {
        if (this.activeTasks.length === 0) return;
        
        this.exec(
            `node .github/scripts/session-tracker.js interrupt "Random interrupt"`,
            'Interrupt'
        );
    }

    op_statusCheck() {
        this.exec(
            'node .github/scripts/session-tracker.js status',
            'Status Check'
        );
    }

    // ========== SIMULATION ==========

    async run() {
        this.resetState();
        
        // Initial session to start from
        this.op_startSession();
        
        const operations = [
            { name: 'startSession', weight: 15, fn: this.op_startSession },
            { name: 'phaseTransition', weight: 25, fn: this.op_phaseTransition },
            { name: 'addContext', weight: 20, fn: this.op_addContext },
            { name: 'completeSession', weight: 10, fn: this.op_completeSession },
            { name: 'resumeRandom', weight: 10, fn: this.op_resumeRandom },
            { name: 'interruptSession', weight: 5, fn: this.op_interruptSession },
            { name: 'statusCheck', weight: 15, fn: this.op_statusCheck }
        ];
        
        // Build weighted operation list
        const weightedOps = [];
        operations.forEach(op => {
            for (let i = 0; i < op.weight; i++) {
                weightedOps.push(op);
            }
        });
        
        // Run random operations
        for (let i = 0; i < OPERATION_COUNT; i++) {
            this.operations++;
            
            const op = this.randomChoice(weightedOps);
            
            if (i % 10 === 0) {
                process.stdout.write(`\rProgress: ${i}/${OPERATION_COUNT} operations (${this.errors.length} errors)`);
            }
            
            try {
                op.fn.call(this);
                
                // Periodic validation
                if (i % 20 === 0) {
                    const checks = this.validateState();
                    const failed = checks.filter(c => !c.passed);
                    if (failed.length > 0) {
                        this.errors.push({
                            operation: i,
                            label: 'Validation',
                            error: `Failed checks: ${failed.map(f => f.name).join(', ')}`
                        });
                    }
                }
            } catch (error) {
                this.errors.push({
                    operation: i,
                    label: op.name,
                    error: error.message
                });
            }
        }
        
        console.log(`\n\nCompleted ${OPERATION_COUNT} operations\n`);
        this.printResults();
    }

    printResults() {
        const state = this.getState();
        
        console.log(`${'='.repeat(60)}`);
        console.log('STRESS TEST RESULTS');
        console.log(`${'='.repeat(60)}`);
        console.log(`Total Operations: ${this.operations}`);
        console.log(`Errors: ${this.errors.length}`);
        console.log(`Error Rate: ${((this.errors.length / this.operations) * 100).toFixed(2)}%`);
        console.log(`\nFinal State:`);
        console.log(`  Total Sessions: ${state.sessions.length}`);
        console.log(`  Active Sessions: ${state.sessions.filter(s => s.status === 'active').length}`);
        console.log(`  Completed Sessions: ${state.sessions.filter(s => s.status === 'completed').length}`);
        console.log(`  Active Tasks Tracked: ${this.activeTasks.length}`);
        console.log(`  Completed Tasks: ${this.completedTasks.length}`);
        
        // Depth distribution
        const depthCounts = {};
        state.sessions.forEach(s => {
            const depth = s.depth || 0;
            depthCounts[depth] = (depthCounts[depth] || 0) + 1;
        });
        console.log(`\nDepth Distribution:`);
        Object.keys(depthCounts).sort().forEach(depth => {
            console.log(`  Depth ${depth}: ${depthCounts[depth]} sessions`);
        });
        
        // Final validation
        console.log(`\nFinal Validation:`);
        const checks = this.validateState();
        const passed = checks.filter(c => c.passed).length;
        const failed = checks.filter(c => !c.passed).length;
        console.log(`  Passed: ${passed} ✓`);
        console.log(`  Failed: ${failed} ✗`);
        
        if (this.errors.length > 0) {
            console.log(`\n${'='.repeat(60)}`);
            console.log('ERRORS:');
            console.log(`${'='.repeat(60)}`);
            this.errors.slice(0, 10).forEach((err, idx) => {
                console.log(`${idx + 1}. [Op ${err.operation}] ${err.label}: ${err.error}`);
            });
            if (this.errors.length > 10) {
                console.log(`... and ${this.errors.length - 10} more errors`);
            }
        }
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Status: ${this.errors.length === 0 && failed === 0 ? 'PASS ✓' : 'ISSUES FOUND ⚠'}`);
        console.log(`${'='.repeat(60)}\n`);
    }
}

// ========== MAIN ==========

async function main() {
    const runner = new StressTestRunner();
    await runner.run();
    process.exit(runner.errors.length > 0 ? 1 : 0);
}

if (require.main === module) {
    main().catch(error => {
        console.error('Stress test crashed:', error);
        process.exit(1);
    });
}

module.exports = StressTestRunner;
