import { showToast, getCurrentUserRole } from '../main.js';
import { createWorkflowTicket, getWorkflowTickets, getTicketBadgeClass, getTicketStatusLabel } from './ticketing.js';

export function renderTicketRaise(container) {
  const role = (getCurrentUserRole() || '').toLowerCase();
  const isHomologation = role === 'homologation' || role === '14';
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Ticket Raise</h1>
        <p>Raise workflow-related tickets with routing based on manager approval state.</p>
      </div>
    </div>
    ${!isHomologation ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><div class="card-title"><span class="material-icons-outlined">add_circle</span>Raise New Ticket</div></div>
      <div class="card-body">
        <div class="detail-grid">
          <div class="form-group"><label class="form-label">Workflow Task ID <span style="color:#DC2626">*</span></label><input class="form-input" id="tr-task-id" placeholder="e.g. WF-T-1002" /></div>
          <div class="form-group"><label class="form-label">Task Title <span style="color:#DC2626">*</span></label><input class="form-input" id="tr-task-title" placeholder="e.g. Technical Review: BA152002" /></div>
          <div class="form-group"><label class="form-label">Manager Approval Status <span style="color:#DC2626">*</span></label>
            <select class="form-select" id="tr-manager-status"><option value="not-approved">Not Approved</option><option value="approved">Approved</option></select>
          </div>
          <div class="form-group"><label style="display:flex;align-items:center;gap:8px;font-size:0.857rem;cursor:pointer;margin-top:28px"><input type="checkbox" id="tr-fault-withdraw" style="accent-color:var(--brand-primary)" /> Fault found and want to withdraw</label></div>
          <div class="form-group" style="grid-column:1 / -1"><label class="form-label">Reason <span style="color:#DC2626">*</span></label><textarea class="form-input" id="tr-reason" rows="3" style="resize:vertical" placeholder="Describe why ticket is being raised"></textarea></div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px"><button class="btn btn-primary" id="tr-submit">Raise Ticket</button></div>
      </div>
    </div>
    ` : ''}

    <div class="card">
      <div class="card-header"><div class="card-title"><span class="material-icons-outlined">schedule</span>Recently Raised Tickets</div></div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Ticket ID</th><th>Task</th><th>Route</th><th>Status</th><th>Raised At</th></tr></thead>
          <tbody id="tr-recent-body"></tbody>
        </table>
      </div>
    </div>
  `;

  const renderRecent = () => {
    const body = container.querySelector('#tr-recent-body');
    const tickets = getWorkflowTickets().slice(0, 6);
    body.innerHTML = tickets.length
      ? tickets.map(t => `<tr>
          <td><span class="part-number">${t.id}</span></td>
          <td>${t.taskId} - ${t.taskTitle}</td>
          <td>${(t.routeTo || []).join(', ')}</td>
          <td><span class="badge ${getTicketBadgeClass(t.status)} badge-sm">${getTicketStatusLabel(t.status)}</span></td>
          <td class="text-secondary text-sm">${t.createdAt}</td>
        </tr>`).join('')
      : '<tr><td colspan="5" class="text-xs text-secondary">No tickets raised yet.</td></tr>';
  };

  renderRecent();

  container.querySelector('#tr-submit')?.addEventListener('click', () => {
    const taskId = container.querySelector('#tr-task-id')?.value?.trim();
    const taskTitle = container.querySelector('#tr-task-title')?.value?.trim();
    const managerStatus = container.querySelector('#tr-manager-status')?.value;
    const faultWithdraw = Boolean(container.querySelector('#tr-fault-withdraw')?.checked);
    const reason = container.querySelector('#tr-reason')?.value?.trim();

    if (!taskId || !taskTitle || !reason) {
      showToast('Task ID, Task Title and Reason are required.', 'error');
      return;
    }

    createWorkflowTicket({ taskId, taskTitle, managerStatus, faultWithdraw, reason }, () => {
      container.querySelector('#tr-task-id').value = '';
      container.querySelector('#tr-task-title').value = '';
      container.querySelector('#tr-reason').value = '';
      container.querySelector('#tr-fault-withdraw').checked = false;
      renderRecent();
    });
  });
}
