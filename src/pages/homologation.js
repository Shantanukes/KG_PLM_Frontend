export function renderHomologation(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Homologation</h1>
        <p>Manage compliance certificates exclusively for Homologation.</p>
      </div>
    </div>

    <div id="homologation-content"></div>
  `;

  renderHomologationTab(container.querySelector('#homologation-content'));
}

function renderHomologationTab(container) {
  container.innerHTML = `
    <div class="card" style="margin-bottom: 20px;">
      <div class="card-header">
        <div class="card-title"><span class="material-icons-outlined">upload_file</span> Upload BOM Compliance Certificate</div>
      </div>
      <div class="card-body">
        <div class="form-group" style="max-width: 400px; margin-bottom: 12px;">
          <label class="form-label">BOM ID / Model <span style="color:#DC2626">*</span></label>
          <input type="text" class="form-input" id="bom-id-input" placeholder="e.g. BOM-EV-MODEL-A" required />
        </div>
        <div class="form-group" style="max-width: 400px; margin-bottom: 12px;">
          <label class="form-label">Start Date <span style="color:#DC2626">*</span></label>
          <input type="date" class="form-input" id="start-date-input" required />
        </div>
        <div class="form-group" style="max-width: 400px; margin-bottom: 12px;">
          <label class="form-label">Expiry Date <span style="color:#DC2626">*</span></label>
          <input type="date" class="form-input" id="expiry-date-input" required />
        </div>
        <div class="form-group" style="max-width: 400px; margin-bottom: 12px;">
          <label class="form-label">Compliance Certificate (PDF/Image) <span style="color:#DC2626">*</span></label>
          <input type="file" class="form-input" id="cert-file-input" accept=".pdf, .jpg, .png, .jpeg" required />
        </div>
        <button class="btn btn-primary" id="upload-bom-cert">Upload Certificate</button>
      </div>
    </div>
    
    <div class="card">
      <div class="card-header">
        <div class="card-title">BOM Compliance Certificates</div>
      </div>
      <div class="card-body">
        <p class="text-secondary" style="font-size: 0.9rem;">No BOM certificates uploaded yet. Recently added compliance records will be listed here.</p>
      </div>
    </div>
  `;

  container.querySelector('#upload-bom-cert')?.addEventListener('click', () => {
    const bomId = container.querySelector('#bom-id-input').value;
    const startDate = container.querySelector('#start-date-input').value;
    const expiryDate = container.querySelector('#expiry-date-input').value;
    const file = container.querySelector('#cert-file-input').value;

    if (!bomId || !startDate || !expiryDate || !file) {
      if (typeof window.showToast === 'function') {
         window.showToast('Please fill in all mandatory fields', 'error');
      } else {
         alert('Please fill in all mandatory fields');
      }
      return;
    }

    if (typeof window.showToast === 'function') {
       window.showToast('BOM Compliance Certificate Uploaded', 'success');
    } else {
       alert('BOM Compliance Certificate Uploaded');
    }
  });
}
