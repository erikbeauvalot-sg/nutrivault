#!/usr/bin/env node

/**
 * NutriVault - Automated Todo List Updater Agent
 *
 * This script automatically updates PROJECT_TODO.md based on project progress.
 * It checks for completed tasks by examining the codebase and updates the todo list.
 *
 * Usage:
 *   node utils/update-todo.js
 *   npm run update-todo
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const TODO_FILE = path.join(ROOT_DIR, 'PROJECT_TODO.md');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

/**
 * Check if a file or directory exists
 */
function exists(filePath) {
  try {
    return fs.existsSync(path.join(ROOT_DIR, filePath));
  } catch (err) {
    return false;
  }
}

/**
 * Count files in a directory matching a pattern
 */
function countFiles(dirPath, pattern = null) {
  try {
    const fullPath = path.join(ROOT_DIR, dirPath);
    if (!fs.existsSync(fullPath)) return 0;

    const files = fs.readdirSync(fullPath);
    if (!pattern) return files.length;

    return files.filter(f => pattern.test(f)).length;
  } catch (err) {
    return 0;
  }
}

/**
 * Check if file contains specific content
 */
function fileContains(filePath, searchString) {
  try {
    const content = fs.readFileSync(path.join(ROOT_DIR, filePath), 'utf8');
    return content.includes(searchString);
  } catch (err) {
    return false;
  }
}

/**
 * Task checker functions
 */
const taskCheckers = {
  // Phase 1: Foundation
  'Phase 1: Foundation - Database setup complete': () => {
    return countFiles('migrations') >= 11 &&
           countFiles('seeders') >= 4 &&
           countFiles('models') >= 12; // 11 models + index.js
  },

  'Phase 1: Foundation - DevOps infrastructure complete': () => {
    return exists('.gitignore') &&
           exists('docker-compose.yml') &&
           exists('backend/.env.example') &&
           exists('README.md');
  },

  // Phase 2: Core API Development
  'Phase 2: Implement user management API endpoints': () => {
    return exists('backend/src/routes/users.routes.js') &&
           exists('backend/src/controllers/user.controller.js');
  },

  'Phase 2: Implement patient management API endpoints': () => {
    return exists('backend/src/routes/patients.routes.js') &&
           exists('backend/src/controllers/patient.controller.js');
  },

  'Phase 2: Implement visit management API endpoints': () => {
    return exists('backend/src/routes/visits.routes.js') &&
           exists('backend/src/controllers/visit.controller.js');
  },

  'Phase 2: Implement billing API endpoints': () => {
    return exists('backend/src/routes/billing.routes.js') &&
           exists('backend/src/controllers/billing.controller.js');
  },

  'Phase 2: Add input validation to all endpoints': () => {
    return exists('backend/src/middleware/validation.js') ||
           exists('backend/src/validators');
  },

  'Phase 2: Implement comprehensive error handling': () => {
    return exists('backend/src/middleware/errorHandler.js');
  },

  'Phase 2: Add API documentation (Swagger)': () => {
    return exists('backend/src/config/swagger.js') ||
           fileContains('backend/package.json', 'swagger');
  },

  'Phase 2: Write unit tests for business logic': () => {
    return countFiles('backend/tests/services') >= 6;
  },

  // Phase 3: Advanced Features
  'Phase 3: Implement API key authentication': () => {
    return exists('backend/src/middleware/apiKey.js') ||
           fileContains('backend/src/middleware/auth.js', 'apiKey');
  },

  'Phase 3: Add advanced filtering and search': () => {
    return exists('backend/src/utils/queryBuilder.js') ||
           exists('backend/src/middleware/filtering.js');
  },

  'Phase 3: Implement reporting endpoints': () => {
    return exists('backend/src/routes/reports.routes.js');
  },

  'Phase 3: Add audit log viewing endpoints': () => {
    return exists('backend/src/routes/audit.routes.js') ||
           fileContains('backend/src/routes/index.js', 'audit');
  },

  'Phase 3: Implement rate limiting': () => {
    return exists('backend/src/middleware/rateLimit.js') ||
           exists('backend/src/middleware/rateLimiter.js') ||
           fileContains('backend/src/server.js', 'rate-limit') ||
           fileContains('backend/src/server.js', 'rateLimit');
  },

  'Phase 3: Add file upload capability': () => {
    return exists('backend/src/middleware/upload.js') ||
           fileContains('backend/package.json', 'multer');
  },

  'Phase 3: Implement data export functionality': () => {
    return exists('backend/src/services/export.js') ||
           exists('backend/src/services/export.service.js') ||
           exists('backend/src/services/exportService.js') ||
           exists('backend/src/controllers/export.controller.js') ||
           fileContains('backend/src/controllers/report.controller.js', 'export') ||
           fileContains('backend/src/controllers/patient.controller.js', 'export');
  },

  // Phase 4: Frontend Development
  'Phase 4: Set up React project with routing': () => {
    return exists('frontend/src/App.jsx') &&
           exists('frontend/src/main.jsx') &&
           fileContains('frontend/package.json', 'react-router');
  },

  'Phase 4: Implement authentication flow (login, logout, token refresh)': () => {
    return exists('frontend/src/pages/Login.jsx') ||
           exists('frontend/src/components/Auth');
  },

  'Phase 4: Create layout components (header, sidebar, footer)': () => {
    return exists('frontend/src/components/Layout');
  },

  'Phase 4: Implement patient management UI': () => {
    return exists('frontend/src/pages/Patients.jsx') ||
           exists('frontend/src/pages/patients');
  },

  'Phase 4: Implement visit management UI': () => {
    return exists('frontend/src/pages/Visits.jsx') ||
           exists('frontend/src/pages/visits');
  },

  'Phase 4: Implement billing management UI': () => {
    return exists('frontend/src/pages/Billing.jsx') ||
           exists('frontend/src/pages/billing');
  },

  'Phase 4: Implement user management UI (admin)': () => {
    return exists('frontend/src/pages/Users.jsx') ||
           exists('frontend/src/pages/users');
  },

  'Phase 4: Implement dashboard and reports': () => {
    return exists('frontend/src/pages/Dashboard.jsx');
  },

  'Phase 4: Add audit log viewer': () => {
    return exists('frontend/src/pages/AuditLogs.jsx') ||
           exists('frontend/src/pages/audit/AuditLogList.jsx');
  },

  // Phase 5: Security & Testing
  'Phase 5: Security audit and penetration testing': () => {
    return exists('docs/security/SECURITY_AUDIT.md');
  },

  'Phase 5: Integration testing for all API endpoints': () => {
    return countFiles('backend/tests/integration') >= 5;
  },

  'Phase 5: End-to-end testing for critical user flows': () => {
    return countFiles('backend/tests/e2e') > 0 ||
           countFiles('frontend/tests/e2e') > 0;
  },

  'Phase 5: Performance testing and optimization': () => {
    return exists('docs/performance/PERFORMANCE_REPORT.md');
  },

  'Phase 5: Accessibility testing': () => {
    return exists('docs/accessibility/ACCESSIBILITY_REPORT.md');
  },

  // Phase 6: Deployment & Monitoring
  'Phase 6: Set up production environment': () => {
    return exists('.github/workflows') || exists('.gitlab-ci.yml');
  },

  'Phase 6: Configure SSL/TLS certificates': () => {
    return exists('docs/setup/SSL_SETUP.md');
  },

  'Phase 6: Set up database backups': () => {
    return exists('scripts/backup.sh') || exists('scripts/backup.js');
  },

  'Phase 6: Configure log aggregation': () => {
    return exists('config/logging.js') &&
           fileContains('backend/package.json', 'winston');
  },

  'Phase 6: Set up monitoring and alerting': () => {
    return exists('config/monitoring.js');
  },

  'Phase 6: Create deployment documentation': () => {
    return exists('docs/setup/DEPLOYMENT.md');
  },

  'Phase 6: Implement CI/CD pipeline': () => {
    return exists('.github/workflows/ci.yml') || exists('.gitlab-ci.yml');
  }
};

/**
 * Calculate progress statistics
 */
function calculateProgress() {
  const tasks = Object.keys(taskCheckers);
  const completedTasks = tasks.filter(task => taskCheckers[task]());

  const phaseStats = {
    'Phase 1': { total: 0, completed: 0 },
    'Phase 2': { total: 0, completed: 0 },
    'Phase 3': { total: 0, completed: 0 },
    'Phase 4': { total: 0, completed: 0 },
    'Phase 5': { total: 0, completed: 0 },
    'Phase 6': { total: 0, completed: 0 }
  };

  tasks.forEach(task => {
    const phase = task.match(/Phase \d/)[0];
    phaseStats[phase].total++;
    if (taskCheckers[task]()) {
      phaseStats[phase].completed++;
    }
  });

  return {
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    percentComplete: Math.round((completedTasks.length / tasks.length) * 100),
    phaseStats,
    completedTasksList: completedTasks
  };
}

/**
 * Generate updated todo list content
 */
function generateTodoContent(progress) {
  const timestamp = new Date().toISOString().split('T')[0];

  let content = `# NutriVault - Project Implementation Tracker

**Last Updated**: ${timestamp}
**Overall Progress**: ${progress.completedTasks}/${progress.totalTasks} tasks (${progress.percentComplete}%)

---

## Progress Overview

`;

  // Add phase overview
  Object.entries(progress.phaseStats).forEach(([phase, stats]) => {
    const phasePercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const icon = stats.completed === stats.total ? '✅' : stats.completed > 0 ? '🔄' : '⏳';
    const status = stats.completed === stats.total ? 'COMPLETE' : stats.completed > 0 ? 'IN PROGRESS' : 'NOT STARTED';

    content += `- ${icon} **${phase}** - ${status} (${stats.completed}/${stats.total} tasks - ${phasePercent}%)\n`;
  });

  content += `\n**Total Progress**: ${progress.completedTasks}/${progress.totalTasks} tasks completed (${progress.percentComplete}%)\n\n`;
  content += `---\n\n`;
  content += `## Detailed Task Status\n\n`;

  // List all tasks by phase
  Object.entries(progress.phaseStats).forEach(([phase, stats]) => {
    content += `### ${phase} (${stats.completed}/${stats.total})\n\n`;

    const phaseTasks = Object.keys(taskCheckers).filter(task => task.startsWith(phase));
    phaseTasks.forEach(task => {
      const isComplete = taskCheckers[task]();
      const checkbox = isComplete ? '[x]' : '[ ]';
      const taskName = task.replace(/^Phase \d: /, '');
      content += `${checkbox} ${taskName}\n`;
    });

    content += '\n';
  });

  content += `---\n\n`;
  content += `## Auto-Generated Report\n\n`;
  content += `This todo list is automatically updated by \`utils/update-todo.js\`.\n\n`;
  content += `**Run manually**: \`node utils/update-todo.js\`\n\n`;
  content += `**Last scan**: ${new Date().toISOString()}\n`;

  return content;
}

/**
 * Main function
 */
function main() {
  console.log(`${colors.blue}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  NutriVault - Todo List Update Agent      ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.gray}Scanning project structure...${colors.reset}\n`);

  const progress = calculateProgress();

  console.log(`${colors.yellow}Progress Summary:${colors.reset}`);
  console.log(`${colors.gray}├─${colors.reset} Total tasks: ${progress.totalTasks}`);
  console.log(`${colors.gray}├─${colors.reset} Completed: ${colors.green}${progress.completedTasks}${colors.reset}`);
  console.log(`${colors.gray}├─${colors.reset} Remaining: ${colors.yellow}${progress.totalTasks - progress.completedTasks}${colors.reset}`);
  console.log(`${colors.gray}└─${colors.reset} Progress: ${colors.blue}${progress.percentComplete}%${colors.reset}\n`);

  console.log(`${colors.yellow}Phase Breakdown:${colors.reset}`);
  Object.entries(progress.phaseStats).forEach(([phase, stats]) => {
    const phasePercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const color = stats.completed === stats.total ? colors.green : stats.completed > 0 ? colors.yellow : colors.gray;
    console.log(`${colors.gray}├─${colors.reset} ${phase}: ${color}${stats.completed}/${stats.total}${colors.reset} (${phasePercent}%)`);
  });
  console.log();

  if (progress.completedTasksList.length > 0) {
    console.log(`${colors.green}Recently Completed:${colors.reset}`);
    progress.completedTasksList.slice(-5).forEach(task => {
      console.log(`${colors.gray}  ✓${colors.reset} ${task.replace(/^Phase \d: /, '')}`);
    });
    console.log();
  }

  // Generate and write updated content
  console.log(`${colors.gray}Updating ${TODO_FILE}...${colors.reset}`);
  const newContent = generateTodoContent(progress);

  try {
    fs.writeFileSync(TODO_FILE, newContent, 'utf8');
    console.log(`${colors.green}✓ Todo list updated successfully!${colors.reset}\n`);
  } catch (err) {
    console.error(`${colors.red}✗ Error writing todo file:${colors.reset}`, err.message);
    process.exit(1);
  }

  // Summary
  if (progress.percentComplete === 100) {
    console.log(`${colors.green}╔════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.green}║  🎉 PROJECT COMPLETE! ALL TASKS DONE! 🎉  ║${colors.reset}`);
    console.log(`${colors.green}╚════════════════════════════════════════════╝${colors.reset}\n`);
  } else {
    const nextPhase = Object.entries(progress.phaseStats).find(([_, stats]) => stats.completed < stats.total);
    if (nextPhase) {
      console.log(`${colors.blue}Next Focus: ${nextPhase[0]}${colors.reset}`);
      console.log(`${colors.gray}${nextPhase[1].total - nextPhase[1].completed} tasks remaining in this phase${colors.reset}\n`);
    }
  }
}

// Run the agent
main();
