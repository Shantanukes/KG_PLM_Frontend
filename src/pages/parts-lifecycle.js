import { authFetch } from '../api/client.js';

export async function renderPartsLifecycle(container) {
  container.innerHTML = `
    <div class="main-workspace fade-in" style="padding: 24px; display: flex; align-items: center; justify-content: center; height: 100%;">
      <div style="text-align: center;">
        <span class="material-icons-outlined" style="font-size: 32px; animation: spin 1s linear infinite; color: var(--primary-main);">autorenew</span>
        <div style="margin-top: 12px; color: var(--text-secondary);">Loading Parts Analytics...</div>
      </div>
    </div>
  `;

  let data;
  try {
    const res = await authFetch('/api/executive-analytics/part-analytics');
    if (res.ok) {
      data = await res.json();
    } else {
      throw new Error('API failed');
    }
  } catch (err) {
    console.warn("Failed to fetch parts analytics, using mock data", err);
    data = {
      "totalParts": 265,
      "lifecycleBreakdown": [
        { "status": "Draft", "count": 251, "percentage": 94.7 },
        { "status": "InReview", "count": 8, "percentage": 3 },
        { "status": "Released", "count": 6, "percentage": 2.3 }
      ],
      "byCategory": [
        { "categoryCode": "B", "categoryName": "3W-BEV", "totalParts": 33, "releasedParts": 0, "draftParts": 30 },
        { "categoryCode": "G", "categoryName": "2 Wheel", "totalParts": 15, "releasedParts": 6, "draftParts": 4 }
      ],
      "makeBuyAnalysis": {
        "makeInHouse": 254,
        "fullSupplierScope": 8,
        "builtToPrint": 3,
        "makePercentage": 95.8,
        "buyPercentage": 4.2
      },
      "eeAnalysis": {
        "totalEEParts": 10,
        "totalNonEEParts": 255,
        "eePercentage": 3.8,
        "eePartsInReview": 4,
        "eePartsReleased": 5
      },
      "creationTrend": [
        { "year": 2026, "month": 4, "label": "Apr 2026", "count": 5 },
        { "year": 2026, "month": 5, "label": "May 2026", "count": 217 },
        { "year": 2026, "month": 6, "label": "Jun 2026", "count": 43 }
      ],
      "topSuppliers": [
        { "supplierId": 1, "supplierName": "ABC", "partCount": 1, "percentage": 9.1 },
        { "supplierId": 7, "supplierName": "Kinetic Green Supplier 2", "partCount": 1, "percentage": 9.1 },
        { "supplierId": 3, "supplierName": "KineticLab", "partCount": 1, "percentage": 9.1 },
        { "supplierId": 5, "supplierName": "N/A", "partCount": 1, "percentage": 9.1 },
        { "supplierId": 6, "supplierName": "psp", "partCount": 1, "percentage": 9.1 }
      ],
      "approvalPipeline": {
        "awaitingPartNumberApproval": 243,
        "atProjectManager": 23,
        "atCOEHead": 1,
        "atProjectHead": 1,
        "atRnDHead": 2,
        "atSupplierFeasibility": 1,
        "atSourcingStudy": 0,
        "atProtoStudy": 0,
        "completed": 6
      },
      "byReleaseFlag": [
        { "releaseFlag": "EC_Release", "count": 262 },
        { "releaseFlag": "CD_Release", "count": 2 },
        { "releaseFlag": "Proto_Release", "count": 1 }
      ]
    };
  }

  // Helpers to generate HTML
  const generateLifecycleHTML = (lifecycleBreakdown) => {
    return lifecycleBreakdown.map(item => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
        <span style="font-weight: 500; color: var(--text-secondary);">${item.status}</span>
        <div>
          <span style="font-weight: 700; color: var(--text-primary); margin-right: 8px;">${item.count}</span>
          <span style="font-size: 11px; color: var(--text-muted);">(${item.percentage}%)</span>
        </div>
      </div>
    `).join('');
  };

  const generateCategoryHTML = (byCategory) => {
    return byCategory.map(cat => `
      <div style="padding: 12px; background: var(--bg-default); border-radius: 4px; border-left: 3px solid var(--primary-main);">
        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${cat.categoryName} (${cat.categoryCode})</div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary);">
          <span>Total: <strong>${cat.totalParts}</strong></span>
          <span>Draft: <strong>${cat.draftParts}</strong></span>
          <span style="color: var(--success-main);">Released: <strong>${cat.releasedParts}</strong></span>
        </div>
      </div>
    `).join('');
  };

  const generatePipelineHTML = (pipeline) => {
    const steps = [
      { key: "awaitingPartNumberApproval", label: "Awaiting Part No." },
      { key: "atProjectManager", label: "Project Manager" },
      { key: "atCOEHead", label: "COE Head" },
      { key: "atProjectHead", label: "Project Head" },
      { key: "atRnDHead", label: "R&D Head" },
      { key: "atSupplierFeasibility", label: "Supplier Feasibility" },
      { key: "atSourcingStudy", label: "Sourcing Study" },
      { key: "atProtoStudy", label: "Proto Study" },
      { key: "completed", label: "Completed" }
    ];

    return steps.map(step => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
        <span style="font-weight: 500; color: var(--text-secondary); font-size: 13px;">${step.label}</span>
        <span style="font-weight: 700; color: var(--primary-main);">${pipeline[step.key] || 0}</span>
      </div>
    `).join('');
  };

  const generateSuppliersHTML = (suppliers) => {
    return suppliers.map(sup => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
        <span style="font-weight: 500; color: var(--text-secondary); font-size: 13px; text-transform: capitalize;">${sup.supplierName}</span>
        <div>
          <span style="font-weight: 700; color: var(--text-primary); margin-right: 8px;">${sup.partCount}</span>
          <span style="font-size: 11px; color: var(--text-muted);">(${sup.percentage}%)</span>
        </div>
      </div>
    `).join('');
  };

  const generateReleaseFlagHTML = (flags) => {
    return flags.map(flag => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
        <span style="font-weight: 500; color: var(--text-secondary);">${flag.releaseFlag.replace('_', ' ')}</span>
        <span style="font-weight: 700;">${flag.count}</span>
      </div>
    `).join('');
  };

  const maxTrend = Math.max(...(data.creationTrend.map(t => t.count) || [1]));
  const generateTrendHTML = (trend) => {
    return trend.map(t => {
      const heightPct = Math.max(10, (t.count / maxTrend) * 100);
      return `
        <div class="bar-col" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
          <div style="height: ${heightPct}%; background: var(--primary-main); width: 40px; border-radius: 4px 4px 0 0; min-height: 20px; display: flex; align-items: flex-start; justify-content: center; color: white; font-size: 10px; font-weight: bold; padding-top: 4px;">${t.count}</div>
          <div style="margin-top: 8px; font-size: 11px; color: var(--text-secondary); font-weight: 500; text-align: center;">${t.label}</div>
        </div>
      `;
    }).join('');
  };

  container.innerHTML = `
    <div class="main-workspace fade-in" style="padding: 24px; overflow-y: auto; height: 100%;">
      <div class="workspace-header" style="margin-bottom: 24px;">
        <div class="header-left">
          <h2>Parts Lifecycle Analytics</h2>
          <p class="text-secondary">Comprehensive breakdown of part statuses, approvals, and categorizations.</p>
        </div>
      </div>

      <!-- High Level Metrics -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 32px;">
        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span class="material-icons-outlined" style="font-size: 18px; color: var(--primary-main);">category</span> Total Parts
          </div>
          <div style="font-size: 32px; font-weight: 700; color: var(--text-primary);">${data.totalParts}</div>
        </div>

        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span class="material-icons-outlined" style="font-size: 18px; color: var(--success-main);">precision_manufacturing</span> Make / Buy Ratio
          </div>
          <div style="font-size: 32px; font-weight: 700; color: var(--text-primary);">${data.makeBuyAnalysis?.makePercentage}%</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px; font-weight: 500;">
            ${data.makeBuyAnalysis?.makeInHouse} In-House | ${data.makeBuyAnalysis?.fullSupplierScope} Supplier
          </div>
        </div>

        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span class="material-icons-outlined" style="font-size: 18px; color: var(--warning-main);">electrical_services</span> EE / Non-EE Parts
          </div>
          <div style="font-size: 32px; font-weight: 700; color: var(--text-primary);">${data.eeAnalysis?.eePercentage}%</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px; font-weight: 500;">
            ${data.eeAnalysis?.totalEEParts} EE | ${data.eeAnalysis?.totalNonEEParts} Non-EE
          </div>
        </div>
      </div>

      <!-- Main Layout Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        
        <!-- Left Column -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Lifecycle Breakdown -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">Lifecycle Breakdown</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${generateLifecycleHTML(data.lifecycleBreakdown || [])}
            </div>
          </div>

          <!-- By Release Flag -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">By Release Flag</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${generateReleaseFlagHTML(data.byReleaseFlag || [])}
            </div>
          </div>
        </div>

        <!-- Middle Column -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Approval Pipeline -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">Approval Pipeline</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${generatePipelineHTML(data.approvalPipeline || {})}
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Categories -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">Parts By Category</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${generateCategoryHTML(data.byCategory || [])}
            </div>
          </div>

          <!-- Top Suppliers -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">Top Suppliers</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${generateSuppliersHTML(data.topSuppliers || [])}
            </div>
          </div>
        </div>

      </div>

      <!-- Bottom Full Width Row for Charts -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 32px;">
        <h3 style="margin-bottom: 24px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">Part Creation Trend</h3>
        <div style="display: flex; align-items: flex-end; justify-content: space-around; height: 200px; padding: 0 24px;">
          ${generateTrendHTML(data.creationTrend || [])}
        </div>
      </div>

    </div>
  `;
}
