import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Worker policy is plain ESM so the same code runs on workerd.
import {allowedOrigin,roomPath,allowedData} from '../server/policy.mjs';

test('relay only admits the shipped game origin and local development',()=>{
 for(const origin of ['https://yexiaotingonemt-jpg.github.io','http://localhost:5180','http://127.0.0.1:5178'])assert.ok(allowedOrigin(origin));
 for(const origin of [null,'null','https://evil.example','https://yexiaotingonemt-jpg.github.io.evil.example','https://evil.example/?localhost','file://localhost/'])assert.equal(allowedOrigin(origin),false);
});
test('relay room paths cannot escape their eight-character room namespace',()=>{
 assert.equal(roomPath('/rooms/ABCD2345'),'ABCD2345');
 for(const path of ['/rooms/ABCD2345/extra','/rooms/../../admin','/rooms/IIII0000','/rooms/abcd2345'])assert.equal(roomPath(path),null);
});
test('relay prevents guest snapshots and host input injection',()=>{
 assert.ok(allowedData('host',{type:'state'}));assert.equal(allowedData('guest',{type:'state'}),false);
 assert.ok(allowedData('guest',{type:'input'}));assert.equal(allowedData('host',{type:'input'}),false);
 assert.equal(allowedData('guest',{type:'admin'}),false);assert.equal(allowedData('host',null),false);
});
