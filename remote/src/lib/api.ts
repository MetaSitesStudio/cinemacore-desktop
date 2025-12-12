export const getServerBase = () => localStorage.getItem('cc_server_base');
export const getToken = () => localStorage.getItem('cc_token');

export const authFetch = async (path: string) => {
  const base = getServerBase();
  const token = getToken();

  if (!base || !token) {
    window.location.href = '/connect';
    throw new Error('Not connected');
  }

  // Ensure base doesn't have trailing slash if path has leading slash
  const cleanBase = base.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  try {
    const res = await fetch(`${cleanBase}${cleanPath}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('cc_token');
      window.location.href = '/connect';
      throw new Error('Unauthorized');
    }

    return res;
  } catch (e) {
    console.error("Fetch error:", e);
    throw e;
  }
};
