import { BookOpen } from 'lucide-react';
export function Brand({ onClick }: { onClick: () => void }) {
  return <button className="brand" onClick={onClick} aria-label="NuvoKids Books, bookshelf"><span className="brand-mark"><BookOpen size={26}/><i>✦</i></span><span>nuvo<span className="brand-kids">kids</span><small>BOOKS</small></span></button>;
}
