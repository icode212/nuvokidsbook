import { useState } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Modal } from '../../components/Modal';
export function ParentGate({ onPass, onClose }: { onPass: () => void; onClose: () => void }) {
  const [answer, setAnswer] = useState('');
  return <Modal title="A moment for grown-ups" onClose={onClose}><div className="gate-symbol"><ShieldCheck size={32}/></div><p>Settings and book management are for a parent or caregiver.</p><p className="gate-instruction">To continue, type <strong>grown up</strong> below.</p><form onSubmit={e => { e.preventDefault(); if (answer.trim().toLowerCase() === 'grown up') onPass(); }}><label className="sr-only" htmlFor="gate">Type grown up</label><input id="gate" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Type the two words" autoComplete="off" autoCapitalize="off" spellCheck={false}/><button className="button primary full" disabled={answer.trim().toLowerCase() !== 'grown up'}>Continue <ArrowRight size={18}/></button></form><p className="fine-print">A reading step to keep little hands in the story.</p></Modal>;
}
