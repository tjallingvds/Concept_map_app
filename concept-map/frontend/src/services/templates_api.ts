import { API_URL, useAuthFetch } from './baseApi.ts';

let authFetch: typeof fetch = () => {
  throw new Error('authFetch not initialized');
};
export const setAuthFetch = (fetchFn: typeof fetch) => {
  authFetch = fetchFn;
};

const templatesApi = {
  getTemplate: async (templateId: string) => {
    const response = await authFetch(`${API_URL}/api/templates/${templateId}/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Error fetching template: ${response.statusText}`);
    }

    return response.json();
  },
};

export function useTemplatesApi() {
  const fetchWithAuth = useAuthFetch();
  setAuthFetch(fetchWithAuth as typeof fetch); // Add type assertion
  return templatesApi;
}
