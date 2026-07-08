import { devLog } from '../utils.js';
import { showToast, showModal, navigateTo } from '../main.js';
import { authFetch } from '../api/client.js';

export function renderChangeManagement(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Engineering Change Management</h1>
        <p>Manage ECR → ECN → ECN-Eng workflows with automated impact analysis.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline btn-sm" id="btn-impact">
          <span class="material-icons-outlined" style="font-size:16px">analytics</span>Impact Analysis
        </button>
        <button class="btn btn-primary btn-sm" id="btn-new-ecn" style="margin-left: 8px;">
          <span class="material-icons-outlined" style="font-size:16px">add</span>ECN Release
        </button>
      </div>
    </div>

    <div class="tabs" id="change-tabs">
      <button class="tab-btn active" data-tab="ecn-list">ECN List</button>
      <button class="tab-btn" data-tab="ecn-eng">ECN-Eng Log</button>
      <button class="tab-btn" data-tab="new-ecn">ECN Release</button>
    </div>

    <div id="change-tab-content"></div>
  `;

  container.querySelectorAll('#change-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#change-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderChangeTab(container.querySelector('#change-tab-content'), btn.dataset.tab);
    });
  });

  container.querySelector('#btn-new-ecn')?.addEventListener('click', () => {
    container.querySelectorAll('#change-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'new-ecn'));
    renderChangeTab(container.querySelector('#change-tab-content'), 'new-ecn');
  });

  container.querySelector('#btn-impact')?.addEventListener('click', () => {
    runImpactAnalysis();
  });

  renderChangeTab(container.querySelector('#change-tab-content'), 'ecn-list');
}

function renderChangeTab(tc, tab) {
  if (tab === 'ecn-list') renderECNList(tc);
  else if (tab === 'ecn-eng') renderECNEng(tc);
  else if (tab === 'new-ecn') renderNewECNForm(tc);
}


function renderECNList(tc) {
  const ecns = [
    { id: 'KG-ECN-2026-0048', title: 'BMS PCB Trace Width Upgrade — Safar Smart', effectivity: 'VIN: BG3W-2026-01501', status: 'draft', by: 'Rohit A.', date: '06-Apr-2026' },
    { id: 'KG-ECN-2026-0038', title: 'E-Luna Prime Display Swap to TFT', effectivity: 'Date: 01-May-2026', status: 'review', by: 'Amit K.', date: '28-Mar-2026' },
    { id: 'KG-ECN-2026-0035', title: 'Safar Shakti Wiring Harness Rev B', effectivity: 'Date: 15-Mar-2026', status: 'released', by: 'Neha N.', date: '15-Mar-2026' },
    { id: 'KG-ECN-2026-0031', title: 'Safar Smart Wiring Update — CAN Protocol', effectivity: 'Date: 01-Mar-2026', status: 'released', by: 'Sanjay G.', date: '01-Mar-2026' },
    { id: 'KG-ECN-2026-0028', title: 'K-Star BMS Firmware v2.0 Rollout', effectivity: 'VIN: BD1W-2026-00800', status: 'released', by: 'Vikram T.', date: '20-Feb-2026' },
  ];

  tc.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">ECN Registry</div></div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>ECN Number</th><th>Title</th><th>Effectivity</th><th>Issued By</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${ecns.map(e => `
              <tr>
                <td><span class="part-number">${e.id}</span></td>
                <td style="max-width:220px;white-space:normal;line-height:1.4">${e.title}</td>
                <td class="text-sm">${e.effectivity}</td>
                <td>${e.by}</td>
                <td class="text-secondary text-sm">${e.date}</td>
                <td><span class="badge badge-${e.status}">${e.status === 'released' ? 'Released' : e.status === 'review' ? 'In Review' : 'Draft'}</span></td>
                <td>
                  <button class="btn btn-ghost btn-xs"><span class="material-icons-outlined" style="font-size:16px">visibility</span></button>
                  <button class="btn btn-ghost btn-xs"><span class="material-icons-outlined" style="font-size:16px">download</span></button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderECNEng(tc) {
  const items = [
    { id: 'KG-ECN-ENG-2026-012', ecn: 'KG-ECN-2026-0048', issue: 'New BMS cell chemistry requires FW changes not in ECN scope', raisedBy: 'Vikram T.', date: '06-Apr-2026', status: 'open' },
    { id: 'KG-ECN-ENG-2026-011', ecn: 'KG-ECN-2026-0048', issue: 'Heatsink thermal simulation fails at peak load — Safar Smart hill-climb', raisedBy: 'Priya M.', date: '05-Apr-2026', status: 'open' },
    { id: 'KG-ECN-ENG-2026-010', ecn: 'KG-ECN-2026-0038', issue: 'OTA update path blocked — older E-Luna hardware cannot handle new package format', raisedBy: 'Vikram T.', date: '02-Apr-2026', status: 'review' },
    { id: 'KG-ECN-ENG-2026-008', ecn: 'KG-ECN-2026-0035', issue: 'Mechanical clearance interference: new motor vs existing chain drive on K-Star', raisedBy: 'Neha N.', date: '18-Mar-2026', status: 'resolved' },
  ];
  tc.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><span class="material-icons-outlined">bug_report</span>ECN-Eng — Engineering Challenge Log</div>
        <button class="btn btn-primary btn-sm" id="btn-new-ecn-eng">
          <span class="material-icons-outlined" style="font-size:16px">add</span>Log Challenge
        </button>
      </div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>ECN-Eng ID</th><th>Parent ECN</th><th>Issue Description</th><th>Raised By</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${items.map(i => `
              <tr>
                <td><span class="part-number">${i.id}</span></td>
                <td><span class="part-number" style="font-size:0.714rem">${i.ecn}</span></td>
                <td style="max-width:250px;white-space:normal;line-height:1.4;font-size:0.857rem">${i.issue}</td>
                <td>${i.raisedBy}</td>
                <td class="text-secondary text-sm">${i.date}</td>
                <td><span class="badge ${i.status === 'resolved' ? 'badge-released' : i.status === 'review' ? 'badge-review' : 'badge-priority-high'}">${i.status.charAt(0).toUpperCase() + i.status.slice(1)}</span></td>
                <td>
                  <button class="btn btn-ghost btn-xs resolve-btn" data-id="${i.id}" data-status="${i.status}">
                    <span class="material-icons-outlined" style="font-size:16px">${i.status === 'resolved' ? 'visibility' : 'check_circle'}</span>
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  tc.querySelector('#btn-new-ecn-eng')?.addEventListener('click', () => {
    showModal('Log Engineering Challenge (ECN-Eng)',
      `<div class="form-group"><label class="form-label">Parent ECN</label><select class="form-select"><option>KG-ECN-2026-0048</option><option>KG-ECN-2026-0038</option><option>KG-ECN-2026-0035</option></select></div>
       <div class="form-group"><label class="form-label">Issue Description <span style="color:#DC2626">*</span></label><textarea class="form-input" id="ecneng-desc" rows="3" placeholder="Describe the technical challenge encountered during ECN implementation…" style="resize:vertical"></textarea></div>
       <div class="form-group"><label class="form-label">Domain</label><select class="form-select"><option>Mechanical</option><option>Electrical</option><option>Software</option><option>Manufacturing</option><option>Regulatory</option></select></div>
       <div class="form-group"><label class="form-label">Proposed Resolution</label><textarea class="form-input" rows="2" placeholder="Initial proposed solution or workaround…" style="resize:vertical"></textarea></div>`,
      `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-primary" id="log-eng">Log Challenge</button>`
    );
    setTimeout(() => {
      document.getElementById('log-eng')?.addEventListener('click', () => {
        const desc = document.getElementById('ecneng-desc')?.value;
        if (!desc) return showToast('Issue description is required', 'error');
        document.querySelector('.modal-overlay')?.remove();
        showToast('Engineering challenge logged. COE Head notified.', 'success');
      });
    }, 50);
  });

  tc.querySelectorAll('.resolve-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.status;
      if (s === 'resolved') return showToast(`${btn.dataset.id} is already resolved`, 'info');
      showModal(`Resolve: ${btn.dataset.id}`,
        `<div class="form-group"><label class="form-label">Resolution Summary <span style="color:#DC2626">*</span></label><textarea class="form-input" id="resolution-text" rows="4" placeholder="Describe how this challenge was resolved…" style="resize:vertical"></textarea></div>`,
        `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-primary" id="confirm-resolve">Mark Resolved</button>`
      );
      setTimeout(() => {
        document.getElementById('confirm-resolve')?.addEventListener('click', () => {
          const t = document.getElementById('resolution-text')?.value;
          if (!t) return showToast('Resolution text required', 'error');
          document.querySelector('.modal-overlay')?.remove();
          showToast(`${btn.dataset.id} marked as resolved!`, 'success');
          btn.closest('tr').querySelector('.badge').textContent = 'Resolved';
          btn.closest('tr').querySelector('.badge').className = 'badge badge-released';
        });
      }, 50);
    });
  });
}

function runImpactAnalysis() {
  showModal('Automated Impact Analysis',
    `<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:14px;background:var(--brand-primary-lighter);border-radius:var(--radius-md)">
      <span class="material-icons-outlined" style="color:var(--brand-primary)">biotech</span>
      <div><div style="font-weight:600;color:var(--brand-primary)">Scanning 1,402 parts across 15 BOMs…</div><div style="font-size:0.786rem;color:var(--text-secondary)">Analysis completed in 0.8 seconds</div></div>
    </div>
    <table class="data-table">
      <thead><tr><th>Affected BOM</th><th>Model</th><th>Qty Used</th><th>WIP</th><th>Stocked</th><th>Risk</th></tr></thead>
      <tbody>
        <tr><td class="part-number">ASSY-BA1 Rev C</td><td>Safar Smart Standard</td><td>1</td><td>124</td><td>56</td><td><span class="badge badge-priority-critical">HIGH</span></td></tr>
        <tr><td class="part-number">ASSY-BH1 Rev B</td><td>Safar Smart S1</td><td>1</td><td>38</td><td>12</td><td><span class="badge badge-priority-critical">HIGH</span></td></tr>
        <tr><td class="part-number">ASSY-BE1 Rev A</td><td>Safar DX Eco</td><td>1</td><td>14</td><td>0</td><td><span class="badge badge-priority-medium">MEDIUM</span></td></tr>
        <tr><td class="part-number">ASSY-BD1 Rev D</td><td>K-Star Super DX</td><td>1</td><td>8</td><td>22</td><td><span class="badge badge-priority-low">LOW</span></td></tr>
      </tbody>
    </table>
    <div style="margin-top:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center">
      <div style="padding:12px;background:var(--bg-muted);border-radius:var(--radius-md)"><div style="font-size:1.14rem;font-weight:700">184</div><div style="font-size:0.714rem;color:var(--text-tertiary)">WIP Units Affected</div></div>
      <div style="padding:12px;background:var(--bg-muted);border-radius:var(--radius-md)"><div style="font-size:1.14rem;font-weight:700;color:#DC2626">2</div><div style="font-size:0.714rem;color:var(--text-tertiary)">High-Risk BOMs</div></div>
      <div style="padding:12px;background:var(--bg-muted);border-radius:var(--radius-md)"><div style="font-size:1.14rem;font-weight:700;color:#059669">₹145/unit</div><div style="font-size:0.714rem;color:var(--text-tertiary)">Cost Delta</div></div>
    </div>`, '');
}

// ─────────────────────────────────────────────────────────────────────────────
//  ECN RELEASE FORM  (matches RDECN PDF format)
// ─────────────────────────────────────────────────────────────────────────────
function renderNewECNForm(tc) {
  // Local state
  let affectedPartNumbers = [];   // array of part-number strings entered by user
  let resolvedPartIds     = [];   // numeric IDs returned by the preview-affected-boms API
  let deletedParts = [];          // { partNumber, description, quantity }
  let addedParts = [];            // { partNumber, description, quantity, revisionDate }

  tc.innerHTML = `
    <div class="card" style="max-width:1100px;margin:0 auto;">

      <!-- ── ECN Header Banner ── -->
      <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);border-radius:var(--radius-lg) var(--radius-lg) 0 0;padding:20px 28px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:14px;">
          <span class="material-icons-outlined" style="font-size:32px;color:#fff;opacity:.9">description</span>
          <div>
            <div style="color:#fff;font-size:1.15rem;font-weight:700;letter-spacing:.3px;">Engineering Change Notice (ECN)</div>
            <div style="color:rgba(255,255,255,.7);font-size:0.8rem;margin-top:2px;">Release &amp; Implementation Form</div>
          </div>
        </div>
        <div style="color:rgba(255,255,255,.85);font-size:0.8rem;text-align:right;">
          <div style="font-weight:600;font-size:1rem;">Kinetic Green Energy Pvt. Ltd.</div>
          <div style="opacity:.8">DOC: KG-ECN-FORM-01</div>
        </div>
      </div>

      <div class="card-body" style="padding:28px;">

        <!-- ── SECTION 1: ECN IDENTIFICATION ── -->
        <div style="border:1.5px solid var(--border-main);border-radius:var(--radius-md);overflow:hidden;margin-bottom:22px;">
          <div style="background:var(--bg-muted);padding:8px 16px;font-weight:700;font-size:0.78rem;letter-spacing:.8px;color:var(--text-secondary);text-transform:uppercase;border-bottom:1px solid var(--border-main);">
            Section 1 — ECN Identification
          </div>
          <div style="padding:16px 20px;">
            <div class="grid-2" style="gap:16px;">
              <div class="form-group" style="margin:0">
                <label class="form-label">ECN Date</label>
                <input type="date" class="form-input" id="ecn-date" value="${new Date().toISOString().slice(0,10)}" />
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label">Vehicle Model / Platform</label>
                <input type="text" class="form-input" id="ecn-model" placeholder="e.g. Safar Smart, E-Luna Go…" />
              </div>
            </div>
          </div>
        </div>

        <!-- ── SECTION 2: AFFECTED PART NUMBERS (Search / Tag) ── -->
        <div style="border:1.5px solid var(--border-main);border-radius:var(--radius-md);overflow:hidden;margin-bottom:22px;">
          <div style="background:var(--bg-muted);padding:8px 16px;font-weight:700;font-size:0.78rem;letter-spacing:.8px;color:var(--text-secondary);text-transform:uppercase;border-bottom:1px solid var(--border-main);">
            Section 2 — Affected Part Numbers <span style="color:#DC2626">*</span>
          </div>
          <div style="padding:16px 20px;">
            <p style="font-size:0.82rem;color:var(--text-secondary);margin:0 0 12px;">Search and add part numbers. Click "Preview Affected BOMs" to see which BOMs are impacted.</p>
            <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;">
              <div style="flex:1;min-width:200px;">
                <input type="text" class="form-input" id="ecn-part-search-input"
                  placeholder="Type part number and press Enter or click Add…"
                  autocomplete="off" />
              </div>
              <button class="btn btn-outline btn-sm" id="ecn-add-part-btn" style="white-space:nowrap;flex-shrink:0;">
                <span class="material-icons-outlined" style="font-size:15px">add</span> Add Part
              </button>
              <button class="btn btn-primary btn-sm" id="ecn-preview-bom-btn" style="white-space:nowrap;flex-shrink:0;">
                <span class="material-icons-outlined" style="font-size:15px">search</span> Preview Affected BOMs
              </button>
            </div>
            <!-- Tag chips -->
            <div id="ecn-part-chips" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;min-height:28px;"></div>
            <!-- BOM Preview Results -->
            <div id="ecn-bom-preview" style="margin-top:14px;display:none;">
              <div style="font-size:0.78rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">
                Affected BOMs Preview
              </div>
              <div id="ecn-bom-preview-content"></div>
            </div>
          </div>
        </div>

        <!-- ── SECTION 3: REASON & CHANGE DETAILS ── -->
        <div style="border:1.5px solid var(--border-main);border-radius:var(--radius-md);overflow:hidden;margin-bottom:22px;">
          <div style="background:var(--bg-muted);padding:8px 16px;font-weight:700;font-size:0.78rem;letter-spacing:.8px;color:var(--text-secondary);text-transform:uppercase;border-bottom:1px solid var(--border-main);">
            Section 3 — Reason &amp; Change Details
          </div>
          <div style="padding:16px 20px;display:flex;flex-direction:column;gap:14px;">
            <div class="form-group" style="margin:0">
              <label class="form-label">Reason for Change <span style="color:#DC2626">*</span></label>
              <textarea class="form-input" id="ecn-reason" rows="3"
                placeholder="Describe the reason for this engineering change (quality issue, cost reduction, design improvement, regulatory compliance…)"
                style="resize:vertical"></textarea>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Change Details <span style="color:#DC2626">*</span></label>
              <textarea class="form-input" id="ecn-change-details" rows="4"
                placeholder="Detailed description of the change — what is changing, where, and how it differs from the current configuration…"
                style="resize:vertical"></textarea>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Remarks</label>
              <textarea class="form-input" id="ecn-remarks" rows="2"
                placeholder="Any additional remarks, notes, or special instructions…"
                style="resize:vertical"></textarea>
            </div>
          </div>
        </div>

        <!-- ── SECTION 4: IMPLEMENTATION OPTIONS ── -->
        <div style="border:1.5px solid var(--border-main);border-radius:var(--radius-md);overflow:hidden;margin-bottom:22px;">
          <div style="background:var(--bg-muted);padding:8px 16px;font-weight:700;font-size:0.78rem;letter-spacing:.8px;color:var(--text-secondary);text-transform:uppercase;border-bottom:1px solid var(--border-main);">
            Section 4 — Implementation Options
          </div>
          <div style="padding:16px 20px;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;">
              <label class="ecn-check-label" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--border-light);border-radius:var(--radius-md);cursor:pointer;">
                <input type="checkbox" id="ecn-consume-stock" style="width:16px;height:16px;accent-color:#2563eb;flex-shrink:0;" />
                <span style="font-size:0.875rem;">To Be Implemented After Consuming Stock</span>
              </label>
              <label class="ecn-check-label" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--border-light);border-radius:var(--radius-md);cursor:pointer;">
                <input type="checkbox" id="ecn-lead-time" style="width:16px;height:16px;accent-color:#2563eb;flex-shrink:0;" />
                <span style="font-size:0.875rem;">To Be Implemented After Lead Time</span>
              </label>
              <label class="ecn-check-label" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--border-light);border-radius:var(--radius-md);cursor:pointer;">
                <input type="checkbox" id="ecn-immediate" style="width:16px;height:16px;accent-color:#2563eb;flex-shrink:0;" />
                <span style="font-size:0.875rem;">To Be Implemented With Immediate Effect</span>
              </label>
              <label class="ecn-check-label" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--border-light);border-radius:var(--radius-md);cursor:pointer;">
                <input type="checkbox" id="ecn-running-change" style="width:16px;height:16px;accent-color:#2563eb;flex-shrink:0;" />
                <span style="font-size:0.875rem;">Running Change</span>
              </label>
              <label class="ecn-check-label" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--border-light);border-radius:var(--radius-md);cursor:pointer;">
                <input type="checkbox" id="ecn-field-parts" style="width:16px;height:16px;accent-color:#2563eb;flex-shrink:0;" />
                <span style="font-size:0.875rem;">Field Parts To Be Modified</span>
              </label>
              <label class="ecn-check-label" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--border-light);border-radius:var(--radius-md);cursor:pointer;">
                <input type="checkbox" id="ecn-replace-vehicle-parts" style="width:16px;height:16px;accent-color:#2563eb;flex-shrink:0;" />
                <span style="font-size:0.875rem;">Replace Field Vehicle Parts</span>
              </label>
            </div>
          </div>
        </div>

        <!-- ── SECTION 5: DELETED / REPLACED PARTS ── -->
        <div style="border:1.5px solid var(--border-main);border-radius:var(--radius-md);overflow:hidden;margin-bottom:22px;">
          <div style="background:var(--bg-muted);padding:8px 16px;font-weight:700;font-size:0.78rem;letter-spacing:.8px;color:var(--text-secondary);text-transform:uppercase;border-bottom:1px solid var(--border-main);display:flex;align-items:center;justify-content:space-between;">
            <span>Section 5 — Deleted / Replaced Parts</span>
            <button class="btn btn-ghost btn-xs" id="ecn-add-deleted-row" style="font-size:0.75rem;text-transform:none;">
              <span class="material-icons-outlined" style="font-size:14px">add</span> Add Row
            </button>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table" style="min-width:580px;">
              <thead>
                <tr>
                  <th style="width:44px;text-align:center">#</th>
                  <th>Part Number</th>
                  <th>Description</th>
                  <th style="width:100px">Quantity</th>
                  <th style="width:48px"></th>
                </tr>
              </thead>
              <tbody id="ecn-deleted-parts-body">
                <tr id="ecn-deleted-empty-row">
                  <td colspan="5" style="text-align:center;color:var(--text-tertiary);font-size:0.82rem;padding:18px;">
                    No deleted/replaced parts added yet — click "+ Add Row" above.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── SECTION 6: NEW / ADDED PARTS ── -->
        <div style="border:1.5px solid var(--border-main);border-radius:var(--radius-md);overflow:hidden;margin-bottom:22px;">
          <div style="background:var(--bg-muted);padding:8px 16px;font-weight:700;font-size:0.78rem;letter-spacing:.8px;color:var(--text-secondary);text-transform:uppercase;border-bottom:1px solid var(--border-main);display:flex;align-items:center;justify-content:space-between;">
            <span>Section 6 — New / Added Parts</span>
            <button class="btn btn-ghost btn-xs" id="ecn-add-added-row" style="font-size:0.75rem;text-transform:none;">
              <span class="material-icons-outlined" style="font-size:14px">add</span> Add Row
            </button>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table" style="min-width:680px;">
              <thead>
                <tr>
                  <th style="width:44px;text-align:center">#</th>
                  <th>Part Number</th>
                  <th>Description</th>
                  <th style="width:100px">Quantity</th>
                  <th style="width:150px">Revision Date</th>
                  <th style="width:48px"></th>
                </tr>
              </thead>
              <tbody id="ecn-added-parts-body">
                <tr id="ecn-added-empty-row">
                  <td colspan="6" style="text-align:center;color:var(--text-tertiary);font-size:0.82rem;padding:18px;">
                    No new/added parts added yet — click "+ Add Row" above.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── SECTION 7: AUTHORISATION ── -->
        <div style="border:1.5px solid var(--border-main);border-radius:var(--radius-md);overflow:hidden;margin-bottom:28px;">
          <div style="background:var(--bg-muted);padding:8px 16px;font-weight:700;font-size:0.78rem;letter-spacing:.8px;color:var(--text-secondary);text-transform:uppercase;border-bottom:1px solid var(--border-main);">
            Section 7 — Authorisation
          </div>
          <div style="padding:16px 20px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
              <!-- Prepared By -->
              <div style="border:1px solid var(--border-light);border-radius:var(--radius-md);padding:16px;">
                <div style="font-weight:600;font-size:0.78rem;color:var(--brand-primary, #2563eb);margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:6px;">
                  <span class="material-icons-outlined" style="font-size:15px">edit</span> Prepared By
                </div>
                <div class="form-group" style="margin-bottom:12px">
                  <label class="form-label">Name <span style="color:#DC2626">*</span></label>
                  <input type="text" class="form-input" id="ecn-prepared-name" placeholder="Full name" />
                </div>
                <div class="form-group" style="margin:0">
                  <label class="form-label">Designation / Role <span style="color:#DC2626">*</span></label>
                  <input type="text" class="form-input" id="ecn-prepared-role" placeholder="e.g. Design Engineer" />
                </div>
              </div>
              <!-- Checked By -->
              <div style="border:1px solid var(--border-light);border-radius:var(--radius-md);padding:16px;">
                <div style="font-weight:600;font-size:0.78rem;color:#059669;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:6px;">
                  <span class="material-icons-outlined" style="font-size:15px">verified</span> Checked By
                </div>
                <div class="form-group" style="margin-bottom:12px">
                  <label class="form-label">Name <span style="color:#DC2626">*</span></label>
                  <input type="text" class="form-input" id="ecn-checked-name" placeholder="Full name" />
                </div>
                <div class="form-group" style="margin:0">
                  <label class="form-label">Designation / Role <span style="color:#DC2626">*</span></label>
                  <input type="text" class="form-input" id="ecn-checked-role" placeholder="e.g. Senior Engineer / Manager" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex;gap:12px;justify-content:flex-end;">
          <button class="btn btn-outline" id="ecn-save-draft">
            <span class="material-icons-outlined" style="font-size:16px">save</span> Save Draft
          </button>
          <button class="btn btn-primary" id="ecn-submit">
            <span class="material-icons-outlined" style="font-size:16px">send</span> Submit ECN
          </button>
        </div>

      </div><!-- /card-body -->
    </div><!-- /card -->`;

  // ── Render part chips ──────────────────────────────────────────────────────
  function renderChips() {
    const el = tc.querySelector('#ecn-part-chips');
    if (!el) return;
    if (affectedPartNumbers.length === 0) {
      el.innerHTML = '<span style="font-size:0.79rem;color:var(--text-tertiary);line-height:28px;">No part numbers added yet.</span>';
      return;
    }
    el.innerHTML = affectedPartNumbers.map((pn, i) => `
      <span style="display:inline-flex;align-items:center;gap:5px;background:var(--brand-primary-lighter,#dbeafe);color:#1d4ed8;border:1px solid #93c5fd;border-radius:20px;padding:3px 10px;font-size:0.79rem;font-weight:600;">
        <span class="material-icons-outlined" style="font-size:12px">tag</span>${pn}
        <button type="button" data-chip-idx="${i}" style="background:none;border:none;cursor:pointer;color:#1d4ed8;padding:0 0 0 2px;display:flex;align-items:center;line-height:1;">
          <span class="material-icons-outlined" style="font-size:14px">close</span>
        </button>
      </span>`).join('');
    el.querySelectorAll('[data-chip-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        affectedPartNumbers.splice(parseInt(btn.dataset.chipIdx), 1);
        resolvedPartIds = [];   // IDs are stale when part list changes
        renderChips();
        tc.querySelector('#ecn-bom-preview').style.display = 'none';
      });
    });
  }

  // ── Add Part button ────────────────────────────────────────────────────────
  function addPartFromInput() {
    const input = tc.querySelector('#ecn-part-search-input');
    const val = (input?.value || '').trim();
    if (!val) return showToast('Enter a part number first', 'warning');
    if (affectedPartNumbers.includes(val)) return showToast('Part number already added', 'info');
    affectedPartNumbers.push(val);
    resolvedPartIds = [];   // IDs are stale when part list changes
    input.value = '';
    renderChips();
  }

  tc.querySelector('#ecn-add-part-btn')?.addEventListener('click', addPartFromInput);
  tc.querySelector('#ecn-part-search-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addPartFromInput(); }
  });

  // ── Preview Affected BOMs ──────────────────────────────────────────────────
  tc.querySelector('#ecn-preview-bom-btn')?.addEventListener('click', async () => {
    if (affectedPartNumbers.length === 0) return showToast('Add at least one part number first', 'warning');
    const btn = tc.querySelector('#ecn-preview-bom-btn');
    const previewDiv = tc.querySelector('#ecn-bom-preview');
    const contentDiv = tc.querySelector('#ecn-bom-preview-content');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-outlined" style="font-size:15px;animation:spin 1s linear infinite">autorenew</span> Loading…';
    contentDiv.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-secondary);font-size:0.82rem;">Fetching affected BOMs…</div>';
    previewDiv.style.display = 'block';
    try {
      const res = await authFetch('/api/Changes/ecn/preview-affected-boms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(affectedPartNumbers)
      });
      if (res.ok) {
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          resolvedPartIds = [];
          contentDiv.innerHTML = '<div style="padding:12px 0;color:var(--text-secondary);font-size:0.82rem;">No BOMs found for the given part numbers.</div>';
        } else {
          // Extract numeric part IDs from the preview response.
          // The API may return them as id, partId, affectedPartId — try all common field names.
          resolvedPartIds = data
            .map(b => b.id ?? b.partId ?? b.affectedPartId ?? b.partNumber ?? null)
            .filter(v => v !== null && v !== undefined)
            .map(v => { const n = parseInt(v, 10); return isNaN(n) ? null : n; })
            .filter(n => n !== null && n > 0);

          const idBadge = resolvedPartIds.length > 0
            ? `<span style="margin-left:8px;background:#d1fae5;color:#065f46;border-radius:12px;padding:2px 8px;font-size:0.75rem;font-weight:700;">
                ✓ ${resolvedPartIds.length} ID${resolvedPartIds.length > 1 ? 's' : ''} resolved
               </span>`
            : `<span style="margin-left:8px;background:#fef3c7;color:#92400e;border-radius:12px;padding:2px 8px;font-size:0.75rem;font-weight:700;">
                ⚠ IDs not returned — will use part numbers
               </span>`;

          contentDiv.innerHTML = `
            <div style="margin-bottom:8px;font-size:0.82rem;">${idBadge}</div>
            <table class="data-table" style="font-size:0.82rem;">
              <thead><tr><th>BOM / Assembly</th><th>Model</th><th>Status</th></tr></thead>
              <tbody>
                ${data.map(b => `<tr>
                  <td><span class="part-number">${b.bomNumber || b.partNumber || b.assembly || (typeof b === 'string' ? b : JSON.stringify(b))}</span></td>
                  <td>${b.vehicleModel || b.model || '—'}</td>
                  <td><span class="badge badge-${(b.status || 'draft').toLowerCase()}">${b.status || 'Draft'}</span></td>
                </tr>`).join('')}
              </tbody>
            </table>`;
        }
      } else {
        resolvedPartIds = [];
        const errBody = await res.text().catch(() => '');
        contentDiv.innerHTML = `<div style="padding:12px 0;color:var(--danger-main,#DC2626);font-size:0.82rem;">Failed to load BOM preview (HTTP ${res.status})${errBody ? ': ' + errBody.slice(0, 120) : ''}</div>`;
      }
    } catch (err) {
      devLog('BOM preview error:', err);
      resolvedPartIds = [];
      contentDiv.innerHTML = '<div style="padding:12px 0;color:var(--danger-main,#DC2626);font-size:0.82rem;">Network error fetching BOM preview.</div>';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:15px">search</span> Preview Affected BOMs';
    }
  });

  // ── Deleted Parts rows ─────────────────────────────────────────────────────
  function renderDeletedRows() {
    const tbody = tc.querySelector('#ecn-deleted-parts-body');
    if (!tbody) return;
    if (deletedParts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-tertiary);font-size:0.82rem;padding:18px;">No deleted/replaced parts added yet — click "+ Add Row" above.</td></tr>';
      return;
    }
    tbody.innerHTML = deletedParts.map((p, i) => `
      <tr>
        <td style="text-align:center;font-weight:600;color:var(--text-tertiary)">${i + 1}</td>
        <td><input type="text" class="form-input" style="padding:5px 8px;font-size:0.82rem;" data-del-pn="${i}" value="${p.partNumber}" placeholder="Part Number" /></td>
        <td><input type="text" class="form-input" style="padding:5px 8px;font-size:0.82rem;" data-del-desc="${i}" value="${p.description}" placeholder="Description" /></td>
        <td><input type="number" class="form-input" style="padding:5px 8px;font-size:0.82rem;" data-del-qty="${i}" value="${p.quantity}" min="0" /></td>
        <td style="text-align:center">
          <button type="button" class="btn btn-ghost btn-xs" data-del-remove="${i}" style="color:#DC2626;">
            <span class="material-icons-outlined" style="font-size:15px">delete</span>
          </button>
        </td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-del-pn]').forEach(el => el.addEventListener('input', () => { deletedParts[+el.dataset.delPn].partNumber = el.value; }));
    tbody.querySelectorAll('[data-del-desc]').forEach(el => el.addEventListener('input', () => { deletedParts[+el.dataset.delDesc].description = el.value; }));
    tbody.querySelectorAll('[data-del-qty]').forEach(el => el.addEventListener('input', () => { deletedParts[+el.dataset.delQty].quantity = parseFloat(el.value) || 0; }));
    tbody.querySelectorAll('[data-del-remove]').forEach(el => el.addEventListener('click', () => { deletedParts.splice(+el.dataset.delRemove, 1); renderDeletedRows(); }));
  }

  tc.querySelector('#ecn-add-deleted-row')?.addEventListener('click', () => {
    deletedParts.push({ partNumber: '', description: '', quantity: 1 });
    renderDeletedRows();
  });

  // ── Added Parts rows ───────────────────────────────────────────────────────
  function renderAddedRows() {
    const tbody = tc.querySelector('#ecn-added-parts-body');
    if (!tbody) return;
    if (addedParts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-tertiary);font-size:0.82rem;padding:18px;">No new/added parts added yet — click "+ Add Row" above.</td></tr>';
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    tbody.innerHTML = addedParts.map((p, i) => `
      <tr>
        <td style="text-align:center;font-weight:600;color:var(--text-tertiary)">${i + 1}</td>
        <td><input type="text" class="form-input" style="padding:5px 8px;font-size:0.82rem;" data-add-pn="${i}" value="${p.partNumber}" placeholder="Part Number" /></td>
        <td><input type="text" class="form-input" style="padding:5px 8px;font-size:0.82rem;" data-add-desc="${i}" value="${p.description}" placeholder="Description" /></td>
        <td><input type="number" class="form-input" style="padding:5px 8px;font-size:0.82rem;" data-add-qty="${i}" value="${p.quantity}" min="0" /></td>
        <td><input type="date" class="form-input" style="padding:5px 8px;font-size:0.82rem;" data-add-rev="${i}" value="${p.revisionDate ? p.revisionDate.slice(0,10) : today}" /></td>
        <td style="text-align:center">
          <button type="button" class="btn btn-ghost btn-xs" data-add-remove="${i}" style="color:#DC2626;">
            <span class="material-icons-outlined" style="font-size:15px">delete</span>
          </button>
        </td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-add-pn]').forEach(el => el.addEventListener('input', () => { addedParts[+el.dataset.addPn].partNumber = el.value; }));
    tbody.querySelectorAll('[data-add-desc]').forEach(el => el.addEventListener('input', () => { addedParts[+el.dataset.addDesc].description = el.value; }));
    tbody.querySelectorAll('[data-add-qty]').forEach(el => el.addEventListener('input', () => { addedParts[+el.dataset.addQty].quantity = parseFloat(el.value) || 0; }));
    tbody.querySelectorAll('[data-add-rev]').forEach(el => el.addEventListener('input', () => { addedParts[+el.dataset.addRev].revisionDate = el.value ? new Date(el.value).toISOString() : null; }));
    tbody.querySelectorAll('[data-add-remove]').forEach(el => el.addEventListener('click', () => { addedParts.splice(+el.dataset.addRemove, 1); renderAddedRows(); }));
  }

  tc.querySelector('#ecn-add-added-row')?.addEventListener('click', () => {
    addedParts.push({ partNumber: '', description: '', quantity: 1, revisionDate: null });
    renderAddedRows();
  });

  // ── Save Draft ─────────────────────────────────────────────────────────────
  tc.querySelector('#ecn-save-draft')?.addEventListener('click', () => showToast('ECN saved as draft.', 'info'));

  // ── Submit ECN ─────────────────────────────────────────────────────────────
  tc.querySelector('#ecn-submit')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;

    const reason        = tc.querySelector('#ecn-reason')?.value?.trim()        || '';
    const changeDetails = tc.querySelector('#ecn-change-details')?.value?.trim() || '';
    const remarks       = tc.querySelector('#ecn-remarks')?.value?.trim()        || '';
    const preparedByName = tc.querySelector('#ecn-prepared-name')?.value?.trim() || '';
    const preparedByRole = tc.querySelector('#ecn-prepared-role')?.value?.trim() || '';
    const checkedByName  = tc.querySelector('#ecn-checked-name')?.value?.trim()  || '';
    const checkedByRole  = tc.querySelector('#ecn-checked-role')?.value?.trim()  || '';

    const toBeImplementedAfterConsumingStock = tc.querySelector('#ecn-consume-stock')?.checked || false;
    const toBeImplementedAfterLeadTime       = tc.querySelector('#ecn-lead-time')?.checked      || false;
    const toBeImplementedWithImmediateEffect = tc.querySelector('#ecn-immediate')?.checked      || false;
    const runningChange          = tc.querySelector('#ecn-running-change')?.checked          || false;
    const fieldPartsToBeModified = tc.querySelector('#ecn-field-parts')?.checked             || false;
    const replaceFieldVehicleParts = tc.querySelector('#ecn-replace-vehicle-parts')?.checked || false;

    // Validation
    if (affectedPartNumbers.length === 0)
      return showToast('Add at least one affected part number (Section 2)', 'error');
    if (resolvedPartIds.length === 0)
      return showToast('Please click "Preview Affected BOMs" first so the server can resolve part IDs before submitting.', 'error');
    if (!reason)
      return showToast('Reason for Change is required (Section 3)', 'error');
    if (!changeDetails)
      return showToast('Change Details is required (Section 3)', 'error');
    if (!preparedByName || !preparedByRole)
      return showToast('Prepared By name and role are required (Section 7)', 'error');
    if (!checkedByName || !checkedByRole)
      return showToast('Checked By name and role are required (Section 7)', 'error');

    // Use the numeric IDs resolved from the preview-affected-boms API response.
    // These are the real DB IDs the server expects — never guess or parseInt from strings.
    const affectedPartIds = resolvedPartIds;

    const payload = {
      affectedPartIds,
      reason,
      changeDetails,
      remarks,
      toBeImplementedAfterConsumingStock,
      toBeImplementedAfterLeadTime,
      toBeImplementedWithImmediateEffect,
      runningChange,
      fieldPartsToBeModified,
      replaceFieldVehicleParts,
      preparedByName,
      preparedByRole,
      checkedByName,
      checkedByRole,
      deletedParts: deletedParts.map(p => ({
        partNumber:  p.partNumber,
        description: p.description,
        quantity:    p.quantity
      })),
      addedParts: addedParts.map(p => ({
        partNumber:   p.partNumber,
        description:  p.description,
        quantity:     p.quantity,
        revisionDate: p.revisionDate || new Date().toISOString()
      }))
    };

    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;animation:spin 1s linear infinite">autorenew</span> Submitting…';

    try {
      const res = await authFetch('/api/Changes/ecn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('ECN submitted successfully!', 'success');
        // Reset state
        affectedPartNumbers = [];
        resolvedPartIds     = [];
        deletedParts = [];
        addedParts   = [];
        tc.querySelectorAll('.form-input').forEach(el => {
          if (el.type === 'date') el.value = new Date().toISOString().slice(0, 10);
          else el.value = '';
        });
        tc.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
        renderChips();
        renderDeletedRows();
        renderAddedRows();
        tc.querySelector('#ecn-bom-preview').style.display = 'none';
      } else {
        const errText = await res.text().catch(() => '');
        showToast('Failed to submit ECN — server returned ' + res.status + (errText ? ': ' + errText.slice(0, 100) : ''), 'error');
      }
    } catch (err) {
      devLog('ECN submit error:', err);
      showToast('Network error while submitting ECN.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px">send</span> Submit ECN';
    }
  });

  // Initial renders
  renderChips();
}
