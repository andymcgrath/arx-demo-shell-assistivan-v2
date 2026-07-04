import type { WorkflowData, DemoEvent } from './types';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function formatWorkflowData(data: Partial<WorkflowData>): Record<string, unknown> {
  const formatted: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      formatted[key] = value;
    } else if (typeof value === 'boolean') {
      formatted[key] = value ? '✓ true' : '✗ false';
    } else {
      formatted[key] = value;
    }
  }
  
  return formatted;
}

export function logWorkflowStateChange(
  eventType: string,
  beforeData: WorkflowData,
  afterData: WorkflowData,
  flowType: string
): void {
  const timestamp = new Date().toLocaleTimeString();
  
  // Find what changed
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  for (const key in afterData) {
    const k = key as keyof WorkflowData;
    if (beforeData[k] !== afterData[k]) {
      changes[key] = {
        before: beforeData[k],
        after: afterData[k],
      };
    }
  }

  const hasChanges = Object.keys(changes).length > 0;

  console.group(
    `%c[WF] %c${eventType}%c @ %c${timestamp}%c (${flowType})`,
    `color: ${colors.dim}`,
    `color: ${colors.cyan}; font-weight: bold`,
    `color: ${colors.dim}`,
    `color: ${colors.yellow}; font-weight: bold`,
    `color: ${colors.dim}`
  );

  if (hasChanges) {
    console.log(`%cState Changes:`, `color: ${colors.green}; font-weight: bold`);
    for (const [key, { before, after }] of Object.entries(changes)) {
      console.log(
        `  ${key}: %c${before}%c → %c${after}`,
        `color: ${colors.red}`,
        `color: ${colors.dim}`,
        `color: ${colors.green}`
      );
    }
  } else {
    console.log(`%c(no state changes)`, `color: ${colors.dim}; font-style: italic`);
  }

  console.log(
    `%cFull State:`,
    `color: ${colors.blue}; font-weight: bold`
  );
  console.table(formatWorkflowData(afterData));

  console.groupEnd();
}

export function logWorkflowEvent(
  eventType: string,
  portal: string,
  flowType: string
): void {
  const timestamp = new Date().toLocaleTimeString();
  
  console.log(
    `%c→ %c${eventType}%c from %c${portal}%c @ %c${timestamp}`,
    `color: ${colors.magenta}`,
    `color: ${colors.bright}${colors.cyan}`,
    `color: ${colors.reset}`,
    `color: ${colors.yellow}; font-weight: bold`,
    `color: ${colors.reset}`,
    `color: ${colors.dim}`
  );
}

export function logWorkflowInit(
  flowType: string,
  initialData: WorkflowData
): void {
  console.group(
    `%c[WF INIT] %c${flowType}`,
    `color: ${colors.green}; font-weight: bold`,
    `color: ${colors.cyan}; font-weight: bold`
  );

  console.log(`%cInitial State:`, `color: ${colors.blue}; font-weight: bold`);
  console.table(formatWorkflowData(initialData));

  console.groupEnd();
}
