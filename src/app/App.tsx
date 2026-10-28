import { lazy, Suspense, useEffect, useState } from 'react';
import { BookOpen, ShieldCheck, WifiOff } from 'lucide-react';
import { summarize, visibleBooks, type Book } from '../content/schema';
import { listBooks } from '../services/catalogue';
import { defaultSettings, readSettings, saveSettings, type Settings } from '../services/storage';
import { downloadRecord } from '../services/downloads';
import { Brand } from '../components/Brand';
import { Bookshelf } from '../features/bookshelf/Bookshelf';
import { ParentGate } from '../features/parent-area/ParentGate';
import { ParentArea } from '../features/parent-area/ParentArea';
const Reader = lazy(() => import('../features/reader/Reader'));
const BookStudio = lazy(() => import('../features/admin/BookStudio'));
export default function App() {
  const [books, setBooks] = useState<Book[]>([]); const [settings, setSettings] = useState(defaultSettings);
  const [opened, setOpened] = useState<Book | null>(null); const [preview, setPreview] = useState<Book | null>(null);
  const [view, setView] = useState<'shelf' | 'studio'>('shelf'); const [gate, setGate] = useState<'parent' | 'studio' | null>(location.hash === '#/admin' ? 'studio' : null);
  const [parent, setParent] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [online, setOnline] = useState(navigator.onLine);
  async function refresh() { try { setBooks(await listBooks()); setError(''); } catch(e) { setError(e instanceof Error ? e.message : 'The bookshelf could not be loaded.'); } finally { setLoading(false); } }
  useEffect(() => {
    void refresh(); void readSettings().then(setSettings).catch(() => setError('Settings cannot be saved in this browser. You can still explore.'));
    const network = () => setOnline(navigator.onLine); const hash = () => { if (location.hash === '#/admin') setGate('studio'); };
    window.addEventListener('online', network); window.addEventListener('offline', network); window.addEventListener('hashchange', hash);
    return () => { window.removeEventListener('online', network); window.removeEventListener('offline', network); window.removeEventListener('hashchange', hash); };
  }, []);
  async function open(id: string) {
    const book = books.find(b => b.id === id); if (!book) return;
    // An interrupted update uses the last complete content snapshot with its matching pictures.
    const downloaded = await downloadRecord(id).catch(() => undefined);
    setOpened(!navigator.onLine && downloaded ? downloaded.book : book); window.scrollTo(0,0);
  }
  function updateSettings(next: Settings) { setSettings(next); void saveSettings(next).catch(() => setError('Your settings could not be saved. Check available device storage.')); }
  function shelf() {
    if (view === 'studio') { window.dispatchEvent(new Event('nuvo-studio-exit')); return; }
    exitStudio();
  }
  function exitStudio() { setOpened(null); setPreview(null); setView('shelf'); history.replaceState(null, '', '/'); window.scrollTo(0,0); }
  return <><a className="skip-link" href="#main-content">Skip to content</a><header className="app-header"><Brand onClick={shelf}/><nav aria-label="Main navigation"><button className={`header-link ${view === 'shelf' ? 'current' : ''}`} onClick={shelf}><BookOpen size={17}/><span>Bookshelf</span></button><span className="header-divider"/><button className="parent-button" onClick={() => setGate('parent')}><ShieldCheck size={18}/><span>Grown-ups</span></button></nav></header>
    {!online ? <div className="offline-indicator"><WifiOff size={14}/> You’re offline. Saved stories are still here.</div> : null}
    {error ? <div className="app-error" role="alert">{error}<button className="text-button" onClick={() => void refresh()}>Try again</button></div> : null}
    <div id="main-content" tabIndex={-1}><Suspense fallback={<div className="loading-state">Opening a little wonder…</div>}>
      {view === 'studio' ? <><div hidden={Boolean(preview)}><BookStudio onExit={exitStudio} onChanged={() => void refresh()} onPreview={book => { if (!book.scenes.length) { setError('Add a scene before previewing this book.'); return; } setError(''); setPreview(book); window.scrollTo(0,0); }}/></div>{preview ? <><div className="preview-banner">Book Studio preview · Unsaved content<button className="text-button" onClick={() => setPreview(null)}>Back to editor</button></div><Reader key={`preview-${preview.id}`} book={preview} settings={settings} paused={Boolean(gate || parent)} onBack={() => setPreview(null)}/></> : null}</> : opened ? <Reader key={opened.id} book={opened} settings={settings} paused={Boolean(gate || parent)} onBack={shelf}/> : loading ? <div className="loading-state">Finding your stories…</div> : <Bookshelf books={visibleBooks(books.map(summarize))} settings={settings} paused={Boolean(gate || parent)} onOpen={id => void open(id)}/>}
    </Suspense></div>
    {gate ? <ParentGate onClose={() => { setGate(null); if (location.hash === '#/admin') history.replaceState(null, '', '/'); }} onPass={() => { if (gate === 'studio') { setView('studio'); setOpened(null); } else setParent(true); setGate(null); }}/> : null}
    {parent ? <ParentArea books={books} settings={settings} onSettings={updateSettings} onClose={() => setParent(false)} onStudio={() => { setParent(false); setOpened(null); setView('studio'); history.replaceState(null, '', '#/admin'); window.scrollTo(0,0); }}/> : null}
  </>;
}
