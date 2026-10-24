export interface WorkflowOperationsSummary {
  pendingOutboxEvents: number;
  retryingOutboxEvents: number;
  publishedOutboxEvents: number;
  oldestPendingAt?: string | null;
}

export interface WorkflowOutboxIncident {
  eventId: string;
  eventType: string;
  attempts: number;
  occurredAt: string;
  dueAt?: string | null;
  lastError?: string | null;
}

export interface WorkflowDlqIncident {
  recordId: string;
  eventId: string;
  eventType: string;
  attempts: number;
  errorSummary?: string | null;
  failedAt: string;
}

