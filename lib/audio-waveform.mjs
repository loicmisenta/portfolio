import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
const execute = promisify(execFile);
export function validWaveform(wave, audio) {
 return wave?.audio === audio && Number.isFinite(wave.duration) && wave.duration > 0 && Array.isArray(wave.peaks) && wave.peaks.length === 180 && wave.peaks.every(p => Number.isFinite(p) && p >= 0 && p <= 1);
}
export async function prepareWaveforms(content, directories) {
 for (const track of content.tracks) {
  if (validWaveform(track.waveform, track.audio)) continue;
  delete track.waveform;
  if (!/^\/media\/[a-f0-9-]+\.(mp3|wav|ogg|flac|m4a)$/.test(track.audio)) continue;
  for (const directory of directories) {
   try {
    const {stdout} = await execute('ffmpeg', ['-v','error','-i',path.join(directory, track.audio.slice(7)),'-vn','-ac','1','-ar','8000','-f','f32le','pipe:1'], {encoding:'buffer',maxBuffer:64*1024*1024,timeout:30000,windowsHide:true});
    const samples = Math.floor(stdout.length / 4);
    if (!samples) break;
    const peaks = Array(180).fill(0);
    for (let i=0;i<samples;i++) { const bin=Math.min(179,Math.floor(i*180/samples));peaks[bin]=Math.max(peaks[bin],Math.abs(stdout.readFloatLE(i*4))); }
    const max=Math.max(...peaks,0.001);
    track.waveform={audio:track.audio,duration:samples/8000,peaks:peaks.map(p=>Math.round(p/max*1000)/1000)};
    break;
   } catch (error) { if (error.code === 'ENOENT') return; /* Keep playback available if local analysis is unavailable. */ }
  }
 }
 return content;
}
