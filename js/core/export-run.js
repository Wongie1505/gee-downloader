// Sends an export request to Earth Engine. Uses the token the library holds.

// Thrown when Google says the login is no longer valid
export class SessionError extends Error {}

// Thrown when the request never reached Google (wifi dropped, offline)
export class NetworkError extends Error {}

function errorText(data, status) {
  const message = data && data.error && data.error.message;

  return message || `Earth Engine returned status ${status}.`;
}

// Returns the long-running operation, whose name is used to check progress
export async function postExport(url, body) {
  let response = null;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: ee.data.getAuthToken(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new NetworkError('Could not reach Google. Check your connection and press Download again.');
  }

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    // An empty or non-JSON body is handled by the status checks below
  }

  if (response.status === 401) {
    throw new SessionError('Your session expired.');
  }

  if (!response.ok) {
    throw new Error(errorText(data, response.status));
  }

  if (!data.name) {
    throw new Error('Earth Engine did not return a task name.');
  }

  return data;
}