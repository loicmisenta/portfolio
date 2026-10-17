import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupJourney } from '../lib/journey.mjs';

test('concurrent activities share a group, older periods stay separate',()=>{
 const items=[{title:'Bachelor',start:'2020',end:'2023'},{title:'Master',start:'2024-09',end:'2026-08'},{title:'Assistant',start:'2025-07',end:'2026-06'},{title:'Internship',start:'2027-01',end:'2027-06'}];
 assert.deepEqual(groupJourney(items).map(g=>g.map(x=>x.title)),[['Internship'],['Assistant','Master'],['Bachelor']]);
});
test('unknown dates are not assigned to an overlapping group',()=>{
 const items=[{title:'Undated'},{title:'Current',start:'2025'},{title:'Other current',start:'2026-01'}];
 assert.deepEqual(groupJourney(items).map(g=>g.map(x=>x.title)),[['Other current','Current'],['Undated']]);
});
test('invalid months or reversed intervals remain separate',()=>{
 const items=[{title:'Invalid',start:'2025-13'},{title:'Reversed',start:'2026-05',end:'2026-01'}];
 assert.equal(groupJourney(items).length,2);
});
