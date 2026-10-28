export interface PlatformConfig { supabaseUrl: string; publicKey: string; assetBase: string; paymentsEnabled: false }
export let platform: PlatformConfig = { supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '', publicKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '', assetBase: import.meta.env.VITE_ASSET_BASE ?? '', paymentsEnabled: false };
let initialized: Promise<void> | undefined;
export function initializePlatform() {
  return initialized ??= (async () => {
    if (platform.supabaseUrl || platform.publicKey) return;
    try { const saved = localStorage.getItem('nuvo-books-platform'); if (saved) platform = {...JSON.parse(saved),paymentsEnabled:false,assetBase:'/api/assets/free'}; } catch { /* Storage may be unavailable. */ }
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    let response: Response;
    try { response = await fetch('/api/config'); } catch { if (platform.supabaseUrl) return; throw new Error('Connect once to set up this device for offline reading.'); }
    // Vite's static local preview returns HTML at unknown routes.
    if (!response.headers.get('content-type')?.includes('application/json')) return;
    if (!response.ok) throw new Error('The Books platform is not configured yet.');
    const config = await response.json();
    if (config.supabaseUrl && config.publicKey) { platform = { ...config, assetBase:'/api/assets/free', paymentsEnabled: false }; try { localStorage.setItem('nuvo-books-platform',JSON.stringify(platform)); } catch { /* Offline downloads may still work in this session. */ } }
  })();
}
export function mediaURL(path: string) {
  if (path.startsWith('/private/')) return `/api/assets/paid/${path.slice('/private/'.length)}`;
  return path.startsWith('/books/') && platform.assetBase ? `${platform.assetBase}${path}` : path;
}
