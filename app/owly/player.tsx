'use client';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../language';

const stamp = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function WavePlayer({ src, title, waveform }: { src: string; title: string; waveform?: {audio: string; duration: number; peaks: number[]} }) {
  const { t } = useLanguage();
  const audio = useRef<HTMLAudioElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const prepared = waveform && src.endsWith(waveform.audio) ? waveform : undefined;
  const peaks = prepared?.peaks || [];
  const length = duration || prepared?.duration || 0;
  const progress = length ? Math.min(1, Math.max(0, position / length)) : 0;
  useEffect(() => { setPosition(0); setDuration(0); setPlaying(false); setError(false); setBuffering(false); pendingSeek.current = null; }, [src]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0, last = 0;
    const update = (now: number) => {
      if (now - last >= 33 && audio.current) { setPosition(audio.current.currentTime); last = now; }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
  function syncDuration(player: HTMLAudioElement) { if (Number.isFinite(player.duration) && player.duration > 0) setDuration(player.duration); }
  async function toggle() {
    const player = audio.current;
    if (!player) return;
    if (!player.paused) player.pause();
    else try { setBuffering(true); await player.play(); } catch (err) { setBuffering(false); if ((err as Error).name !== 'AbortError') setError(true); }
  }
  return <div className="wave-player">
    <audio ref={audio} src={src} preload="none" onLoadedMetadata={e => { syncDuration(e.currentTarget); if (pendingSeek.current !== null) { e.currentTarget.currentTime = Math.min(pendingSeek.current, e.currentTarget.duration || pendingSeek.current); pendingSeek.current = null; } }} onDurationChange={e => syncDuration(e.currentTarget)} onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)} onCanPlay={() => setBuffering(false)} onTimeUpdate={e => setPosition(e.currentTarget.currentTime)} onPlay={e => { setPlaying(true); setError(false); document.querySelectorAll('audio').forEach(player => { if (player !== e.currentTarget) player.pause(); }); }} onPause={() => { setPlaying(false); setBuffering(false); }} onEnded={e => { setPosition(e.currentTarget.currentTime); setPlaying(false); setBuffering(false); }} onError={() => { setError(true); setBuffering(false); }}/>
    <button className="wave-play" type="button" aria-busy={buffering} aria-label={`${playing ? t('Pause', 'Pause') : t('Play', 'Écouter')} ${title}`} onClick={toggle}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{playing ? <path d="M6 4h4v16H6zm8 0h4v16h-4z"/> : <path d="M7 4v16l14-8z"/>}</svg>
    </button>
    <div className="wave-seek">
      {peaks.length ? <svg className="waveform" viewBox="0 0 720 64" preserveAspectRatio="none" aria-hidden="true">{peaks.map((peak, index) => { const height = Math.max(2, peak * 56); return <rect key={index} x={index * 4} y={(64 - height) / 2} width="2" height={height} rx="1" fill={index / peaks.length < progress ? 'var(--primary)' : 'currentColor'}/>; })}</svg> : <div className="wave-loading" aria-hidden="true"><span style={{width:`${progress * 100}%`}}/></div>}
      <input type="range" min="0" max={length || 1} step="0.1" value={Math.min(position, length || 1)} disabled={!length} aria-label={t('Playback position', 'Position de lecture')} aria-valuetext={`${stamp(position)} / ${stamp(length)}`} onChange={e => { if (audio.current) { try { const target = Number(e.target.value); if (audio.current.readyState === 0) { pendingSeek.current = target; audio.current.preload = "metadata"; audio.current.load(); } else { audio.current.currentTime = target; } setPosition(target); } catch { /* Seeking becomes available once metadata is loaded. */ } } }}/>
    </div>
    <span className="wave-time">{stamp(position)} <span>/ {stamp(length)}</span></span>
    {buffering && <span className="wave-error" role="status">{t('Loading audio...', 'Chargement audio...')}</span>}
    {error && <p className="wave-error" role="status">{t('Unable to play this recording.', 'Impossible de lire ce morceau.')} <a href={src}>{t('Open file ↗', 'Ouvrir le fichier ↗')}</a></p>}
  </div>;
}
