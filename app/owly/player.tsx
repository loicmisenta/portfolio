'use client';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../language';

const stamp = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function WavePlayer({ src, title }: { src: string; title: string }) {
  const { t } = useLanguage();
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let context: AudioContext | undefined;
    let cancelled = false;
    setPeaks([]); setPosition(0); setDuration(0); setPlaying(false); setError(false);
    // Decode the actual recording, rather than drawing an invented waveform.
    async function analyze() {
      try {
        const response = await fetch(src, { signal: controller.signal });
        if (!response.ok) throw new Error('Audio unavailable');
        const bytes = await response.arrayBuffer();
        if (cancelled) return;
        context = new AudioContext();
        const buffer = await context.decodeAudioData(bytes);
        if (cancelled) return;
        const bins = 180;
        const values = new Array<number>(bins).fill(0);
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const data = buffer.getChannelData(channel);
          for (let bin = 0; bin < bins; bin++) {
            const start = Math.floor(bin * data.length / bins);
            const end = Math.floor((bin + 1) * data.length / bins);
            const step = Math.max(1, Math.floor((end - start) / 500));
            for (let sample = start; sample < end; sample += step) values[bin] = Math.max(values[bin], Math.abs(data[sample]));
          }
        }
        const maximum = Math.max(...values, .001);
        setPeaks(values.map(value => value / maximum));
      } catch { /* Playback and the seek control still work when decoding is unavailable. */ }
      finally { if (context && context.state !== 'closed') void context.close(); }
    }
    // Leave the entrance animation free of audio decoding work.
    const timer = setTimeout(() => { void analyze(); }, document.documentElement.dataset.depth ? 900 : 0);
    return () => { clearTimeout(timer); cancelled = true; controller.abort(); if (context && context.state !== 'closed') void context.close().catch(() => {}); };
  }, [src]);
  const progress = duration ? position / duration : 0;
  async function toggle() {
    const player = audio.current;
    if (!player) return;
    if (!player.paused) player.pause();
    else try { await player.play(); } catch { setError(true); }
  }
  return <div className="wave-player">
    <audio ref={audio} src={src} preload="metadata" onLoadedMetadata={e => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)} onTimeUpdate={e => setPosition(e.currentTarget.currentTime)} onPlay={e => { setPlaying(true); setError(false); document.querySelectorAll('audio').forEach(player => { if (player !== e.currentTarget) player.pause(); }); }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setError(true)}/>
    <button className="wave-play" type="button" aria-label={`${playing ? t('Pause', 'Pause') : t('Play', 'Écouter')} ${title}`} onClick={toggle}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{playing ? <path d="M6 4h4v16H6zm8 0h4v16h-4z"/> : <path d="M7 4v16l14-8z"/>}</svg>
    </button>
    <div className="wave-seek">
      {peaks.length ? <svg className="waveform" viewBox="0 0 720 64" preserveAspectRatio="none" aria-hidden="true">{peaks.map((peak, index) => { const height = Math.max(2, peak * 56); return <rect key={index} x={index * 4} y={(64 - height) / 2} width="2" height={height} rx="1" fill={index / peaks.length < progress ? 'var(--primary)' : 'currentColor'}/>; })}</svg> : <div className="wave-loading" aria-hidden="true"><span style={{width:`${progress * 100}%`}}/></div>}
      <input type="range" min="0" max={duration || 1} step="0.1" value={position} disabled={!duration} aria-label={t('Playback position', 'Position de lecture')} aria-valuetext={`${stamp(position)} / ${stamp(duration)}`} onChange={e => { if (audio.current) { audio.current.currentTime = Number(e.target.value); setPosition(Number(e.target.value)); } }}/>
    </div>
    <span className="wave-time">{stamp(position)} <span>/ {stamp(duration)}</span></span>
    {error && <p className="wave-error" role="status">{t('Unable to play this recording.', 'Impossible de lire ce morceau.')} <a href={src}>{t('Open file ↗', 'Ouvrir le fichier ↗')}</a></p>}
  </div>;
}
