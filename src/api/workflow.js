import { authFetch } from './client.js';

/**
 * Assigns a new workflow.
 * @param {Object} payload 
 * @param {string} payload.entityType
 * @param {number} payload.entityId
 * @param {number} payload.assignedUserId
 * @param {string|null} [payload.title]
 * @param {string|null} [payload.comments]
 * @param {string|null} [payload.dueDate]
 */
export async function assignWorkflow(payload) {
  const response = await authFetch('/api/Workflow/assign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error('Failed to assign workflow');
  }
  
  // Return parsed JSON if the server responds with content, otherwise null
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function fetchWorkflows() {
  const response = await authFetch('/api/Workflow/my-tasks');
  if (!response.ok) {
    throw new Error('Failed to fetch my tasks');
  }
  return response.json();
}
