import { showToast, showModal } from '../main.js';

export function renderSoftware(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Software BOM & OTA Management</h1>
        <p>Firmware lifecycle, hardware–firmware compatibility, OTA deployment tracking, and software parts registry.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline btn-sm" id="sw-verify">
          <span class="material-icons-outlined" style="font-size:16px">checklist</span>Verify Matrix
        </button>
        <button class="btn btn-primary btn-sm" id="sw-release">
          <span class="material-icons-outlined" style="font-size:16px">add</span>Release Firmware
        </button>
      </div>
    </div>

    <div class="tabs" id="sw-tabs">
      <button class="tab-btn active" data-tab="compat">Compatibility Matrix</button>
      <button class="tab-btn" data-tab="swbom">Software BOM</button>
      <button class="tab-btn" data-tab="archive">Release History</button>
    </div>

    <div id="sw-tab-content"></div>
  `;

  container.querySelectorAll('#sw-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#sw-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSwTab(container.querySelector('#sw-tab-content'), btn.dataset.tab);
    });
  });

  container.querySelector('#sw-release')?.addEventListener('click', () => openReleaseForm());
  container.querySelector('#sw-verify')?.addEventListener('click', () => {
    showToast('Running full compatibility matrix verification…', 'info');
    setTimeout(() => showToast('Verification complete — 2 mismatches found (BMS v1.8.2 ↔ HW Rev D/E)', 'warning'), 1800);
  });

  renderSwTab(container.querySelector('#sw-tab-content'), 'compat');
}

function renderSwTab(tc, tab) {
  if (tab === 'compat') renderCompat(tc);
  else if (tab === 'swbom') renderSwBom(tc);
  else renderArchive(tc);
}

function renderCompat(tc) {
  tc.innerHTML = `
    <div class="kpi-grid" style="margin-bottom:20px">
      <div class="kpi-tile">
        <div class="kpi-top"><div class="kpi-icon purple"><span class="material-icons-outlined">cell_tower</span></div><span class="kpi-change up">In-Progress</span></div>
        <div class="kpi-value">5%</div><div class="kpi-label">Staged Rollout — BMS FW v2.3.1</div>
        <div class="stat-bar"><div class="stat-bar-fill purple" style="width:25%"></div></div>
      </div>
      <div class="kpi-tile">
        <div class="kpi-top"><div class="kpi-icon green"><span class="material-icons-outlined">verified</span></div><span class="kpi-change up">All Clear</span></div>
        <div class="kpi-value">92%</div><div class="kpi-label">Fleet OTA Success Rate</div>
        <div class="stat-bar"><div class="stat-bar-fill green" style="width:92%"></div></div>
      </div>
      <div class="kpi-tile">
        <div class="kpi-top"><div class="kpi-icon blue"><span class="material-icons-outlined">memory</span></div><span class="kpi-change neutral">Current</span></div>
        <div class="kpi-value">v4.0</div><div class="kpi-label">Latest VCU Standard</div>
        <div class="stat-bar"><div class="stat-bar-fill blue" style="width:100%"></div></div>
      </div>
      <div class="kpi-tile">
        <div class="kpi-top"><div class="kpi-icon amber"><span class="material-icons-outlined">warning_amber</span></div><span class="kpi-change down">Action Required</span></div>
        <div class="kpi-value">2</div><div class="kpi-label">Mismatch Exceptions</div>
        <div class="stat-bar"><div class="stat-bar-fill amber" style="width:15%"></div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title"><span class="material-icons-outlined">grid_view</span>OTA Compatibility Matrix — Hardware Rev vs Firmware</div>
        <div style="display:flex;gap:8px;align-items:center">
          <span style="display:flex;align-items:center;gap:4px;font-size:0.714rem"><span style="background:#ECFDF5;border:1px solid #059669;width:10px;height:10px;border-radius:2px;display:inline-block"></span>Compatible</span>
          <span style="display:flex;align-items:center;gap:4px;font-size:0.714rem"><span style="background:#FEF2F2;border:1px solid #DC2626;width:10px;height:10px;border-radius:2px;display:inline-block"></span>Blocked</span>
        </div>
      </div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Firmware Component</th><th>Version</th><th>Target ECU</th><th>HW Rev A</th><th>HW Rev B</th><th>HW Rev C</th><th>HW Rev D</th><th>HW Rev E</th><th>OTA?</th></tr></thead>
          <tbody>
            <tr><td class="font-medium">BMS Firmware</td><td style="font-family:var(--font-mono)">v2.3.1</td><td>STM32F407</td><td class="ota-cell-no">✕</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td><span class="badge badge-released badge-sm">YES</span></td></tr>
            <tr><td class="font-medium">BMS Firmware (Legacy)</td><td style="font-family:var(--font-mono)">v1.8.2</td><td>STM32F407</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td class="ota-cell-no">✕</td><td class="ota-cell-no">✕</td><td><span class="badge badge-released badge-sm">YES</span></td></tr>
            <tr><td class="font-medium">VCU Motor Controller</td><td style="font-family:var(--font-mono)">v4.0.0</td><td>NXP S32K144</td><td class="ota-cell-no">✕</td><td class="ota-cell-no">✕</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td><span class="badge badge-released badge-sm">YES</span></td></tr>
            <tr><td class="font-medium">Fleet Telematics</td><td style="font-family:var(--font-mono)">v3.1.2</td><td>ESP32-S3</td><td class="ota-cell-no">✕</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td><span class="badge badge-released badge-sm">YES</span></td></tr>
            <tr><td class="font-medium">Instrument Cluster</td><td style="font-family:var(--font-mono)">v5.2.0</td><td>STM32H7</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td><span class="badge badge-released badge-sm">YES</span></td></tr>
            <tr><td class="font-medium">Charger Controller</td><td style="font-family:var(--font-mono)">v2.0.1</td><td>PIC18F</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td class="ota-cell-yes">✓</td><td><span class="badge badge-draft badge-sm">NO</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderSwBom(tc) {
  const swParts = [
    { pn:'SW-GA1-52-001BZ', name:'BMS Firmware', ver:'v2.3.1', model:'E-Luna (GA)', ecu:'STM32F407', size:'248 KB', hash:'7a2e41c', signed:'Yes (RSA-2048)', relBy:'Vikram Thakur', relDate:'03-Apr-2026', status:'released' },
    { pn:'SW-GA1-52-001AZ', name:'BMS Firmware (Base)', ver:'v1.8.2', model:'E-Luna Go (GA1)', ecu:'STM32F407', size:'215 KB', hash:'3f9b201', signed:'Yes', relBy:'Vikram Thakur', relDate:'15-Jan-2026', status:'released' },
    { pn:'SW-GF1-58-002AZ', name:'VCU Motor Controller SW', ver:'v4.0.0', model:'Zulu (GF1)', ecu:'NXP S32K144', size:'512 KB', hash:'c9b101f', signed:'Yes (RSA-2048)', relBy:'Amit Kumar', relDate:'28-Mar-2026', status:'released' },
    { pn:'SW-BA1-59-001AZ', name:'Fleet Telematics', ver:'v3.1.2', model:'Safar Smart (BA1)', ecu:'ESP32-S3', size:'1.2 MB', hash:'f1e293c', signed:'Yes', relBy:'Neha Nair', relDate:'22-Mar-2026', status:'released' },
    { pn:'SW-ALL-55-001AZ', name:'Instrument Cluster', ver:'v5.2.0', model:'Universal (All)', ecu:'STM32H7', size:'3.8 MB', hash:'a41c0e7', signed:'Yes (RSA-2048)', relBy:'Priya Mehta', relDate:'10-Mar-2026', status:'released' },
    { pn:'SW-GA1-60-001AZ', name:'Charger Controller', ver:'v2.0.1', model:'E-Luna (GA)', ecu:'PIC18F', size:'64 KB', hash:'e1f445b', signed:'No (non-OTA)', relBy:'Rohit Sharma', relDate:'05-Feb-2026', status:'released' },
    { pn:'SW-BD1-52-002AZ', name:'BMS Firmware (K-Star)', ver:'v2.0.0', model:'K-Star DX (BD1)', ecu:'STM32F407', size:'260 KB', hash:'d3a92c1', signed:'Yes', relBy:'Vikram Thakur', relDate:'20-Feb-2026', status:'released' },
  ];

  tc.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><span class="material-icons-outlined">developer_board</span>Software Parts Registry</div>
        <div style="display:flex;gap:8px">
          <div class="global-search" style="width:220px;height:36px">
            <span class="material-icons-outlined" style="font-size:16px">search</span>
            <input type="text" id="sw-search" placeholder="Search SW parts…" />
          </div>
        </div>
      </div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>SW Part Number</th><th>Name</th><th>Version</th><th>Vehicle</th><th>Target ECU</th><th>Size</th><th>Git Hash</th><th>Code Signed</th><th>Released By</th><th>Date</th></tr></thead>
          <tbody id="sw-bom-body">
            ${swParts.map(s => `
              <tr class="sw-row">
                <td><span class="part-number">${s.pn}</span></td>
                <td class="font-medium">${s.name}</td>
                <td style="font-family:var(--font-mono);font-weight:600">${s.ver}</td>
                <td><span class="tag">${s.model}</span></td>
                <td style="font-family:var(--font-mono);font-size:0.786rem">${s.ecu}</td>
                <td class="text-xs text-secondary">${s.size}</td>
                <td style="font-family:var(--font-mono);font-size:0.714rem;color:var(--brand-primary)">${s.hash}</td>
                <td class="text-xs">${s.signed}</td>
                <td class="text-sm">${s.relBy}</td>
                <td class="text-xs text-secondary">${s.relDate}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  tc.querySelector('#sw-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    tc.querySelectorAll('.sw-row').forEach(r => { r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'; });
  });
}


function renderArchive(tc) {
  const releases = [
    { pn:'SW-GA1-52-001BZ', ver:'v2.3.1', date:'03-Apr-2026', relBy:'Vikram T.', hash:'7a2e41c', pipeline:'#1847', status:'released', notes:'Thermal mgmt fix + early shutdown' },
    { pn:'SW-GF1-58-002AZ', ver:'v4.0.0', date:'28-Mar-2026', relBy:'Amit K.', hash:'c9b101f', pipeline:'#1832', status:'released', notes:'Regen braking v2 + cruise control' },
    { pn:'SW-BA1-59-001AZ', ver:'v3.1.2', date:'22-Mar-2026', relBy:'Neha N.', hash:'f1e293c', pipeline:'#1819', status:'released', notes:'GPS cold-start fix + sleep mode opt' },
    { pn:'SW-ALL-55-001AZ', ver:'v5.2.0', date:'10-Mar-2026', relBy:'Priya M.', hash:'a41c0e7', pipeline:'#1801', status:'released', notes:'New trip stats UI + AIS indicators' },
    { pn:'SW-BD1-52-002AZ', ver:'v2.0.0', date:'20-Feb-2026', relBy:'Vikram T.', hash:'d3a92c1', pipeline:'#1778', status:'released', notes:'K-Star BMS v2 — cell balancing algo' },
    { pn:'SW-GA1-60-001AZ', ver:'v2.0.1', date:'05-Feb-2026', relBy:'Rohit S.', hash:'e1f445b', pipeline:'—', status:'released', notes:'Charger overcurrent protection' },
    { pn:'SW-GA1-52-001AZ', ver:'v1.8.2', date:'15-Jan-2026', relBy:'Vikram T.', hash:'3f9b201', pipeline:'#1744', status:'superseded', notes:'Base BMS — superseded by v2.3.1' },
  ];

  tc.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><span class="material-icons-outlined">history</span>Firmware Release History</div>
        <button class="btn btn-outline btn-xs" id="export-sw-history"><span class="material-icons-outlined" style="font-size:14px">download</span>Export</button>
      </div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>SW Part</th><th>Version</th><th>Released</th><th>By</th><th>Git Hash</th><th>CI Pipeline</th><th>Status</th><th>Release Notes</th></tr></thead>
          <tbody>
            ${releases.map(r => `
              <tr>
                <td><span class="part-number">${r.pn}</span></td>
                <td style="font-family:var(--font-mono);font-weight:600">${r.ver}</td>
                <td class="text-xs text-secondary">${r.date}</td>
                <td class="text-sm">${r.relBy}</td>
                <td style="font-family:var(--font-mono);font-size:0.714rem;color:var(--brand-primary)">${r.hash}</td>
                <td style="font-family:var(--font-mono);font-size:0.786rem">${r.pipeline}</td>
                <td><span class="badge badge-${r.status} badge-sm">${r.status === 'released' ? 'Released' : 'Superseded'}</span></td>
                <td class="text-xs text-secondary" style="max-width:200px;white-space:normal;line-height:1.4">${r.notes}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  tc.querySelector('#export-sw-history')?.addEventListener('click', () => {
    showToast('Exporting firmware release history…', 'info');
    setTimeout(() => showToast('Export complete!', 'success'), 1200);
  });
}

function openReleaseForm() {
  showModal('Release New Firmware Package',
    `<div class="grid-2" style="gap:16px">
      <div class="form-group"><label class="form-label">Firmware Component <span style="color:#DC2626">*</span></label>
        <select class="form-select"><option>BMS Firmware (STM32F407)</option><option>VCU Motor Controller (NXP S32K144)</option><option>Fleet Telematics (ESP32-S3)</option><option>Instrument Cluster (STM32H7)</option><option>Charger Controller (PIC18F)</option></select></div>
      <div class="form-group"><label class="form-label">Version Number <span style="color:#DC2626">*</span></label><input class="form-input" id="fw-ver" placeholder="e.g. v2.4.0" style="font-family:var(--font-mono)" /></div>
      <div class="form-group"><label class="form-label">Target Vehicle(s)</label>
        <select class="form-select" multiple style="height:70px"><option>E-Luna (GA)</option><option>E-Luna Pro (GG)</option><option>Zulu (GF)</option><option>Safar Smart (BA)</option><option>K-Star (BD)</option><option>All Models</option></select></div>
      <div class="form-group"><label class="form-label">Git Commit Hash <span style="color:#DC2626">*</span></label><input class="form-input" id="fw-hash" placeholder="e.g. abc123f" style="font-family:var(--font-mono)" /></div>
      <div class="form-group"><label class="form-label">CI Pipeline Run</label><input class="form-input" placeholder="e.g. #1850" /></div>
      <div class="form-group"><label class="form-label">Code Signing</label><select class="form-select"><option>RSA-2048 (Production)</option><option>ECDSA-P256</option><option>Unsigned (Dev Only)</option></select></div>
      <div class="form-group" style="grid-column:1/-1"><label class="form-label">Binary Upload</label>
        <div style="border:2px dashed var(--brand-primary);border-radius:var(--radius-md);padding:20px;text-align:center;cursor:pointer;background:var(--brand-primary-lighter)">
          <span class="material-icons-outlined" style="font-size:28px;color:var(--brand-primary)">cloud_upload</span>
          <div style="font-size:0.857rem;color:var(--brand-primary);font-weight:600;margin-top:6px">Drop .bin / .hex file here</div>
          <div style="font-size:0.714rem;color:var(--text-tertiary);margin-top:4px">Max 16 MB · .bin, .hex, .elf</div>
        </div></div>
      <div class="form-group" style="grid-column:1/-1"><label class="form-label">Release Notes <span style="color:#DC2626">*</span></label>
        <textarea class="form-input" id="fw-notes" rows="3" placeholder="Summary of changes, bug fixes, new features…" style="resize:vertical"></textarea></div>
      <div class="form-group"><label class="form-label">Deployment Strategy</label>
        <select class="form-select"><option>Staged Rollout (5% → 25% → 100%)</option><option>Immediate Full Fleet</option><option>Hold (Manual Trigger)</option></select></div>
      <div class="form-group"><label class="form-label">Rollback Policy</label>
        <select class="form-select"><option>Auto-rollback on >5% failure</option><option>Auto-rollback on >2% failure</option><option>Manual rollback only</option></select></div>
    </div>`,
    `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
     <button class="btn btn-primary" id="fw-submit">Release & Deploy</button>`
  );
  setTimeout(() => {
    document.getElementById('fw-submit')?.addEventListener('click', () => {
      const ver = document.getElementById('fw-ver')?.value;
      const hash = document.getElementById('fw-hash')?.value;
      const notes = document.getElementById('fw-notes')?.value;
      if (!ver || !hash || !notes) return showToast('Version, hash, and release notes are required', 'error');
      document.querySelector('.modal-overlay')?.remove();
      showToast(`Firmware ${ver} released! OTA deployment initiated.`, 'success');
    });
  }, 50);
}
