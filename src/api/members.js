import { getAccessToken } from './client.js';
import { getErrorMessageFromResponse } from './auth.js';

export async function changePassword({ apiBaseUrl, currentPassword, newPassword, confirmPassword, token }) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['X-Reset-Token'] = token;
    headers.Authorization = `Bearer ${token}`;
  } else {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const response = await fetch(`${apiBaseUrl}/api/Members/change-password`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ currentPassword: currentPassword || "", newPassword, confirmPassword }),
  });

  let rawData = null;
  try {
    rawData = await response.json();
  } catch {
    rawData = null;
  }

  if (!response.ok) {
    throw new Error(getErrorMessageFromResponse(rawData, `Password update failed (${response.status})`));
  }
}
