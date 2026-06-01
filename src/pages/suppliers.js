import { authFetch } from '../api/client.js';

export async function renderSuppliers(container) {
  container.innerHTML = `
    <div class="page-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0;">Suppliers</h2>
        <p style="color: var(--text-secondary); margin: 4px 0 0 0;">Manage supplier details and information</p>
      </div>
    </div>
    
    <div class="card fade-in">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding: 16px 24px;">
        <h3 class="card-title" style="margin: 0;">Suppliers Directory</h3>
        <div style="display: flex; gap: 8px; align-items: center;">
          <div class="search-box" style="display: flex; align-items: center; border: 1px solid var(--border-light); border-radius: 6px; padding: 6px 12px; background: var(--bg-primary); transition: border-color 0.2s;">
            <span class="material-icons-outlined" style="color: var(--text-muted); font-size: 18px; margin-right: 6px;">search</span>
            <input type="number" id="suppliers-search-id" placeholder="Search by ID..." style="border: none; background: transparent; outline: none; width: 140px; color: var(--text-primary); font-family: inherit;" />
          </div>
          <button class="btn btn-primary" id="search-supplier-btn" style="white-space: nowrap; height: 36px; display: flex; align-items: center; gap: 4px;"><span class="material-icons-outlined" style="font-size:18px">search</span> Search</button>
          <button class="btn btn-outline" id="refresh-suppliers-btn" title="View All / Refresh" style="height: 36px; width: 36px; padding: 0; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons-outlined">refresh</span>
          </button>
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div id="suppliers-content" style="min-height: 200px;">
          <div style="display: flex; align-items: center; justify-content: center; height: 200px;"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  const contentDiv = document.getElementById('suppliers-content');
  const refreshBtn = document.getElementById('refresh-suppliers-btn');
  const searchInputId = document.getElementById('suppliers-search-id');
  const searchBtn = document.getElementById('search-supplier-btn');
  let allSuppliers = [];

  const loadSuppliers = async () => {
    contentDiv.innerHTML = '<div style="padding: 40px; text-align: center;"><div class="spinner" style="margin: 0 auto;"></div><div style="margin-top: 12px; color: var(--text-secondary);">Loading suppliers...</div></div>';
    
    try {
      const res = await authFetch('/api/Suppliers');
      if (res.ok) {
        let rawData = await res.json();
        
        // Handle varying payload structures
        if (!Array.isArray(rawData)) {
          const possibleArrayKeys = Object.keys(rawData).filter(k => Array.isArray(rawData[k]));
          if (possibleArrayKeys.length > 0) {
            allSuppliers = rawData[possibleArrayKeys[0]];
          } else {
            allSuppliers = [rawData];
          }
        } else {
          allSuppliers = rawData;
        }
        
        displaySuppliers(allSuppliers);
      } else {
        contentDiv.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Failed to load suppliers. Server responded with status ${res.status}.</div>`;
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      contentDiv.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Network error while loading suppliers.</div>`;
    }
  };

  const displaySuppliers = (suppliersList) => {
    if (!suppliersList || suppliersList.length === 0) {
      contentDiv.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-secondary);">No suppliers found.</div>';
      return;
    }

    // Dynamically extract columns from the first object
    const firstObj = suppliersList[0];
    const columns = Object.keys(firstObj);

    let html = `
      <div style="overflow-x: auto;">
        <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-light);">
              ${columns.map(col => `<th style="padding: 12px 16px; font-weight: 600; color: var(--text-secondary); text-transform: capitalize; white-space: nowrap;">${col.replace(/([A-Z])/g, ' $1').trim()}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${suppliersList.map(supplier => `
              <tr style="border-bottom: 1px solid var(--bg-muted);" class="supplier-row hover-bg">
                ${columns.map(col => {
                  let val = supplier[col];
                  if (val === null || val === undefined) {
                    val = '-';
                  } else if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                    val = new Date(val).toLocaleString();
                  } else if (typeof val === 'object') {
                    val = JSON.stringify(val);
                  }
                  return `<td style="padding: 12px 16px; color: var(--text-primary); white-space: nowrap;">${val}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    contentDiv.innerHTML = html;
  };

  const searchSupplierById = async () => {
    const id = searchInputId?.value?.trim();
    if (!id) {
      if (window.showToast) window.showToast('Please enter a Supplier ID', 'warning');
      return;
    }
    
    contentDiv.innerHTML = '<div style="padding: 40px; text-align: center;"><div class="spinner" style="margin: 0 auto;"></div><div style="margin-top: 12px; color: var(--text-secondary);">Searching supplier...</div></div>';
    
    try {
      const res = await authFetch('/api/Suppliers/' + id);
      if (res.ok) {
        let rawData = await res.json();
        // Reset the main list to just this one supplier for display
        allSuppliers = [rawData];
        displaySuppliers(allSuppliers);
      } else if (res.status === 404) {
        contentDiv.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Supplier not found.</div>';
      } else {
        contentDiv.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Failed to search supplier. Status ${res.status}.</div>`;
      }
    } catch (error) {
      console.error('Error searching supplier:', error);
      contentDiv.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Network error while searching supplier.</div>`;
    }
  };

  refreshBtn?.addEventListener('click', () => {
    if (searchInputId) searchInputId.value = '';
    loadSuppliers();
  });
  
  searchBtn?.addEventListener('click', searchSupplierById);
  
  searchInputId?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchSupplierById();
  });

  // Initial load
  loadSuppliers();
}
