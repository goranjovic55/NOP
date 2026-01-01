const fs = require('fs');

const sessionData = JSON.parse(fs.readFileSync('.akis-session.json', 'utf-8'));
console.log('Raw data:', JSON.stringify(sessionData, null, 2));

// Simulate parser logic
let session = sessionData;
if (sessionData.sessions && Array.isArray(sessionData.sessions)) {
    if (sessionData.currentSessionId) {
        session = sessionData.sessions.find(s => s.id === sessionData.currentSessionId) || sessionData.sessions[sessionData.sessions.length - 1];
    } else {
        session = sessionData.sessions[sessionData.sessions.length - 1];
    }
}

console.log('\nParsed session:');
console.log('  Task:', session.task);
console.log('  Agent:', session.agent);
console.log('  Phase:', session.phase);
console.log('  Status:', session.status);
console.log('  Progress:', session.progress);
console.log('  Decisions:', session.decisions?.length || 0);
console.log('  Emissions:', session.emissions?.length || 0);
