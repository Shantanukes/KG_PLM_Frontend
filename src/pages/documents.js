import { showToast, showModal, navigateTo, getCurrentUserRole } from '../main.js';
import { getDocuments, getDocumentsByPartNumber, viewDocumentFile, downloadDocumentFile } from '../api/documents.js';
import { assignWorkflow } from '../api/workflow.js';

export function renderDocuments(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Document Vault &amp; Drawing Control</h1>
        <p>Version-controlled engineering drawings, CAD files, compliance documents with approval workflow.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline btn-sm" id="btn-search-vault">
          <span class="material-icons-outlined" style="font-size:16px">tune</span>Advanced Search
        </button>
      </div>
    </div>

    <div class="tabs" id="doc-tabs" style="justify-content:space-between; align-items:center;">
      <div style="display:flex;">
        <button class="tab-btn active" data-tab="all">All Documents</button>
        <button class="tab-btn" data-tab="mine">My Drawings</button>
        <button class="tab-btn" data-tab="pending">Pending Review (3)</button>
        <button class="tab-btn" data-tab="compliance">Compliance Certs</button>
      </div>
      <div style="display:flex; background:var(--bg-white); border:1px solid var(--border-light); border-radius:16px; padding:2px 12px; align-items:center; margin-bottom:8px; height: 32px; box-sizing: border-box;">
        <span class="material-icons-outlined" style="font-size:16px; color:var(--text-secondary);">search</span>
        <input type="text" id="part-id-search" placeholder="Search by part_number..." style="border:none; outline:none; background:transparent; padding:0 8px; font-size:0.857rem; width:180px; color:var(--text-primary);">
        <button id="btn-part-search" style="border:none; background:transparent; color:var(--brand-primary); font-weight:500; cursor:pointer; font-size:0.857rem; padding:0;">Search</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-chip active" data-type="">All Types</div>
      <div class="filter-chip" data-type="DWG">2D CAD (DXF/DWG)</div>
      <div class="filter-chip" data-type="STEP">3D CAD (STEP)</div>
      <div class="filter-chip" data-type="PDF">PDF Drawings</div>
      <div class="filter-chip" data-type="BIN">Firmware (BIN/HEX)</div>
      <div class="filter-chip" data-type="Cert">Compliance Certs</div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-body no-pad">
        <table class="data-table">
          <thead id="doc-table-head">
            <tr>
              <th>Drawing Number</th>
              <th>Document Name</th>
              <th>Part Ref</th>
              <th>Type</th>
              <th>Rev</th>
              <th>Status</th>
              <th>Size</th>
              <th>Uploaded By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="doc-table-body">
          </tbody>
        </table>
      </div>
    </div>

    <!-- Drawing Viewer -->
    <div class="card" id="viewer-card">
      <div class="card-header">
        <div class="card-title"><span class="material-icons-outlined">preview</span>Drawing Viewer</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-xs" id="viewer-zoom-in" title="Zoom In"><span class="material-icons-outlined" style="font-size:16px">zoom_in</span></button>
          <button class="btn btn-ghost btn-xs" id="viewer-zoom-out" title="Zoom Out"><span class="material-icons-outlined" style="font-size:16px">zoom_out</span></button>
          <button class="btn btn-ghost btn-xs" id="viewer-fit" title="Fit Screen"><span class="material-icons-outlined" style="font-size:16px">fit_screen</span></button>
          <button class="btn btn-ghost btn-xs" id="viewer-prev" title="Previous Rev"><span class="material-icons-outlined" style="font-size:16px">arrow_back</span></button>
          <button class="btn btn-ghost btn-xs" id="viewer-next" title="Next Rev"><span class="material-icons-outlined" style="font-size:16px">arrow_forward</span></button>
          <button class="btn btn-outline btn-xs" id="viewer-annotate">
            <span class="material-icons-outlined" style="font-size:14px">edit_note</span>Annotate
          </button>
          <button class="btn btn-outline btn-xs" id="viewer-download">
            <span class="material-icons-outlined" style="font-size:14px">download</span>Download
          </button>
        </div>
      </div>
      <div class="card-body" id="viewer-body" style="min-height:520px;display:flex;align-items:center;justify-content:center;background:#FAFBFC">
        <div class="empty-state">
          <span class="material-icons-outlined">draw</span>
          <h3>Select a drawing to preview</h3>
          <p>Click on any drawing row or the View button to open it in the browser-based viewer.</p>
        </div>
      </div>
    </div>
  `;

  let documents = [];
  // Track current document shown in viewer for download button
  let currentViewerDoc = null;
  // Track object URLs so we can revoke them to free memory
  let currentViewerObjectUrl = null;

  function formatBytes(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  }

  function normalizeDocument(apiDoc) {
    let type = 'PDF';
    if (apiDoc.fileName) {
      const ext = apiDoc.fileName.split('.').pop().toUpperCase();
      if (['PDF', 'DWG', 'STEP', 'BIN'].includes(ext)) {
        type = ext;
      } else if (ext === 'DXF') {
        type = 'DWG';
      } else if (ext === 'STP') {
        type = 'STEP';
      } else if (ext === 'HEX') {
        type = 'BIN';
      }
    }

    const statusLower = (apiDoc.status || '').toLowerCase();
    let wm = 'draft';
    let wmlabel = 'DRAFT';
    if (statusLower === 'released' || statusLower === 'approved') {
      wm = 'released';
      wmlabel = 'APPROVED';
    } else if (statusLower === 'review' || statusLower === 'under review' || statusLower === 'under_review') {
      wm = 'review';
      wmlabel = 'UNDER REVIEW';
    } else if (statusLower === 'superseded') {
      wm = 'superseded';
      wmlabel = 'SUPERSEDED';
    } else if (statusLower === 'draft') {
      wm = 'draft';
      wmlabel = 'DRAFT';
    } else {
      wm = 'draft';
      wmlabel = apiDoc.status ? apiDoc.status.toUpperCase() : 'DRAFT';
    }

    return {
      drw: apiDoc.drawingNumber || '-',
      name: apiDoc.name || apiDoc.fileName || '-',
      part: apiDoc.partNumber || '-',
      type: type,
      rev: apiDoc.revision || '-',
      wm: wm,
      wmlabel: wmlabel,
      size: formatBytes(apiDoc.fileSizeBytes),
      by: apiDoc.uploadedByUserName || 'Unknown',
      date: formatDate(apiDoc.createdAt),
      color: '#6B7280',
      fileName: apiDoc.fileName || '',
      id: apiDoc.id
    };
  }

  async function loadData() {
    const vb = container.querySelector('#viewer-body');
    try {
      const apiDocs = await getDocuments();
      if (apiDocs && Array.isArray(apiDocs)) {
        documents = apiDocs.map(normalizeDocument);
      } else {
        documents = [];
      }
    } catch (e) {
      console.error('Failed to load API docs:', e);
      documents = [];
      // Show the error reason in the viewer placeholder
      if (vb && e.message && e.message.includes('401')) {
        showToast('Session expired — please log out and log back in.', 'error');
      } else if (vb && e.message) {
        showToast(`Could not load documents: ${e.message}`, 'error');
      }
    }

    applyCurrentFilter();
  }

  function applyCurrentFilter() {
    const activeChip = container.querySelector('.filter-chip.active');
    const type = activeChip ? activeChip.dataset.type : '';
    const isComplianceCertsActive = container.querySelector('#doc-tabs .tab-btn[data-tab="compliance"]')?.classList.contains('active') || type === 'Cert';

    const activeTabBtn = container.querySelector('#doc-tabs .tab-btn.active');
    const tab = activeTabBtn ? activeTabBtn.dataset.tab : 'all';

    let filteredDocs = documents;
    if (tab === 'pending') filteredDocs = filteredDocs.filter(d => d.wm === 'review');
    else if (tab === 'mine') filteredDocs = filteredDocs.filter(d => d.by === 'Priya Mehta' || d.by === 'Neha Nair' || d.by === 'Aakash Tiwari');
    else if (tab === 'compliance') filteredDocs = filteredDocs.filter(d => d.type === 'Cert');

    if (type && tab !== 'compliance') {
      filteredDocs = filteredDocs.filter(d => d.type === type);
    }

    populateTable(filteredDocs, isComplianceCertsActive);
  }

  const tbody = container.querySelector('#doc-table-body');
  const thead = container.querySelector('#doc-table-head');
  const typeIcon = { PDF: 'picture_as_pdf', DWG: 'drafts', STEP: 'view_in_ar', BIN: 'memory', Cert: 'verified' };

  function populateTable(docs, isComplianceOnly = false) {
    const role = (getCurrentUserRole() || '').toLowerCase();
    const isHomologation = role === 'homologation' || role === '14';

    if (isComplianceOnly) {
      thead.innerHTML = `
        <tr>
          <th>Certificate Number</th>
          <th>Document Name</th>
          <th>BOM Ref</th>
          <th>Model Ref</th>
          <th>Type</th>
          <th>Status</th>
          <th>Size</th>
          <th>Uploaded By</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      `;

      tbody.innerHTML = docs.map((d, i) => `
        <tr class="doc-row" data-index="${i}" style="cursor:pointer">
          <td><span class="part-number">${d.drw}</span></td>
          <td>${d.name}</td>
          <td><span class="part-number" style="font-size:0.714rem">${d.bomRef || '—'}</span></td>
          <td><span class="part-number" style="font-size:0.714rem">${d.modelRef || '—'}</span></td>
          <td><span class="tag"><span class="material-icons-outlined" style="font-size:12px">${typeIcon[d.type] || 'insert_drive_file'}</span> ${d.type}</span></td>
          <td><span class="badge badge-${d.wm} badge-sm">${d.wmlabel}</span></td>
          <td class="text-sm text-secondary">${d.size}</td>
          <td class="text-sm">${d.by}</td>
          <td class="text-sm text-secondary">${d.date}</td>
          <td onclick="event.stopPropagation()">
            <button class="btn btn-ghost btn-xs view-doc-btn" data-index="${i}" title="View Drawing">
              <span class="material-icons-outlined" style="font-size:16px">visibility</span>
            </button>
            <button class="btn btn-ghost btn-xs dl-doc-btn" data-index="${i}" title="Download File">
              <span class="material-icons-outlined" style="font-size:16px">download</span>
            </button>
          </td>
        </tr>`).join('');
    } else {
      thead.innerHTML = `
        <tr>
          <th>Drawing Number</th>
          <th>Document Name</th>
          <th>Part Ref</th>
          <th>Type</th>
          <th>Rev</th>
          <th>Status</th>
          <th>Size</th>
          <th>Uploaded By</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      `;

      tbody.innerHTML = docs.map((d, i) => `
        <tr class="doc-row" data-index="${i}" style="cursor:pointer">
          <td><span class="part-number">${d.drw}</span></td>
          <td>${d.name}</td>
          <td><span class="part-number" style="font-size:0.714rem">${d.part}</span></td>
          <td><span class="tag"><span class="material-icons-outlined" style="font-size:12px">${typeIcon[d.type] || 'insert_drive_file'}</span> ${d.type}</span></td>
          <td>${d.rev}</td>
          <td><span class="badge badge-${d.wm} badge-sm">${d.wmlabel}</span></td>
          <td class="text-sm text-secondary">${d.size}</td>
          <td class="text-sm">${d.by}</td>
          <td class="text-sm text-secondary">${d.date}</td>
          <td onclick="event.stopPropagation()">
            <button class="btn btn-ghost btn-xs view-doc-btn" data-index="${i}" title="View Drawing">
              <span class="material-icons-outlined" style="font-size:16px">visibility</span>
            </button>
            <button class="btn btn-ghost btn-xs dl-doc-btn" data-index="${i}" title="Download File">
              <span class="material-icons-outlined" style="font-size:16px">download</span>
            </button>
            ${d.wm === 'review' && !isHomologation ? `<button class="btn btn-success btn-xs approve-doc-btn" data-index="${i}" title="Approve">Approve</button>` : ''}
            ${d.wm === 'draft' && !isHomologation ? `<button class="btn btn-primary btn-xs assign-doc-btn" data-index="${i}" title="Assign Workflow">Assign</button>` : ''}
          </td>
        </tr>`).join('');
    }

    // Row click → open viewer
    tbody.querySelectorAll('.doc-row').forEach(row => {
      row.addEventListener('click', () => openViewer(docs[row.dataset.index]));
    });

    // VIEW button → fetch with ?inline=true → show in embedded viewer
    tbody.querySelectorAll('.view-doc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openViewer(docs[btn.dataset.index]);
      });
    });

    // DOWNLOAD button → fetch without inline → trigger browser download
    tbody.querySelectorAll('.dl-doc-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const d = docs[btn.dataset.index];
        if (!d.id) {
          showToast('No document ID available for download', 'warning');
          return;
        }
        showToast(`Downloading ${d.drw}…`, 'info');
        try {
          await downloadDocumentFile(d.id, d.fileName || d.drw);
          showToast(`${d.drw} downloaded successfully!`, 'success');
        } catch (err) {
          console.error('Download failed:', err);
          showToast(`Failed to download ${d.drw}: ${err.message}`, 'error');
        }
      });
    });

    tbody.querySelectorAll('.approve-doc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = docs[btn.dataset.index];
        showModal(`Approve Drawing: ${d.drw}`,
          `<p>You are approving <strong>${d.name}</strong> (Rev ${d.rev}).</p>
           <div class="form-group" style="margin-top:16px"><label class="form-label">Approval Comments</label><textarea class="form-input" rows="3" placeholder="Engineering sign-off notes…" style="resize:vertical"></textarea></div>
           <p class="text-xs text-secondary" style="margin-top:8px"> will change from UNDER REVIEW ➜ APPROVED automatically upon confirmation.</p>`,
          `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
           <button class="btn btn-primary" id="confirm-doc-approve">Approve &amp; Release</button>`
        );
        setTimeout(() => {
          document.getElementById('confirm-doc-approve')?.addEventListener('click', () => {
            document.querySelector('.modal-overlay')?.remove();
            d.wm = 'released'; d.wmlabel = 'APPROVED';
            applyCurrentFilter();
            showToast(`${d.drw} approved and released!`, 'success');
          });
        }, 50);
      });
    });

    tbody.querySelectorAll('.assign-doc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = docs[btn.dataset.index];
        showModal(`Assign Workflow: ${d.drw}`,
          `<p>Assign <strong>${d.name}</strong> (Rev ${d.rev}) to a review workflow.</p>
           <div class="form-group" style="margin-top:16px"><label class="form-label">Assignee / Reviewer</label><input type="text" class="form-input" id="assignee-name" placeholder="e.g. John Doe"></div>`,
          `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
           <button class="btn btn-primary" id="confirm-doc-assign">Assign</button>`
        );
        setTimeout(() => {
          document.getElementById('confirm-doc-assign')?.addEventListener('click', async () => {
            const assignee = document.getElementById('assignee-name').value || 'Reviewer';
            try {
              showToast('Assigning workflow...', 'info');
              await assignWorkflow({ documentId: d.id, assignee });
              document.querySelector('.modal-overlay')?.remove();
              d.wm = 'review';
              d.wmlabel = 'UNDER REVIEW';
              applyCurrentFilter();
              showToast(`${d.drw} assigned to workflow!`, 'success');
            } catch (err) {
              console.error(err);
              showToast('Failed to assign workflow', 'error');
            }
          });
        }, 50);
      });
    });
  }

  /**
   * Opens the embedded viewer panel for a document.
   * Fetches the file using ?inline=true via JWT auth and renders it.
   */
  async function openViewer(doc) {
    // Clean up any previous object URL to free memory
    if (currentViewerObjectUrl) {
      URL.revokeObjectURL(currentViewerObjectUrl);
      currentViewerObjectUrl = null;
    }

    currentViewerDoc = doc;

    const vb = container.querySelector('#viewer-body');

    // Show a loading state immediately
    vb.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px">
        <div style="width:40px;height:40px;border:3px solid var(--border-light);border-top-color:var(--brand-primary);border-radius:50%;animation:spin 0.8s linear infinite"></div>
        <div style="font-size:0.857rem;color:var(--text-secondary)">Loading ${doc.drw}…</div>
      </div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;

    container.querySelector('#viewer-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Update the download button to be wired to this doc
    const dlBtn = container.querySelector('#viewer-download');
    if (dlBtn) dlBtn.dataset.docId = doc.id || '';
    if (dlBtn) dlBtn.dataset.docName = doc.fileName || doc.drw || 'document';

    if (!doc.id) {
      vb.innerHTML = buildViewerMeta(doc, buildFallbackContent(doc, 'No document ID — cannot fetch file from server.'));
      showToast(`No ID for ${doc.drw}`, 'warning');
      return;
    }

    try {
      const { objectUrl, contentType } = await viewDocumentFile(doc.id);
      currentViewerObjectUrl = objectUrl;

      let contentHtml;
      const ct = (contentType || '').toLowerCase();

      if (ct.startsWith('image/')) {
        // Images: render in <img> tag — blob: is allowed by img-src 'self' blob:
        contentHtml = `
          <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:auto;padding:16px">
            <img src="${objectUrl}" alt="${doc.name}" style="max-width:100%;max-height:500px;object-fit:contain;border-radius:4px;box-shadow:0 2px 12px rgba(0,0,0,0.12)" />
          </div>`;
      } else if (ct === 'application/pdf') {
        // PDFs: use <embed> (uses object-src directive, not frame-src)
        // blob: is allowed by object-src 'self' blob: in our CSP
        contentHtml = `
          <embed src="${objectUrl}" type="application/pdf" style="width:100%;height:520px;border:none;border-radius:4px" title="${doc.name}" />`;
      } else {
        // Other types (DOCX, STEP, BIN, DWG): show fallback with download button
        contentHtml = buildFallbackContent(doc, `This document format (${doc.type}) cannot be viewed inline. Please download it.`);
      }

      vb.innerHTML = buildViewerMeta(doc, contentHtml);
      showToast(`Viewing: ${doc.drw}`, 'success');
    } catch (err) {
      console.error('Failed to load file for viewer:', err);
      const msg = err.message?.includes('401')
        ? 'Session expired — please log out and log back in.'
        : `Could not load file: ${err.message}`;
      vb.innerHTML = buildViewerMeta(doc, buildFallbackContent(doc, msg));
      showToast(`Failed to load ${doc.drw}`, 'error');
    }
  }

  function buildViewerMeta(doc, contentHtml) {
    return `
      <div style="width:100%;padding:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div>
            <div style="font-weight:700;font-size:1rem">${doc.name}</div>
            <div style="font-family:var(--font-mono);font-size:0.786rem;color:var(--brand-primary)">${doc.drw}</div>
          </div>
          <div style="display:flex;gap:8px">
            <span class="badge badge-${doc.wm}">${doc.wmlabel}</span>
            <span class="tag">Rev ${doc.rev}</span>
          </div>
        </div>
        <div style="background:#F1F5F9;border:1px solid var(--border-light);border-radius:var(--radius-md);min-height:520px;overflow:hidden;position:relative">
          ${contentHtml}
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:0.786rem;color:var(--text-tertiary)">
          <span>File: ${doc.drw}</span>
          ${doc.type === 'Cert' ? `<span>BOM: ${doc.bomRef || '—'}</span><span>Model: ${doc.modelRef || '—'}</span>` : `<span>Part: ${doc.part || '—'}</span>`}
          <span>Type: ${doc.type}</span><span>Size: ${doc.size}</span>
        </div>
      </div>`;
  }

  function buildFallbackContent(doc, message) {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:48px">
        <span class="material-icons-outlined" style="font-size:48px;color:var(--text-tertiary)">${doc.type === 'PDF' ? 'picture_as_pdf' : doc.type === 'STEP' ? 'view_in_ar' : doc.type === 'BIN' ? 'memory' : 'description'}</span>
        <div style="font-size:0.857rem;color:var(--text-secondary);text-align:center">${message}</div>
        <div style="font-size:0.786rem;color:var(--text-tertiary)">${doc.name} — ${doc.size} — Uploaded by ${doc.by} on ${doc.date}</div>
      </div>`;
  }

  loadData();

  // Filters
  container.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyCurrentFilter();
    });
  });

  // Tabs
  container.querySelectorAll('#doc-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#doc-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (btn.dataset.tab === 'compliance') {
        container.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.type === 'Cert'));
      }
      applyCurrentFilter();
    });
  });

  // Viewer toolbar actions
  container.querySelector('#viewer-zoom-in')?.addEventListener('click', () => showToast('Zoomed in', 'info'));
  container.querySelector('#viewer-zoom-out')?.addEventListener('click', () => showToast('Zoomed out', 'info'));
  container.querySelector('#viewer-fit')?.addEventListener('click', () => showToast('Fit to screen', 'info'));
  container.querySelector('#viewer-annotate')?.addEventListener('click', () => showToast('Annotation mode enabled. Click on the drawing to add a comment.', 'info'));

  // Viewer Download button — uses the stored doc ID
  container.querySelector('#viewer-download')?.addEventListener('click', async (e) => {
    const docId = e.currentTarget.dataset.docId;
    const docName = e.currentTarget.dataset.docName || 'document';
    if (!docId) {
      showToast('No document selected or ID unavailable', 'warning');
      return;
    }
    showToast('Preparing download…', 'info');
    try {
      await downloadDocumentFile(docId, docName);
      showToast('Download started!', 'success');
    } catch (err) {
      console.error('Download failed:', err);
      showToast(`Download failed: ${err.message}`, 'error');
    }
  });

  container.querySelector('#viewer-prev')?.addEventListener('click', () => showToast('Previous revision loaded', 'info'));
  container.querySelector('#viewer-next')?.addEventListener('click', () => showToast('No newer revision available', 'warning'));

  // Part number search
  container.querySelector('#btn-part-search')?.addEventListener('click', async () => {
    const partNumber = container.querySelector('#part-id-search').value.trim();
    if (!partNumber) {
      loadData();
      return;
    }
    showToast(`Searching documents for Part Number ${partNumber}...`, 'info');
    try {
      const apiDocs = await getDocuments();
      let allDocs = [];
      if (apiDocs && Array.isArray(apiDocs)) {
        allDocs = apiDocs.map(normalizeDocument);
      }
      documents = allDocs.filter(d =>
        (d.part && d.part.toLowerCase().includes(partNumber.toLowerCase())) ||
        (d.drw && d.drw.toLowerCase().includes(partNumber.toLowerCase()))
      );
    } catch (e) {
      console.error('Failed to load API docs for search:', e);
      documents = [];
    }

    container.querySelectorAll('#doc-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    container.querySelector('#doc-tabs .tab-btn[data-tab="all"]')?.classList.add('active');
    applyCurrentFilter();
  });

  container.querySelector('#btn-search-vault')?.addEventListener('click', () => {
    showModal('Advanced Vault Search',
      `<div class="grid-2" style="gap:16px">
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Full-text Search</label><input class="form-input" placeholder="Drawing name, part number, description…" /></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-select"><option value="">Any</option><option>Approved</option><option>Under Review</option><option>Draft</option><option>Superseded</option></select></div>
        <div class="form-group"><label class="form-label">Document Type</label><select class="form-select"><option value="">Any</option><option>PDF</option><option>DWG</option><option>STEP</option><option>BIN</option></select></div>
        <div class="form-group"><label class="form-label">Uploaded After</label><input class="form-input" type="date" /></div>
        <div class="form-group"><label class="form-label">Uploaded Before</label><input class="form-input" type="date" /></div>
      </div>`,
      `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove();window._showToast('Search complete — 8 results found','success')">Search Vault</button>`
    );
    window._showToast = showToast;
  });
}
