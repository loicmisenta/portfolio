import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sortTracks,validReleaseDate} from '../lib/tracks.mjs';
test('release dates reject impossible days and accept leap years',()=>{
 for(const value of ['2026-02-29','2026-04-31','2026-13-01','2026-1-01','']) assert.equal(validReleaseDate(value),false);
 assert.equal(validReleaseDate('2024-02-29'),true);
});
test('newest releases first, legacy years and undated tracks preserved',()=>{
 const tracks=[{id:'unknown'},{id:'old',year:'2024'},{id:'june',releaseDate:'2026-06-01'},{id:'year',year:'2026'},{id:'oct',releaseDate:'2026-10-21'},{id:'unknown2'}];
 assert.deepEqual(sortTracks(tracks).map(t=>t.id),['oct','june','year','old','unknown','unknown2']);
 assert.equal(tracks[0].id,'unknown');
});

import {validYoutubeUrl} from '../lib/tracks.mjs';
test('YouTube links allow HTTPS YouTube hosts only',()=>{
 for(const url of ['https://youtu.be/rNuTLGLnu8s','https://www.youtube.com/watch?v=rNuTLGLnu8s']) assert.equal(validYoutubeUrl(url),true);
 for(const url of ['javascript:alert(1)','https://youtube.com.evil.example/video','http://youtu.be/test','https://user:pass@youtube.com/video','bad']) assert.equal(validYoutubeUrl(url),false);
});
