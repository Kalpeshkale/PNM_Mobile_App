// Base API Configuration
export const API_BASE_URL = 'https://misboard.rohanbuilders.com'; // Default live endpoint
export const SESSION_GUID_KEY = 'pnm_mobile_guid';
export const USER_INFO_KEY = 'pnm_user_info';

// In-memory storage fallback for web/RN without native storage
const memoryStore = new Map();
let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export async function getStoredUser() {
  try {
    const json = memoryStore.get(USER_INFO_KEY);
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.error('Error reading stored user:', error);
    return null;
  }
}

/**
 * Get stored session GUID
 */
export async function getStoredGuid() {
  try {
    return memoryStore.get(SESSION_GUID_KEY) || 'c39a1963-f8da-4898-a4dd-2c46f5b8ffe7';
  } catch (error) {
    console.error('Error reading stored GUID:', error);
    return 'c39a1963-f8da-4898-a4dd-2c46f5b8ffe7';
  }
}

/**
 * Save session GUID to persistent storage
 */
export async function storeGuid(guid) {
  try {
    if (guid) {
      memoryStore.set(SESSION_GUID_KEY, String(guid).trim());
    } else {
      memoryStore.delete(SESSION_GUID_KEY);
    }
  } catch (error) {
    console.error('Error storing GUID:', error);
  }
}

/**
 * Clear stored session & user info on logout
 */
export async function clearSession() {
  try {
    memoryStore.delete(SESSION_GUID_KEY);
    memoryStore.delete(USER_INFO_KEY);
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

/**
 * Core Request Function matching fnsndrequest(moduleName, eventPayload)
 */
export async function fnsndrequest(moduleName = 'PNM_2026', eventPayload = '') {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pnm/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        module: moduleName,
        payload: eventPayload,
      }),
    });

    if (response.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data && data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.warn(`fnsndrequest error [${moduleName}] [${eventPayload}]:`, error.message);
    throw error;
  }
}

/**
 * Centralized API Request Handler (fnsndrequest Event Wrapper)
 * @param {string} eventName - e.g. "Event:GetSiteEquipment", "Event:AddDailyLog"
 * @param {object|string} params - Payload parameters
 */
export async function sendPnmRequest(eventName, params = {}) {
  const guid = await getStoredGuid();
  
  // Format event string
  let eventPayload = eventName;
  if (typeof params === 'object' && params !== null) {
    const paramPairs = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}:${v}`);
    
    if (paramPairs.length > 0) {
      eventPayload += `~!${paramPairs.join('~!')}`;
    }
  } else if (typeof params === 'string') {
    eventPayload += `~!${params}`;
  }

  if (guid && !eventPayload.includes('guid:')) {
    eventPayload += `~!guid:${guid}`;
  }
  
  if (!eventPayload.includes('format:')) {
    eventPayload += `~!format:compactjson`;
  }

  return await fnsndrequest('PNM_2026', eventPayload);
}

/**
 * Helpers for Assets and Photos
 */
export function resolveNumericAssetId(machine) {
  if (typeof machine === 'number') return machine;
  if (typeof machine === 'string') {
    const parsed = parseInt(machine, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return machine?.AssetID || machine?.NumericID || machine?.id || machine?.machineId || 0;
}

export function resolvePhotoUrl(photoPath) {
  if (!photoPath) return '';
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://') || photoPath.startsWith('file://') || photoPath.startsWith('data:')) {
    return photoPath;
  }
  return `${API_BASE_URL}/${photoPath.replace(/^\//, '')}`;
}

export function parseEventResultRow(row) {
  if (!row) return {};
  if (typeof row === 'object') return row;
  try {
    return JSON.parse(row);
  } catch (_) {
    return { raw: row };
  }
}

/**
 * Event #1: Fetch Logs Data for Equipment Cards
 */
export async function fetchLogsData(options = {}) {
  const storedGuid = await getStoredGuid();
  const operatorId = options.operatorId ?? 0;
  const guid = options.guid || storedGuid || 'c39a1963-f8da-4898-a4dd-2c46f5b8ffe7';
  const userId = options.userId || '2509';

  const eventPayload = `Event:GetData~!OperatorID:${operatorId}~!format:compactjson~!Guid:${guid}~!mis_session_userid:${userId}`;

  return await fnsndrequest('PNM_2026', eventPayload);
}

export async function loginWithMis(username, password) {
  try {
    const response = await sendPnmRequest('Event:UserLogin', {
      Username: username,
      Password: password,
    });

    if (response?.guid) {
      await storeGuid(response.guid);
    }
    if (response?.user) {
      memoryStore.set(USER_INFO_KEY, JSON.stringify(response.user));
    }

    return response;
  } catch (error) {
    throw new Error(error.message || 'Login failed. Please check your credentials.');
  }
}

export async function fetchEquipmentList(siteId = '') {
  try {
    const data = await sendPnmRequest('Event:GetEquipmentList', {
      SiteID: siteId,
    });
    return data?.equipment || data || [];
  } catch (error) {
    console.warn('Failed to fetch live equipment list:', error.message);
    throw error;
  }
}

export async function submitDailyLogEntry(logData) {
  return await sendPnmRequest('Event:SaveDailyLog', {
    AssetID: logData.machineId || logData.id,
    Action: logData.action || 'stop',
    HMR: logData.hmr,
    KMR: logData.kmr,
    Remarks: logData.remarks || '',
    PhotoAttached: logData.photoAttached ? '1' : '0',
  });
}

export async function submitFuelEntry(fuelData) {
  return await sendPnmRequest('Event:SaveFuelLog', {
    AssetID: fuelData.machineId || fuelData.id,
    Litres: fuelData.litres,
    Rate: fuelData.rate,
    CurrentHmr: fuelData.hmr,
    ChallanNo: fuelData.challanNo,
    Vendor: fuelData.vendor,
  });
}

export async function submitMaintenanceEntry(maintData) {
  return await sendPnmRequest('Event:SaveMaintenanceLog', {
    AssetID: maintData.machineId || maintData.id,
    Type: maintData.maintenanceType,
    Remarks: maintData.remarks,
  });
}

export async function submitBreakdownEntry(breakdownData) {
  return await sendPnmRequest('Event:SaveBreakdownLog', {
    AssetID: breakdownData.machineId || breakdownData.id,
    Reason: breakdownData.reason,
    Remarks: breakdownData.remarks,
  });
}

export async function saveAddLog(params) {
  return await sendPnmRequest('Event:SaveAddLog', params);
}

export async function saveAddLogBulk(rows) {
  return await sendPnmRequest('Event:SaveAddLogBulk', { Rows: typeof rows === 'string' ? rows : JSON.stringify(rows) });
}

export async function startWorking(params) {
  return await sendPnmRequest('Event:StartWorking', params);
}

export async function endWorking(params) {
  return await sendPnmRequest('Event:EndWorking', params);
}

export async function startInterruption(params) {
  return await sendPnmRequest('Event:StartInterruption', params);
}

export async function endUnderMaintenance(params) {
  return await sendPnmRequest('Event:EndUnderMaintenance', params);
}

export async function endBreakdown(params) {
  return await sendPnmRequest('Event:EndBreakdown', params);
}

export async function saveFuelLog(params) {
  return await sendPnmRequest('Event:SaveFuelLog', params);
}

export async function getAddLogAssetDetails(assetId) {
  return await sendPnmRequest('Event:GetAddLogAssetDetails', { AssetID: assetId });
}

export async function getAssetQuickViewLogs(assetId) {
  return await sendPnmRequest('Event:GetAssetQuickViewLogs', { AssetID: assetId });
}

export async function getFuelLogForm(assetId) {
  return await sendPnmRequest('Event:GetFuelLogForm', { AssetID: assetId });
}

export async function getEndLogDetails(logId) {
  return await sendPnmRequest('Event:GetEndLogDetails', { LogID: logId });
}

export async function getAssetFuelLogs(assetId) {
  return await sendPnmRequest('Event:GetAssetFuelLogs', { AssetID: assetId });
}

export async function getAssetQuickViewHeader(assetId) {
  return await sendPnmRequest('Event:GetAssetQuickViewHeader', { AssetID: assetId });
}

export async function uploadLogPhoto(photoData) {
  return await sendPnmRequest('Event:UploadLogPhoto', photoData);
}
