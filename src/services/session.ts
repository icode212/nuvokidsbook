// Device cache identity is a namespace, never proof of server-side ownership.
let owner: string | null = null;
try { owner = localStorage.getItem('nuvo-books-owner'); } catch { /* No persisted account on this device. */ }
let epoch = 0;
const transfers = new Set<AbortController>();
export const sessionOwner = () => owner;
export const sessionEpoch = () => epoch;
export function setSessionOwner(next: string | null) {
  if (next === owner) return;
  owner = next; epoch++;
  try { if (next) localStorage.setItem('nuvo-books-owner',next); else localStorage.removeItem('nuvo-books-owner'); } catch { /* Private browsing. */ }
  for (const controller of transfers) controller.abort();
  transfers.clear();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('nuvo-account-change'));
}
export function trackTransfer(controller: AbortController) { transfers.add(controller); return () => { transfers.delete(controller); }; }
if (typeof window !== 'undefined') window.addEventListener('storage',event=>{if(event.key==='nuvo-books-owner')setSessionOwner(event.newValue);});
