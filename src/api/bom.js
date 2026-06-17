import { authFetch } from './client.js';
import { getErrorMessageFromResponse } from './auth.js';

let cacheAllBomsWithParts = null;

export function clearBomCache() {
  cacheAllBomsWithParts = null;
}

// POST /api/BOM/create — Create BOM header
// Also exported as createBom (camelCase) for consumers that use that spelling.
export async function createBOM(payload) {
  const body = {
    categoryCode: payload?.categoryCode,
    modelCode: payload?.modelCode,
    groupCode: payload?.groupCode,
    subGroupCode: payload?.subGroupCode,
    revisionLetter: payload?.revisionLetter,
    assemblyStatus: payload?.assemblyStatus,
    name: payload?.name,
    description: payload?.description,
    teamId: payload?.teamId,
    vehicleModelId: payload?.vehicleModelId
  };

  if (payload?.parentBOMId) {
    body.parentBOMId = payload.parentBOMId;
  }

  let response = await authFetch('/api/BOM/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.status === 404) {
    response = await authFetch('/api/bom/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  let rawData = null;
  try { rawData = await response.json(); } catch { rawData = null; }
  if (!response.ok) {
    const validationErrors = rawData?.errors
      ? Object.values(rawData.errors).flat().filter(Boolean).join(' ')
      : '';
    const fallback = `BOM creation failed (${response.status})`;
    const message = validationErrors || getErrorMessageFromResponse(rawData, fallback);
    throw new Error(message || fallback);
  }
  clearBomCache();
  return rawData;
}

// POST /api/bom/lines — Add a child part to a parent's BOM
export async function addBomLine({ parentPartId, childPartId, quantity, unitOfMeasure, findNumber, referenceDesignator, notes }) {
  const response = await authFetch('/api/bom/lines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentPartId, childPartId, quantity, unitOfMeasure: unitOfMeasure || 'EA', findNumber, referenceDesignator, notes }),
  });
  let rawData = null;
  try { rawData = await response.json(); } catch { rawData = null; }
  if (!response.ok) throw new Error(getErrorMessageFromResponse(rawData, `BOM line add failed (${response.status})`));
  return rawData;
}

// GET /api/bom/{parentPartId}/lines — Flat BOM: direct children only
export async function getBomLines(parentPartId) {
  const response = await authFetch(`/api/bom/${parentPartId}/lines`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw new Error(`Failed to fetch BOM lines (${response.status})`);
  return response.json();
}

// GET /api/bom/{partId}/tree — Recursive BOM tree up to 10 levels deep
export async function getBomTree(partId) {
  const response = await authFetch(`/api/bom/${partId}/tree`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw new Error(`Failed to fetch BOM tree (${response.status})`);
  return response.json();
}

// GET /api/bom/{partId}/where-used — Where-used / where-fitted report
export async function getBomWhereUsed(partId) {
  const response = await authFetch(`/api/bom/${partId}/where-used`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw new Error(`Failed to fetch where-used (${response.status})`);
  return response.json();
}

// PUT /api/bom/lines/{bomLineId} — Update an existing BOM line
export async function updateBomLine(bomLineId, { quantity, unitOfMeasure, notes, findNumber, referenceDesignator }) {
  const response = await authFetch(`/api/bom/lines/${bomLineId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity, unitOfMeasure, notes, findNumber, referenceDesignator }),
  });
  let rawData = null;
  try { rawData = await response.json(); } catch { rawData = null; }
  if (!response.ok) throw new Error(getErrorMessageFromResponse(rawData, `BOM line update failed (${response.status})`));
  return rawData;
}

// DELETE /api/bom/lines/{bomLineId} — Soft-delete a BOM line
export async function deleteBomLine(bomLineId) {
  const response = await authFetch(`/api/bom/lines/${bomLineId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`BOM line delete failed (${response.status})`);
}

// GET /api/BOM/team/{teamId} — Get BOM by Team ID
export async function getBomByTeamId(teamId) {
  const response = await authFetch(`/api/BOM/team/${teamId}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw new Error(`Failed to fetch BOM for team (${response.status})`);
  return response.json();
}

// GET /api/BOM/{id}/parts — Get parts in a BOM
export async function getBomParts(id) {
  const response = await authFetch(`/api/BOM/${id}/parts`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw new Error(`Failed to fetch BOM parts (${response.status})`);
  return response.json();
}
// GET /api/BOM — Get all BOMs
export async function getBoms() {
  const endpoints = ['/api/BOM', '/api/BOMs', '/api/bom', '/api/boms'];
  let lastResponse = null;

  for (const endpoint of endpoints) {
    const response = await authFetch(endpoint, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    lastResponse = response;
    if (response.ok) return response.json();
    if (response.status !== 404) break;
  }

  if (!lastResponse.ok) throw new Error(`Failed to fetch BOMs (${lastResponse.status})`);
  return lastResponse.json();
}

// GET /api/BOM/{id} — Get BOM by ID
export async function getBomById(id) {
  const response = await authFetch(`/api/BOM/${id}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw new Error(`Failed to fetch BOM by id (${response.status})`);
  return response.json();
}

// GET /api/BOM/all-with-parts — Get all BOMs with parts
export async function getAllBomsWithParts(bypassCache = false) {
  if (cacheAllBomsWithParts && !bypassCache) {
    return cacheAllBomsWithParts;
  }
  const response = await authFetch('/api/BOM/all-with-parts', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw new Error(`Failed to fetch BOMs with parts (${response.status})`);
  const data = await response.json();
  cacheAllBomsWithParts = data;
  return data;
}

// camelCase alias — pages that import { createBom } resolve to the same function
export const createBom = createBOM;

// POST /api/BOM/{id}/link-parent — Link child BOM to a parent BOM
export async function linkBomWithParent(childBomId, parentBOMId) {
  const response = await authFetch(`/api/BOM/${childBomId}/link-parent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentBOMId })
  });
  let rawData = null;
  try { rawData = await response.json(); } catch { rawData = null; }
  if (!response.ok) throw new Error(getErrorMessageFromResponse(rawData, `Failed to link BOM with parent (${response.status})`));
  return rawData;
}
