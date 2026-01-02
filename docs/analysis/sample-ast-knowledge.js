#!/usr/bin/env node
/**
 * AST-Based Knowledge Extractor for NOP Project
 * 
 * Replaces manual project_knowledge.json with dynamic extraction.
 * Run: node .github/scripts/ast-knowledge.js > .ast-knowledge.json
 */

const fs = require('fs');
const path = require('path');

// Simple AST parsing without external dependencies
// For production, use ts-morph or @babel/parser

const FRONTEND_SRC = path.join(__dirname, '../../frontend/src');
const BACKEND_SRC = path.join(__dirname, '../../backend/app');

function extractKnowledge() {
  const knowledge = {
    generatedAt: new Date().toISOString(),
    version: 'AST-based v1.0',
    frontend: {
      pages: [],
      components: [],
      stores: [],
      services: [],
      hooks: []
    },
    backend: {
      endpoints: [],
      services: [],
      models: [],
      schemas: []
    },
    dependencies: {}
  };

  // Extract frontend knowledge
  if (fs.existsSync(FRONTEND_SRC)) {
    extractFrontendKnowledge(FRONTEND_SRC, knowledge);
  }

  // Extract backend knowledge
  if (fs.existsSync(BACKEND_SRC)) {
    extractBackendKnowledge(BACKEND_SRC, knowledge);
  }

  return knowledge;
}

function extractFrontendKnowledge(srcDir, knowledge) {
  const pagesDir = path.join(srcDir, 'pages');
  const componentsDir = path.join(srcDir, 'components');
  const storesDir = path.join(srcDir, 'stores');
  const servicesDir = path.join(srcDir, 'services');

  // Extract pages
  if (fs.existsSync(pagesDir)) {
    fs.readdirSync(pagesDir)
      .filter(f => f.endsWith('.tsx'))
      .forEach(file => {
        const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
        knowledge.frontend.pages.push({
          name: file.replace('.tsx', ''),
          file: `frontend/src/pages/${file}`,
          exports: extractExports(content),
          imports: extractImports(content),
          hooks: extractHooksUsed(content)
        });
      });
  }

  // Extract components
  if (fs.existsSync(componentsDir)) {
    walkDir(componentsDir).forEach(file => {
      if (file.endsWith('.tsx')) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(path.join(__dirname, '../..'), file);
        knowledge.frontend.components.push({
          name: path.basename(file, '.tsx'),
          file: relativePath,
          exports: extractExports(content),
          props: extractPropsInterface(content)
        });
      }
    });
  }

  // Extract stores
  if (fs.existsSync(storesDir)) {
    fs.readdirSync(storesDir)
      .filter(f => f.endsWith('.ts'))
      .forEach(file => {
        const content = fs.readFileSync(path.join(storesDir, file), 'utf-8');
        knowledge.frontend.stores.push({
          name: file.replace('.ts', ''),
          file: `frontend/src/stores/${file}`,
          stateFields: extractZustandState(content),
          actions: extractZustandActions(content)
        });
      });
  }

  // Extract services
  if (fs.existsSync(servicesDir)) {
    fs.readdirSync(servicesDir)
      .filter(f => f.endsWith('.ts'))
      .forEach(file => {
        const content = fs.readFileSync(path.join(servicesDir, file), 'utf-8');
        knowledge.frontend.services.push({
          name: file.replace('.ts', ''),
          file: `frontend/src/services/${file}`,
          functions: extractFunctions(content)
        });
      });
  }
}

function extractBackendKnowledge(srcDir, knowledge) {
  const apiDir = path.join(srcDir, 'api');
  const servicesDir = path.join(srcDir, 'services');
  const modelsDir = path.join(srcDir, 'models');
  const schemasDir = path.join(srcDir, 'schemas');

  // Extract API endpoints
  if (fs.existsSync(apiDir)) {
    walkDir(apiDir).forEach(file => {
      if (file.endsWith('.py')) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(path.join(__dirname, '../..'), file);
        const endpoints = extractPythonEndpoints(content);
        if (endpoints.length > 0) {
          knowledge.backend.endpoints.push({
            file: relativePath,
            routes: endpoints
          });
        }
      }
    });
  }

  // Extract services
  if (fs.existsSync(servicesDir)) {
    fs.readdirSync(servicesDir)
      .filter(f => f.endsWith('.py') && !f.startsWith('__'))
      .forEach(file => {
        const content = fs.readFileSync(path.join(servicesDir, file), 'utf-8');
        knowledge.backend.services.push({
          name: file.replace('.py', ''),
          file: `backend/app/services/${file}`,
          classes: extractPythonClasses(content),
          functions: extractPythonFunctions(content)
        });
      });
  }

  // Extract models
  if (fs.existsSync(modelsDir)) {
    fs.readdirSync(modelsDir)
      .filter(f => f.endsWith('.py') && !f.startsWith('__'))
      .forEach(file => {
        const content = fs.readFileSync(path.join(modelsDir, file), 'utf-8');
        knowledge.backend.models.push({
          name: file.replace('.py', ''),
          file: `backend/app/models/${file}`,
          classes: extractSQLAlchemyModels(content)
        });
      });
  }

  // Extract schemas
  if (fs.existsSync(schemasDir) && fs.statSync(schemasDir).isDirectory()) {
    const schemaFiles = fs.readdirSync(schemasDir).filter(f => f.endsWith('.py'));
    
    schemaFiles.forEach(file => {
      const content = fs.readFileSync(path.join(schemasDir, file), 'utf-8');
      knowledge.backend.schemas.push({
        name: file.replace('.py', ''),
        file: `backend/app/schemas/${file}`,
        models: extractPydanticModels(content)
      });
    });
  }
}

// Helper functions for parsing

function walkDir(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

function extractExports(content) {
  const exports = [];
  const exportRegex = /export\s+(?:const|function|class|interface|type)\s+(\w+)/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  const defaultExport = content.match(/export\s+default\s+(\w+)/);
  if (defaultExport) exports.push(`default:${defaultExport[1]}`);
  return exports;
}

function extractImports(content) {
  const imports = [];
  const importRegex = /import\s+.*from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function extractHooksUsed(content) {
  const hooks = [];
  const hookRegex = /\b(use[A-Z]\w+)\s*\(/g;
  let match;
  const seen = new Set();
  while ((match = hookRegex.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      hooks.push(match[1]);
      seen.add(match[1]);
    }
  }
  return hooks;
}

function extractPropsInterface(content) {
  const propsMatch = content.match(/interface\s+(\w+Props)\s*\{([^}]+)\}/);
  if (propsMatch) {
    const props = propsMatch[2]
      .split(';')
      .filter(p => p.trim())
      .map(p => p.trim().split(':')[0].trim())
      .filter(p => p);
    return { name: propsMatch[1], fields: props };
  }
  return null;
}

function extractZustandState(content) {
  const stateMatch = content.match(/interface\s+\w+State\s*\{([^}]+)\}/);
  if (stateMatch) {
    return stateMatch[1]
      .split(';')
      .filter(p => p.trim())
      .map(p => p.trim().split(':')[0].trim())
      .filter(p => p && !p.includes('('));
  }
  return [];
}

function extractZustandActions(content) {
  const actions = [];
  const actionRegex = /(\w+):\s*\([^)]*\)\s*=>/g;
  let match;
  while ((match = actionRegex.exec(content)) !== null) {
    actions.push(match[1]);
  }
  return actions;
}

function extractFunctions(content) {
  const funcs = [];
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
  const arrowRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/g;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    funcs.push(match[1]);
  }
  while ((match = arrowRegex.exec(content)) !== null) {
    funcs.push(match[1]);
  }
  return funcs;
}

function extractPythonEndpoints(content) {
  const endpoints = [];
  const routeRegex = /@router\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/g;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    endpoints.push({ method: match[1].toUpperCase(), path: match[2] });
  }
  return endpoints;
}

function extractPythonClasses(content) {
  const classes = [];
  const classRegex = /class\s+(\w+)/g;
  let match;
  while ((match = classRegex.exec(content)) !== null) {
    classes.push(match[1]);
  }
  return classes;
}

function extractPythonFunctions(content) {
  const funcs = [];
  const funcRegex = /(?:async\s+)?def\s+(\w+)\s*\(/g;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    if (!match[1].startsWith('_')) { // Skip private methods
      funcs.push(match[1]);
    }
  }
  return funcs;
}

function extractSQLAlchemyModels(content) {
  const models = [];
  const modelRegex = /class\s+(\w+)\s*\([^)]*Base[^)]*\)/g;
  let match;
  while ((match = modelRegex.exec(content)) !== null) {
    models.push(match[1]);
  }
  return models;
}

function extractPydanticModels(content) {
  const models = [];
  const modelRegex = /class\s+(\w+)\s*\([^)]*BaseModel[^)]*\)/g;
  let match;
  while ((match = modelRegex.exec(content)) !== null) {
    models.push(match[1]);
  }
  return models;
}

// Run extraction
const knowledge = extractKnowledge();

// Output as formatted JSON
console.log(JSON.stringify(knowledge, null, 2));
