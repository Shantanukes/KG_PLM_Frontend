import { showToast, showModal, navigateTo } from '../main.js';
import { assignWorkflow, fetchWorkflows, fetchCurrentApprovalStage, fetchPendingApprovals, approvePartNumber, rejectPartNumber, approveDrawing, rejectDrawing, authFetch, fetchPartApprovalHistory, fetchDesignerTasks, getPartById, updatePart, TokenStore } from '../api/index.js';
import { approveBom, rejectBom } from '../api/bom.js';
import { devLog } from '../utils.js';

const RUNTIME_KEY = 'kg_plm_runtime';
const SESSION_USER_KEY = 'kg_plm_session_user';

function getCurrentUserName() {
  try {
    const sessionUser = TokenStore.getSessionUser() || {};
    return sessionUser?.name || 'User';
  } catch {
    return 'User';
  }
}

function getCurrentUserRole() {
  try {
    const sessionUser = TokenStore.getSessionUser() || {};
    return sessionUser?.role || '';
  } catch {
    return '';
  }
}

function normalizeRole(role) {
  return (role || '').toString().toLowerCase().replace(/\s/g, '');
}

function isBomType(type) {
  return type === 'BOM' || type === 'BOMEntity' || (type || '').toString().toLowerCase().includes('bom');
}

function getCurrentStepText(item) {
  return item?.currentApprovalStage || item?.bomStatus || item?.stage || item?.status || 'Pending';
}

function getStageBadgeColor(step) {
  const normalized = (step || '').toString().toLowerCase();
  if (normalized.includes('completed') || normalized.includes('approved') || normalized.includes('release')) return '#10B981';
  if (normalized.includes('reject')) return '#EF4444';
  return '#F59E0B';
}

function canCurrentUserActOnApproval({ isApprovable, isDesignerRole, isHomologationRole, isBomResolved, currentUserRole }) {
  if (!isApprovable || isDesignerRole || isHomologationRole) return false;
  return !(isBomResolved && currentUserRole === 'projectmanager');
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
    </div>


    <div class="tabs" id="wf-tabs">
      <button class="tab-btn active" data-tab="my">My Tasks</button>
      <button class="tab-btn" data-tab="progress">Pending</button>
      <button class="tab-btn" data-tab="completed">Completed</button>
      <button class="tab-btn" data-tab="history">History</button>
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


  renderWFTab(container.querySelector('#wf-tab-content'), 'my');
}

async function renderWFTab(tc, tab) {
  if (tab === 'my') await renderMyTasks(tc);
  else if (tab === 'progress') await renderInProgress(tc);
  else if (tab === 'completed') await renderCompleted(tc);
  else if (tab === 'history') await renderHistory(tc);
}

async function renderMyTasks(tc) {
  let tasks = [];
  try {
    tc.innerHTML = '<div style="padding: 20px; text-align: center;">Loading workflows...</div>';
    const apiData = await fetchWorkflows();
    const fetchedTasks = Array.isArray(apiData) ? apiData : (apiData?.items || []);

    tasks = fetchedTasks.map(t => {
      const taskType = t.approvalType || t.entityType || 'Workflow';
      return {
        id: t.id ? `WF-${t.id}` : `WF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        subject: t.title || 'Untitled Task',
        type: taskType,
        step: getCurrentStepText(t),
        assignee: t.assignedUserName || t.assignedByUserName || 'System',
        started: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A',
        ref: t.entityReference || t.bomNumber || t.partNumber || '-',
        entityId: t.entityId || t.bomId || t.partId
      };
    });
  } catch (err) {
    devLog('Failed to load workflows', err);
  }

  let designerTasksHtml = '';
  if (getCurrentUserRole()?.toLowerCase() === 'designer') {
    let designerTasks = [];
    try {
      const apiData = await fetchDesignerTasks();
      designerTasks = Array.isArray(apiData) ? apiData : (apiData?.items || []);
    } catch (err) {
      devLog('Failed to load designer tasks', err);
    }

    const tableRows = designerTasks.length ? designerTasks.map(t => {
      const formattedDate = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A';
      const commentText = t.rejectionComments || '';
      const isApproved = commentText.toLowerCase().includes('approved');
      const commentColor = isApproved ? '#10B981' : '#EF4444';
      return `
        <tr>
          <td style="font-family:var(--font-mono);font-weight:600;">${t.partNumber || ''}</td>
          <td><span class="tag">${t.taskType || ''}</span></td>
          <td style="max-width:280px;white-space:normal;line-height:1.4;">${t.description || ''}</td>
          <td style="max-width:280px;white-space:normal;line-height:1.4;color:${commentColor};">${commentText}</td>
          <td>${formattedDate}</td>
          <td>
            ${['UploadDrawing', 'ReUploadDrawing'].includes(t.taskType)
          ? `<button class="btn btn-primary btn-xs nav-upload-btn" data-part="${t.partNumber || t.partId}">Upload Drawing</button>`
          : (['FixPartNumber'].includes(t.taskType)
            ? `<button class="btn btn-warning btn-xs modify-part-btn" data-partid="${t.partId}">Modify Part</button>`
            : `<button class="btn btn-outline btn-xs" onclick="window.location.hash='#/parts/${t.partId}'">View Part</button>`)}
          </td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="6" class="text-center text-secondary py-4" style="text-align: center;">No designer tasks available</td></tr>';

    designerTasksHtml = `
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header"><div class="card-title">Designer Tasks</div></div>
        <div class="card-body no-pad">
          <table class="data-table">
            <thead><tr><th>Part Number</th><th>Task Type</th><th>Description</th><th>Comments</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  tc.innerHTML = `
    ${designerTasksHtml}
    <div class="card">
      <div class="card-header">
        <div class="card-title">Pending Task Queue</div>
        <span class="badge badge-priority-high">${tasks.filter(t => t.step !== 'Completed' && t.step !== 'Approved' && t.step !== 'Rejected').length} pending</span>
      </div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Workflow ID</th><th>Subject</th><th>Type</th><th>Current Step</th><th>Assignee</th><th>Started</th><th>Part Ref</th><th>Action</th></tr></thead>
          <tbody>
            ${tasks.length ? tasks.map(t => {
    const role = (getCurrentUserRole() || '').toLowerCase();
    const isHomologation = role === 'homologation' || role === '14';
    const isDone = (t.step === 'Completed' || t.step === 'Approved' || t.step === 'Rejected');
    const bgColor = getStageBadgeColor(t.step);
    const text = t.step === 'Completed' ? 'Approved' : t.step;
    return `
              <tr style="${isDone ? 'opacity: 0.7; background: #F9FAFB;' : ''}">
                <td style="font-family:var(--font-mono);font-weight:600;">${t.id}</td>
                <td style="max-width:280px;white-space:normal;line-height:1.4;">${t.subject}</td>
                <td><span class="tag">${t.type}</span></td>
                <td><span class="badge" style="background:${bgColor}; color:#fff; border:none; padding:4px 8px; border-radius:4px;">${text}</span></td>
                <td>${t.assignee}</td>
                <td>${t.started}</td>
                <td style="font-family:var(--font-mono); font-size:0.857rem;">${t.ref}</td>
                <td>
                  ${(t.type === 'UploadDrawing' || t.type === 'ReUploadDrawing') && !isDone && !isHomologation ?
        `<button class="btn btn-primary btn-xs nav-upload-btn" data-part="${t.ref !== '-' ? t.ref : t.entityId}">Upload Drawing</button>` :
        (((t.type || '').includes('Part') || (t.type || '').toLowerCase().includes('drawing') || (t.type || '').toLowerCase().includes('bom')) && !isDone ? `<button class="btn btn-outline btn-xs view-stage-btn" data-id="${t.entityId}" data-type="${t.type}">View Stage</button>` : '')}
                </td>
              </tr>`}).join('') : '<tr><td colspan="8" class="text-center text-secondary py-4" style="text-align: center;">No pending tasks</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;

  tc.querySelectorAll('.nav-upload-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const partNum = e.target.dataset.part;
      if (partNum) navigateTo('upload-drawing', partNum);
    });
  });

  tc.querySelectorAll('.modify-part-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const partId = e.target.dataset.partid;
      if (!partId) return;

      const prevText = e.target.textContent;
      e.target.textContent = 'Loading...';
      e.target.disabled = true;

      try {
        const part = await getPartById(partId);

        const overlay = showModal('Modify Part',
          `<div class="detail-grid" style="grid-template-columns: 1fr 1fr; gap:16px;">
             <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="mod-name" value="${part.name || ''}"></div>
             <div class="form-group"><label class="form-label">Description</label><input class="form-input" id="mod-desc" value="${part.description || ''}"></div>
             <div class="form-group"><label class="form-label">Make/Buy</label>
               <select class="form-select" id="mod-makeBuy">
                 <option value="0" ${part.makeBuy === 0 ? 'selected' : ''}>Make</option>
                 <option value="1" ${part.makeBuy === 1 ? 'selected' : ''}>Buy</option>
               </select>
             </div>
             <div class="form-group"><label class="form-label">Release Flag</label><input class="form-input" type="number" id="mod-release" value="${part.releaseFlag || 0}"></div>
             <div class="form-group"><label class="form-label">EE Release</label><input class="form-input" type="number" id="mod-eeRelease" value="${part.eeRelease || 0}"></div>
             <div class="form-group"><label class="form-label">Weight</label><input class="form-input" type="number" id="mod-weight" value="${part.weight || 0}"></div>
             <div class="form-group"><label class="form-label">UoM</label><input class="form-input" id="mod-uom" value="${part.unitOfMeasure || ''}"></div>
             <div class="form-group"><label class="form-label">GST Code</label><input class="form-input" id="mod-gst" value="${part.gstCode || ''}"></div>
             <div class="form-group"><label class="form-label">Supplier Name</label><input class="form-input" id="mod-suppName" value="${part.supplierName || ''}"></div>
             <div class="form-group"><label class="form-label">Supplier Email</label><input class="form-input" id="mod-suppEmail" value="${part.supplierEmail || ''}"></div>
             <div class="form-group"><label class="form-label">Lifecycle Status</label><input class="form-input" type="number" id="mod-lifecycle" value="${part.lifecycleStatus || 0}"></div>
             <div class="form-group"><label class="form-label">Quantity</label><input class="form-input" type="number" id="mod-qty" value="${part.quantity || 0}"></div>
             <div class="form-group" style="grid-column: 1 / -1;"><label class="form-label">Homologation Status</label><input class="form-input" type="number" id="mod-homol" value="${part.homologationStatus || 0}"></div>
           </div>`,
          `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
           <button class="btn btn-primary" id="save-mod-part">Update Part</button>`
        );

        overlay.querySelector('#save-mod-part').addEventListener('click', async (btnEv) => {
          const sBtn = btnEv.target;
          sBtn.textContent = 'Updating...';
          sBtn.disabled = true;

          const payload = {
            name: overlay.querySelector('#mod-name').value.trim(),
            description: overlay.querySelector('#mod-desc').value.trim(),
            makeBuy: parseInt(overlay.querySelector('#mod-makeBuy').value, 10) || 0,
            releaseFlag: parseInt(overlay.querySelector('#mod-release').value, 10) || 0,
            eeRelease: parseInt(overlay.querySelector('#mod-eeRelease').value, 10) || 0,
            weight: parseFloat(overlay.querySelector('#mod-weight').value) || 0,
            unitOfMeasure: overlay.querySelector('#mod-uom').value.trim(),
            gstCode: overlay.querySelector('#mod-gst').value.trim(),
            supplierName: overlay.querySelector('#mod-suppName').value.trim(),
            supplierEmail: overlay.querySelector('#mod-suppEmail').value.trim(),
            lifecycleStatus: parseInt(overlay.querySelector('#mod-lifecycle').value, 10) || 0,
            quantity: parseInt(overlay.querySelector('#mod-qty').value, 10) || 0,
            homologationStatus: parseInt(overlay.querySelector('#mod-homol').value, 10) || 0
          };

          try {
            await updatePart(partId, payload);
            showToast('Part updated successfully', 'success');
            overlay.remove();
          } catch (err) {
            showToast(err.message || 'Update failed', 'error');
            sBtn.textContent = 'Update Part';
            sBtn.disabled = false;
          }
        });

      } catch (err) {
        showToast('Failed to load part details', 'error');
      } finally {
        e.target.textContent = prevText;
        e.target.disabled = false;
      }
    });
  });

  tc.querySelectorAll('.view-stage-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const entityId = e.target.dataset.id;
      if (!entityId || entityId === 'undefined') return showToast('Entity ID not found', 'error');

      const prevText = e.target.textContent;
      e.target.textContent = 'Loading...';
      e.target.disabled = true;

      try {
        const itemType = e.target.dataset.type;
        const isBomItem = isBomType(itemType);
        const res = isBomItem
          ? await authFetch('/api/BOM/' + entityId + '/approval-status')
          : await authFetch('/api/Parts/' + entityId + '/current-approval-stage');

        if (res.ok) {
          const data = await res.json();
          const resolvedType = data.approvalType || (isBomItem ? 'BOM' : itemType);
          const isBomResolved = isBomType(resolvedType);
          const isApprovable = resolvedType === 'PartNumber' || resolvedType?.toLowerCase() === 'drawing' || isBomResolved;
          const currentUserRole = normalizeRole(getCurrentUserRole());
          const isDesignerRole = currentUserRole === 'designer';
          const isHomologationRole = currentUserRole === 'homologation' || currentUserRole === '14';
          const isDesignerRejected = isDesignerRole && ((data.status || '').toLowerCase() === 'rejected' || (data.result || '').toLowerCase() === 'rejected' || (data.currentApprovalStage || '').toLowerCase().includes('reject'));
          const isProjectManagerPartStage = currentUserRole === 'projectmanager' &&
            (resolvedType === 'PartNumber' || resolvedType === 'Part' || itemType === 'Part' || itemType === 'PartNumber') &&
            ((data.role || '').toLowerCase() === 'projectmanager' || (data.currentApprovalStage || '').toLowerCase().includes('projectmanager') || (data.currentApprovalStage || '').toLowerCase().includes('pm'));
          const canActOnApproval = canCurrentUserActOnApproval({ isApprovable, isDesignerRole, isHomologationRole, isBomResolved, currentUserRole });
          const currentStage = data.currentApprovalStage || data.bomStatus || 'N/A';

          const overlay = showModal('Current Approval Stage',
            `<div style="font-family:var(--font-mono); font-size:14px; line-height: 1.6; padding: 10px;">
               <div style="margin-bottom: 12px;"><strong>Approval Type:</strong> ${resolvedType || 'N/A'}</div>
               <div style="margin-bottom: 12px;"><strong>Current Step:</strong> <span class="badge" style="background:${getStageBadgeColor(currentStage)};color:#fff;">${currentStage}</span></div>
               ${isBomResolved ? `
                 <div style="margin-bottom: 12px;"><strong>Part:</strong> ${data.partNumber || '-'} (${data.partName || '-'})</div>
                 <div><strong>Stages:</strong> ${data.totalStagesCompleted ?? 0} completed, ${data.totalStagesRemaining ?? 0} remaining</div>
               ` : `
                 <div style="margin-bottom: 12px;"><strong>Assigned To:</strong> ${data.name || 'N/A'}</div>
                 <div><strong>Role:</strong> ${data.role || 'N/A'}</div>
               `}
               ${canActOnApproval ? `
                 <hr style="margin: 16px 0; border: none; border-top: 1px solid var(--border-light);" />
                 <div class="form-group" style="margin-bottom: 12px;">
                   <label class="form-label">Comments</label>
                   <textarea class="form-input" id="stage-comments" rows="2" placeholder="Enter approval/rejection comments..."></textarea>
                 </div>
                 ${!isBomResolved ? `
                 <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
                   <input type="checkbox" id="stage-revert-designer" />
                   <label for="stage-revert-designer" style="font-size: 13px;">Revert to Designer </label>
                 </div>
                 ${currentUserRole === 'coehead' ? `
                 <div class="form-group" style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                   <input type="checkbox" id="stage-revert-pm-checkbox" onchange="document.getElementById('pm-dropdown-wrapper').style.display = this.checked ? 'block' : 'none'; if(!this.checked) document.getElementById('stage-pm-dropdown').value='';" />
                   <label for="stage-revert-pm-checkbox" style="font-size: 13px;">Revert through PM</label>
                 </div>
                 <div id="pm-dropdown-wrapper" style="display:none; margin-top: 8px;" class="form-group">
                   <label class="form-label" style="font-size: 13px;">Select Project Manager</label>
                   <select class="form-select" id="stage-pm-dropdown">
                     <option value="">Select a PM...</option>
                   </select>
                 </div>` : ''}
                 ${currentUserRole === 'projectmanager' ? `
                 <div class="form-group" style="margin-top: 12px;">
                   <label class="form-label" style="font-size: 13px;">Proto Study User</label>
                   <select class="form-select" id="stage-proto-study-select">
                     <option value="0">Select User...</option>
                   </select>
                 </div>
                 <div class="form-group" style="margin-top: 12px;">
                   <label class="form-label" style="font-size: 13px;">Proto Approval User</label>
                   <select class="form-select" id="stage-proto-approval-select">
                     <option value="0">Select User...</option>
                   </select>
                 </div>` : ''}
                 ` : ''}
               ` : ''}
             </div>`,
            `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
             ${canActOnApproval ? `
               ${isProjectManagerPartStage ? `<button class="btn btn-outline" style="border-color:#10B981;color:#10B981" id="release-flag-btn">Release Flag</button>` : ''}
               <button class="btn btn-danger" id="reject-stage-btn">Reject</button>
               <button class="btn btn-primary" id="approve-stage-btn">Approve</button>
             ` : ''}
             ${isDesignerRejected ? `
               <button class="btn btn-primary" id="resubmit-stage-btn">Resubmit</button>
             ` : ''}`
          );

          if (canActOnApproval || isDesignerRejected) {
            if (isProjectManagerPartStage) {
              overlay.querySelector('#release-flag-btn')?.addEventListener('click', () => {
                showModal('Update Release Flag',
                  `<div class="form-group" style="margin-bottom: 12px;">
                     <label class="form-label" style="font-size: 13px;">RELEASE FLAG <span style="color:#DC2626">*</span></label>
                     <select class="form-select" id="release-flag-select">
                       <option value="0">E-Release</option>
                       <option value="1">FS-Release</option>
                       <option value="2">Proto</option>
                     </select>
                   </div>
                   <div class="form-group" style="margin-bottom: 12px;">
                     <label class="form-label" style="font-size: 13px;">Comments</label>
                     <textarea class="form-input" id="release-flag-comments" rows="2" placeholder="Enter comments..."></textarea>
                   </div>`,
                  `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                   <button class="btn btn-primary" id="confirm-release-flag">Submit</button>`
                );
                setTimeout(() => {
                  document.getElementById('confirm-release-flag')?.addEventListener('click', async (btnEv) => {
                    const confBtn = btnEv.target;
                    const flagSelect = document.getElementById('release-flag-select');
                    const flagComments = document.getElementById('release-flag-comments');
                    const newFlag = flagSelect ? parseInt(flagSelect.value, 10) : 0;
                    const comments = flagComments ? flagComments.value.trim() : '';

                    confBtn.textContent = 'Updating...';
                    confBtn.disabled = true;
                    try {
                      const res = await authFetch('/api/Parts/' + entityId + '/convert-release-flag', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newFlag, comments })
                      });
                      if (res.ok) {
                        showToast('Release Flag updated successfully.', 'success');
                        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
                        const activeTabBtn = document.querySelector('#wf-tabs .tab-btn.active');
                        if (activeTabBtn) {
                          renderWFTab(document.querySelector('#wf-tab-content'), activeTabBtn.dataset.tab);
                        } else {
                          renderWorkflows(document.querySelector('.main-content') || document.body);
                        }
                      } else {
                        const errText = await res.text();
                        showToast('Unable to update Release Flag. ' + errText, 'error');
                        confBtn.textContent = 'Submit';
                        confBtn.disabled = false;
                      }
                    } catch (err) {
                      showToast('Unable to update Release Flag.', 'error');
                      confBtn.textContent = 'Submit';
                      confBtn.disabled = false;
                    }
                  });
                }, 50);
              });
            }

            const revertPmCheckbox = document.getElementById('stage-revert-pm-checkbox');
            const pmSelect = document.getElementById('stage-pm-dropdown');

            if (revertPmCheckbox && pmSelect) {
              revertPmCheckbox.addEventListener('change', async (e) => {
                if (e.target.checked) {
                  if (pmSelect.options.length <= 1) {
                    try {
                      pmSelect.innerHTML = '<option value="">Loading...</option>';
                      const res = await authFetch('/api/Parts/project-managers');
                      if (res.ok) {
                        const pms = await res.json();
                        pmSelect.innerHTML = '<option value="">Select a PM...</option>' +
                          pms.map(pm => `<option value="${pm.id}">${pm.fullName}</option>`).join('');
                      } else {
                        pmSelect.innerHTML = '<option value="">Failed to load PMs</option>';
                      }
                    } catch (err) {
                      pmSelect.innerHTML = '<option value="">Error loading PMs</option>';
                    }
                  }
                } else {
                  pmSelect.value = '';
                }
              });
            }

            const protoStudySelect = document.getElementById('stage-proto-study-select');
            const protoApprovalSelect = document.getElementById('stage-proto-approval-select');
            if (protoStudySelect && protoApprovalSelect) {
              try {
                const res = await authFetch('/api/Members');
                if (res.ok) {
                  const membersData = await res.json();
                  const membersList = Array.isArray(membersData) ? membersData : (Object.keys(membersData).filter(k => Array.isArray(membersData[k])).length > 0 ? membersData[Object.keys(membersData).filter(k => Array.isArray(membersData[k]))[0]] : [membersData]);
                  const optionsHtml = '<option value="0">Select User...</option>' + membersList.map(m => `<option value="${m.id || m.userId || 0}">${m.fullName || m.name || 'Unknown'}</option>`).join('');
                  protoStudySelect.innerHTML = optionsHtml;
                  protoApprovalSelect.innerHTML = optionsHtml;
                }
              } catch (err) {
                devLog('Failed to load members for proto users', err);
              }
            }

            overlay.querySelector('#approve-stage-btn')?.addEventListener('click', async (btnEv) => {
              const comments = overlay.querySelector('#stage-comments')?.value?.trim() || '';

              const cb = document.getElementById('stage-revert-pm-checkbox');
              const revertThroughPM = cb ? cb.checked : false;

              const sel = document.getElementById('stage-pm-dropdown');
              const selectedPMId = sel && sel.value ? parseInt(sel.value, 10) : 0;

              if (revertThroughPM && (!selectedPMId || isNaN(selectedPMId))) {
                showToast('Please select a Project Manager before proceeding', 'warning');
                return;
              }

              const pStudy = document.getElementById('stage-proto-study-select');
              const pApprove = document.getElementById('stage-proto-approval-select');
              const protoStudyUserId = pStudy && pStudy.value ? parseInt(pStudy.value, 10) : 0;
              const protoApprovalUserId = pApprove && pApprove.value ? parseInt(pApprove.value, 10) : 0;

              const btn = btnEv.currentTarget;
              btn.disabled = true;
              btn.textContent = 'Approving...';
              try {
                const payload = {
                  comments,
                  revertToDesigner: false,
                  revertThroughPM,
                  selectedPMId: revertThroughPM ? (selectedPMId || 0) : 0,
                  protoStudyUserId,
                  protoApprovalUserId
                };
                if (isBomResolved) {
                  await approveBom(entityId, payload);
                } else if (resolvedType === 'PartNumber') {
                  await approvePartNumber(entityId, payload);
                } else {
                  await approveDrawing(entityId, payload);
                }
                showToast('Approved successfully', 'success');
                overlay.remove();
                const activeTab = document.querySelector('#wf-tabs .tab-btn.active')?.dataset.tab;
                if (activeTab) renderWFTab(document.querySelector('#wf-tab-content'), activeTab);
              } catch (e) {
                showToast('Failed to approve', 'error');
                btn.disabled = false;
                btn.textContent = 'Approve';
              }
            });

            overlay.querySelector('#reject-stage-btn')?.addEventListener('click', async (btnEv) => {
              const comments = overlay.querySelector('#stage-comments')?.value?.trim() || '';
              const revertToDesigner = overlay.querySelector('#stage-revert-designer')?.checked || false;

              const cb = document.getElementById('stage-revert-pm-checkbox');
              const revertThroughPM = cb ? cb.checked : false;

              const sel = document.getElementById('stage-pm-dropdown');
              const selectedPMId = sel && sel.value ? parseInt(sel.value, 10) : 0;

              if (revertThroughPM && (!selectedPMId || isNaN(selectedPMId))) {
                showToast('Please select a Project Manager before proceeding', 'warning');
                return;
              }

              const pStudy = document.getElementById('stage-proto-study-select');
              const pApprove = document.getElementById('stage-proto-approval-select');
              const protoStudyUserId = pStudy && pStudy.value ? parseInt(pStudy.value, 10) : 0;
              const protoApprovalUserId = pApprove && pApprove.value ? parseInt(pApprove.value, 10) : 0;

              const btn = btnEv.currentTarget;
              btn.disabled = true;
              btn.textContent = 'Rejecting...';
              try {
                const payload = {
                  comments,
                  revertToDesigner,
                  revertThroughPM,
                  selectedPMId: revertThroughPM ? (selectedPMId || 0) : 0,
                  protoStudyUserId,
                  protoApprovalUserId
                };
                if (isBomResolved) {
                  await rejectBom(entityId, payload);
                } else if (resolvedType === 'PartNumber') {
                  await rejectPartNumber(entityId, payload);
                } else {
                  await rejectDrawing(entityId, payload);
                }
                showToast('Rejected successfully', 'success');
                overlay.remove();
                const activeTab = document.querySelector('#wf-tabs .tab-btn.active')?.dataset.tab;
                if (activeTab) renderWFTab(document.querySelector('#wf-tab-content'), activeTab);
              } catch (e) {
                showToast('Failed to reject', 'error');
                btn.disabled = false;
                btn.textContent = 'Reject';
              }
            });

            overlay.querySelector('#resubmit-stage-btn')?.addEventListener('click', async (btnEv) => {
              const comments = overlay.querySelector('#stage-comments')?.value?.trim() || '';

              const btn = btnEv.currentTarget;
              btn.disabled = true;
              btn.textContent = 'Resubmitting...';
              try {
                const payload = {
                  comments,
                  revertToDesigner: true,
                  revertThroughPM: true,
                  selectedPMId: 0,
                  protoStudyUserId: 0,
                  protoApprovalUserId: 0
                };

                const res = await authFetch('/api/Parts/' + entityId + '/resubmit-part-number', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                  headers: { 'Content-Type': 'application/json' }
                });

                if (res.ok) {
                  showToast('Resubmitted successfully', 'success');
                  overlay.remove();
                  const activeTab = document.querySelector('#wf-tabs .tab-btn.active')?.dataset.tab;
                  if (activeTab) renderWFTab(document.querySelector('#wf-tab-content'), activeTab);
                } else {
                  showToast('Failed to resubmit', 'error');
                  btn.disabled = false;
                  btn.textContent = 'Resubmit';
                }
              } catch (e) {
                showToast('Failed to resubmit', 'error');
                btn.disabled = false;
                btn.textContent = 'Resubmit';
              }
            });
          }
        } else {
          showToast('Failed to fetch approval stage', 'error');
        }
      } catch (err) {
        showToast('Error fetching approval stage', 'error');
      } finally {
        e.target.textContent = prevText;
        e.target.disabled = false;
      }
    });
  });

}

async function renderInProgress(tc) {
  tc.innerHTML = '<div style="padding: 20px; text-align: center;">Loading Pending workflows...</div>';
  let tasks = [];
  try {
    const apiData = await fetchPendingApprovals();
    const fetchedTasks = Array.isArray(apiData) ? apiData : (apiData?.items || []);

    tasks = fetchedTasks.map(t => {
      return {
        id: t.approvalId ? `APP-${t.approvalId}` : `WF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        subject: `Review ${t.approvalType || 'Approval'}: ${t.partName || ''} — ${t.stage || ''}`,
        type: t.approvalType || 'Workflow',
        step: getCurrentStepText(t),
        assignee: 'Me',
        started: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A',
        ref: t.partNumber || t.bomNumber || '-',
        entityId: t.entityId || t.bomId || t.partId
      };
    });
  } catch (err) {
    devLog('Failed to load Pending workflows', err);
  }

  tc.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">Pending Workflows</div></div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Workflow ID</th><th>Subject</th><th>Type</th><th>Current Step</th><th>Assignee</th><th>Started</th><th>Part Ref</th><th>Action</th></tr></thead>
          <tbody>
            ${tasks.length ? tasks.map(t => `
              <tr>
                <td style="font-family:var(--font-mono);font-weight:600;">${t.id}</td>
                <td style="max-width:280px;white-space:normal;line-height:1.4;">${t.subject}</td>
                <td><span class="tag">${t.type}</span></td>
                <td><span class="badge" style="background:${getStageBadgeColor(t.step)}; color:#fff; border:none; padding:4px 8px; border-radius:4px;">${t.step}</span></td>
                <td>${t.assignee}</td>
                <td>${t.started}</td>
                <td style="font-family:var(--font-mono); font-size:0.857rem;">${t.ref}</td>
                <td>
                  <button class="btn btn-outline btn-xs view-wf-btn" data-id="${t.id}" style="margin-right:4px;">View</button>
                  ${(t.type === 'UploadDrawing' || t.type === 'ReUploadDrawing') ?
      `<button class="btn btn-primary btn-xs nav-upload-btn" data-part="${t.ref !== '-' ? t.ref : t.entityId}">Upload Drawing</button>` :
      ((t.type === 'Part' || t.type === 'PartNumber' || t.type?.toLowerCase() === 'drawing' || isBomType(t.type)) ? `<button class="btn btn-outline btn-xs view-stage-btn" data-id="${t.entityId}" data-type="${t.type}">View Stage</button>` : '')}
                </td>
              </tr>
            `).join('') : '<tr><td colspan="8" class="text-center text-secondary py-4" style="text-align: center;">No Pending workflows</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;

  tc.querySelectorAll('.view-wf-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast(`Opening workflow ${btn.dataset.id}…`, 'info'));
  });

  tc.querySelectorAll('.nav-upload-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const partNum = e.target.dataset.part;
      if (partNum) navigateTo('upload-drawing', partNum);
    });
  });

  tc.querySelectorAll('.view-stage-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const entityId = e.target.dataset.id;
      if (!entityId || entityId === 'undefined') return showToast('Entity ID not found', 'error');

      const prevText = e.target.textContent;
      e.target.textContent = 'Loading...';
      e.target.disabled = true;

      try {
        const itemType = e.target.dataset.type;
        const isBomItem = isBomType(itemType);
        const res = isBomItem
          ? await authFetch('/api/BOM/' + entityId + '/approval-status')
          : await authFetch('/api/Parts/' + entityId + '/current-approval-stage');

        if (res.ok) {
          const data = await res.json();
          const resolvedType = data.approvalType || (isBomItem ? 'BOM' : itemType);
          const isBomResolved = isBomType(resolvedType);
          const isApprovable = resolvedType === 'PartNumber' || resolvedType?.toLowerCase() === 'drawing' || isBomResolved;

          const currentUserRole = normalizeRole(getCurrentUserRole());
          const isDesignerRole = currentUserRole === 'designer';
          const isHomologationRole = currentUserRole === 'homologation' || currentUserRole === '14';
          const isDesignerRejected = isDesignerRole && ((data.status || '').toLowerCase() === 'rejected' || (data.result || '').toLowerCase() === 'rejected' || (data.currentApprovalStage || '').toLowerCase().includes('reject'));
          const isProjectManagerPartStage = currentUserRole === 'projectmanager' &&
            (resolvedType === 'PartNumber' || resolvedType === 'Part' || itemType === 'Part' || itemType === 'PartNumber') &&
            ((data.role || '').toLowerCase() === 'projectmanager' || (data.currentApprovalStage || '').toLowerCase().includes('projectmanager') || (data.currentApprovalStage || '').toLowerCase().includes('pm'));
          const canActOnApproval = canCurrentUserActOnApproval({ isApprovable, isDesignerRole, isHomologationRole, isBomResolved, currentUserRole });
          const currentStage = data.currentApprovalStage || data.bomStatus || 'N/A';

          const overlay = showModal('Current Approval Stage',
            `<div style="font-family:var(--font-mono); font-size:14px; line-height: 1.6; padding: 10px;">
               <div style="margin-bottom: 12px;"><strong>Approval Type:</strong> ${resolvedType || 'N/A'}</div>
               <div style="margin-bottom: 12px;"><strong>Current Step:</strong> <span class="badge" style="background:${getStageBadgeColor(currentStage)};color:#fff;">${currentStage}</span></div>
               ${isBomResolved ? `
                 <div style="margin-bottom: 12px;"><strong>Part:</strong> ${data.partNumber || '-'} (${data.partName || '-'})</div>
                 <div><strong>Stages:</strong> ${data.totalStagesCompleted ?? 0} completed, ${data.totalStagesRemaining ?? 0} remaining</div>
               ` : `
                 <div style="margin-bottom: 12px;"><strong>Assigned To:</strong> ${data.name || 'N/A'}</div>
                 <div><strong>Role:</strong> ${data.role || 'N/A'}</div>
               `}
               ${canActOnApproval ? `
                 <hr style="margin: 16px 0; border: none; border-top: 1px solid var(--border-light);" />
                 <div class="form-group" style="margin-bottom: 12px;">
                   <label class="form-label">Comments</label>
                   <textarea class="form-input" id="stage-comments" rows="2" placeholder="Enter approval/rejection comments..."></textarea>
                 </div>
                 ${!isBomResolved ? `
                 <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
                   <input type="checkbox" id="stage-revert-designer" />
                   <label for="stage-revert-designer" style="font-size: 13px;">Revert to Designer </label>
                 </div>
                 ${currentUserRole === 'coehead' ? `
                 <div class="form-group" style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                   <input type="checkbox" id="stage-revert-pm-checkbox" onchange="document.getElementById('pm-dropdown-wrapper').style.display = this.checked ? 'block' : 'none'; if(!this.checked) document.getElementById('stage-pm-dropdown').value='';" />
                   <label for="stage-revert-pm-checkbox" style="font-size: 13px;">Revert through PM</label>
                 </div>
                 <div id="pm-dropdown-wrapper" style="display:none; margin-top: 8px;" class="form-group">
                   <label class="form-label" style="font-size: 13px;">Select Project Manager</label>
                   <select class="form-select" id="stage-pm-dropdown">
                     <option value="">Select a PM...</option>
                   </select>
                 </div>` : ''}
                 ${currentUserRole === 'projectmanager' ? `
                 <div class="form-group" style="margin-top: 12px;">
                   <label class="form-label" style="font-size: 13px;">Proto Study User</label>
                   <select class="form-select" id="stage-proto-study-select">
                     <option value="0">Select User...</option>
                   </select>
                 </div>
                 <div class="form-group" style="margin-top: 12px;">
                   <label class="form-label" style="font-size: 13px;">Proto Approval User</label>
                   <select class="form-select" id="stage-proto-approval-select">
                     <option value="0">Select User...</option>
                   </select>
                 </div>` : ''}
                 ` : ''}
               ` : ''}
             </div>`,
            `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
             ${canActOnApproval ? `
               ${isProjectManagerPartStage ? `<button class="btn btn-outline" style="border-color:#10B981;color:#10B981" id="release-flag-btn">Release Flag</button>` : ''}
               <button class="btn btn-danger" id="reject-stage-btn">Reject</button>
               <button class="btn btn-primary" id="approve-stage-btn">Approve</button>
             ` : ''}
             ${isDesignerRejected ? `
               <button class="btn btn-primary" id="resubmit-stage-btn">Resubmit</button>
             ` : ''}`
          );

          if (canActOnApproval || isDesignerRejected) {
            if (isProjectManagerPartStage) {
              overlay.querySelector('#release-flag-btn')?.addEventListener('click', () => {
                showModal('Update Release Flag',
                  `<div class="form-group" style="margin-bottom: 12px;">
                     <label class="form-label" style="font-size: 13px;">RELEASE FLAG <span style="color:#DC2626">*</span></label>
                     <select class="form-select" id="release-flag-select">
                       <option value="0">E-Release</option>
                       <option value="1">FS-Release</option>
                       <option value="2">Proto</option>
                     </select>
                   </div>
                   <div class="form-group" style="margin-bottom: 12px;">
                     <label class="form-label" style="font-size: 13px;">Comments</label>
                     <textarea class="form-input" id="release-flag-comments" rows="2" placeholder="Enter comments..."></textarea>
                   </div>`,
                  `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                   <button class="btn btn-primary" id="confirm-release-flag">Submit</button>`
                );
                setTimeout(() => {
                  document.getElementById('confirm-release-flag')?.addEventListener('click', async (btnEv) => {
                    const confBtn = btnEv.target;
                    const flagSelect = document.getElementById('release-flag-select');
                    const flagComments = document.getElementById('release-flag-comments');
                    const newFlag = flagSelect ? parseInt(flagSelect.value, 10) : 0;
                    const comments = flagComments ? flagComments.value.trim() : '';

                    confBtn.textContent = 'Updating...';
                    confBtn.disabled = true;
                    try {
                      const res = await authFetch('/api/Parts/' + entityId + '/convert-release-flag', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newFlag, comments })
                      });
                      if (res.ok) {
                        showToast('Release Flag updated successfully.', 'success');
                        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
                        const activeTabBtn = document.querySelector('#wf-tabs .tab-btn.active');
                        if (activeTabBtn) {
                          renderWFTab(document.querySelector('#wf-tab-content'), activeTabBtn.dataset.tab);
                        } else {
                          renderWorkflows(document.querySelector('.main-content') || document.body);
                        }
                      } else {
                        const errText = await res.text();
                        showToast('Unable to update Release Flag. ' + errText, 'error');
                        confBtn.textContent = 'Submit';
                        confBtn.disabled = false;
                      }
                    } catch (err) {
                      showToast('Unable to update Release Flag.', 'error');
                      confBtn.textContent = 'Submit';
                      confBtn.disabled = false;
                    }
                  });
                }, 50);
              });
            }

            const revertPmCheckbox = document.getElementById('stage-revert-pm-checkbox');
            const pmSelect = document.getElementById('stage-pm-dropdown');

            if (revertPmCheckbox && pmSelect) {
              revertPmCheckbox.addEventListener('change', async (e) => {
                if (e.target.checked) {
                  if (pmSelect.options.length <= 1) {
                    try {
                      pmSelect.innerHTML = '<option value="">Loading...</option>';
                      const res = await authFetch('/api/Parts/project-managers');
                      if (res.ok) {
                        const pms = await res.json();
                        pmSelect.innerHTML = '<option value="">Select a PM...</option>' +
                          pms.map(pm => `<option value="${pm.id}">${pm.fullName}</option>`).join('');
                      } else {
                        pmSelect.innerHTML = '<option value="">Failed to load PMs</option>';
                      }
                    } catch (err) {
                      pmSelect.innerHTML = '<option value="">Error loading PMs</option>';
                    }
                  }
                } else {
                  pmSelect.value = '';
                }
              });
            }

            const protoStudySelect = document.getElementById('stage-proto-study-select');
            const protoApprovalSelect = document.getElementById('stage-proto-approval-select');
            if (protoStudySelect && protoApprovalSelect) {
              try {
                const res = await authFetch('/api/Members');
                if (res.ok) {
                  const membersData = await res.json();
                  const membersList = Array.isArray(membersData) ? membersData : (Object.keys(membersData).filter(k => Array.isArray(membersData[k])).length > 0 ? membersData[Object.keys(membersData).filter(k => Array.isArray(membersData[k]))[0]] : [membersData]);
                  const optionsHtml = '<option value="0">Select User...</option>' + membersList.map(m => `<option value="${m.id || m.userId || 0}">${m.fullName || m.name || 'Unknown'}</option>`).join('');
                  protoStudySelect.innerHTML = optionsHtml;
                  protoApprovalSelect.innerHTML = optionsHtml;
                }
              } catch (err) {
                devLog('Failed to load members for proto users', err);
              }
            }

            overlay.querySelector('#approve-stage-btn')?.addEventListener('click', async (btnEv) => {
              const comments = overlay.querySelector('#stage-comments')?.value?.trim() || '';

              const cb = document.getElementById('stage-revert-pm-checkbox');
              const revertThroughPM = cb ? cb.checked : false;

              const sel = document.getElementById('stage-pm-dropdown');
              const selectedPMId = sel && sel.value ? parseInt(sel.value, 10) : 0;

              if (revertThroughPM && (!selectedPMId || isNaN(selectedPMId))) {
                showToast('Please select a Project Manager before proceeding', 'warning');
                return;
              }

              const pStudy = document.getElementById('stage-proto-study-select');
              const pApprove = document.getElementById('stage-proto-approval-select');
              const protoStudyUserId = pStudy && pStudy.value ? parseInt(pStudy.value, 10) : 0;
              const protoApprovalUserId = pApprove && pApprove.value ? parseInt(pApprove.value, 10) : 0;

              const btn = btnEv.currentTarget;
              btn.disabled = true;
              btn.textContent = 'Approving...';
              try {
                const payload = {
                  comments,
                  revertToDesigner: false,
                  revertThroughPM,
                  selectedPMId: revertThroughPM ? (selectedPMId || 0) : 0,
                  protoStudyUserId,
                  protoApprovalUserId
                };
                if (isBomResolved) {
                  await approveBom(entityId, payload);
                } else if (resolvedType === 'PartNumber') {
                  await approvePartNumber(entityId, payload);
                } else {
                  await approveDrawing(entityId, payload);
                }
                showToast('Approved successfully', 'success');
                overlay.remove();
                const activeTab = document.querySelector('#wf-tabs .tab-btn.active')?.dataset.tab;
                if (activeTab) renderWFTab(document.querySelector('#wf-tab-content'), activeTab);
              } catch (e) {
                showToast('Failed to approve', 'error');
                btn.disabled = false;
                btn.textContent = 'Approve';
              }
            });

            overlay.querySelector('#reject-stage-btn')?.addEventListener('click', async (btnEv) => {
              const comments = overlay.querySelector('#stage-comments')?.value?.trim() || '';
              const revertToDesigner = overlay.querySelector('#stage-revert-designer')?.checked || false;

              const cb = document.getElementById('stage-revert-pm-checkbox');
              const revertThroughPM = cb ? cb.checked : false;

              const sel = document.getElementById('stage-pm-dropdown');
              const selectedPMId = sel && sel.value ? parseInt(sel.value, 10) : 0;

              if (revertThroughPM && (!selectedPMId || isNaN(selectedPMId))) {
                showToast('Please select a Project Manager before proceeding', 'warning');
                return;
              }

              const pStudy = document.getElementById('stage-proto-study-select');
              const pApprove = document.getElementById('stage-proto-approval-select');
              const protoStudyUserId = pStudy && pStudy.value ? parseInt(pStudy.value, 10) : 0;
              const protoApprovalUserId = pApprove && pApprove.value ? parseInt(pApprove.value, 10) : 0;

              const btn = btnEv.currentTarget;
              btn.disabled = true;
              btn.textContent = 'Rejecting...';
              try {
                const payload = {
                  comments,
                  revertToDesigner,
                  revertThroughPM,
                  selectedPMId: revertThroughPM ? (selectedPMId || 0) : 0,
                  protoStudyUserId,
                  protoApprovalUserId
                };
                if (isBomResolved) {
                  await rejectBom(entityId, payload);
                } else if (resolvedType === 'PartNumber') {
                  await rejectPartNumber(entityId, payload);
                } else {
                  await rejectDrawing(entityId, payload);
                }
                showToast('Rejected successfully', 'success');
                overlay.remove();
                const activeTab = document.querySelector('#wf-tabs .tab-btn.active')?.dataset.tab;
                if (activeTab) renderWFTab(document.querySelector('#wf-tab-content'), activeTab);
              } catch (e) {
                showToast('Failed to reject', 'error');
                btn.disabled = false;
                btn.textContent = 'Reject';
              }
            });

            overlay.querySelector('#resubmit-stage-btn')?.addEventListener('click', async (btnEv) => {
              const comments = overlay.querySelector('#stage-comments')?.value?.trim() || '';

              const btn = btnEv.currentTarget;
              btn.disabled = true;
              btn.textContent = 'Resubmitting...';
              try {
                const payload = {
                  comments,
                  revertToDesigner: true,
                  revertThroughPM: true,
                  selectedPMId: 0,
                  protoStudyUserId: 0,
                  protoApprovalUserId: 0
                };

                const res = await authFetch('/api/Parts/' + entityId + '/resubmit-part-number', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                  headers: { 'Content-Type': 'application/json' }
                });

                if (res.ok) {
                  showToast('Resubmitted successfully', 'success');
                  overlay.remove();
                  const activeTab = document.querySelector('#wf-tabs .tab-btn.active')?.dataset.tab;
                  if (activeTab) renderWFTab(document.querySelector('#wf-tab-content'), activeTab);
                } else {
                  showToast('Failed to resubmit', 'error');
                  btn.disabled = false;
                  btn.textContent = 'Resubmit';
                }
              } catch (e) {
                showToast('Failed to resubmit', 'error');
                btn.disabled = false;
                btn.textContent = 'Resubmit';
              }
            });
          }
        } else {
          showToast('Failed to fetch approval stage', 'error');
        }
      } catch (err) {
        showToast('Error fetching approval stage', 'error');
      } finally {
        e.target.textContent = prevText;
        e.target.disabled = false;
      }
    });
  });
}

async function renderCompleted(tc) {
  tc.innerHTML = '<div style="padding: 20px; text-align: center;">Loading Completed workflows...</div>';
  let completedTasks = [];
  try {
    const apiData = await fetchWorkflows();
    const fetchedTasks = Array.isArray(apiData) ? apiData : (apiData?.items || []);

    completedTasks = fetchedTasks.filter(t => t.status === 'Completed' || t.status === 'Approved' || t.status === 'Rejected').map(t => {
      return {
        id: t.id ? `WF-${t.id}` : `WF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        subject: t.title || 'Untitled Task',
        type: t.entityType || 'Workflow',
        step: t.status || 'Completed',
        assignee: t.assignedUserName || t.assignedByUserName || 'System',
        started: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A',
        ref: t.entityReference || '-',
        entityId: t.entityId
      };
    });
  } catch (err) {
    devLog('Failed to load completed workflows', err);
  }

  tc.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">Completed Workflows</div><div class="text-xs text-secondary">Last 30 days · ${completedTasks.length} completed</div></div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Workflow ID</th><th>Subject</th><th>Type</th><th>Result</th><th>Assignee</th><th>Date</th><th>Part Ref</th></tr></thead>
          <tbody>
            ${completedTasks.length ? completedTasks.map(t => {
    const text = t.step === 'Completed' ? 'Approved' : t.step;
    const bgColor = (t.step === 'Completed' || t.step === 'Approved') ? '#10B981' : (t.step === 'Rejected' ? '#EF4444' : '#6B7280');
    return `
              <tr>
                <td style="font-family:var(--font-mono);font-weight:600;">${t.id}</td>
                <td style="max-width:280px;white-space:normal;line-height:1.4;">${t.subject}</td>
                <td><span class="tag">${t.type}</span></td>
                <td><span class="badge" style="background:${bgColor}; color:#fff; border:none; padding:4px 8px; border-radius:4px;">${text}</span></td>
                <td>${t.assignee}</td>
                <td>${t.started}</td>
                <td style="font-family:var(--font-mono); font-size:0.857rem;">${t.ref}</td>
              </tr>
            `}).join('') : '<tr><td colspan="7" class="text-center text-secondary py-4" style="text-align: center;">No completed workflows</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function renderHistory(tc) {
  tc.innerHTML = '<div style="padding: 20px; text-align: center;">Loading History...</div>';
  let historyItems = [];
  try {
    const apiData = await fetchWorkflows();
    const fetchedTasks = Array.isArray(apiData) ? apiData : (apiData?.items || []);

    // Extract unique workflow targets
    const uniqueTargets = [];
    const seen = new Set();
    fetchedTasks.forEach(t => {
      if (!t.entityId) return;
      const type = t.type || t.approvalType || '';
      const key = `${type}-${t.entityId}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTargets.push({ id: t.entityId, type });
      }
    });

    // Fetch history concurrently
    const historyPromises = uniqueTargets.map(target => {
      if (target.type === 'BOM') {
        return authFetch(`/api/BOM/${target.id}/approval-history`)
          .then(res => res.json())
          .catch(() => []);
      } else {
        return fetchPartApprovalHistory(target.id).catch(() => []);
      }
    });

    const historyResults = await Promise.all(historyPromises);

    // Flatten and format the results
    historyResults.forEach(res => {
      const items = Array.isArray(res) ? res : (res?.items || []);
      items.forEach(h => {
        historyItems.push({
          id: h.partNumber || `PRT-${h.partId}`,
          subject: `Approval for ${h.partNumber || h.partId}`,
          type: h.approvalType || 'Workflow',
          step: h.stage || 'Unknown',
          status: h.status || 'Pending',
          assignee: h.assignedUserName || 'System',
          date: h.createdAt ? new Date(h.createdAt).toLocaleDateString() : 'N/A',
          timestamp: h.createdAt ? new Date(h.createdAt).getTime() : 0
        });
      });
    });

    // Sort by date descending
    historyItems.sort((a, b) => b.timestamp - a.timestamp);

  } catch (err) {
    devLog('Failed to load workflow history', err);
  }

  tc.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">Workflow Approval History</div></div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Part Number</th><th>Subject</th><th>Approval Type</th><th>Stage</th><th>Status</th><th>Assigned User</th><th>Date</th></tr></thead>
          <tbody>
            ${historyItems.length ? historyItems.map(h => {
    const statusColor = (h.status === 'Approved' || h.status === 'Completed') ? '#10B981' : (h.status === 'Rejected' ? '#EF4444' : '#F59E0B');
    const text = h.status === 'Completed' ? 'Approved' : h.status;
    return `
              <tr>
                <td style="font-family:var(--font-mono);font-weight:600;">${h.id}</td>
                <td style="max-width:280px;white-space:normal;line-height:1.4;">${h.subject}</td>
                <td><span class="tag">${h.type}</span></td>
                <td>${h.step}</td>
                <td><span class="badge" style="background:${statusColor}; color:#fff; border:none; padding:4px 8px; border-radius:4px;">${text}</span></td>
                <td>${h.assignee}</td>
                <td>${h.date}</td>
              </tr>
            `}).join('') : '<tr><td colspan="7" class="text-center text-secondary py-4" style="text-align: center;">No history available</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}


