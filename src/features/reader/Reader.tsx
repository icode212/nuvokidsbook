import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Grid2X2, Hand, Headphones, Home, Play, RotateCcw, Search, Volume2, VolumeX } from 'lucide-react';
import type { Book, Target } from '../../content/schema';
import type { Settings } from '../../services/storage';
import { readProgress, saveProgress } from '../../services/storage';
import { AudioController, createBrowserDriver } from '../../services/audio';
import { findResponse, nextFindTarget } from './find-it';
import { objectAudioCue } from './object-audio';
import { BookImage } from '../../components/BookImage';
import { Modal } from '../../components/Modal';

export default function Reader({ book, settings, onBack, paused = false }: { book: Book; settings: Settings; onBack: () => void; paused?: boolean }) {
  const [page, setPage] = useState(0); // 0 is a separate, editable cover.
  const [mode, setMode] = useState<'explore' | 'find'>('explore');
  const [requested, setRequested] = useState<Target>(); const [active, setActive] = useState('');
  const [feedback, setFeedback] = useState(''); const [label, setLabel] = useState(''); const [pagesOpen, setPagesOpen] = useState(false);
  const [muted, setMuted] = useState(false); const [loaded, setLoaded] = useState(false);
  const voiceVolume = useRef(settings.voiceVolume); voiceVolume.current = settings.voiceVolume;
  const audio = useRef<AudioController | null>(null); audio.current ??= new AudioController(createBrowserDriver(book.id, book.narrationAssets, () => voiceVolume.current));
  const activeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const promptTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scene = page > 0 ? book.scenes[page - 1] : undefined;
  const narration = settings.narration && !muted; const sounds = settings.sounds && !muted;
  useEffect(() => { void readProgress(book.id).then(p => { if (p > 0 && p <= book.scenes.length) setFeedback(`You last explored page ${p}. Start again or use the page picker.`); }).catch(() => {}); }, [book.id, book.scenes.length]);
  useEffect(() => {
    const stop = () => { audio.current?.stop(); clearTimeout(activeTimer.current); clearTimeout(promptTimer.current); setActive(''); };
    const visibility = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', stop);
    return () => { stop(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', stop); };
  }, []);
  useEffect(() => { audio.current?.stop(); }, [muted, settings.narration, settings.sounds, settings.voiceVolume]);
  useEffect(() => { if (paused) { audio.current?.stop(); clearTimeout(activeTimer.current); clearTimeout(promptTimer.current); setActive(''); } }, [paused]);
  function navigate(next: number) {
    audio.current?.stop(); clearTimeout(activeTimer.current); clearTimeout(promptTimer.current);
    setPage(next); setActive(''); setLabel(''); setFeedback(''); setRequested(undefined); setMode('explore'); setLoaded(false);
    void saveProgress(book.id, next).catch(() => {});
  }
  function ask(target?: Target) {
    if (!target) return;
    clearTimeout(promptTimer.current); audio.current?.stop(); setRequested(target); setFeedback(''); setLabel('');
    void audio.current?.play(narration ? target.findPrompt : null, false);
  }
  function switchMode(next: 'explore' | 'find') {
    clearTimeout(promptTimer.current); audio.current?.stop(); setMode(next); setFeedback(''); setLabel('');
    if (next === 'find' && scene) ask(nextFindTarget(scene)); else setRequested(undefined);
  }
  function select(target: Target) {
    clearTimeout(activeTimer.current); clearTimeout(promptTimer.current);
    setActive(target.id); activeTimer.current = setTimeout(() => setActive(''), 900);
    if (mode === 'find' && requested && scene) {
      const result = findResponse(target.id, requested.id); setFeedback(result.text); setLabel('');
      void audio.current?.play(narration ? result.text : null, sounds && result.correct);
      if (result.correct) promptTimer.current = setTimeout(() => ask(nextFindTarget(scene, requested.id)), 1800);
    } else {
      setLabel(target.label); setFeedback('');
      const cue = objectAudioCue(target, narration, sounds);
      void audio.current?.play(cue.text, cue.sound);
    }
  }
  const last = page === book.scenes.length;
  return <main className="reader" data-motion={settings.motion ? 'on' : 'off'}>
    <div className="reader-heading"><button className="text-button" onClick={onBack}><Home size={19}/><span>Bookshelf</span></button><div><small>{book.series}</small><h1>{book.title}</h1></div><button className="icon-button" aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted} onClick={() => setMuted(!muted)}>{muted ? <VolumeX/> : <Volume2/>}</button></div>
    {!scene ? <section className="reader-cover"><BookImage bookId={book.id} src={book.cover} alt="The Wonder Crew arriving at the farm"/><div className="reader-cover-shade"/><div className="reader-cover-copy"><span className="eyebrow light">{book.series}</span><h2>{book.title}</h2><p>What makes a happy farm?</p><button className="button amber" onClick={() => navigate(1)}>Open the book <ArrowRight size={20}/></button><small>{book.scenes.length} story pages · By {book.creator}</small></div></section> : <>
      <div className="reader-tools"><div className="segmented" aria-label="Play mode"><button className={mode === 'explore' ? 'selected' : ''} aria-pressed={mode === 'explore'} onClick={() => switchMode('explore')}><Hand size={17}/>Explore</button><button className={mode === 'find' ? 'selected' : ''} aria-pressed={mode === 'find'} disabled={!scene.objects.some(o => o.findPrompt)} onClick={() => switchMode('find')}><Search size={17}/>Find it</button></div><span className="tap-hint">{mode === 'find' ? 'Look, listen & find' : 'Tap a picture to discover'}</span><button className="text-button" onClick={() => { audio.current?.stop(); clearTimeout(promptTimer.current); setPagesOpen(true); }}><Grid2X2 size={17}/><span>Pages</span></button></div>
      <section className="scene-frame" aria-label={scene.title}>
        <div className="scene-canvas" style={{ aspectRatio: scene.aspectRatio, '--scene-aspect': scene.aspectRatio } as CSSProperties}>
          <BookImage bookId={book.id} src={scene.image} alt={`${scene.title}. ${scene.storyText}`} className="scene-background" onLoad={() => setLoaded(true)}/>
          {loaded ? scene.objects.map(target => <button key={target.id} className={`hotspot ${active === target.id ? 'active' : ''} ${scene.renderMode === 'layered' ? 'layered' : ''}`} data-animation={target.animation} aria-label={target.label} style={{ left: `${target.rect.x * 100}%`, top: `${target.rect.y * 100}%`, width: `${target.rect.width * 100}%`, height: `${target.rect.height * 100}%` }} onClick={() => select(target)}>{target.image ? <BookImage bookId={book.id} src={target.image} alt=""/> : <span className="hotspot-dot"/>}{active === target.id ? <span className="tap-ring"/> : null}</button>) : null}
          {label && settings.labels && mode === 'explore' ? <span className="object-label" aria-live="polite">{label}</span> : null}
          {feedback && mode === 'find' ? <div className="find-feedback" role="status">{feedback === 'You found it!' ? <Check size={20}/> : <Search size={18}/>} {feedback}</div> : null}
        </div>
      </section>
      {mode === 'find' && requested ? <div className="find-prompt"><span><Search size={21}/>{requested.findPrompt}</span><button className="icon-button" aria-label="Repeat the question" onClick={() => { clearTimeout(promptTimer.current); void audio.current?.play(narration ? requested.findPrompt : null, false); }}><Volume2 size={20}/></button><button className="text-button" onClick={() => ask(nextFindTarget(scene, requested.id))}>Another <RotateCcw size={15}/></button></div> : <div className="story-caption"><div><span className="eyebrow">PAGE {page} <i>·</i> {scene.title}</span><p>{scene.storyText}</p></div><button className="story-replay" aria-label="Read the story" onClick={() => { setLabel(''); setActive(''); void audio.current?.play(narration ? scene.storyText : null, false); }} disabled={!narration}><Headphones size={23}/><span>Read to me</span><Play size={13} fill="currentColor"/></button></div>}
    </>}
    <nav className="reader-navigation" aria-label="Book pages"><button className="button quiet" disabled={page === 0} onClick={() => navigate(Math.max(0, page - 1))}><ArrowLeft size={20}/><span>Back</span></button><span className="page-indicator">{page === 0 ? <><BookOpen size={16}/> Your adventure starts here</> : <><span>{String(page).padStart(2, '0')}</span><span className="page-rule"/>{String(book.scenes.length).padStart(2, '0')}</>}</span><button className="button primary" onClick={() => last ? onBack() : navigate(page + 1)}><span>{last ? 'Bookshelf' : page === 0 ? 'Begin' : 'Next'}</span>{last ? <Home size={19}/> : <ArrowRight size={20}/>}</button></nav>
    {page === 0 && feedback ? <p className="resume-note">{feedback}</p> : null}
    {last ? <p className="ending-note">A happy farm has food, water, shelter—and gentle care. ♡</p> : null}
    {pagesOpen ? <Modal title="Pick a page" onClose={() => setPagesOpen(false)} wide><div className="page-picker"><button onClick={() => { navigate(0); setPagesOpen(false); }}><BookImage bookId={book.id} src={book.cover} alt=""/><span>Cover</span></button>{book.scenes.map(s => <button key={s.id} aria-current={page === s.pageNumber ? 'page' : undefined} onClick={() => { navigate(s.pageNumber); setPagesOpen(false); }}><BookImage bookId={book.id} src={s.image} alt=""/><span>{s.pageNumber}. {s.title}</span></button>)}</div></Modal> : null}
  </main>;
}
