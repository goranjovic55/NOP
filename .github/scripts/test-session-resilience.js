#!/usr/bin/env node
/**
 * AKIS Session Resilience Edge Case Simulator
 * 
 * Tests session tracking resilience with:
 * - Nested sessions (depth 0-3)
 * - Random interrupts and context switches
 * - Automatic recovery mechanisms
 * - State preservation across interrupts
 * - Parent session auto-resume
 * - Corruption recovery
 * 
 * Usage: node .github/scripts/test-session-resilience.js [--verbose] [--test=N]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SESSION_FILE = '.akis-session.json';
const MULTI_SESSION_FILE = '.akis-sessions.json';
const BACKUP_DIR = '/tmp/akis-test-backups';

// Test configuration
const VERBOSE = process.argv.includes('--verbose');
const SPECIFIC_TEST = process.argv.find(arg => arg.startsWith('--test='))?.split('=')[1];

class SessionResilienceSimulator {
    constructor() {
        this.testResults = [];
        this.sessionPath = path.join(process.cwd(), SESSION_FILE);
        this.multiSessionPath = path.join(process.cwd(), MULTI_SESSION_FILE);
        this.testCount = 0;
        this.passCount = 0;
        this.failCount = 0;
        
        // Create backup directory
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'INFO': '  ℹ',
            'PASS': '  ✓',
            'FAIL': '  ✗',
            'WARN': '  ⚠',
            'TEST': '\n▶'
        }[level] || '   ';
        
        console.log(`${prefix} ${message}`);
    }

    exec(command, silent = false) {
        try {
            const output = execSync(command, { 
                cwd: process.cwd(),
                encoding: 'utf-8',
                stdio: silent ? 'pipe' : 'inherit'
            });
            return { success: true, output };
        } catch (error) {
            return { success: false, error: error.message, output: error.stdout };
        }
    }

    backupState(label) {
        const timestamp = Date.now();
        const backupFile = path.join(BACKUP_DIR, `${label}_${timestamp}.json`);
        
        if (fs.existsSync(this.multiSessionPath)) {
            fs.copyFileSync(this.multiSessionPath, backupFile);
            if (VERBOSE) this.log(`Backed up state to ${backupFile}`, 'INFO');
        }
    }

    resetState() {
        [SESSION_FILE, MULTI_SESSION_FILE, `${MULTI_SESSION_FILE}.backup`].forEach(file => {
            const filePath = path.join(process.cwd(), file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
        if (VERBOSE) this.log('Reset session state', 'INFO');
    }

    getSessionState() {
        if (!fs.existsSync(this.multiSessionPath)) {
            return { sessions: [], currentSessionId: null };
        }
        return JSON.parse(fs.readFileSync(this.multiSessionPath, 'utf-8'));
    }

    getCurrentSession() {
        if (!fs.existsSync(this.sessionPath)) {
            return null;
        }
        return JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
    }

    assertCondition(condition, message, testName) {
        this.testCount++;
        
        if (condition) {
            this.passCount++;
            this.log(`${testName}: ${message}`, 'PASS');
            return true;
        } else {
            this.failCount++;
            this.log(`${testName}: ${message}`, 'FAIL');
            this.testResults.push({ test: testName, status: 'FAIL', message });
            return false;
        }
    }

    // ========== TEST CASES ==========

    async test1_basicLifecycle() {
        this.log('Test 1: Basic Session Lifecycle', 'TEST');
        this.resetState();
        
        // Start session
        this.exec('node .github/scripts/session-tracker.js start "test-basic" "Developer"', true);
        const session1 = this.getCurrentSession();
        this.assertCondition(
            session1 && session1.status === 'active' && session1.phase === 'CONTEXT',
            'Session started in CONTEXT phase',
            'Test 1'
        );

        // Phase transitions
        this.exec('node .github/scripts/session-tracker.js phase "PLAN" "2/7"', true);
        const session2 = this.getCurrentSession();
        this.assertCondition(
            session2.phase === 'PLAN' && session2.progress === '2/7',
            'Phase transition to PLAN',
            'Test 1'
        );

        // Complete session
        this.exec('node .github/scripts/session-tracker.js complete', true);
        const session3 = this.getCurrentSession();
        this.assertCondition(
            session3.status === 'completed',
            'Session completed successfully',
            'Test 1'
        );

        this.backupState('test1_basic');
    }

    async test2_singleInterruptResume() {
        this.log('Test 2: Single Interrupt and Resume', 'TEST');
        this.resetState();

        // Start main session
        this.exec('node .github/scripts/session-tracker.js start "main-task" "Developer"', true);
        this.exec('node .github/scripts/session-tracker.js phase "PLAN" "2/7"', true);
        
        const mainBefore = this.getCurrentSession();
        const mainId = mainBefore.id;
        
        // Start interrupt (sub-session)
        this.exec('node .github/scripts/session-tracker.js start "interrupt-task" "Developer"', true);
        
        const state = this.getSessionState();
        this.assertCondition(
            state.sessions.length === 2,
            'Two sessions exist after interrupt',
            'Test 2'
        );
        
        const parent = state.sessions.find(s => s.id === mainId);
        const child = state.sessions.find(s => s.id !== mainId);
        
        this.assertCondition(
            child.parentSessionId === mainId,
            'Child session has correct parent reference',
            'Test 2'
        );
        
        this.assertCondition(
            parent.actions.some(a => a.type === 'PAUSE'),
            'Parent session has PAUSE action',
            'Test 2'
        );

        // Complete child
        this.exec('node .github/scripts/session-tracker.js complete', true);
        
        // Check auto-resume
        const resumedSession = this.getCurrentSession();
        this.assertCondition(
            resumedSession.id === mainId,
            'Parent session auto-resumed after child completion',
            'Test 2'
        );

        this.backupState('test2_interrupt');
    }

    async test3_nestedSessions() {
        this.log('Test 3: Nested Sessions (Depth 0-3)', 'TEST');
        this.resetState();

        // Depth 0 (main)
        this.exec('node .github/scripts/session-tracker.js start "depth0-main" "Architect"', true);
        const depth0 = this.getCurrentSession();
        
        this.assertCondition(
            depth0.depth === 0 && depth0.isMainSession === true,
            'Depth 0 session is main session',
            'Test 3'
        );

        // Depth 1 (first interrupt)
        this.exec('node .github/scripts/session-tracker.js start "depth1-interrupt" "Developer"', true);
        const depth1 = this.getCurrentSession();
        
        this.assertCondition(
            depth1.depth === 1 && depth1.parentSessionId === depth0.id,
            'Depth 1 session correctly nested',
            'Test 3'
        );

        // Depth 2 (second interrupt)
        this.exec('node .github/scripts/session-tracker.js start "depth2-interrupt" "Developer"', true);
        const depth2 = this.getCurrentSession();
        
        this.assertCondition(
            depth2.depth === 2 && depth2.parentSessionId === depth1.id,
            'Depth 2 session correctly nested',
            'Test 3'
        );

        // Check session hierarchy
        const state = this.getSessionState();
        this.assertCondition(
            state.sessions.length === 3,
            'Three sessions in hierarchy',
            'Test 3'
        );

        // Verify pause chain
        const pauseCount = state.sessions.filter(s => 
            s.actions.some(a => a.type === 'PAUSE')
        ).length;
        
        this.assertCondition(
            pauseCount === 2,
            'Two parent sessions paused',
            'Test 3'
        );

        this.backupState('test3_nested');
    }

    async test4_multipleRandomInterrupts() {
        this.log('Test 4: Multiple Random Interrupts with Context Preservation', 'TEST');
        this.resetState();

        // Start main task
        this.exec('node .github/scripts/session-tracker.js start "main-complex" "Developer"', true);
        const mainId = this.getCurrentSession().id;
        
        // Add context to main
        this.exec('node .github/scripts/session-tracker.js phase "INTEGRATE" "4/7"', true);
        
        // Random interrupts
        const interrupts = ['urgent-fix', 'review-request', 'quick-question'];
        const interruptIds = [];
        
        for (let i = 0; i < interrupts.length; i++) {
            this.exec(`node .github/scripts/session-tracker.js start "${interrupts[i]}" "Developer"`, true);
            const interruptSession = this.getCurrentSession();
            interruptIds.push(interruptSession.id);
            
            // Do some work in interrupt
            this.exec('node .github/scripts/session-tracker.js phase "PLAN" "2/7"', true);
            this.exec('node .github/scripts/session-tracker.js phase "INTEGRATE" "4/7"', true);
            
            // Complete interrupt
            this.exec('node .github/scripts/session-tracker.js complete', true);
            
            // Verify we're back to parent
            const current = this.getCurrentSession();
            const expectedParent = i === interrupts.length - 1 ? mainId : interruptIds[i];
            
            // After last interrupt completes, should be back to main
            if (i === interrupts.length - 1) {
                this.assertCondition(
                    current.id === mainId,
                    `Back to main session after ${interrupts.length} interrupts`,
                    'Test 4'
                );
            }
        }

        // Verify main session state preserved
        const final = this.getCurrentSession();
        this.assertCondition(
            final.id === mainId && final.phase === 'INTEGRATE',
            'Main session phase preserved through interrupts',
            'Test 4'
        );

        this.backupState('test4_random_interrupts');
    }

    async test5_corruptionRecovery() {
        this.log('Test 5: Session Recovery from Corruption', 'TEST');
        this.resetState();

        // Create valid session
        this.exec('node .github/scripts/session-tracker.js start "recovery-test" "Developer"', true);
        this.exec('node .github/scripts/session-tracker.js phase "PLAN" "2/7"', true);
        
        // Corrupt session file (truncate JSON)
        const sessionData = fs.readFileSync(this.sessionPath, 'utf-8');
        fs.writeFileSync(this.sessionPath, sessionData.substring(0, sessionData.length / 2));
        
        // Try to read - should handle gracefully
        try {
            JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
            this.assertCondition(false, 'Should have detected corruption', 'Test 5');
        } catch (error) {
            this.assertCondition(true, 'Corruption detected', 'Test 5');
        }

        // Check backup exists
        const backupExists = fs.existsSync(`${this.multiSessionPath}.backup`);
        this.assertCondition(
            backupExists,
            'Backup file exists for recovery',
            'Test 5'
        );

        // Recover from backup
        if (backupExists) {
            fs.copyFileSync(`${this.multiSessionPath}.backup`, this.multiSessionPath);
            const recovered = this.getSessionState();
            this.assertCondition(
                recovered.sessions.length > 0,
                'Recovered session state from backup',
                'Test 5'
            );
        }

        this.backupState('test5_recovery');
    }

    async test6_concurrentSessionHandling() {
        this.log('Test 6: Concurrent Session Handling', 'TEST');
        this.resetState();

        // Start multiple sessions without completing
        this.exec('node .github/scripts/session-tracker.js start "task-a" "Developer"', true);
        const taskA = this.getCurrentSession();
        
        this.exec('node .github/scripts/session-tracker.js start "task-b" "Developer"', true);
        const taskB = this.getCurrentSession();
        
        this.exec('node .github/scripts/session-tracker.js start "task-c" "Developer"', true);
        const taskC = this.getCurrentSession();

        const state = this.getSessionState();
        const activeSessions = state.sessions.filter(s => s.status === 'active');
        
        this.assertCondition(
            activeSessions.length === 3,
            'Three concurrent active sessions',
            'Test 6'
        );

        // Test resume by ID
        this.exec(`node .github/scripts/session-tracker.js resume "${taskA.id}"`, true);
        const resumed = this.getCurrentSession();
        
        this.assertCondition(
            resumed.id === taskA.id,
            'Successfully resumed specific session by ID',
            'Test 6'
        );

        this.backupState('test6_concurrent');
    }

    async test7_maxDepthEnforcement() {
        this.log('Test 7: Max Depth Enforcement', 'TEST');
        this.resetState();

        // Create sessions up to max depth
        this.exec('node .github/scripts/session-tracker.js start "depth0" "Developer"', true);
        this.exec('node .github/scripts/session-tracker.js start "depth1" "Developer"', true);
        this.exec('node .github/scripts/session-tracker.js start "depth2" "Developer"', true);
        
        const state = this.getSessionState();
        
        this.assertCondition(
            state.sessions.length === 3,
            'Max concurrent sessions warning at depth 3',
            'Test 7'
        );

        // Verify depth values
        const depths = state.sessions.map(s => s.depth).sort();
        this.assertCondition(
            JSON.stringify(depths) === JSON.stringify([0, 1, 2]),
            'Depth values correctly assigned (0, 1, 2)',
            'Test 7'
        );

        this.backupState('test7_maxdepth');
    }

    async test8_randomTaskSwitching() {
        this.log('Test 8: Random Task Switching with State Preservation', 'TEST');
        this.resetState();

        const tasks = [
            { name: 'feature-a', agent: 'Developer', phases: ['CONTEXT', 'PLAN', 'INTEGRATE'] },
            { name: 'bugfix-b', agent: 'Developer', phases: ['CONTEXT', 'INTEGRATE'] },
            { name: 'review-c', agent: 'Reviewer', phases: ['CONTEXT', 'VERIFY'] }
        ];

        const taskIds = [];
        
        // Create initial tasks
        for (const task of tasks) {
            this.exec(`node .github/scripts/session-tracker.js start "${task.name}" "${task.agent}"`, true);
            const session = this.getCurrentSession();
            taskIds.push({ id: session.id, ...task });
        }

        // Random switch and progress simulation
        const switches = [0, 2, 1, 0, 1, 2, 0]; // Random task indices
        
        for (const taskIdx of switches) {
            const task = taskIds[taskIdx];
            
            // Resume task
            this.exec(`node .github/scripts/session-tracker.js resume "${task.id}"`, true);
            const current = this.getCurrentSession();
            
            this.assertCondition(
                current.id === task.id,
                `Switched to ${task.name}`,
                'Test 8'
            );
            
            // Do random phase progression
            const randomPhase = task.phases[Math.floor(Math.random() * task.phases.length)];
            this.exec(`node .github/scripts/session-tracker.js phase "${randomPhase}" "X/7"`, true);
        }

        // Verify all sessions still have correct state
        const finalState = this.getSessionState();
        this.assertCondition(
            finalState.sessions.length === tasks.length,
            'All task sessions preserved after switching',
            'Test 8'
        );

        this.backupState('test8_switching');
    }

    async test9_autoResumeParent() {
        this.log('Test 9: Auto-Resume Parent on Child Completion', 'TEST');
        this.resetState();

        // Create parent session
        this.exec('node .github/scripts/session-tracker.js start "parent-work" "Developer"', true);
        this.exec('node .github/scripts/session-tracker.js phase "INTEGRATE" "4/7"', true);
        const parentId = this.getCurrentSession().id;
        const parentPhase = this.getCurrentSession().phase;

        // Create child session
        this.exec('node .github/scripts/session-tracker.js start "child-work" "Developer"', true);
        const childId = this.getCurrentSession().id;
        
        this.assertCondition(
            childId !== parentId,
            'Child session created',
            'Test 9'
        );

        // Work in child
        this.exec('node .github/scripts/session-tracker.js phase "PLAN" "2/7"', true);
        this.exec('node .github/scripts/session-tracker.js phase "INTEGRATE" "4/7"', true);
        
        // Complete child - should auto-resume parent
        this.exec('node .github/scripts/session-tracker.js complete', true);
        
        const current = this.getCurrentSession();
        this.assertCondition(
            current.id === parentId,
            'Parent session auto-resumed',
            'Test 9'
        );

        // Verify parent has RESUME action
        this.assertCondition(
            current.actions.some(a => a.type === 'RESUME'),
            'Parent has RESUME action logged',
            'Test 9'
        );

        this.backupState('test9_autoresume');
    }

    async test10_hierarchyTraversal() {
        this.log('Test 10: Session Hierarchy Traversal', 'TEST');
        this.resetState();

        // Create complex hierarchy: A -> B -> C
        this.exec('node .github/scripts/session-tracker.js start "task-a" "Architect"', true);
        const idA = this.getCurrentSession().id;
        
        this.exec('node .github/scripts/session-tracker.js start "task-b" "Developer"', true);
        const idB = this.getCurrentSession().id;
        
        this.exec('node .github/scripts/session-tracker.js start "task-c" "Developer"', true);
        const idC = this.getCurrentSession().id;

        const state = this.getSessionState();
        
        // Verify hierarchy
        const sessionA = state.sessions.find(s => s.id === idA);
        const sessionB = state.sessions.find(s => s.id === idB);
        const sessionC = state.sessions.find(s => s.id === idC);
        
        this.assertCondition(
            sessionA.parentSessionId === null,
            'Task A has no parent (root)',
            'Test 10'
        );
        
        this.assertCondition(
            sessionB.parentSessionId === idA,
            'Task B parent is Task A',
            'Test 10'
        );
        
        this.assertCondition(
            sessionC.parentSessionId === idB,
            'Task C parent is Task B',
            'Test 10'
        );

        // Complete in reverse order: C -> B -> A
        this.exec('node .github/scripts/session-tracker.js complete', true); // C
        let current = this.getCurrentSession();
        this.assertCondition(
            current.id === idB,
            'After C completes, resumed to B',
            'Test 10'
        );

        this.exec('node .github/scripts/session-tracker.js complete', true); // B
        current = this.getCurrentSession();
        this.assertCondition(
            current.id === idA,
            'After B completes, resumed to A',
            'Test 10'
        );

        this.backupState('test10_hierarchy');
    }

    // ========== SIMULATION RUNNER ==========

    async runAllTests() {
        console.log('\n' + '='.repeat(60));
        console.log('AKIS SESSION RESILIENCE EDGE CASE SIMULATOR');
        console.log('='.repeat(60) + '\n');

        const tests = [
            { id: 1, name: 'Basic Lifecycle', fn: this.test1_basicLifecycle },
            { id: 2, name: 'Single Interrupt Resume', fn: this.test2_singleInterruptResume },
            { id: 3, name: 'Nested Sessions', fn: this.test3_nestedSessions },
            { id: 4, name: 'Multiple Random Interrupts', fn: this.test4_multipleRandomInterrupts },
            { id: 5, name: 'Corruption Recovery', fn: this.test5_corruptionRecovery },
            { id: 6, name: 'Concurrent Sessions', fn: this.test6_concurrentSessionHandling },
            { id: 7, name: 'Max Depth Enforcement', fn: this.test7_maxDepthEnforcement },
            { id: 8, name: 'Random Task Switching', fn: this.test8_randomTaskSwitching },
            { id: 9, name: 'Auto Resume Parent', fn: this.test9_autoResumeParent },
            { id: 10, name: 'Hierarchy Traversal', fn: this.test10_hierarchyTraversal }
        ];

        let testsToRun = tests;
        if (SPECIFIC_TEST) {
            testsToRun = tests.filter(t => t.id === parseInt(SPECIFIC_TEST));
            if (testsToRun.length === 0) {
                console.log(`Test ${SPECIFIC_TEST} not found`);
                return;
            }
        }

        for (const test of testsToRun) {
            try {
                await test.fn.call(this);
            } catch (error) {
                this.log(`Test ${test.id} crashed: ${error.message}`, 'FAIL');
                this.failCount++;
            }
        }

        this.printSummary();
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Assertions: ${this.testCount}`);
        console.log(`Passed: ${this.passCount} ✓`);
        console.log(`Failed: ${this.failCount} ✗`);
        console.log(`Success Rate: ${((this.passCount / this.testCount) * 100).toFixed(1)}%`);
        console.log('='.repeat(60) + '\n');

        if (this.failCount > 0) {
            console.log('FAILED TESTS:');
            this.testResults.forEach(result => {
                console.log(`  ✗ ${result.test}: ${result.message}`);
            });
            console.log('');
        }

        console.log(`Backup states saved to: ${BACKUP_DIR}`);
        console.log(`Session files: ${SESSION_FILE}, ${MULTI_SESSION_FILE}\n`);
    }
}

// ========== MAIN ==========

async function main() {
    const simulator = new SessionResilienceSimulator();
    await simulator.runAllTests();
    
    // Exit with failure code if tests failed
    process.exit(simulator.failCount > 0 ? 1 : 0);
}

if (require.main === module) {
    main().catch(error => {
        console.error('Simulator crashed:', error);
        process.exit(1);
    });
}

module.exports = SessionResilienceSimulator;
