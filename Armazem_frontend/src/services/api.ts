import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const isBrowser = typeof window !== 'undefined';
const AUTH_WHITELIST = ['/user/login', '/user/refresh'];

/** Cliente sem Authorization para endpoints de auth */
export const apiAuth = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

/** Cliente padrão com Authorization */
export const api = axios.create({ baseURL });

// Injeta Authorization em todas as rotas, exceto as whitelisted
api.interceptors.request.use((config) => {
  const url = config.url ?? '';
  const isAuthPath = AUTH_WHITELIST.some((p) => url.includes(p));

  if (!isAuthPath && isBrowser) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let isRefreshing = false;
let queue: Array<(t: string | null) => void> = [];
const notifyAll = (t: string | null) => { queue.forEach((cb) => cb(t)); queue = []; };

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error || {};
    const original: any = config || {};
    const url = original.url ?? '';
    const isAuthPath = AUTH_WHITELIST.some((p) => url.includes(p));

    if (response?.status !== 401 || original._retry || isAuthPath) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshToken = isBrowser ? localStorage.getItem('refreshToken') : null;
        const { data } = await apiAuth.post('/user/refresh', { refreshToken });
        const newAccess = data?.accessToken as string | undefined;
        const newRefresh = data?.refreshToken as string | undefined;

        if (isBrowser && newAccess) {
          localStorage.setItem('accessToken', newAccess);
          if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
        }

        isRefreshing = false;
        notifyAll(newAccess ?? null);
      } catch (e) {
        isRefreshing = false;
        notifyAll(null);
        if (isBrowser) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
        return Promise.reject(error);
      }
    }

    return new Promise((resolve, reject) => {
      queue.push((newToken) => {
        if (!newToken) return reject(error);
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        resolve(api(original));
      });
    });
  }
);

export default api;
