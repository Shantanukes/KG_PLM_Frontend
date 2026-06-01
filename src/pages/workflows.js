import { showToast, showModal, navigateTo } from '../main.js';
import { assignWorkflow, fetchWorkflows } from '../api/index.js';

const RUNTIME_KEY = 'kg_plm_runtime';
const SESSION_USER_KEY = 'kg_plm_session_user';

function getCurrentUserName() {
  try {
    const sessionUser = JSON.parse(localStorage.getItem(SESSION_USER_KEY) || '{}');
    return sessionUser?.name || 'Rohit Agarwal';
  } catch {
    return 'Rohit Agarwal';
  }
}

function getRuntimeState() {
  try {
    return JSON.parse(localStorage.getItem(RUNTIME_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveRuntimeState(state) {
  localStorage.setItem(RUNTIME_KEY, JSON.stringify(state));
}

function upsertPartWorkflow(partId, updates) {
  if (!partId) return;
  const state = getRuntimeState();
  state.partWorkflows = state.partWorkflows || {};
  state.partWorkflows[partId] = { ...(state.partWorkflows[partId] || {}), ...updates };
  saveRuntimeState(state);
}

function pushRejectionFeedback(item) {
  const state = getRuntimeState();
  state.rejectionFeedback = state.rejectionFeedback || [];
  state.rejectionFeedback.unshift(item);
  state.rejectionFeedback = state.rejectionFeedback.slice(0, 10);
  saveRuntimeState(state);
}

function getTaskAttachments(taskId) {
  const state = getRuntimeState();
  state.workflowAttachments = state.workflowAttachments || {};
  return state.workflowAttachments[taskId] || [];
}

function saveTaskAttachments(taskId, attachments) {
  const state = getRuntimeState();
  state.workflowAttachments = state.workflowAttachments || {};
  state.workflowAttachments[taskId] = attachments;
  saveRuntimeState(state);
}

function openWorkflowEditModal(taskId, taskTitle) {
  const currentUser = getCurrentUserName();
  const attachments = getTaskAttachments(taskId);
  const rows = attachments.length
    ? attachments.map((f) => {
        const canDelete = f.uploadedBy === currentUser;
        return `<tr>
          <td style="max-width:220px;white-space:normal;line-height:1.4">${f.name}</td>
          <td>${f.uploadedBy}</td>
          <td class="text-secondary text-sm">${f.uploadedAt}</td>
          <td class="text-secondary text-sm">${f.sizeKb} KB</td>
          <td>
            <button class="btn btn-danger btn-xs delete-attachment-btn" data-file-id="${f.id}" ${canDelete ? '' : 'disabled title="Only uploader can delete this file"'}>
              Delete
            </button>
          </td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="5" class="text-xs text-secondary">No files uploaded yet.</td></tr>';

  const overlay = showModal(
    `Edit Task Files: ${taskId}`,
    `<p class="text-xs text-secondary" style="margin-bottom:10px">${taskTitle}</p>
     <div class="form-group">
       <label class="form-label">Upload File</label>
       <input class="form-input" id="wf-file-input" type="file" />
     </div>
     <table class="data-table" style="margin-top:12px">
       <thead><tr><th>File</th><th>Uploaded By</th><th>Uploaded At</th><th>Size</th><th>Action</th></tr></thead>
       <tbody>${rows}</tbody>
     </table>
     <div class="text-xs text-secondary" style="margin-top:8px">Only the user who uploaded a file can delete it.</div>`,
    `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
     <button class="btn btn-primary" id="wf-upload-btn">Upload</button>`
  );

  overlay.querySelector('#wf-upload-btn')?.addEventListener('click', () => {
    const fileInput = overlay.querySelector('#wf-file-input');
    const file = fileInput?.files?.[0];
    if (!file) {
      showToast('Please choose a file to upload.', 'warning');
      return;
    }
    const updated = getTaskAttachments(taskId);
    updated.push({
      id: `F-${Date.now()}`,
      name: file.name,
      sizeKb: Math.max(1, Math.round(file.size / 1024)),
      uploadedBy: currentUser,
      uploadedAt: new Date().toLocaleString(),
    });
    saveTaskAttachments(taskId, updated);
    overlay.remove();
    showToast(`File uploaded to ${taskId}.`, 'success');
    openWorkflowEditModal(taskId, taskTitle);
  });

  overlay.querySelectorAll('.delete-attachment-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fileId = btn.dataset.fileId;
      const all = getTaskAttachments(taskId);
      const fileItem = all.find((f) => f.id === fileId);
      if (!fileItem) return;
      if (fileItem.uploadedBy !== currentUser) {
        showToast('Only the uploader can delete this file.', 'error');
        return;
      }
      const updated = all.filter((f) => f.id !== fileId);
      saveTaskAttachments(taskId, updated);
      overlay.remove();
      showToast('File deleted successfully.', 'success');
      openWorkflowEditModal(taskId, taskTitle);
    });
  });
}

export function renderWorkflows(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Workflows & Approvals</h1>
        <p>Monitor and manage active approval cycles, SLA tracking, and engineering release workflows.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline btn-sm" id="wf-archive">
          <span class="material-icons-outlined" style="font-size:16px">history</span>Archive
        </button>
        <button class="btn btn-primary btn-sm" id="wf-new">
          <span class="material-icons-outlined" style="font-size:16px">add</span>New Workflow
        </button>
      </div>
    </div>

    <div class="tabs" id="wf-tabs">
      <button class="tab-btn active" data-tab="my">My Tasks</button>
      <button class="tab-btn" data-tab="progress">In-Progress</button>
      <button class="tab-btn" data-tab="completed">Completed</button>
    </div>

    <div id="wf-tab-content"></div>
  `;

  container.querySelectorAll('#wf-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#wf-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderWFTab(container.querySelector('#wf-tab-content'), btn.dataset.tab);
    });
  });

  container.querySelector('#wf-new')?.addEventListener('click', () => {
    showModal('New Workflow Instance',
      `<div class="form-group"><label class="form-label">Entity Type <span style="color:#DC2626">*</span></label>
        <input class="form-input" id="wf-entity-type" placeholder="e.g. ECR, ECN, Part" /></div>
      <div class="form-group"><label class="form-label">Entity ID <span style="color:#DC2626">*</span></label>
        <input class="form-input" type="number" id="wf-entity-id" placeholder="e.g. 123" /></div>
      <div class="form-group"><label class="form-label">Assigned User ID <span style="color:#DC2626">*</span></label>
        <input class="form-input" type="number" id="wf-assigned-user" placeholder="e.g. 1" /></div>
      <div class="form-group"><label class="form-label">Title</label>
        <input class="form-input" id="wf-title" placeholder="Enter task title" /></div>
      <div class="form-group"><label class="form-label">Comments</label>
        <textarea class="form-input" id="wf-comments" rows="2" placeholder="Enter comments..."></textarea></div>
      <div class="form-group"><label class="form-label">Due Date</label>
        <input class="form-input" type="date" id="wf-due-date" /></div>`,
        `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      <button class="btn btn-primary" id="launch-workflow">Assign Workflow</button>`
    );
    setTimeout(() => {
      document.getElementById('launch-workflow')?.addEventListener('click', async () => {
        const entityType = document.getElementById('wf-entity-type')?.value?.trim();
        const entityIdStr = document.getElementById('wf-entity-id')?.value?.trim();
        const assignedUserStr = document.getElementById('wf-assigned-user')?.value?.trim();
        
        if (!entityType || !entityIdStr || !assignedUserStr) {
          return showToast('Entity Type, Entity ID, and Assigned User ID are required', 'error');
        }
        
        const title = document.getElementById('wf-title')?.value?.trim() || null;
        const comments = document.getElementById('wf-comments')?.value?.trim() || null;
        const dueDateInput = document.getElementById('wf-due-date')?.value;
        
        let dueDate = null;
        if (dueDateInput) {
          dueDate = new Date(dueDateInput).toISOString().split('.')[0] + 'Z';
        } else {
          dueDate = new Date(Date.now() + 86400000).toISOString().split('.')[0] + 'Z';
        }
        
        const btn = document.getElementById('launch-workflow');
        btn.disabled = true;
        btn.textContent = 'Assigning...';

        try {
          const payload = {
            entityType: entityType,
            entityId: parseInt(entityIdStr, 10),
            assignedUserId: parseInt(assignedUserStr, 10),
            title: title,
            comments: comments,
            dueDate: dueDate
          };
          
          await assignWorkflow(payload);
          
          document.querySelector('.modal-overlay')?.remove();
          showToast(`Workflow task assigned successfully`, 'success');
          
          // Trigger a refresh of the UI to show the newly assigned task
          const activeTab = document.querySelector('#wf-tabs .tab-btn.active')?.dataset.tab;
          if (activeTab) {
            renderWFTab(document.querySelector('#wf-tab-content'), activeTab);
          }
        } catch (e) {
          console.error(e);
          showToast('Failed to assign workflow', 'error');
          btn.disabled = false;
          btn.textContent = 'Assign Workflow';
        }
      });
    }, 50);
  });

  container.querySelector('#wf-archive')?.addEventListener('click', () => showToast('Loading archived workflows…', 'info'));

  renderWFTab(container.querySelector('#wf-tab-content'), 'my');
}

async function renderWFTab(tc, tab) {
  if (tab === 'my') await renderMyTasks(tc);
  else if (tab === 'progress') renderInProgress(tc);
  else if (tab === 'completed') renderCompleted(tc);
}

async function renderMyTasks(tc) {
  let tasks = [];
  try {
    tc.innerHTML = '<div style="padding: 20px; text-align: center;">Loading workflows...</div>';
    const apiData = await fetchWorkflows();
    const fetchedTasks = Array.isArray(apiData) ? apiData : (apiData?.items || []);
    
    tasks = fetchedTasks.map(t => {
      const entityType = t.entityType || t.EntityType || 'Workflow';
      const entityId = t.entityId || t.EntityId || '';
      const assignedUserId = t.assignedUserId || t.AssignedUserId || '';
      const title = t.title || t.Title || 'Untitled Task';
      const comments = t.comments || t.Comments || '';
      const dueDate = t.dueDate || t.DueDate;
      const id = t.id || t.Id || t.workflowId || t.WorkflowId || t.taskId || t.TaskId;
      const prio = t.priority || t.Priority;

      let priorityClass = 'medium';
      if (prio === 4 || (typeof prio === 'string' && prio.toLowerCase() === 'critical')) priorityClass = 'critical';
      else if (prio === 3 || (typeof prio === 'string' && prio.toLowerCase() === 'high')) priorityClass = 'high';
      else if (prio === 1 || (typeof prio === 'string' && prio.toLowerCase() === 'low')) priorityClass = 'low';

      return {
        id: id ? `WF-${id}` : `WF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        title: title,
        comments: comments,
        by: assignedUserId ? `User ${assignedUserId}` : 'System',
        due: dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A',
        dueColor: '#10B981',
        priority: priorityClass,
        type: entityType,
        partId: entityId
      };
    });
  } catch (err) {
    console.error('Failed to load workflows', err);
  }

  // fallback tasks if empty to still show UI design structure
  // removed dummy tasks
  const state = getRuntimeState();
  const feedback = state.rejectionFeedback || [];

  tc.innerHTML = `
      <div class="card-header">
        <div class="card-title"><span class="material-icons-outlined">feedback</span>Rejection Feedback Sent To Creators</div>
      </div>
      <div class="card-body" style="padding:12px 16px">
        ${feedback.length ? feedback.map(f => `<div style="padding:8px 0;border-bottom:1px solid var(--border-light)"><div style="font-size:0.786rem;color:var(--text-tertiary)">${f.time}</div><div style="font-size:0.857rem"><strong>${f.creator}</strong> notified for <strong>${f.taskId}</strong> by ${f.rejectedBy}</div><div style="font-size:0.786rem;color:#991B1B;margin-top:4px">Feedback: ${f.feedback}</div></div>`).join('') : '<div class="text-xs text-secondary">No rejection feedback events yet.</div>'}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Pending Task Queue</div>
        <span class="badge badge-priority-high">${tasks.length} pending</span>
      </div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Priority</th><th>Task Type</th><th>Description</th><th>Approved By</th><th>SLA / Due</th><th>Actions</th></tr></thead>
          <tbody>
            ${tasks.length ? tasks.map(t => `
              <tr>
                <td><span class="badge badge-priority-${t.priority}">${t.priority.charAt(0).toUpperCase()+t.priority.slice(1)}</span></td>
                <td><span class="tag">${t.type}</span></td>
                <td style="max-width:280px;white-space:normal;line-height:1.4;font-size:0.857rem">
                  <div style="font-weight:600;margin-bottom:4px">${t.title}</div>
                  ${t.comments ? `<div style="color:var(--text-secondary);font-size:0.75rem">${t.comments}</div>` : ''}
                </td>
                <td>${t.by}</td>
                <td><span style="font-weight:600;color:${t.dueColor};font-size:0.857rem">${t.due}</span></td>
                <td>
                  <button class="btn btn-primary btn-xs wf-action-btn" data-id="${t.id}" data-title="${t.title}" data-by="${t.by}" data-part="${t.partId || ''}">Action</button>
                  <button class="btn btn-outline btn-xs wf-edit-btn" data-id="${t.id}" data-title="${t.title}">Edit</button>
                  <button class="btn btn-ghost btn-xs wf-delegate-btn" data-id="${t.id}" title="Delegate">
                    <span class="material-icons-outlined" style="font-size:14px">transfer_within_a_station</span>
                  </button>
                </td>
              </tr>`).join('') : '<tr><td colspan="6" class="text-center text-secondary py-4" style="text-align: center;">No pending tasks</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;

  // Removed dummy event listeners for advance and reassign

  tc.querySelectorAll('.wf-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.dataset.title;
      showModal('Action Required',
        `<p style="margin-bottom:16px">Task: <strong>${title}</strong></p>
         <div class="form-group"><label class="form-label">Action</label>
          <select class="form-select" id="wf-action-type">
            <option>Approve</option><option>Approve with Comments</option><option>Reject & Return</option><option>Request Clarification</option>
          </select></div>
         <div class="form-group"><label class="form-label">Comments / Feedback</label><textarea class="form-input" id="wf-feedback" rows="3" placeholder="Provide reviewer notes…" style="resize:vertical"></textarea></div>
         <div class="text-xs text-secondary">For rejection, feedback is mandatory and will be sent to the creator.</div>`,
        `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
         <button class="btn btn-primary" id="submit-wf-action">Submit Action</button>`
      );
      setTimeout(() => {
        document.getElementById('submit-wf-action')?.addEventListener('click', () => {
          const action = document.getElementById('wf-action-type')?.value;
          const feedbackText = document.getElementById('wf-feedback')?.value?.trim() || '';
          const creator = btn.dataset.by || 'Originator';
          const taskId = btn.dataset.id || 'Task';
          const partId = btn.dataset.part || '';
          const reviewer = 'Current Reviewer';

          if (action?.startsWith('Reject') && !feedbackText) {
            showToast('Rejection feedback is required before submitting.', 'error');
            return;
          }

          document.querySelector('.modal-overlay')?.remove();
          const isApprove = action.startsWith('Approve');
          if (isApprove) {
            upsertPartWorkflow(partId, {
              state: 'review',
              currentStep: 3,
              lastUpdated: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }),
            });
          } else if (action?.startsWith('Reject')) {
            upsertPartWorkflow(partId, {
              state: 'rejected',
              currentStep: 2,
              lastFeedback: feedbackText,
              lastRejectedBy: reviewer,
              lastUpdated: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }),
              steps: [
                { name: 'Creation', owner: creator, status: 'completed' },
                { name: 'Technical Check', owner: reviewer, status: 'rejected' },
                { name: 'COE Approval', owner: 'COE Head', status: 'pending' },
                { name: 'Effectivity', owner: 'Project Manager', status: 'pending' },
                { name: 'Final Release', owner: 'System', status: 'pending' },
              ],
            });
            pushRejectionFeedback({
              taskId,
              creator,
              feedback: feedbackText,
              rejectedBy: reviewer,
              time: new Date().toLocaleString(),
            });
            showToast(`Rejected. ${creator} notified with feedback.`, 'warning');
          } else {
            showToast('Clarification requested from creator with feedback.', 'info');
          }

          if (isApprove) showToast('Task approved! Next step initiated.', 'success');
          btn.closest('tr').style.opacity = '0.4';
          setTimeout(() => btn.closest('tr').remove(), 500);
        });
      }, 50);
    });
  });

  tc.querySelectorAll('.wf-delegate-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast(`Delegation dialog for task ${btn.dataset.id}`, 'info'));
  });

  tc.querySelectorAll('.wf-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openWorkflowEditModal(btn.dataset.id, btn.dataset.title || 'Task');
    });
  });

}

function renderInProgress(tc) {
  tc.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">In-Progress Workflows</div></div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Workflow ID</th><th>Subject</th><th>Template</th><th>Current Step</th><th>Assignee</th><th>Started</th><th>SLA</th><th>Actions</th></tr></thead>
          <tbody>
            <tr><td colspan="8" class="text-center text-secondary py-4" style="text-align: center;">No in-progress workflows</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  tc.querySelectorAll('.view-wf-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast(`Opening workflow ${btn.dataset.id}…`, 'info'));
  });
}

function renderCompleted(tc) {
  tc.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">Completed Workflows</div><div class="text-xs text-secondary">Last 30 days · 0 completed</div></div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Workflow ID</th><th>Subject</th><th>Template</th><th>Completed</th><th>Cycle Time</th><th>Result</th></tr></thead>
          <tbody>
            <tr><td colspan="6" class="text-center text-secondary py-4" style="text-align: center;">No completed workflows</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}
