import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validWaveform,prepareWaveforms} from '../lib/audio-waveform.mjs';
test('prepared waveform belongs to the exact audio file and has bounded peaks',async()=>{
 const audio='/media/abc.mp3'; const waveform={audio,duration:120,peaks:Array(180).fill(0.5)};
 assert.equal(validWaveform(waveform,audio),true);
 assert.equal(validWaveform(waveform,'/media/def.mp3'),false);
 assert.equal(validWaveform({...waveform,peaks:[NaN]},audio),false);
 assert.equal(validWaveform({...waveform,duration:Infinity},audio),false);
 const content={tracks:[{audio,waveform}]}; await prepareWaveforms(content,[]);assert.equal(content.tracks[0].waveform,waveform);
 const stale={tracks:[{audio:'/media/def.mp3',waveform}]};await prepareWaveforms(stale,[]);assert.equal(stale.tracks[0].waveform,undefined);
});
