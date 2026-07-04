# Workflow State Logging

A comprehensive logging system has been added to track all workflow state changes in real-time through the browser console.

## Features

### 1. Initialization Logging
When the workflow provider initializes, the complete initial state is logged:
```
[WF INIT] Fax_QS_PA_Approved
Initial State: (table of all workflow data fields)
```

### 2. State Change Logging
Every workflow event that modifies state is logged with:
- **Event name**: The trigger event (e.g., ENROLL, VERIFY_SMS, APPROVE_PA)
- **Timestamp**: When the state change occurred
- **Flow type**: Which workflow this is (Fax_QS_PA_Approved, CoA_DTP, etc.)
- **State changes**: Only fields that changed, shown as `before → after`
- **Full state table**: Complete workflow data after the change

Example:
```
[WF] VERIFY_SMS @ 3:14:25 AM (Fax_QS_PA_Approved)
State Changes:
  smsVerified: false → ✓ true

Full State: (table of all fields)
```

### 3. Undo Logging
When Undo is triggered, it logs the state restoration:
```
[WF] UNDO @ 3:14:26 AM
(shows the before/after of the undo operation)
```

### 4. Color-Coded Output
- **Event names**: Cyan (bright)
- **Timestamps**: Yellow
- **Changed fields**: Red (before) → Green (after)
- **State tables**: Blue headers
- **Boolean values**: Formatted as ✓ true or ✗ false

## How to Use

1. Open browser developer tools (F12 or Cmd+Option+I)
2. Go to the **Console** tab
3. Interact with the demo workflow
4. Watch the console for detailed state change logs
5. Each event will show exactly what changed in the workflow

## Implementation Details

- **Logger utility**: `client/engine/workflowLogger.ts` - Functions for formatting and logging
- **Machine integration**: `client/engine/workflowMachine.ts` - Wrapped all state update actions with logging
- **Provider integration**: `client/engine/WorkflowProvider.tsx` - Logs initial state on mount

## Use Cases

- **Debugging**: Understand exactly when and how state changes
- **Testing**: Verify workflow transitions are correct
- **Learning**: See how the workflow progresses through the demo
- **Verification**: Confirm that Reset, Undo, and other operations work correctly
