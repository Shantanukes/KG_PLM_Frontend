import { authFetch } from './client.js';
import { getErrorMessageFromResponse } from './auth.js';

export async function getDocuments() {
  const endpoints = ['/api/Documents', '/api/documents'];
  let lastResponse = null;

  for (const endpoint of endpoints) {
    try {
      const response = await authFetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      lastResponse = response;
      if (response.ok) {
        return await response.json();
      }
      if (response.status !== 404) break;
    } catch (e) {
      console.warn(`Failed to fetch from ${endpoint}:`, e);
    }
  }

  if (lastResponse && !lastResponse.ok) {
    throw new Error(`Failed to fetch documents (${lastResponse.status})`);
  }
  throw new Error('Failed to fetch documents from server');
}

export async function uploadDocument(formData) {
  const response = await authFetch('/api/Documents/upload', {
    method: 'POST',
    body: formData,
  });

  let rawData = null;
  try {
    rawData = await response.json();
  } catch {
    rawData = null;
  }

  if (!response.ok) {
    throw new Error(getErrorMessageFromResponse(rawData, `Upload failed (${response.status})`));
  }
  return rawData;
}

export async function getDocumentsByPartNumber(partNumber) {
  const response = await authFetch(`/api/Documents/part/${partNumber}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error(`Failed to fetch documents for part ${partNumber} (${response.status})`);
  return response.json();
}


export async function getDocumentById(id) {
  const response = await authFetch(`/api/documents/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error(`Failed to fetch document by id ${id} (${response.status})`);
  return response.json();
}
