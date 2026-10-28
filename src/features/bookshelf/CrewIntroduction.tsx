import { useEffect, useRef, useState } from 'react';
import { Headphones, Square, Volume2, VolumeX } from 'lucide-react';
import crew from '../../../content-source/crew.json';
import type { Settings } from '../../services/storage';
import { AudioController, createBrowserDriver } from '../../services/audio';

const narration = Object.fromEntries([crew.intro, ...crew.friends].map(cue => [cue.text, cue.audio]));
export function CrewIntroduction({ settings, paused }: { settings: Settings; paused: boolean }) {
  const [muted, setMuted] = useState(false);
  const [active, setActive] = useState('');
  const volume = useRef(settings.voiceVolume); volume.current = settings.voiceVolume;
  const audio = useRef<AudioController | null>(null);
  audio.current ??= new AudioController(createBrowserDriver(undefined, narration, () => volume.current));
  const sequence = useRef(0);
  const enabled = settings.narration && settings.voiceVolume > 0 && !muted && !paused;
  function stop() { sequence.current++; audio.current?.stop(); setActive(''); }
  useEffect(() => { stop(); }, [muted, settings.narration, settings.voiceVolume, paused]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    const leave = () => stop();
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', leave);
    return () => { sequence.current++; audio.current?.stop(); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', leave); };
  }, []);
  async function play(id: string, text: string) {
    if (!enabled) return;
    if (active === id) { stop(); return; }
    const request = ++sequence.current; setActive(id);
    await audio.current?.play(text, false);
    if (request === sequence.current) setActive('');
  }
  const transcript = active === 'crew' ? crew.intro.text : crew.friends.find(friend => friend.id === active)?.text;
  return <section className="crew-introduction" aria-label="Meet the Wonder Crew">
    <div className="hero-art crew-art">
      <img src={crew.image} width="1200" height="800" alt="The Wonder Crew: Milo in blue glasses on the left, Nuvo in yellow overalls in the middle, Lina on the right, with Pip the puppy and Mimi the kitten in front." fetchPriority="high"/>
    </div>
    <div className="crew-friends">{crew.friends.map(friend => <button key={friend.id} className="crew-name"
      aria-label={`Meet ${friend.name}`} aria-pressed={active === friend.id} disabled={!enabled} onClick={() => void play(friend.id, friend.text)}><Volume2 size={13}/>{friend.name}</button>)}</div>
    <div className="crew-controls"><button className="button quiet compact" disabled={!enabled} aria-pressed={active === 'crew'} onClick={() => void play('crew', crew.intro.text)}>{active === 'crew' ? <Square size={16}/> : <Headphones size={18}/>} {active === 'crew' ? 'Stop introduction' : 'Meet the crew'}</button>
      <button className="icon-button" aria-label={muted ? 'Unmute introductions' : 'Mute introductions'} aria-pressed={muted} onClick={() => setMuted(value => !value)}>{muted ? <VolumeX size={19}/> : <Volume2 size={19}/>}</button>
      <span>Tap a name to meet a friend.</span></div>
    <p className="crew-transcript" aria-live="polite">{transcript ?? (!settings.narration ? 'Turn on Read aloud in Grown-ups to hear the crew.' : 'Nuvo, Milo, Lina, Pip and Mimi. Your story friends are here!')}</p>
  </section>;
}
