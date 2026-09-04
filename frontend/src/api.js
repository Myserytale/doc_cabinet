const TOKEN_KEY = 'docvault_token';
const USERNAME_KEY = 'docvault_username';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUsername() {
  return localStorage.getItem(USERNAME_KEY);
}

export function setAuthSession(token, username) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

async function request(url, options = {}) {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthSession();
    window.dispatchEvent(new CustomEvent('docvault:unauthorized'));
    throw new Error('Session expired. Please log in again.');
  }

  return response;
}

export const api = {
  async register(username, email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Registration failed');
    }
    return res.text();
  },

  async login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Invalid username or password');
    }
    const data = await res.json();
    setAuthSession(data.jwt, username);
    return data;
  },

  logout() {
    clearAuthSession();
  },

  async listDocuments() {
    const res = await request('/api/documents');
    if (!res.ok) throw new Error('Failed to load documents');
    return res.json();
  },

  async getDocument(id) {
    const res = await request(`/api/documents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch document details');
    return res.json();
  },

  async searchDocuments(query, page = 0, size = 20) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', page);
    params.set('size', size);

    const res = await request(`/api/documents/search?${params.toString()}`);
    if (!res.ok) throw new Error('Search request failed');
    return res.json();
  },

  async uploadDocument(file, title) {
    const formData = new FormData();
    formData.append('file', file);
    if (title && title.trim()) {
      formData.append('title', title.trim());
    }

    const res = await request('/api/documents', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Upload failed');
    }
    return res.json();
  },

  async downloadDocument(id, filename) {
    const res = await request(`/api/documents/${id}/download`);
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async deleteDocument(id) {
    const res = await request(`/api/documents/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) {
      const err = await res.text();
      throw new Error(err || 'Failed to delete document');
    }
    return true;
  },

  async reindexDocument(id) {
    const res = await request(`/api/documents/${id}/reindex`, {
      method: 'POST',
    });
    if (!res.ok && res.status !== 202) {
      throw new Error('Reindexing request failed');
    }
    return true;
  },
};
