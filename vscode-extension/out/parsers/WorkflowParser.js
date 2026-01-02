"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowParser = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class WorkflowParser {
    static parseWorkflowLog(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const filename = path.basename(filePath);
            // Parse filename for timestamp and task
            const filenameMatch = filename.match(/^(\d{4}-\d{2}-\d{2}_\d{6})_(.+)\.md$/);
            const timestamp = filenameMatch?.[1] || '';
            const task = filenameMatch?.[2]?.replace(/-/g, ' ') || '';
            // Extract metadata
            const agentMatch = content.match(/\*\*Agent\*\*:\s*(.+)/);
            const statusMatch = content.match(/\*\*Status\*\*:\s*(.+)/);
            const summaryMatch = content.match(/##\s+Summary\s+([\s\S]+?)(?=##|$)/);
            // Extract decisions
            const decisions = this.extractDecisions(content);
            // Extract tools
            const tools = this.extractTools(content);
            // Extract delegations
            const delegations = this.extractDelegations(content);
            // Extract modified files
            const files = this.extractFiles(content);
            // Extract phases
            const phases = this.extractPhases(content);
            // Extract skills
            const skills = this.extractSkills(content);
            return {
                filename,
                timestamp,
                task,
                agent: agentMatch?.[1]?.trim() || 'Unknown',
                status: statusMatch?.[1]?.trim() || 'Unknown',
                summary: summaryMatch?.[1]?.trim() || '',
                decisions,
                tools,
                delegations,
                files,
                phases,
                skills
            };
        }
        catch (error) {
            console.error(`Error parsing workflow log ${filePath}:`, error);
            return null;
        }
    }
    static extractDecisions(content) {
        const decisions = [];
        // New format: ### Key Decisions section
        const keyDecisionsSection = content.match(/###\s+Key Decisions([\s\S]+?)(?=###|##|$)/);
        if (keyDecisionsSection) {
            const lines = keyDecisionsSection[1].split('\n').filter(line => line.trim());
            lines.forEach(line => {
                if (line.match(/^\d+\.\s+/)) {
                    decisions.push({
                        description: line.replace(/^\d+\.\s*/, '').trim(),
                        rationale: ''
                    });
                }
            });
        }
        // Old format: [DECISIONS] section
        const decisionsSection = content.match(/\[DECISIONS\]([\s\S]+?)(?=\[|##|$)/);
        if (decisionsSection) {
            const lines = decisionsSection[1].split('\n').filter(line => line.trim());
            lines.forEach(line => {
                if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                    decisions.push({
                        description: line.replace(/^[-*]\s*/, '').trim(),
                        rationale: ''
                    });
                }
            });
        }
        // Also extract [DECISION] actions from Actions section
        const actionMatches = content.matchAll(/\*\*\[DECISION\]\*\*\s+([^\n]+)/g);
        for (const match of actionMatches) {
            decisions.push({
                description: match[1].trim(),
                rationale: ''
            });
        }
        return decisions;
    }
    static extractTools(content) {
        const tools = [];
        const toolsSection = content.match(/\[TOOLS_USED\]([\s\S]+?)(?=\[|##|$)/);
        if (toolsSection) {
            const lines = toolsSection[1].split('\n').filter(line => line.trim());
            lines.forEach(line => {
                const match = line.match(/[-*]\s*(.+?):\s*(.+)/);
                if (match) {
                    tools.push({
                        tool: match[1].trim(),
                        calls: 1,
                        purpose: match[2].trim()
                    });
                }
            });
        }
        return tools;
    }
    static extractDelegations(content) {
        const delegations = [];
        const delegationsSection = content.match(/\[DELEGATIONS\]([\s\S]+?)(?=\[|##|$)/);
        if (delegationsSection) {
            const lines = delegationsSection[1].split('\n').filter(line => line.trim());
            let currentDelegation = {};
            lines.forEach(line => {
                const agentMatch = line.match(/agent[=:]\s*(.+)/i);
                const taskMatch = line.match(/task[=:]\s*(.+)/i);
                const resultMatch = line.match(/result[=:]\s*(.+)/i);
                if (agentMatch) {
                    currentDelegation.agent = agentMatch[1].trim();
                }
                if (taskMatch) {
                    currentDelegation.task = taskMatch[1].trim();
                }
                if (resultMatch) {
                    currentDelegation.result = resultMatch[1].trim();
                    if (currentDelegation.agent && currentDelegation.task) {
                        delegations.push(currentDelegation);
                        currentDelegation = {};
                    }
                }
            });
        }
        return delegations;
    }
    static extractFiles(content) {
        const files = [];
        const filesSection = content.match(/##\s+Files?\s+Modified([\s\S]+?)(?=##|$)/i);
        if (filesSection) {
            const matches = filesSection[1].matchAll(/`([^`]+)`/g);
            for (const match of matches) {
                if (match[1].includes('/')) {
                    files.push(match[1]);
                }
            }
        }
        return [...new Set(files)]; // Remove duplicates
    }
    static extractPhases(content) {
        const phases = [];
        // New format: Phase Breakdown section
        const phaseBreakdownSection = content.match(/###\s+Phase Breakdown([\s\S]+?)(?=###|##|---*|$)/);
        if (phaseBreakdownSection) {
            const lines = phaseBreakdownSection[1].split('\n').filter(line => line.trim());
            lines.forEach(line => {
                const phaseMatch = line.match(/^-\s*\*\*([A-Z]+)\*\*:\s*(\w+)/);
                if (phaseMatch) {
                    phases.push({
                        phase: phaseMatch[1],
                        progress: '0/0',
                        timestamp: phaseMatch[2]
                    });
                }
            });
        }
        // Old format: [PHASE:] emissions
        const phaseMatches = content.matchAll(/\[PHASE:\s*([A-Z]+)\s*\|?\s*progress=(\d+\/\d+)?\]/g);
        for (const match of phaseMatches) {
            phases.push({
                phase: match[1],
                progress: match[2] || '0/0'
            });
        }
        return phases;
    }
    static extractSkills(content) {
        const skills = [];
        // Look for [AKIS] emissions with skills
        const akisMatches = content.matchAll(/\[AKIS\].*?skills=([^|\]]+)/g);
        for (const match of akisMatches) {
            const skillList = match[1].split(',').map(s => s.trim()).filter(s => s && s !== '[]');
            skills.push(...skillList);
        }
        // New format: Skills Used section
        const skillsUsedSection = content.match(/###\s+Skills Used([\s\S]+?)(?=###|##|---*|$)/);
        if (skillsUsedSection) {
            const lines = skillsUsedSection[1].split('\n').filter(line => line.trim());
            lines.forEach(line => {
                if (line.match(/^-\s*\*\*(.+?)\*\*/)) {
                    const skillMatch = line.match(/^-\s*\*\*(.+?)\*\*/);
                    if (skillMatch) {
                        skills.push(skillMatch[1].trim());
                    }
                }
            });
        }
        // Old format: [SKILLS] section
        const skillsSection = content.match(/\[SKILLS\]([\s\S]+?)(?=\[|##|$)/i);
        if (skillsSection) {
            const lines = skillsSection[1].split('\n').filter(line => line.trim());
            lines.forEach(line => {
                if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                    skills.push(line.replace(/^[-*]\s*/, '').trim());
                }
            });
        }
        return [...new Set(skills)]; // Remove duplicates
    }
    static parseAllWorkflowLogs(workflowDir) {
        const logs = [];
        try {
            const files = fs.readdirSync(workflowDir)
                .filter(f => f.endsWith('.md') && f !== 'README.md')
                .sort()
                .reverse(); // Most recent first
            for (const file of files) {
                const log = this.parseWorkflowLog(path.join(workflowDir, file));
                if (log) {
                    logs.push(log);
                }
            }
        }
        catch (error) {
            console.error(`Error reading workflow directory ${workflowDir}:`, error);
        }
        return logs;
    }
}
exports.WorkflowParser = WorkflowParser;
//# sourceMappingURL=WorkflowParser.js.map