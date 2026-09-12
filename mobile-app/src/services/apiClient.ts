import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

const TIMEOUT_MS = 6000;

const fetchWithTimeout = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Connection timed out reaching backend server at ${API_URL}`);
    }
    throw new Error(`Unable to reach backend at ${API_URL}. Ensure backend server is running.`);
  }
};

let cachedToken: string | null = null;

export const setAuthTokenCache = (token: string | null) => {
  cachedToken = token;
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  try {
    if (cachedToken === null) {
      cachedToken = await AsyncStorage.getItem('userToken');
    }
    if (cachedToken) {
      headers['Authorization'] = `Bearer ${cachedToken}`;
    }
  } catch (e) {}
  return headers;
};

const parseApiResponse = async (response: Response): Promise<any> => {
  const body = await response.text();
  let data: any;

  try {
    data = body ? JSON.parse(body) : {};
  } catch {
    throw new Error(`Backend returned an invalid response (${response.status}). Check that the API server is running the latest version.`);
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}.`);
  }

  return data;
};

const normalizeUrl = (endpoint: string): string => {
  if (!API_URL) throw new Error('API_URL not configured');
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const pathWithApi = cleanPath.startsWith('/api/') || cleanPath === '/api'
    ? cleanPath
    : `/api${cleanPath}`;
  return `${API_URL.replace(/\/$/, '')}${pathWithApi}`;
};

export const apiClient = {
  async get(endpoint: string): Promise<any> {
    const url = normalizeUrl(endpoint);
    const headers = await getAuthHeaders();
    const res = await fetchWithTimeout(url, { method: 'GET', headers });
    return parseApiResponse(res);
  },

  async post(endpoint: string, data: any = {}): Promise<any> {
    const url = normalizeUrl(endpoint);
    const headers = await getAuthHeaders();
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return parseApiResponse(res);
  },

  async put(endpoint: string, data: any = {}): Promise<any> {
    const url = normalizeUrl(endpoint);
    const headers = await getAuthHeaders();
    const res = await fetchWithTimeout(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return parseApiResponse(res);
  },

  async delete(endpoint: string): Promise<any> {
    const url = normalizeUrl(endpoint);
    const headers = await getAuthHeaders();
    const res = await fetchWithTimeout(url, { method: 'DELETE', headers });
    return parseApiResponse(res);
  },
};
