import { decideManagerTicket, getWorkflowTickets, getTicketBadgeClass, getTicketStatusLabel } from './ticketing.js';
import { TokenStore } from '../api/index.js';

function getSessionRole() {
  try {
    return TokenStore.getSessionUser()?.role || '';
  } catch {
    return '';
  }
}

export function renderTicketHistory(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Ticket History</h1>
        <p>Track raised tickets, routing, and manager decision status.</p>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:14px 16px">
        <div style="display:flex;gap:10px;align-items:center">
          <label class="form-label" style="margin:0">Filter by Status</label>
          <select class="form-select" id="th-status" style="width:240px">
            <option value="all">All</option>
            <option value="pending-manager-approval">Pending Manager Approval</option>
            <option value="open-withdrawal">Open Withdrawal</option>
            <option value="manager-approved">Manager Approved</option>
            <option value="manager-rejected">Manager Rejected</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title"><span class="material-icons-outlined">history</span>All Tickets</div></div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Ticket ID</th><th>Task</th><th>Route</th><th>Status</th><th>Raised By</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody id="th-body"></tbody>
        </table>
      </div>
    </div>
  `;

  const renderRows = () => {
    const currentRole = getSessionRole();
    const canDecide = ['COE Head', 'Admin/IT Head'].includes(currentRole);
    const selectedStatus = container.querySelector('#th-status')?.value || 'all';
    let tickets = getWorkflowTickets();
    if (selectedStatus !== 'all') tickets = tickets.filter(t => t.status === selectedStatus);

    const body = container.querySelector('#th-body');
    body.innerHTML = tickets.length
      ? tickets.map(t => `<tr>
          <td><span class="part-number">${t.id}</span></td>
          <td style="max-width:220px;white-space:normal;line-height:1.4;font-size:0.857rem">${t.taskId} - ${t.taskTitle}</td>
          <td>${(t.routeTo || []).join(', ')}</td>
          <td><span class="badge ${getTicketBadgeClass(t.status)} badge-sm">${getTicketStatusLabel(t.status)}</span></td>
          <td>${t.raisedBy}</td>
          <td class="text-secondary text-sm">${t.createdAt}</td>
          <td>
            ${t.status === 'pending-manager-approval' && canDecide
              ? `<button class="btn btn-success btn-xs th-manager-action" data-ticket-id="${t.id}" data-decision="approve">Approve</button>
                 <button class="btn btn-danger btn-xs th-manager-action" data-ticket-id="${t.id}" data-decision="reject">Reject</button>`
              : '<span class="text-xs text-secondary">Read only</span>'}
          </td>
        </tr>`).join('')
      : '<tr><td colspan="7" class="text-xs text-secondary">No tickets found for selected filter.</td></tr>';

    body.querySelectorAll('.th-manager-action').forEach(btn => {
      btn.addEventListener('click', () => {
        decideManagerTicket(btn.dataset.ticketId, btn.dataset.decision, renderRows);
      });
    });
  };

  container.querySelector('#th-status')?.addEventListener('change', renderRows);
  renderRows();
}
