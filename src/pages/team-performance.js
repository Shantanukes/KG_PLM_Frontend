import { devLog } from '../utils.js';
import { authFetch } from '../api/client.js';

export async function renderTeamPerformance(container) {
  // Initial loading state
  container.innerHTML = `
    <div class="main-workspace fade-in" style="padding: 24px; display: flex; align-items: center; justify-content: center; height: 100%;">
      <div style="text-align: center;">
        <span class="material-icons-outlined" style="font-size: 32px; animation: spin 1s linear infinite; color: var(--primary-main);">autorenew</span>
        <div style="margin-top: 12px; color: var(--text-secondary);">Loading Team Performance Analytics...</div>
      </div>
    </div>
  `;

  let teams = [];

  try {
    const res = await authFetch('/api/executive-analytics/team-performance');
    if (res.ok) {
      const json = await res.json();
      // Handle { teams: [...] } response format
      teams = json.teams || (Array.isArray(json) ? json : []);
    } else {
      throw new Error('API failed');
    }
  } catch (err) {
    devLog("Failed to fetch team performance, using mock data", err);
    // Mock data reflecting the newly requested schema
    const mockResponse = {
      "teams": [
        {
          "teamId": 1,
          "teamName": "2 Wheeler",
          "isActive": true,
          "memberCount": 0,
          "totalBOMs": 8,
          "releasedBOMs": 0,
          "totalParts": 250,
          "releasedParts": 0,
          "pendingApprovals": 15
        },
        {
          "teamId": 6,
          "teamName": "Test Team",
          "isActive": true,
          "memberCount": 6,
          "totalBOMs": 2,
          "releasedBOMs": 0,
          "totalParts": 15,
          "releasedParts": 6,
          "pendingApprovals": 6
        },
        {
          "teamId": 2,
          "teamName": "Manufacturing Team 3 Wheeler",
          "isActive": true,
          "memberCount": 0,
          "totalBOMs": 0,
          "releasedBOMs": 0,
          "totalParts": 0,
          "releasedParts": 0,
          "pendingApprovals": 0
        },
        {
          "teamId": 3,
          "teamName": "3 Wheeler SS",
          "isActive": true,
          "memberCount": 1,
          "totalBOMs": 0,
          "releasedBOMs": 0,
          "totalParts": 0,
          "releasedParts": 0,
          "pendingApprovals": 0
        },
        {
          "teamId": 4,
          "teamName": "Testteam21",
          "isActive": true,
          "memberCount": 3,
          "totalBOMs": 0,
          "releasedBOMs": 0,
          "totalParts": 0,
          "releasedParts": 0,
          "pendingApprovals": 0
        },
        {
          "teamId": 5,
          "teamName": "TEstProject33",
          "isActive": true,
          "memberCount": 3,
          "totalBOMs": 0,
          "releasedBOMs": 0,
          "totalParts": 0,
          "releasedParts": 0,
          "pendingApprovals": 0
        }
      ]
    };
    // teams = mockResponse.teams;
  }

  const renderTeamCards = () => {
    if (teams.length === 0) {
      return `<div style="text-align: center; color: var(--text-muted); padding: 40px; width: 100%;">No teams found.</div>`;
    }

    return teams.map(team => `
      <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); position: relative; overflow: hidden;">
        
        <!-- Active Status Indicator -->
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: ${team.isActive ? 'var(--success-main)' : 'var(--text-muted)'};"></div>
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
          <div>
            <h3 style="font-size: 18px; color: var(--text-primary); margin-bottom: 4px;">${team.teamName}</h3>
            <div style="font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;">
              <span class="material-icons-outlined" style="font-size: 14px;">groups</span>
              ${team.memberCount} Members
            </div>
          </div>
          <div style="background: ${team.isActive ? 'var(--success-light)' : 'var(--bg-default)'}; color: ${team.isActive ? 'var(--success-dark)' : 'var(--text-muted)'}; padding: 4px 12px; border-radius: 16px; font-weight: 600; font-size: 11px; text-transform: uppercase;">
            ${team.isActive ? 'Active' : 'Inactive'}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <!-- Parts Metric -->
          <div style="background: var(--bg-default); padding: 16px; border-radius: 6px; border: 1px solid var(--border-light);">
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
               <span class="material-icons-outlined" style="font-size: 14px; color: var(--primary-main);">category</span> Parts
            </div>
            <div style="font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${team.totalParts}</div>
            <div style="font-size: 11px; color: var(--text-muted);">
              <span style="color: var(--success-main); font-weight: 600;">${team.releasedParts}</span> Released
            </div>
          </div>

          <!-- BOMs Metric -->
          <div style="background: var(--bg-default); padding: 16px; border-radius: 6px; border: 1px solid var(--border-light);">
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
               <span class="material-icons-outlined" style="font-size: 14px; color: var(--primary-main);">account_tree</span> BOMs
            </div>
            <div style="font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${team.totalBOMs}</div>
            <div style="font-size: 11px; color: var(--text-muted);">
              <span style="color: var(--success-main); font-weight: 600;">${team.releasedBOMs}</span> Released
            </div>
          </div>
        </div>

        <!-- Pending Approvals Bar -->
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">Pending Approvals Pipeline</div>
          <div style="font-size: 16px; font-weight: 700; color: var(--warning-main); display: flex; align-items: center; gap: 6px;">
            <span class="material-icons-outlined" style="font-size: 16px;">pending_actions</span>
            ${team.pendingApprovals}
          </div>
        </div>

      </div>
    `).join('');
  };

  container.innerHTML = `
    <div class="main-workspace fade-in" style="padding: 24px; overflow-y: auto; height: 100%;">
      <div class="workspace-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
        <div class="header-left">
          <h2>Team Performance Analytics</h2>
          <p class="text-secondary">Evaluate engineering throughput, release velocity, and pending bottlenecks by team.</p>
        </div>
      </div>

      <!-- Teams Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px; margin-bottom: 32px;">
        ${renderTeamCards()}
      </div>

    </div>
  `;
}
