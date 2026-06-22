import { authFetch } from './client.js';

export async function getVehicleModels() {
  const response = await authFetch('/api/VehicleModels');
  if (!response.ok) throw new Error(`Failed to fetch vehicle models (${response.status})`);
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export async function getVehicleModelCodes(id) {
  const response = await authFetch(`/api/VehicleModels/${id}/codes`);
  if (!response.ok) throw new Error(`Failed to fetch vehicle model codes (${response.status})`);
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export async function createVehicleModel(data) {
  const response = await authFetch('/api/VehicleModels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(`Failed to create vehicle model (${response.status})`);
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export async function updateVehicleModel(id, data) {
  const response = await authFetch(`/api/VehicleModels/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(`Failed to update vehicle model (${response.status})`);
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export async function deleteVehicleModel(id, data) {
  const response = await authFetch(`/api/VehicleModels/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {})
  });
  if (!response.ok) throw new Error(`Failed to delete vehicle model (${response.status})`);
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
