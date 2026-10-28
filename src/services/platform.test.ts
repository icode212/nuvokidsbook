import {expect,it,vi,afterEach} from 'vitest';
afterEach(()=>vi.unstubAllGlobals());
it('restores public platform config on a cold offline boot without fetching',async()=>{
  vi.resetModules();
  vi.stubGlobal('localStorage',{getItem:(key:string)=>key==='nuvo-books-platform'?JSON.stringify({supabaseUrl:'https://test.supabase.co',publicKey:'public',assetBase:'/api/assets/free'}):null});
  vi.stubGlobal('navigator',{onLine:false}); const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  const {initializePlatform,platform}=await import('./platform'); await initializePlatform();
  const config=await import('./platform');expect(config.platform.supabaseUrl).toBe('https://test.supabase.co');expect(platform.paymentsEnabled).toBe(false);expect(fetcher).not.toHaveBeenCalled();
});
