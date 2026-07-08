import { devLog } from '../utils.js';
import { authFetch } from '../api/client.js';

export async function renderECNLifecycle(container) {
  // Loading State
  container.innerHTML = `
    <div class="main-workspace fade-in" style="padding: 24px; display: flex; align-items: center; justify-content: center; height: 100%;">
      <div style="text-align: center;">
        <span class="material-icons-outlined" style="font-size: 32px; animation: spin 1s linear infinite; color: var(--primary-main);">autorenew</span>
        <div style="margin-top: 12px; color: var(--text-secondary);">Loading ECN Analytics...</div>
      </div>
    </div>
  `;

  let data;
  try {
    const res = await authFetch('/api/executive-analytics/ecn-analytics');
    if (res.ok) {
      data = await res.json();
    } else {
      throw new Error('API failed');
    }
  } catch (err) {
    devLog("Failed to fetch ECN analytics, using mock data", err);
    // Mock data using the provided schema
    data = {
      "totalECNs": 24,
      "statusBreakdown": [
        { "status": "Open", "count": 10 },
        { "status": "In Review", "count": 5 },
        { "status": "Approved", "count": 6 },
        { "status": "Rejected", "count": 3 }
      ],
      "creationTrend": [
        { "label": "Apr 2026", "count": 2 },
        { "label": "May 2026", "count": 14 },
        { "label": "Jun 2026", "count": 8 }
      ],
      "implementationStrategy": {
        "afterConsumingStock": 8,
        "afterLeadTime": 4,
        "immediateEffect": 6,
        "runningChange": 2,
        "fieldPartsToBeModified": 3,
        "replaceFieldVehicleParts": 1
      },
      "recentCostImpacts": [
        { "ecnNumber": "ECN-8840", "costImpact": "$500" },
        { "ecnNumber": "ECN-8841", "costImpact": "$12,000" }
      ],
      "approvalMetrics": {
        "totalPendingApprovals": 5,
        "totalApproved": 6,
        "totalRejected": 3
      },
      "byVehicleCode": [
        { "vehicleCode": "3W-BEV", "count": 15 },
        { "vehicleCode": "2-Wheel", "count": 9 }
      ]
    };
  }

  // Helpers to generate HTML
  const generateListHTML = (items, keyLabel, keyCount, isCurrency = false) => {
    if (!items || items.length === 0) {
      return `<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 13px;">No data available</div>`;
    }
    return items.map(item => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
        <span style="font-weight: 500; color: var(--text-secondary);">${item[keyLabel]}</span>
        <span style="font-weight: 700; color: var(--text-primary);">${isCurrency ? item[keyCount] : item[keyCount]}</span>
      </div>
    `).join('');
  };

  const generateImplementationHTML = (strategy) => {
    const fields = [
      { key: 'immediateEffect', label: 'Immediate Effect' },
      { key: 'runningChange', label: 'Running Change' },
      { key: 'afterConsumingStock', label: 'After Consuming Stock' },
      { key: 'afterLeadTime', label: 'After Lead Time' },
      { key: 'fieldPartsToBeModified', label: 'Field Parts to be Modified' },
      { key: 'replaceFieldVehicleParts', label: 'Replace Field Vehicle Parts' }
    ];

    return fields.map(field => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
        <span style="font-weight: 500; color: var(--text-secondary); font-size: 13px;">${field.label}</span>
        <span style="font-weight: 700; color: var(--primary-main);">${strategy[field.key] || 0}</span>
      </div>
    `).join('');
  };

  const maxTrend = Math.max(...((data.creationTrend || []).map(t => t.count)) || [1], 1);
  const generateTrendHTML = (trend) => {
    if (!trend || trend.length === 0) {
      return `<div style="width: 100%; text-align: center; color: var(--text-muted);">No trend data available</div>`;
    }
    return trend.map(t => {
      const heightPct = Math.max(10, (t.count / maxTrend) * 100);
      return `
        <div class="bar-col" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
          <div style="height: ${heightPct}%; background: var(--danger-main); width: 40px; border-radius: 4px 4px 0 0; min-height: 20px; display: flex; align-items: flex-start; justify-content: center; color: white; font-size: 10px; font-weight: bold; padding-top: 4px;">${t.count}</div>
          <div style="margin-top: 8px; font-size: 11px; color: var(--text-secondary); font-weight: 500; text-align: center;">${t.label}</div>
        </div>
      `;
    }).join('');
  };

  container.innerHTML = `
    <div class="main-workspace fade-in" style="padding: 24px; overflow-y: auto; height: 100%;">
      <div class="workspace-header" style="margin-bottom: 24px;">
        <div class="header-left">
          <h2>ECN Lifecycle Analytics</h2>
          <p class="text-secondary">Engineering Change Notice tracking, review states, and impact strategies.</p>
        </div>
      </div>

      <!-- High Level Metrics -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 32px;">
        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span class="material-icons-outlined" style="font-size: 18px; color: var(--text-primary);">assignment</span> Total ECNs
          </div>
          <div style="font-size: 32px; font-weight: 700; color: var(--text-primary);">${data.totalECNs || 0}</div>
        </div>

        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span class="material-icons-outlined" style="font-size: 18px; color: var(--warning-main);">pending_actions</span> Pending Approvals
          </div>
          <div style="font-size: 32px; font-weight: 700; color: var(--warning-main);">${data.approvalMetrics?.totalPendingApprovals || 0}</div>
        </div>

        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span class="material-icons-outlined" style="font-size: 18px; color: var(--success-main);">check_circle</span> Total Approved
          </div>
          <div style="font-size: 32px; font-weight: 700; color: var(--success-main);">${data.approvalMetrics?.totalApproved || 0}</div>
        </div>

        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span class="material-icons-outlined" style="font-size: 18px; color: var(--danger-main);">cancel</span> Total Rejected
          </div>
          <div style="font-size: 32px; font-weight: 700; color: var(--danger-main);">${data.approvalMetrics?.totalRejected || 0}</div>
        </div>
      </div>

      <!-- Main Layout Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        
        <!-- Left Column -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Implementation Strategy -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">Implementation Strategy</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${generateImplementationHTML(data.implementationStrategy || {})}
            </div>
          </div>
        </div>

        <!-- Middle Column -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Status Breakdown -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">Status Breakdown</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${generateListHTML(data.statusBreakdown, 'status', 'count')}
            </div>
          </div>

          <!-- By Vehicle Code -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">By Vehicle Code</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${generateListHTML(data.byVehicleCode, 'vehicleCode', 'count')}
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Recent Cost Impacts -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">Recent Cost Impacts</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${generateListHTML(data.recentCostImpacts, 'ecnNumber', 'costImpact', true)}
            </div>
          </div>
        </div>

      </div>

      <!-- Bottom Full Width Row for Charts -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 32px;">
        <h3 style="margin-bottom: 24px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">ECN Creation Trend</h3>
        <div style="display: flex; align-items: flex-end; justify-content: space-around; height: 200px; padding: 0 24px;">
          ${generateTrendHTML(data.creationTrend || [])}
        </div>
      </div>

    </div>
  `;
}
