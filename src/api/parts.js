  import { authFetch } from './client.js';
import { getErrorMessageFromResponse } from './auth.js';

// Cache TTL: entries older than 90 seconds are considered stale and refreshed
const CACHE_TTL_MS = 90_000;
let cacheParts = {};

export function clearPartsCache() {
  cacheParts = {};
}

function isCacheValid(entry) {
  return entry && (Date.now() - entry.ts < CACHE_TTL_MS);
}


export async function createPart(payload) {
  const response = await authFetch('/api/Parts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });

  let rawData = null;
  try {
    rawData = await response.json();
  } catch {
    rawData = null;
  }

  if (!response.ok) {
    const validationErrors = rawData?.errors
      ? Object.values(rawData.errors).flat().filter(Boolean).join(' ')
      : '';
    const fallback = `Part creation failed (${response.status})`;
    const message = validationErrors || getErrorMessageFromResponse(rawData, fallback);
    throw new Error(message || fallback);
  }

  clearPartsCache();
  return rawData;
}

export async function updatePart(id, payload) {
  const response = await authFetch(`/api/Parts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });

  let rawData = null;
  try {
    rawData = await response.json();
  } catch {
    rawData = null;
  }

  if (!response.ok) {
    const validationErrors = rawData?.errors
      ? Object.values(rawData.errors).flat().filter(Boolean).join(' ')
      : '';
    const fallback = `Part update failed (${response.status})`;
    const message = validationErrors || getErrorMessageFromResponse(rawData, fallback);
    throw new Error(message || fallback);
  }

  clearPartsCache();
  return rawData;
}

export async function deletePart(id) {
  const response = await authFetch(`/api/Parts/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    let rawData;
    try {
      rawData = await response.json();
    } catch {
      rawData = null;
    }
    const fallback = `Part deletion failed (${response.status})`;
    const message = rawData?.errors ? Object.values(rawData.errors).flat().join(' ') : getErrorMessageFromResponse(rawData, fallback);
    throw new Error(message || fallback);
  }

  clearPartsCache();
  return true;
}

export async function getParts(params = {}, bypassCache = false) {
  const qs = new URLSearchParams(params).toString();
  const cacheKey = qs || 'all';
  // Return cached data if it exists and is within TTL
  if (!bypassCache && isCacheValid(cacheParts[cacheKey])) {
    return cacheParts[cacheKey].data;
  }
  const url = qs ? `/api/Parts?${qs}` : '/api/Parts';
  const response = await authFetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  if (!response.ok) throw new Error(`Failed to fetch parts (${response.status})`);
  const data = await response.json();
  // Store with timestamp for TTL checking
  cacheParts[cacheKey] = { data, ts: Date.now() };
  return data;
}


export async function getPartById(id) {
  const response = await authFetch(`/api/Parts/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  if (!response.ok) throw new Error(`Failed to fetch part by id (${response.status})`);
  return response.json();
}

export async function revisePart(payload) {
  const response = await authFetch('/api/Parts/revise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let rawData = null;
  try {
    rawData = await response.json();
  } catch {
    rawData = null;
  }

  if (!response.ok) {
    const validationErrors = rawData?.errors
      ? Object.values(rawData.errors).flat().filter(Boolean).join(' ')
      : '';
    const fallback = `Part revision failed (${response.status})`;
    const message = validationErrors || getErrorMessageFromResponse(rawData, fallback);
    throw new Error(message || fallback);
  }

  clearPartsCache();
  return rawData;
}

export async function getPartByNumber(partNumber) {
  const response = await authFetch(`/api/Parts/Number/${encodeURIComponent(partNumber)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  if (!response.ok) throw new Error(`Failed to fetch part by number (${response.status})`);
  return response.json();
}

export async function fetchSuppliers() {
  const response = await authFetch('/api/Suppliers', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  if (!response.ok) {
     console.warn('Failed to fetch suppliers:', response.status);
     return [];
  }
  return response.json();
}
