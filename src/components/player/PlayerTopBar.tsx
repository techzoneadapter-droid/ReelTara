import type { RefObject } from 'react';
import { ArrowLeft } from 'lucide-react';
export function PlayerTopBar({ title, mode, onClose, back }: { title: string; mode: 'free' | 'trailer'; onClose: () => void; back: RefObject<HTMLButtonElement | null> }) {
  return <header className="player-topbar"><button ref={back} className="icon-button" aria-label="Back to movie details" onClick={onClose}><ArrowLeft /></button><span>{title}</span><span className="player-mode">{mode === 'free' ? 'Full movie' : 'Trailer'}</span></header>;
}
