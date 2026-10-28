import { useEffect, useState, type CSSProperties } from 'react';
import { ImageOff } from 'lucide-react';
import { savedMedia } from '../services/downloads';
export function BookImage({ bookId, src, alt, className, style, onLoad }: { bookId: string; src: string; alt: string; className?: string; style?: CSSProperties; onLoad?: () => void }) {
  const [resolved, setResolved] = useState(''); const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true; let blobUrl: string | undefined; setResolved(''); setError(false);
    void savedMedia(bookId, src).then(blob => { if (alive) { blobUrl = blob ? URL.createObjectURL(blob) : undefined; setResolved(blobUrl ?? src); } }).catch(() => { if (alive) setResolved(src); });
    return () => { alive = false; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [bookId, src]);
  if (error) return <div className="image-error" role="status"><ImageOff/><p>This picture isn’t available.<br/>Connect to the internet or save the book again.</p><button className="button" onClick={() => setError(false)}>Try again</button></div>;
  return resolved ? <img className={className} style={style} src={resolved} alt={alt} draggable={false} onLoad={onLoad} onError={() => setError(true)}/> : <div className="image-loading" aria-label="Loading picture"/>;
}
