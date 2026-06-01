import { showToast, showModal } from '../main.js';

export function renderReports(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Engineering Intelligence & Compliance</h1>
        <p>Strategic analytics for engineering velocity, quality metrics, and AIS/CMVR compliance tracking.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline btn-sm" id="rep-filter">
          <span class="material-icons-outlined" style="font-size:16px">filter_list</span>Filter
        </button>
        <button class="btn btn-primary btn-sm" id="rep-export">
          <span class="material-icons-outlined" style="font-size:16px">file_download</span>Generate Report
        </button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-tile">
        <div class="kpi-top">
          <div class="kpi-icon blue"><span class="material-icons-outlined">timer</span></div>
          <span class="kpi-change up">Excellent</span>
        </div>
        <div class="kpi-value">4.2d</div>
        <div class="kpi-label">Mean ECN Cycle Time</div>
      </div>
      <div class="kpi-tile">
        <div class="kpi-top">
          <div class="kpi-icon green"><span class="material-icons-outlined">verified</span></div>
          <span class="kpi-change">98.5%</span>
        </div>
        <div class="kpi-value">22/23</div>
        <div class="kpi-label">AIS Compliance Readiness</div>
      </div>
      <div class="kpi-tile">
        <div class="kpi-top">
          <div class="kpi-icon purple"><span class="material-icons-outlined">inventory_2</span></div>
          <span class="kpi-change up">+12%</span>
        </div>
        <div class="kpi-value">1,402</div>
        <div class="kpi-label">Unique Active Parts</div>
      </div>
      <div class="kpi-tile">
        <div class="kpi-top">
          <div class="kpi-icon amber"><span class="material-icons-outlined">assignment_late</span></div>
          <span class="kpi-change down">8 Pending</span>
        </div>
        <div class="kpi-value">14h</div>
        <div class="kpi-label">Avg Approval Response</div>
      </div>
    </div>

    <div class="grid-main-sidebar">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Engineering Velocity (Revisions vs Time)</div>
          <select class="form-select" style="width:120px; padding:4px 8px;" id="velocity-scope">
            <option>Last 6 Months</option><option>Last Year</option>
          </select>
        </div>
        <div class="card-body">
          <div class="mini-bar-chart" style="height:200px; padding-bottom:30px;">
            <div class="mini-bar blue" style="height:35%" data-label="NOV"></div>
            <div class="mini-bar blue" style="height:45%" data-label="DEC"></div>
            <div class="mini-bar blue" style="height:55%" data-label="JAN"></div>
            <div class="mini-bar blue" style="height:82%" data-label="FEB"></div>
            <div class="mini-bar blue" style="height:70%" data-label="MAR"></div>
            <div class="mini-bar blue" style="height:90%" data-label="APR"></div>
          </div>
          <div style="display:flex; justify-content:center; gap:20px; margin-top:20px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <div style="width:12px; height:12px; background:#2563EB; border-radius:2px;"></div>
              <span class="text-xs text-secondary">Part Revisions</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Top 5 Delayed Workflows</div></div>
        <div class="card-body no-pad">
          <table class="data-table">
            <thead><tr><th>Workflow ID</th><th>Assignee</th><th>Delay</th></tr></thead>
            <tbody>
              <tr><td class="font-medium">WF-2026-901</td><td>Suresh I.</td><td style="color:#DC2626; font-weight:600">+48h</td></tr>
              <tr><td class="font-medium">WF-2026-882</td><td>Amit K.</td><td style="color:#DC2626; font-weight:600">+36h</td></tr>
              <tr><td class="font-medium">WF-2026-915</td><td>Neha N.</td><td style="color:#D97706; font-weight:600">+12h</td></tr>
              <tr><td class="font-medium">WF-2026-920</td><td>Priya M.</td><td style="color:#D97706; font-weight:600">+8h</td></tr>
              <tr><td class="font-medium">WF-2026-895</td><td>Vikram T.</td><td style="color:#D97706; font-weight:600">+4h</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:24px;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Compliance Matrix Status</div>
        </div>
        <div class="card-body no-pad">
          <table class="data-table">
            <thead>
              <tr><th>Standard</th><th>Status</th><th>Verification</th></tr>
            </thead>
            <tbody>
              <tr><td class="font-medium">AIS-038 Rev 5</td><td><span class="badge badge-review">92%</span></td><td>In-Lab Testing</td></tr>
              <tr><td class="font-medium">AIS-156</td><td><span class="badge badge-released">PASS</span></td><td>Certified (ARAI)</td></tr>
              <tr><td class="font-medium">CMVR Rule 126</td><td><span class="badge badge-released">PASS</span></td><td>Homologation OK</td></tr>
              <tr><td class="font-medium">ISO 10007</td><td><span class="badge badge-draft">75%</span></td><td>Audit Ongoing</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Change Category Distribution</div></div>
        <div class="card-body">
          <div style="display:flex; justify-content:space-around; align-items:flex-end; height:150px; padding-bottom:20px;">
             <div style="display:flex; flex-direction:column; items:center; gap:8px;">
               <div style="height:90px; width:40px; background:#3B82F6; border-radius:4px 4px 0 0;"></div>
               <span class="text-xs font-bold">Defect</span>
             </div>
             <div style="display:flex; flex-direction:column; items:center; gap:8px;">
               <div style="height:45px; width:40px; background:#10B981; border-radius:4px 4px 0 0;"></div>
               <span class="text-xs font-bold">Upgrade</span>
             </div>
             <div style="display:flex; flex-direction:column; items:center; gap:8px;">
               <div style="height:30px; width:40px; background:#F59E0B; border-radius:4px 4px 0 0;"></div>
               <span class="text-xs font-bold">Cost</span>
             </div>
             <div style="display:flex; flex-direction:column; items:center; gap:8px;">
               <div style="height:20px; width:40px; background:#6B7280; border-radius:4px 4px 0 0;"></div>
               <span class="text-xs font-bold">Regul.</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Interactivity
  container.querySelector('#rep-export')?.addEventListener('click', () => {
    showToast('Preparing PDF export for Q1 Engineering Report...', 'info');
    setTimeout(() => {
      showToast('Report generated successfully! Download started.', 'success');
    }, 1500);
  });

  container.querySelector('#rep-filter')?.addEventListener('click', () => {
    showModal('Report Filters', `
      <div class="grid-2" style="gap:16px">
        <div class="form-group"><label class="form-label">Date Range</label>
          <select class="form-select"><option>Q1 2026</option><option>Q4 2025</option><option>Full Year 2025</option></select>
        </div>
        <div class="form-group"><label class="form-label">Module Policy</label>
          <select class="form-select"><option>All Modules</option><option>BOM Only</option><option>Change Management Only</option></select>
        </div>
        <div class="form-group" style="grid-column: 1/-1">
           <label class="form-label">Include Raw Data Tables</label>
           <label class="toggle-switch">
              <input type="checkbox" checked />
              <span class="toggle-track"></span>
           </label>
        </div>
      </div>
    `, `
      <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove(); window._rep_st('Filters applied!','success')">Apply</button>
    `);
    window._rep_st = showToast;
  });

  container.querySelector('#velocity-scope')?.addEventListener('change', (e) => {
    showToast(`Scaling report data to ${e.target.value}...`, 'info');
  });
}
