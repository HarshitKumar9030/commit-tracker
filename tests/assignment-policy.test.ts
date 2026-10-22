import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assignReviewer} from '../lib/assignment';
const members=[{id:'a',login:'alice',name:'Alice',role:'Developer',focus:'',color:'blue'},{id:'b',login:'bob',name:'Bob',role:'Slides',focus:'',color:'pink',receivesReviews:false}];
test('non-code members never receive automatic reviews',()=>assert.equal(assignReviewer('abcdef12','external',members,{}),'a'));
test('manual policy leaves commits unassigned',()=>assert.equal(assignReviewer('abcdef12','external',members,{assignmentMode:'manual'}),''));
test('single developer self-review requires explicit opt-in',()=>{assert.equal(assignReviewer('abcdef12','alice',members,{}),'');assert.equal(assignReviewer('abcdef12','alice',members,{allowSelfReview:true}),'a');});
