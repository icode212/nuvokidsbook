import { lazy, Suspense, useEffect, useState } from 'react';
import { BookOpen, ShieldCheck, WifiOff } from 'lucide-react';
import { visibleBooks, type Book } from '../content/schema';
import { listCatalogue, loadBook } from '../services/catalogue';
import { defaultSettings, readSettings, saveSettings, type Settings } from '../services/storage';
import { downloadRecord, downloadOwnedBook, downloadAdminPreviewBook } from '../services/downloads';
import type { BookSummary } from '../content/schema';
import { sessionOwner,sessionEpoch } from '../services/session';
import { Brand } from '../components/Brand';
import { Bookshelf } from '../features/bookshelf/Bookshelf';
import { ParentGate } from '../features/parent-area/ParentGate';
import { ParentArea } from '../features/parent-area/ParentArea';
const Reader = lazy(() => import('../features/reader/Reader'));
const BookStudio = lazy(() => import('../features/admin/BookStudio'));
export default function App() {
  const [books, setBooks] = useState<BookSummary[]>([]); const [settings, setSettings] = useState(defaultSettings);
  const [downloadProgress,setDownloadProgress] = useState<number|null>(null);
  const [opened, setOpened] = useState<Book | null>(null); const [preview, setPreview] = useState<Book | null>(null);
  const [view, setView] = useState<'shelf' | 'studio'>('shelf'); const [gate, setGate] = useState<'parent' | 'studio' | null>(location.hash === '#/admin' ? 'studio' : null);
  const [parent, setParent] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [online, setOnline] = useState(navigator.onLine);
  async function refresh(force=false) { try { setBooks(await listCatalogue(force)); setError(''); } catch(e) { setError(e instanceof Error ? e.message : 'The bookshelf could not be loaded.'); } finally { setLoading(false); } }
  useEffect(() => {
    void refresh(); void readSettings().then(setSettings).catch(() => setError('Settings cannot be saved in this browser. You can still explore.'));
    const network = () => setOnline(navigator.onLine); const hash = () => { if (location.hash === '#/admin') setGate('studio'); };
    window.addEventListener('online', network); window.addEventListener('offline', network); window.addEventListener('hashchange', hash);
    const account = () => { setOpened(null); setPreview(null); void refresh(); };
    window.addEventListener('nuvo-account-change',account);
    return () => { window.removeEventListener('online', network); window.removeEventListener('offline', network); window.removeEventListener('hashchange', hash); window.removeEventListener('nuvo-account-change',account); };
  }, []);
  async function open(id: string) {
    const owner=sessionOwner(),epoch=sessionEpoch();
    const summary = books.find(b => b.id === id); if (!summary) return;
    if (summary.access === 'paid' && !summary.owned) { setError('Payments are disabled. Sign in through Grown-ups to restore books you already own.'); return; }
    try {
      const downloaded = await downloadRecord(id).catch(() => undefined);
      let book:Book;
      if (downloaded && (summary.access === 'paid' || !navigator.onLine || downloaded.version===summary.contentVersion)) book=downloaded.book;
      else if (summary.access === 'paid') { setDownloadProgress(0); const record = await downloadOwnedBook(id,new AbortController().signal,(done,total)=>setDownloadProgress(Math.round(done/total*100))); book=record.book; }
      else { if (!navigator.onLine) throw new Error('Connect to the internet and save this book in Grown-ups before reading offline.'); book=await loadBook(id,summary.contentVersion); }
      if (book.access==='paid' && (owner!==sessionOwner() || epoch!==sessionEpoch())) return;
      setOpened(book);
      window.scrollTo(0,0); setError('');
    } catch(e) { setError(e instanceof Error?e.message:'The book could not be opened.'); } finally { setDownloadProgress(null); }
  }
  function updateSettings(next: Settings) { setSettings(next); void saveSettings(next).catch(() => setError('Your settings could not be saved. Check available device storage.')); }
  async function previewBook(book:Book) {
    if (!book.scenes.length) {setError('Add a scene before previewing this book.');return;}
    const owner=sessionOwner(),epoch=sessionEpoch();
    try {
      setError('');
      if (book.access==='paid') {
        setDownloadProgress(0);
        await downloadAdminPreviewBook(book,new AbortController().signal,(done,total)=>setDownloadProgress(Math.round(done/total*100)));
        if(owner!==sessionOwner() || epoch!==sessionEpoch())return;
      }
      setPreview(book);window.scrollTo(0,0);
    } catch(e) {setError(e instanceof Error?e.message:'The book preview could not be opened.');}
    finally {setDownloadProgress(null);}
  }
  function shelf() {
    if (view === 'studio') { window.dispatchEvent(new Event('nuvo-studio-exit')); return; }
    exitStudio();
  }
  function exitStudio() { setOpened(null); setPreview(null); setView('shelf'); history.replaceState(null, '', '/'); window.scrollTo(0,0); }
  return <><a className="skip-link" href="#main-content">Skip to content</a><header className="app-header"><Brand onClick={shelf}/><nav aria-label="Main navigation"><button className={`header-link ${view === 'shelf' ? 'current' : ''}`} onClick={shelf}><BookOpen size={17}/><span>Bookshelf</span></button><span className="header-divider"/><button className="parent-button" onClick={() => setGate('parent')}><ShieldCheck size={18}/><span>Grown-ups</span></button></nav></header>
    {!online ? <div className="offline-indicator"><WifiOff size={14}/> You’re offline. Saved stories are still here.</div> : null}
    {error ? <div className="app-error" role="alert">{error}<button className="text-button" onClick={() => void refresh()}>Try again</button></div> : null}
    {downloadProgress !== null ? <div className="offline-indicator" role="status">Saving your book for offline reading… {downloadProgress}%</div>:null}
    <div id="main-content" tabIndex={-1}><Suspense fallback={<div className="loading-state">Opening a little wonder…</div>}>
      {view === 'studio' ? <><div hidden={Boolean(preview)}><BookStudio onExit={exitStudio} onChanged={() => void refresh(true)} onPreview={book=>void previewBook(book)}/></div>{preview ? <><div className="preview-banner">Book Studio preview<button className="text-button" onClick={() => setPreview(null)}>Back to editor</button></div><Reader key={`preview-${preview.id}`} book={preview} mediaBookId={preview.access==='paid'?`preview:${preview.id}`:undefined} settings={settings} paused={Boolean(gate || parent)} onBack={() => setPreview(null)}/></> : null}</> : opened ? <Reader key={opened.id} book={opened} settings={settings} paused={Boolean(gate || parent)} onBack={shelf}/> : loading ? <div className="loading-state">Finding your stories…</div> : <Bookshelf books={visibleBooks(books,settings.hideUnowned)} settings={settings} paused={Boolean(gate || parent || downloadProgress !== null)} onOpen={id => void open(id)}/>}
    </Suspense></div>
    {gate ? <ParentGate onClose={() => { setGate(null); if (location.hash === '#/admin') history.replaceState(null, '', '/'); }} onPass={() => { if (gate === 'studio') { setView('studio'); setOpened(null); } else setParent(true); setGate(null); }}/> : null}
    {parent ? <ParentArea books={books} settings={settings} onSettings={updateSettings} onAccountChanged={()=>void refresh(true)} onClose={() => setParent(false)} onStudio={() => { setParent(false); setOpened(null); setView('studio'); history.replaceState(null, '', '#/admin'); window.scrollTo(0,0); }}/> : null}
  </>;
}
