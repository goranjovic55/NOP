#!/usr/bin/env node
/**
 * AKIS Response Validator
 * 
 * Validates that agent responses contain required AKIS headers
 * Usage: node validate-response.js <response_text>
 */

const SessionTracker = require('./session-tracker');

class ResponseValidator {
    constructor() {
        this.tracker = new SessionTracker();
    }

    /**
     * Validate AKIS response format
     */
    validate(response) {
        const hasSession = response.includes('[SESSION:');
        const hasAKIS = response.includes('[AKIS]');
        const hasPhase = response.includes('[PHASE:');
        const hasComplete = response.includes('[COMPLETE]');

        const errors = [];
        const warnings = [];

        if (!hasSession) {
            errors.push('Missing [SESSION: task] @Agent header');
        }

        if (!hasAKIS) {
            warnings.push('Missing [AKIS] entities/skills/patterns header');
        }

        if (!hasPhase && !hasComplete) {
            warnings.push('No [PHASE:] or [COMPLETE] markers found');
        }

        const session = this.tracker.status();
        if (!session.active) {
            errors.push('No active session - call session-tracker.js start first');
        }

        return {
            valid: errors.length === 0,
            hasSession,
            hasAKIS,
            hasPhase,
            hasComplete,
            errors,
            warnings,
            session: session.active ? session : null
        };
    }

    /**
     * Check if session tracker is available
     */
    checkSessionTracker() {
        try {
            const session = this.tracker.status();
            return {
                available: true,
                session
            };
        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const validator = new ResponseValidator();

    if (args.length === 0) {
        console.log(`
AKIS Response Validator

Usage:
  node validate-response.js check         - Check session tracker availability
  node validate-response.js <response>    - Validate response format

Example:
  node validate-response.js "[SESSION: task] @Agent [AKIS] entities=5"
        `);
        process.exit(0);
    }

    if (args[0] === 'check') {
        const status = validator.checkSessionTracker();
        console.log(JSON.stringify(status, null, 2));
        process.exit(status.available ? 0 : 1);
    }

    const response = args.join(' ');
    const result = validator.validate(response);
    
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.valid) {
        process.exit(1);
    }
}

module.exports = ResponseValidator;
