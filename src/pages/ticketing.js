import { showModal, showToast } from '../main.js';

const RUNTIME_KEY = 'kg_plm_runtime';
const SESSION_USER_KEY = 'kg_plm_session_user';

function getCurrentSessionUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_USER_KEY) || '{}');
  } catch {
    return {};
  }
}

function getTicketCurrentUserName() {
  return getCurrentSessionUser()?.name || 'Rohit Agarwal';
}

function getTicketCurrentUserRole() {
  return getCurrentSessionUser()?.role || 'Admin/IT Head';
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

export function getWorkflowTickets() {
  const state = getRuntimeState();
  state.workflowTickets = state.workflowTickets || [];
  return state.workflowTickets;
}

function saveWorkflowTickets(tickets) {
  const state = getRuntimeState();
  state.workflowTickets = tickets;
  saveRuntimeState(state);
}

export function getTicketBadgeClass(status) {
  if (status === 'pending-manager-approval') return 'badge-review';
  if (status === 'manager-rejected') return 'badge-rejected';
  return 'badge-released';
}

export function getTicketStatusLabel(status) {
  if (status === 'pending-manager-approval') return 'Pending Manager Approval';
  if (status === 'open-withdrawal') return 'Open Withdrawal';
  if (status === 'manager-approved') return 'Manager Approved';
  if (status === 'manager-rejected') return 'Manager Rejected';
  return 'Open';
}

export function createWorkflowTicket(payload, onSaved) {
  const managerStatus = payload.managerStatus;
  const faultWithdraw = Boolean(payload.faultWithdraw);
  const reason = payload.reason?.trim();
  const taskId = payload.taskId;
  const taskTitle = payload.taskTitle;
  const raisedBy = payload.raisedBy || getTicketCurrentUserName();

  if (!taskId || !taskTitle || !reason) {
    showToast('Task and reason are required to raise a ticket.', 'error');
    return;
  }

  let routeTo = [];
  let status = 'open';

  if (managerStatus === 'approved') {
    if (!faultWithdraw) {
      showToast('For approved workflow, enable fault withdraw to raise this ticket.', 'warning');
      return;
    }
    routeTo = ['OT Team Head/Admin', 'IT Team'];
    status = 'open-withdrawal';
  } else {
    routeTo = ['COE Head'];
    status = 'pending-manager-approval';
  }

  const tickets = getWorkflowTickets();
  tickets.unshift({
    id: `TKT-${Date.now()}`,
    taskId,
    taskTitle,
    raisedBy,
    managerStatus,
    faultWithdraw,
    reason,
    routeTo,
    status,
    createdAt: new Date().toLocaleString(),
  });
  saveWorkflowTickets(tickets);
  showToast(`Ticket raised to ${routeTo.join(' and ')}.`, 'success');
  if (onSaved) onSaved();
}

export function decideManagerTicket(ticketId, decision, onSaved) {
  const role = getTicketCurrentUserRole();
  if (!['COE Head', 'Admin/IT Head'].includes(role)) {
    showToast('Only COE Head can approve or reject this ticket.', 'error');
    return;
  }

  const tickets = getWorkflowTickets();
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return;
  if (tickets[idx].status !== 'pending-manager-approval') {
    showToast('Manager decision is already completed for this ticket.', 'info');
    return;
  }

  tickets[idx].status = decision === 'approve' ? 'manager-approved' : 'manager-rejected';
  tickets[idx].managerDecisionBy = getTicketCurrentUserName();
  tickets[idx].managerDecisionAt = new Date().toLocaleString();
  saveWorkflowTickets(tickets);
  showToast(`Ticket ${decision === 'approve' ? 'approved' : 'rejected'} by COE Head.`, 'success');
  if (onSaved) onSaved();
}

export function openRaiseTicketModal(taskId, taskTitle, onSaved) {
  showModal(
    `Raise Ticket: ${taskId}`,
    `<p class="text-xs text-secondary" style="margin-bottom:10px">${taskTitle}</p>
     <div class="form-group"><label class="form-label">Manager Approval Status <span style="color:#DC2626">*</span></label>
       <select class="form-select" id="rt-manager-status"><option value="not-approved">Not Approved</option><option value="approved">Approved</option></select>
     </div>
     <div class="form-group"><label style="display:flex;align-items:center;gap:8px;font-size:0.857rem;cursor:pointer"><input type="checkbox" id="rt-fault-withdraw" style="accent-color:var(--brand-primary)" /> Fault found and want to withdraw</label></div>
     <div class="form-group"><label class="form-label">Reason <span style="color:#DC2626">*</span></label><textarea class="form-input" id="rt-reason" rows="3" placeholder="Describe the issue and reason for ticket" style="resize:vertical"></textarea></div>`,
    `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-primary" id="rt-submit">Raise Ticket</button>`
  );

  document.getElementById('rt-submit')?.addEventListener('click', () => {
    createWorkflowTicket(
      {
        taskId,
        taskTitle,
        managerStatus: document.getElementById('rt-manager-status')?.value,
        faultWithdraw: Boolean(document.getElementById('rt-fault-withdraw')?.checked),
        reason: document.getElementById('rt-reason')?.value,
      },
      () => {
        document.querySelector('.modal-overlay')?.remove();
        if (onSaved) onSaved();
      }
    );
  });
}
