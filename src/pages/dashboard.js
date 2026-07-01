import { showToast, showModal, navigateTo } from '../main.js';

export function renderDashboard(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Dashboard</h1>
        <p>Welcome back, Rohit. Here's your PLM overview for today — <strong>06 April 2026</strong>.</p>
      </div>
    </div>

    <!-- KPI Tiles -->
    <div class="kpi-grid">
      <div class="kpi-tile" id="kpi-ecr" style="cursor:pointer">
        <div class="kpi-top"><div class="kpi-icon amber"><span class="material-icons-outlined">pending_actions</span></div><span class="kpi-change up">+3 today</span></div>
        <div class="kpi-value">12</div><div class="kpi-label">Open ECRs</div>
        <div class="stat-bar"><div class="stat-bar-fill amber" style="width:65%"></div></div>
      </div>
      <div class="kpi-tile" id="kpi-approval" style="cursor:pointer">
        <div class="kpi-top"><div class="kpi-icon red"><span class="material-icons-outlined">approval</span></div><span class="kpi-change down">2 overdue</span></div>
        <div class="kpi-value">8</div><div class="kpi-label">Parts Awaiting Approval</div>
        <div class="stat-bar"><div class="stat-bar-fill red" style="width:40%"></div></div>
      </div>
      <div class="kpi-tile" id="kpi-released">
        <div class="kpi-top"><div class="kpi-icon green"><span class="material-icons-outlined">new_releases</span></div><span class="kpi-change up">+14 vs last week</span></div>
        <div class="kpi-value">47</div><div class="kpi-label">Parts Released This Week</div>
        <div class="stat-bar"><div class="stat-bar-fill green" style="width:78%"></div></div>
      </div>
      <div class="kpi-tile" id="kpi-overdue" style="cursor:pointer">
        <div class="kpi-top"><div class="kpi-icon blue"><span class="material-icons-outlined">task_alt</span></div><span class="kpi-change neutral">-1 vs yesterday</span></div>
        <div class="kpi-value">3</div><div class="kpi-label">Overdue Tasks</div>
        <div class="stat-bar"><div class="stat-bar-fill blue" style="width:15%"></div></div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid-main-sidebar">
      <div style="display:flex;flex-direction:column;gap:20px">
        <!-- My Tasks -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="material-icons-outlined">assignment</span>My Tasks</div>
            <span class="badge badge-review">8 pending</span>
          </div>
          <div class="card-body no-pad" id="task-list">
            ${buildTaskItem('red', 'Review BMS PCB Drawing — Safar Smart', 'DRW-52-BA152002-RevB · Submitted by Priya Mehta', '2h overdue', '#EF4444', true)}
            ${buildTaskItem('amber', 'ECR Technical Review — Motor Controller Upgrade', 'KG-ECR-2026-0043 · Zulu High-Speed', '6h remaining', '#F59E0B', false, 'Review')}
            ${buildTaskItem('green', 'Approve Part Release — BLDC Motor 350W', 'GA151002 · E-Luna Pro', '1d 4h remaining', '#10B981', true)}
            ${buildTaskItem('green', 'Review ECN-Eng — Battery Cell Chemistry Mismatch', 'KG-ECN-ENG-2026-008 · K-Star DX', '2d remaining', '#10B981', false, 'Review')}
            ${buildTaskItem('amber', 'Variant BOM Approval — E-Luna Prime Twin Battery', 'ASSY-GA1-VAR-PRIME · 2W Platform', '12h remaining', '#F59E0B', false, 'Review')}
            ${buildTaskItem('red', 'AIS-038 Compliance Sign-off — Battery Pack', 'GA152001 Rev C · Regulatory', '4h overdue', '#EF4444', false, 'Sign Off')}
          </div>
        </div>

        <!-- Recently Released -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="material-icons-outlined">inventory_2</span>Recently Released Parts</div>
            <button class="btn btn-ghost btn-xs" id="view-all-parts">View All →</button>
          </div>
          <div class="card-body no-pad">
            <table class="data-table">
              <thead><tr><th>Part Number</th><th>Name</th><th>Model</th><th>Status</th><th>Released</th></tr></thead>
              <tbody>
                <tr><td><span class="part-number link-part">GA151002 1AZ</span></td><td>BLDC Hub Motor 350W 48V</td><td><span class="tag tag-green">E-Luna Pro</span></td><td><span class="badge badge-released">Released</span></td><td class="text-secondary text-sm">Today, 09:30</td></tr>
                <tr><td><span class="part-number link-part">BA159001 1AZ</span></td><td>Throttle Position Sensor 10kΩ</td><td><span class="tag tag-blue">Safar Smart</span></td><td><span class="badge badge-released">Released</span></td><td class="text-secondary text-sm">Today, 08:15</td></tr>
                <tr><td><span class="part-number link-part">GF158001 1BZ</span></td><td>VCU Motor Controller 60V 35A</td><td><span class="tag tag-purple">Zulu</span></td><td><span class="badge badge-released">Released</span></td><td class="text-secondary text-sm">Yesterday</td></tr>
                <tr><td><span class="part-number link-part">BD152003 1AZ</span></td><td>Li-Ion Battery Pack 5kWh 48V</td><td><span class="tag tag-amber">K-Star DX</span></td><td><span class="badge badge-released">Released</span></td><td class="text-secondary text-sm">Yesterday</td></tr>
                <tr><td><span class="part-number link-part">GA155001 1BZ</span></td><td>LED Headlamp with DRL 12V Rev B</td><td><span class="tag tag-green">E-Luna</span></td><td><span class="badge badge-released">Released</span></td><td class="text-secondary text-sm">2 days ago</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Right Sidebar -->
      <div style="display:flex;flex-direction:column;gap:20px">
        <div class="card">
          <div class="card-header"><div class="card-title"><span class="material-icons-outlined">health_and_safety</span>BOM Health</div></div>
          <div class="card-body">
            <div class="donut-chart">
              <svg viewBox="0 0 140 140" width="140" height="140">
                <circle cx="70" cy="70" r="56" fill="none" stroke="#E5E7EB" stroke-width="14"/>
                <circle cx="70" cy="70" r="56" fill="none" stroke="#059669" stroke-width="14"
                  stroke-dasharray="${(0.72 * 352).toFixed(0)} ${(0.28 * 352).toFixed(0)}" stroke-dashoffset="88" stroke-linecap="round"/>
                <circle cx="70" cy="70" r="56" fill="none" stroke="#F59E0B" stroke-width="14"
                  stroke-dasharray="${(0.18 * 352).toFixed(0)} ${(0.82 * 352).toFixed(0)}" stroke-dashoffset="${(88 - 0.72 * 352).toFixed(0)}" stroke-linecap="round"/>
                <circle cx="70" cy="70" r="56" fill="none" stroke="#EF4444" stroke-width="14"
                  stroke-dasharray="${(0.06 * 352).toFixed(0)} ${(0.94 * 352).toFixed(0)}" stroke-dashoffset="${(88 - 0.9 * 352).toFixed(0)}" stroke-linecap="round"/>
                <circle cx="70" cy="70" r="56" fill="none" stroke="#7C3AED" stroke-width="14"
                  stroke-dasharray="${(0.04 * 352).toFixed(0)} ${(0.96 * 352).toFixed(0)}" stroke-dashoffset="${(88 - 0.96 * 352).toFixed(0)}" stroke-linecap="round"/>
              </svg>
              <div class="donut-center"><div class="donut-value">94%</div><div class="donut-label">Healthy</div></div>
            </div>
            <div class="chart-legend" style="justify-content:center;margin-top:20px">
              <div class="legend-item"><div class="legend-dot" style="background:#059669"></div>Released (72%)</div>
              <div class="legend-item"><div class="legend-dot" style="background:#F59E0B"></div>In Review (18%)</div>
              <div class="legend-item"><div class="legend-dot" style="background:#EF4444"></div>Draft (6%)</div>
              <div class="legend-item"><div class="legend-dot" style="background:#7C3AED"></div>Superseded (4%)</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title"><span class="material-icons-outlined" style="color:var(--brand-accent)">auto_awesome</span>Smart AI Insights</div></div>
          <div class="card-body">
            <div style="background:var(--bg-muted);padding:12px;border-radius:12px;margin-bottom:12px;border-left:3px solid var(--brand-accent);">
              <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px;">Approval Bottleneck</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);">3 parts awaiting approval for more than 48 hours. Suggest reassigning to an available engineer.</div>
            </div>
            <div style="background:var(--bg-muted);padding:12px;border-radius:12px;border-left:3px solid #F59E0B;">
              <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px;">ECN Trend Warning</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);">High volume of ECNs related to 'Motor Controller' in the last 7 days. Review design tolerances.</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title"><span class="material-icons-outlined">history</span>Recent Activity</div></div>
          <div class="card-body" style="max-height:280px;overflow-y:auto;padding:0 20px">
            ${buildActivity('#059669', 'PM', 'Priya Mehta', 'submitted', 'BMS PCB Rev B', 'for review', '5 min ago')}
            ${buildActivity('#2563EB', 'AK', 'Amit Kumar', 'approved', 'Motor Controller 48V', '', '23 min ago')}
            ${buildActivity('#D97706', 'RS', 'Rohit Sharma', 'raised', 'KG-ECR-2026-0047', '— BMS overheating fix', '1h ago')}
            ${buildActivity('#7C3AED', 'NN', 'Neha Nair', 'uploaded drawing', 'DRW-02-GA102001-RevA', '', '2h ago')}
            ${buildActivity('#DC2626', 'VT', 'Vikram Thakur', 'released OTA package', 'BMS FW v2.3.1', '', '3h ago')}
            ${buildActivity('#0B6E4F', 'SG', 'Sanjay Ghosh', 'closed', 'KG-ECN-2026-0031', '— Safar Smart wiring', '5h ago')}
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Wire up interactions ──
  container.querySelector('#dash-export')?.addEventListener('click', () => {
    showToast('Generating report PDF…', 'info');
    setTimeout(() => showToast('Report exported successfully!', 'success'), 1800);
  });

  container.querySelector('#dash-new-part')?.addEventListener('click', () => navigateTo('parts-bom'));

  container.querySelector('#kpi-ecr')?.addEventListener('click', () => navigateTo('change-mgmt'));
  container.querySelector('#kpi-approval')?.addEventListener('click', () => navigateTo('workflows'));
  container.querySelector('#kpi-overdue')?.addEventListener('click', () => navigateTo('workflows'));

  container.querySelector('#view-all-parts')?.addEventListener('click', () => navigateTo('parts-bom'));

  // Task action buttons
  container.querySelectorAll('.task-approve-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskItem = e.target.closest('.task-item');
      const title = taskItem.querySelector('.task-title').textContent;
      showModal('Approve Task',
        `<p style="margin-bottom:16px">You are about to <strong>approve</strong>:</p><p style="color:var(--brand-primary);font-weight:600">${title}</p><div class="form-group" style="margin-top:20px"><label class="form-label">Comments (optional)</label><textarea class="form-input" rows="3" placeholder="Add approval note…" style="resize:vertical"></textarea></div>`,
        `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-primary" id="confirm-approve">Confirm Approval</button>`
      );
      setTimeout(() => {
        document.getElementById('confirm-approve')?.addEventListener('click', () => {
          document.querySelector('.modal-overlay')?.remove();
          taskItem.style.opacity = '0.4';
          taskItem.style.transition = 'opacity 0.4s';
          showToast(`"${title}" approved successfully!`, 'success');
          setTimeout(() => taskItem.remove(), 500);
        });
      }, 50);
    });
  });

  container.querySelectorAll('.task-reject-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskItem = e.target.closest('.task-item');
      const title = taskItem.querySelector('.task-title').textContent;
      showModal('Reject Task',
        `<p style="margin-bottom:16px">Rejecting: <strong>${title}</strong></p><div class="form-group"><label class="form-label">Rejection Reason <span style="color:#DC2626">*</span></label><textarea class="form-input" rows="3" placeholder="Provide a clear rejection reason…" required style="resize:vertical"></textarea></div>`,
        `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-danger" id="confirm-reject">Reject & Return</button>`
      );
      setTimeout(() => {
        document.getElementById('confirm-reject')?.addEventListener('click', () => {
          document.querySelector('.modal-overlay')?.remove();
          showToast(`Task rejected. Designer notified.`, 'warning');
          taskItem.style.borderLeft = '3px solid #DC2626';
        });
      }, 50);
    });
  });

  container.querySelectorAll('.task-review-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskItem = e.target.closest('.task-item');
      const title = taskItem.querySelector('.task-title').textContent;
      showToast(`Opening review for: ${title}`, 'info');
    });
  });

  // Part number links
  container.querySelectorAll('.link-part').forEach(el => {
    el.addEventListener('click', () => {
      showToast(`Opening part details…`, 'info');
      setTimeout(() => navigateTo('parts-bom'), 600);
    });
  });
}

function buildTaskItem(sla, title, meta, time, color, hasApprove, singleBtnLabel = '') {
  const timeStyle = color === '#EF4444' ? `color:${color};font-weight:600` : `color:${color};font-weight:600`;
  const actions = hasApprove
    ? `<button class="btn btn-success btn-xs task-approve-btn">Approve</button><button class="btn btn-danger btn-xs task-reject-btn">Reject</button>`
    : `<button class="btn btn-outline btn-xs task-review-btn">${singleBtnLabel}</button>`;
  return `
    <div class="task-item">
      <div class="task-sla ${sla}"></div>
      <div class="task-info">
        <div class="task-title">${title}</div>
        <div class="task-meta">${meta} · <span style="${timeStyle}">${time}</span></div>
      </div>
      <div class="task-actions">${actions}</div>
    </div>`;
}

function buildActivity(color, initials, name, verb, obj, extra, time) {
  return `
    <div class="activity-item">
      <div class="activity-avatar" style="background:${color}">${initials}</div>
      <div class="activity-content">
        <div class="activity-text"><strong>${name}</strong> ${verb} <strong>${obj}</strong> ${extra}</div>
        <div class="activity-time">${time}</div>
      </div>
    </div>`;
}
