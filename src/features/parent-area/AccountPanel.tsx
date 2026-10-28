import { useEffect, useState } from 'react';
import { cloudClient, cloudConfigured } from '../../services/catalogue';
import { setSessionOwner } from '../../services/session';

export function AccountPanel({onChanged}:{onChanged:()=>void}) {
  const [email,setEmail] = useState(''), [signedIn,setSignedIn] = useState('');
  const [message,setMessage] = useState(''), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const [purchases,setPurchases] = useState<{id:string;book_id:string;status:string}[]>([]);
  useEffect(()=>{
    let alive=true;
    if (cloudConfigured) void cloudClient().then(async cloud=>{
      const {data:{session}}=await cloud.auth.getSession(); if (!alive) return;
      setSignedIn(session?.user.email ?? '');
      if (session && navigator.onLine) { const {data,error}=await cloud.from('purchases').select('id,book_id,status'); if (alive && !error) setPurchases(data); }
    }).catch(e=>{if(alive)setError(e.message);});
    return()=>{alive=false;};
  },[]);
  async function signIn(event:React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const cloud=await cloudClient(); const {error}=await cloud.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:location.origin+'/'}}); if(error)throw error; setMessage('Check your email for a sign-in link. Your books will be restored when you return.'); }
    catch(e){setError(e instanceof Error?e.message:'Sign-in unavailable.');}finally{setBusy(false);}
  }
  async function signOut() {
    setBusy(true); setError('');
    try { const cloud=await cloudClient(); const {error}=await cloud.auth.signOut({scope:'local'}); if(error)throw error; setSessionOwner(null); setSignedIn(''); setPurchases([]); onChanged(); }
    catch(e){setError(e instanceof Error?e.message:'Sign-out unavailable.');}finally{setBusy(false);}
  }
  return <section className="account-panel"><h3>Your Books account</h3><p className="small-copy">The free book needs no account. Sign in to restore books you own on another device. One-time ownership has no recurring subscription.</p>
    {!cloudConfigured ? <p className="small-copy">Accounts are available on the connected Books website.</p> : signedIn ? <><p>Signed in as <strong>{signedIn}</strong></p><div className="download-actions"><button className="button quiet compact" disabled={busy || !navigator.onLine} onClick={onChanged}>Restore my books</button><button className="text-button" disabled={busy} onClick={()=>void signOut()}>Sign out</button></div>{purchases.length ? <ul>{purchases.map(p=><li key={p.id}>{p.book_id} · {p.status === 'completed' ? 'One-time purchase' : 'Refunded'}</li>)}</ul>:null}</> : <form onSubmit={signIn}><label>Parent email<input type="email" autoComplete="email" value={email} required onChange={e=>setEmail(e.target.value)}/></label><button className="button quiet compact" disabled={busy || !navigator.onLine} type="submit">{busy?'Sending…':'Email a sign-in link'}</button></form>}
    <p className="fine-print">Payments are disabled. No purchases or charges can be made yet.</p>
    {message?<p className="message" role="status">{message}</p>:null}{error?<p className="message error" role="alert">{error}</p>:null}
  </section>;
}
