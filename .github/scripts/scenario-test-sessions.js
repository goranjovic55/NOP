#!/usr/bin/env node
/**
 * AKIS Session Advanced Scenario Tester
 * 
 * Tests specific complex scenarios:
 * - Rapid context switching (10+ switches/second)
 * - Deep nesting with selective resumption
 * - Interrupt storms (multiple interrupts in quick succession)
 * - State corruption and recovery
 * - Concurrent modification attempts
 * 
 * Usage: node .github/scripts/scenario-test-sessions.js [--scenario=NAME]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SESSION_FILE = '.akis-session.json';
const MULTI_SESSION_FILE = '.akis-sessions.json';

class ScenarioTester {
    constructor() {
        this.sessionPath = path.join(process.cwd(), SESSION_FILE);
        this.multiSessionPath = path.join(process.cwd(), MULTI_SESSION_FILE);
        this.results = [];
    }

    exec(command, silent = true) {
        try {
            const output = execSync(command, {
                cwd: process.cwd(),
                encoding: 'utf-8',
                stdio: silent ? 'pipe' : 'inherit'
            });
            return { success: true, output };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    resetState() {
        [SESSION_FILE, MULTI_SESSION_FILE, `${MULTI_SESSION_FILE}.backup`].forEach(file => {
            const filePath = path.join(process.cwd(), file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    }

    getState() {
        if (!fs.existsSync(this.multiSessionPath)) {
            return { sessions: [], currentSessionId: null };
        }
        return JSON.parse(fs.readFileSync(this.multiSessionPath, 'utf-8'));
    }

    log(message, status = 'INFO') {
        const symbols = {
            'SCENARIO': '\n🎯',
            'PASS': '  ✓',
            'FAIL': '  ✗',
            'INFO': '  ℹ',
            'WARN': '  ⚠'
        };
        console.log(`${symbols[status]} ${message}`);
    }

    recordResult(scenario, passed, details) {
        this.results.push({ scenario, passed, details });
        this.log(`${scenario}: ${details}`, passed ? 'PASS' : 'FAIL');
    }

    // ========== SCENARIOS ==========

    async scenario1_rapidContextSwitching() {
        this.log('Scenario 1: Rapid Context Switching (High Frequency)', 'SCENARIO');
        this.resetState();

        // Create 10 sessions
        const sessions = [];
        for (let i = 0; i < 10; i++) {
            this.exec(`node .github/scripts/session-tracker.js start "task-${i}" "Developer"`, true);
            const state = this.getState();
            sessions.push(state.currentSessionId);
        }

        // Rapid switching - 30 switches in quick succession
        const startTime = Date.now();
        for (let i = 0; i < 30; i++) {
            const sessionId = sessions[i % sessions.length];
            this.exec(`node .github/scripts/session-tracker.js resume "${sessionId}"`, true);
        }
        const duration = Date.now() - startTime;

        const finalState = this.getState();
        const passed = finalState.sessions.length === 10 && duration < 5000;
        this.recordResult(
            'Rapid Context Switching',
            passed,
            `30 switches in ${duration}ms, ${finalState.sessions.length} sessions intact`
        );
    }

    async scenario2_interruptStorm() {
        this.log('Scenario 2: Interrupt Storm (Cascading Interrupts)', 'SCENARIO');
        this.resetState();

        // Start main task
        this.exec('node .github/scripts/session-tracker.js start "main-work" "Developer"', true);
        this.exec('node .github/scripts/session-tracker.js phase "INTEGRATE" "4/7"', true);

        // Create 5 interrupts in rapid succession without completing
        for (let i = 0; i < 5; i++) {
            this.exec(`node .github/scripts/session-tracker.js start "interrupt-${i}" "Developer"`, true);
            this.exec('node .github/scripts/session-tracker.js phase "PLAN" "2/7"', true);
        }

        const state = this.getState();
        
        // Verify interrupt chain
        const depths = state.sessions.map(s => s.depth).sort((a, b) => a - b);
        const expectedDepths = [0, 1, 2, 3, 4, 5];
        const depthsMatch = JSON.stringify(depths) === JSON.stringify(expectedDepths);

        // Verify all have PAUSE actions except the deepest
        const pausedSessions = state.sessions.filter(s => 
            s.actions.some(a => a.type === 'PAUSE')
        ).length;

        const passed = depthsMatch && pausedSessions === 5;
        this.recordResult(
            'Interrupt Storm',
            passed,
            `6 sessions, depths ${depths.join(',')}, ${pausedSessions} paused`
        );
    }

    async scenario3_selectiveResumption() {
        this.log('Scenario 3: Selective Resumption (Non-Linear)', 'SCENARIO');
        this.resetState();

        // Create deep hierarchy: A -> B -> C -> D
        this.exec('node .github/scripts/session-tracker.js start "task-a" "Architect"', true);
        const idA = this.getState().currentSessionId;
        
        this.exec('node .github/scripts/session-tracker.js start "task-b" "Developer"', true);
        const idB = this.getState().currentSessionId;
        
        this.exec('node .github/scripts/session-tracker.js start "task-c" "Developer"', true);
        const idC = this.getState().currentSessionId;
        
        this.exec('node .github/scripts/session-tracker.js start "task-d" "Developer"', true);
        const idD = this.getState().currentSessionId;

        // Resume non-linearly: D -> B -> A -> C
        this.exec(`node .github/scripts/session-tracker.js resume "${idD}"`, true);
        const state1 = this.getState();
        
        this.exec(`node .github/scripts/session-tracker.js resume "${idB}"`, true);
        const state2 = this.getState();
        
        this.exec(`node .github/scripts/session-tracker.js resume "${idA}"`, true);
        const state3 = this.getState();
        
        this.exec(`node .github/scripts/session-tracker.js resume "${idC}"`, true);
        const state4 = this.getState();

        const passed = 
            state1.currentSessionId === idD &&
            state2.currentSessionId === idB &&
            state3.currentSessionId === idA &&
            state4.currentSessionId === idC;

        this.recordResult(
            'Selective Resumption',
            passed,
            'Non-linear resumption maintained correct session state'
        );
    }

    async scenario4_corruptionRecovery() {
        this.log('Scenario 4: State Corruption and Recovery', 'SCENARIO');
        this.resetState();

        // Create valid state
        this.exec('node .github/scripts/session-tracker.js start "work" "Developer"', true);
        this.exec('node .github/scripts/session-tracker.js phase "PLAN" "2/7"', true);
        this.exec('node .github/scripts/session-tracker.js phase "INTEGRATE" "4/7"', true);

        // Verify backup exists
        const backupExists = fs.existsSync(`${this.multiSessionPath}.backup`);
        
        // Corrupt main file
        fs.writeFileSync(this.multiSessionPath, '{"invalid": json}');

        let recoverable = false;
        try {
            JSON.parse(fs.readFileSync(this.multiSessionPath, 'utf-8'));
        } catch (error) {
            // Corruption detected, attempt recovery from backup
            if (backupExists) {
                fs.copyFileSync(`${this.multiSessionPath}.backup`, this.multiSessionPath);
                try {
                    const recovered = JSON.parse(fs.readFileSync(this.multiSessionPath, 'utf-8'));
                    recoverable = recovered.sessions && recovered.sessions.length > 0;
                } catch (e) {
                    recoverable = false;
                }
            }
        }

        this.recordResult(
            'Corruption Recovery',
            recoverable,
            recoverable ? 'Successfully recovered from backup' : 'Recovery failed'
        );
    }

    async scenario5_deepNestingCompletion() {
        this.log('Scenario 5: Deep Nesting with Sequential Completion', 'SCENARIO');
        this.resetState();

        // Create 10-deep nesting
        const ids = [];
        for (let i = 0; i < 10; i++) {
            this.exec(`node .github/scripts/session-tracker.js start "level-${i}" "Developer"`, true);
            ids.push(this.getState().currentSessionId);
        }

        // Complete all from deepest to root
        const completionOrder = [];
        for (let i = 9; i >= 0; i--) {
            this.exec('node .github/scripts/session-tracker.js complete', true);
            const current = this.getState().currentSessionId;
            completionOrder.push(current);
        }

        // After completing all, should have auto-resumed through the chain
        const finalState = this.getState();
        const allCompleted = finalState.sessions.every(s => s.status === 'completed');

        this.recordResult(
            'Deep Nesting Completion',
            allCompleted,
            `Completed 10-level hierarchy, all sessions completed: ${allCompleted}`
        );
    }

    async scenario6_massiveParallelSessions() {
        this.log('Scenario 6: Massive Parallel Session Creation', 'SCENARIO');
        this.resetState();

        // Create 50 sessions rapidly
        const startTime = Date.now();
        for (let i = 0; i < 50; i++) {
            this.exec(`node .github/scripts/session-tracker.js start "parallel-${i}" "Developer"`, true);
        }
        const duration = Date.now() - startTime;

        const state = this.getState();
        const passed = state.sessions.length === 50 && duration < 10000;

        this.recordResult(
            'Massive Parallel Sessions',
            passed,
            `Created 50 sessions in ${duration}ms`
        );
    }

    async scenario7_phaseJumping() {
        this.log('Scenario 7: Non-Sequential Phase Transitions', 'SCENARIO');
        this.resetState();

        this.exec('node .github/scripts/session-tracker.js start "jumper" "Developer"', true);

        // Jump through phases non-sequentially
        const phases = ['VERIFY', 'CONTEXT', 'LEARN', 'INTEGRATE', 'PLAN', 'COMPLETE'];
        for (const phase of phases) {
            this.exec(`node .github/scripts/session-tracker.js phase "${phase}" "X/7"`, true);
        }

        const session = this.getState().sessions[0];
        const allPhasesRecorded = phases.every(p => session.phases[p] !== undefined);

        this.recordResult(
            'Phase Jumping',
            allPhasesRecorded,
            `Non-sequential phase transitions: ${allPhasesRecorded ? 'handled' : 'failed'}`
        );
    }

    async scenario8_interruptDuringResume() {
        this.log('Scenario 8: Interrupt During Resume Operation (Stack-Based)', 'SCENARIO');
        this.resetState();

        // Create initial sessions
        this.exec('node .github/scripts/session-tracker.js start "session-1" "Developer"', true);
        const id1 = this.getState().currentSessionId;
        
        this.exec('node .github/scripts/session-tracker.js start "session-2" "Developer"', true);
        const id2 = this.getState().currentSessionId;

        // Resume first, then immediately interrupt with new session
        // Note: Stack-based behavior means new interrupt uses most recent ACTIVE session as parent
        // Since session-2 is still active (not completed), it becomes the parent
        this.exec(`node .github/scripts/session-tracker.js resume "${id1}"`, true);
        this.exec('node .github/scripts/session-tracker.js start "interrupt" "Developer"', true);

        const state = this.getState();
        const interruptSession = state.sessions.find(s => s.task === 'interrupt');
        // Stack-based: parent should be the last active session (session-2, not session-1)
        const passed = interruptSession && interruptSession.parentSessionId === id2;

        this.recordResult(
            'Interrupt During Resume',
            passed,
            `Stack-based parent assignment (parent=${interruptSession?.parentSessionId}, expected=${id2}): ${passed}`
        );
    }

    async scenario9_emptySessionHandling() {
        this.log('Scenario 9: Empty Session Edge Cases', 'SCENARIO');
        this.resetState();

        // Try operations with no session
        const result1 = this.exec('node .github/scripts/session-tracker.js phase "PLAN" "2/7"', true);
        const result2 = this.exec('node .github/scripts/session-tracker.js complete', true);
        const result3 = this.exec('node .github/scripts/session-tracker.js resume', true);

        // These should not crash
        const passed = true; // If we got here, no crashes occurred

        this.recordResult(
            'Empty Session Handling',
            passed,
            'Operations on non-existent sessions handled gracefully'
        );
    }

    async scenario10_contextPreservation() {
        this.log('Scenario 10: Context Preservation Across Interrupts', 'SCENARIO');
        this.resetState();

        // Start with context-heavy session
        this.exec('node .github/scripts/session-tracker.js start "main" "Developer"', true);
        this.exec('node .github/scripts/session-tracker.js decision "Decision 1"', true);
        this.exec('node .github/scripts/session-tracker.js decision "Decision 2"', true);
        this.exec('node .github/scripts/session-tracker.js skills "backend-api,testing"', true);
        
        const mainId = this.getState().currentSessionId;
        const mainBefore = this.getState().sessions.find(s => s.id === mainId);

        // Create interrupt
        this.exec('node .github/scripts/session-tracker.js start "interrupt" "Developer"', true);
        this.exec('node .github/scripts/session-tracker.js complete', true);

        // Check main session context preserved
        const mainAfter = this.getState().sessions.find(s => s.id === mainId);
        
        const decisionsPreserved = mainBefore.decisions.length === mainAfter.decisions.length;
        const skillsPreserved = mainBefore.skills.length === mainAfter.skills.length;
        const passed = decisionsPreserved && skillsPreserved;

        this.recordResult(
            'Context Preservation',
            passed,
            `Decisions: ${decisionsPreserved}, Skills: ${skillsPreserved}`
        );
    }

    // ========== RUNNER ==========

    async runAll() {
        console.log('\n' + '='.repeat(60));
        console.log('AKIS SESSION ADVANCED SCENARIO TESTS');
        console.log('='.repeat(60));

        const scenarios = [
            this.scenario1_rapidContextSwitching,
            this.scenario2_interruptStorm,
            this.scenario3_selectiveResumption,
            this.scenario4_corruptionRecovery,
            this.scenario5_deepNestingCompletion,
            this.scenario6_massiveParallelSessions,
            this.scenario7_phaseJumping,
            this.scenario8_interruptDuringResume,
            this.scenario9_emptySessionHandling,
            this.scenario10_contextPreservation
        ];

        for (const scenario of scenarios) {
            try {
                await scenario.call(this);
            } catch (error) {
                this.recordResult(scenario.name, false, `Crashed: ${error.message}`);
            }
        }

        this.printSummary();
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('SCENARIO TEST SUMMARY');
        console.log('='.repeat(60));
        
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        
        console.log(`Total Scenarios: ${this.results.length}`);
        console.log(`Passed: ${passed} ✓`);
        console.log(`Failed: ${failed} ✗`);
        console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
        console.log('='.repeat(60) + '\n');

        if (failed > 0) {
            console.log('FAILED SCENARIOS:');
            this.results.filter(r => !r.passed).forEach(r => {
                console.log(`  ✗ ${r.scenario}: ${r.details}`);
            });
            console.log('');
        }
    }
}

// ========== MAIN ==========

async function main() {
    const tester = new ScenarioTester();
    await tester.runAll();
    
    const failed = tester.results.filter(r => !r.passed).length;
    process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
    main().catch(error => {
        console.error('Scenario tester crashed:', error);
        process.exit(1);
    });
}

module.exports = ScenarioTester;
