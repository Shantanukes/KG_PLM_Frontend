import { showToast } from '../main.js';
import { authFetch } from '../api/client.js';

export function renderPartNumber(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>11 Digit Part Numbering System</h1>
        <p>Master Data Lookups</p>
      </div>
    </div>

    <div style="display: flex; gap: 16px; overflow-x: auto; padding-bottom: 20px; align-items: flex-start; min-height: 70vh;">
      <div id="col-category" style="min-width: 250px; flex-shrink: 0; flex: 1;"></div>
      <div id="col-groups" style="min-width: 280px; flex-shrink: 0; flex: 1;"></div>
      <div id="col-machine" style="min-width: 250px; flex-shrink: 0; flex: 1;"></div>
      <div id="col-dev" style="min-width: 280px; flex-shrink: 0; flex: 1;"></div>
    </div>
  `;

  renderProductCategoriesTab(container.querySelector('#col-category'));
  renderPartGroupsTab(container.querySelector('#col-groups'));
  renderMachineStatusTab(container.querySelector('#col-machine'));
  renderDevStatusTab(container.querySelector('#col-dev'));
}

function createPaginatedLookupTable(tc, title, color, items, renderRow) {
  let currentPage = 1;
  const itemsPerPage = 15;

  const renderPage = (page) => {
    currentPage = page;
    const totalPages = Math.ceil(items.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, items.length);
    const pageItems = items.slice(startIdx, endIdx);

    const rowsHtml = pageItems.length > 0 
      ? pageItems.map(renderRow).join('') 
      : '<tr><td colspan="2" style="text-align:center;padding:20px;">No records found.</td></tr>';

    const paginationHtml = items.length > itemsPerPage ? `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 16px; border-top:1px solid var(--border-light); background:white;">
        <div style="font-size:0.75rem; color:var(--text-secondary);">
          Showing ${startIdx + 1}-${endIdx} of ${items.length}
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-outline btn-xs prev-btn" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
          <button class="btn btn-outline btn-xs next-btn" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    ` : '';

    tc.innerHTML = `
      <div class="card fade-in" style="margin: 0; display:flex; flex-direction:column; height: 100%;">
        <div class="card-header" style="background-color: ${color}; color: white; padding: 12px 16px;">
          <div class="card-title" style="color: white; font-size: 0.9rem;">${title}</div>
        </div>
        <div class="card-body no-pad" style="flex:1; display:flex; flex-direction:column;">
          <div style="flex:1;">
            <table class="data-table" style="margin-bottom:0;">
              <thead>
                <tr style="background: white; border-bottom: 1px solid var(--border-light);">
                  <th style="text-align:left;padding:8px 16px;font-size:0.75rem;">Code</th>
                  <th style="text-align:left;padding:8px 16px;font-size:0.75rem;">Name</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
          ${paginationHtml}
        </div>
      </div>
    `;

    const prevBtn = tc.querySelector('.prev-btn');
    const nextBtn = tc.querySelector('.next-btn');

    if (prevBtn) prevBtn.addEventListener('click', () => renderPage(currentPage - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => renderPage(currentPage + 1));
  };

  renderPage(1);
}

async function renderProductCategoriesTab(tc) {
  tc.innerHTML = '<div style="padding: 20px;">Loading product categories...</div>';
  try {
    const res = await authFetch('/api/Lookups/product-categories');
    if (!res.ok) throw new Error('Failed to load product categories');
    const categories = await res.json();
    createPaginatedLookupTable(tc, 'Product Category', '#22c55e', categories, c => `
      <tr style="border-bottom: 1px solid var(--border-light);">
        <td style="padding: 6px 16px; font-family: var(--font-mono); font-weight: 600; font-size:0.8rem;">${c.code || '-'}</td>
        <td style="padding: 6px 16px; font-size:0.8rem;" class="font-medium">${c.name || 'N/A'}</td>
      </tr>
    `);
  } catch (err) {
    console.error(err);
    showToast('Error loading product categories', 'error');
    tc.innerHTML = '<div style="padding: 20px; color: #DC2626;">Failed to load product categories.</div>';
  }
}

async function renderPartGroupsTab(tc) {
  tc.innerHTML = '<div style="padding: 20px;">Loading part groups...</div>';
  try {
    const res = await authFetch('/api/Lookups/part-groups');
    if (!res.ok) throw new Error('Failed to load part groups');
    const groups = await res.json();
    createPaginatedLookupTable(tc, 'Group Number', '#eab308', groups, g => {
      const code = g.groupCode !== undefined || g.subGroupCode !== undefined ? (g.groupCode || '') + '' + (g.subGroupCode || '') : g.id || '-';
      return `
      <tr style="border-bottom: 1px solid var(--border-light);">
        <td style="padding: 6px 16px; font-family: var(--font-mono); font-weight: 600; font-size:0.8rem;">${code}</td>
        <td style="padding: 6px 16px; font-size:0.8rem;" class="font-medium">${g.name || 'N/A'}</td>
      </tr>
      `;
    });
  } catch (err) {
    console.error(err);
    showToast('Error loading part groups', 'error');
    tc.innerHTML = '<div style="padding: 20px; color: #DC2626;">Failed to load part groups.</div>';
  }
}

async function renderMachineStatusTab(tc) {
  tc.innerHTML = '<div style="padding: 20px;">Loading machining statuses...</div>';
  try {
    const res = await authFetch('/api/Lookups/machining-statuses');
    if (!res.ok) throw new Error('Failed to load machining statuses');
    const statuses = await res.json();
    createPaginatedLookupTable(tc, 'Machining Status', '#3b82f6', statuses, s => `
      <tr style="border-bottom: 1px solid var(--border-light);">
        <td style="padding: 6px 16px; font-family: var(--font-mono); font-weight: 600; font-size:0.8rem;">${s.code || '-'}</td>
        <td style="padding: 6px 16px; font-size:0.8rem;" class="font-medium">${s.name || 'N/A'}</td>
      </tr>
    `);
  } catch (err) {
    console.error(err);
    showToast('Error loading machining statuses', 'error');
    tc.innerHTML = '<div style="padding: 20px; color: #DC2626;">Failed to load machining statuses.</div>';
  }
}

async function renderDevStatusTab(tc) {
  tc.innerHTML = '<div style="padding: 20px;">Loading dev statuses...</div>';
  try {
    const res = await authFetch('/api/Lookups/dev-statuses');
    if (!res.ok) throw new Error('Failed to load dev statuses');
    const statuses = await res.json();
    createPaginatedLookupTable(tc, 'Development Status', '#f59e0b', statuses, s => `
      <tr style="border-bottom: 1px solid var(--border-light);">
        <td style="padding: 6px 16px; font-family: var(--font-mono); font-weight: 600; font-size:0.8rem;">
          <span class="tag tag-amber" style="background:var(--bg-muted);color:var(--text-primary);border:1px solid var(--border-light);padding:2px 6px;">${s.code || '-'}</span>
        </td>
        <td style="padding: 6px 16px; font-size:0.8rem;" class="font-medium">${s.name || 'N/A'}</td>
      </tr>
    `);
  } catch (err) {
    console.error(err);
    showToast('Error loading dev statuses', 'error');
    tc.innerHTML = '<div style="padding: 20px; color: #DC2626;">Failed to load dev statuses.</div>';
  }
}
