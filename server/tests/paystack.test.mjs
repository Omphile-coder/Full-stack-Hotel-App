import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {test,beforeEach,afterEach} from 'node:test';
import {checkoutUrl,initializePaystack,paymentCallback,paymentReference,validPaystackSignature,verifyPaystack} from '../dist/services/paystack.js';

const names=['PAYSTACK_SECRET_KEY','PAYSTACK_WEBHOOK_SECRET','PAYSTACK_CALLBACK_URL','CLIENT_URL'];
let saved,originalFetch;
beforeEach(()=>{saved=Object.fromEntries(names.map(name=>[name,process.env[name]]));originalFetch=globalThis.fetch;process.env.PAYSTACK_SECRET_KEY='sk_test_unit';delete process.env.PAYSTACK_WEBHOOK_SECRET;delete process.env.PAYSTACK_CALLBACK_URL;process.env.CLIENT_URL='http://localhost:5173';});
afterEach(()=>{globalThis.fetch=originalFetch;for(const name of names){if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];}});

// These tests use fixture secrets and fake HTTP responses, with no network or database access.
test('legacy signature authenticates exact raw bytes and rejects tampering',()=>{
 const raw=Buffer.from('{ "event": "charge.success" }');const sig=createHmac('sha512','sk_test_unit').update(raw).digest('hex');
 assert.equal(validPaystackSignature(raw,undefined,sig),true);
 assert.equal(validPaystackSignature(Buffer.from('{"event":"charge.success"}'),undefined,sig),false);
 assert.equal(validPaystackSignature(raw,undefined,'bad'),false);
});
test('current signatures support rotation, require a recent timestamp, and prevent legacy downgrade',()=>{
 process.env.PAYSTACK_WEBHOOK_SECRET='whsec_unit';const raw=Buffer.from('{}');const now=Math.floor(Date.now()/1000);
 const signature=time=>createHmac('sha512','whsec_unit').update(time+'.').update(raw).digest('hex');
 assert.equal(validPaystackSignature(raw,`t=${now},v1=whk_old:${'0'.repeat(128)},v1=whk_new:${signature(now)}`),true);
 assert.equal(validPaystackSignature(raw,`t=${now-600},v1=whk_new:${signature(now-600)}`),false);
 const legacy=createHmac('sha512','sk_test_unit').update(raw).digest('hex');
 assert.equal(validPaystackSignature(raw,undefined,legacy),false);
 assert.equal(validPaystackSignature(raw,`t=${now},t=${now},v1=whk_new:${signature(now)}`,legacy),false);
});
test('return URLs stay on the frontend origin',()=>{
 assert.equal(paymentCallback(),'http://localhost:5173/payments/callback');
 process.env.PAYSTACK_CALLBACK_URL='https://untrusted.example/callback';
 assert.throws(paymentCallback,/frontend origin/);
});
test('hosted checkout URLs and references reject redirects and malformed input',()=>{
 assert.equal(checkoutUrl('https://checkout.paystack.com/fixture'),'https://checkout.paystack.com/fixture');
 for(const url of ['http://checkout.paystack.com/x','https://checkout.paystack.com.evil.example/x','https://user@checkout.paystack.com/x','javascript:alert(1)'])assert.throws(()=>checkoutUrl(url));
 assert.equal(paymentReference('hotel-1234567890'),'hotel-1234567890');
 assert.throws(()=>paymentReference('../invalid'));
});
test('initialization sends a server secret, exact cents, and configured reference',async()=>{
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.paystack.co/transaction/initialize');assert.equal(options.headers.Authorization,'Bearer sk_test_unit');assert.equal(JSON.parse(options.body).amount,'246912');return Response.json({status:true,data:{reference:'hotel-1234567890',authorization_url:'https://checkout.paystack.com/fixture'}});};
 const result=await initializePaystack({email:'guest@example.test',amount:'246912',currency:'ZAR',reference:'hotel-1234567890',callback_url:'http://localhost:5173/payments/callback'});
 assert.equal(result.reference,'hotel-1234567890');
});
test('verification reads the provider transaction and does not trust HTTP success alone',async()=>{
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.paystack.co/transaction/verify/hotel-1234567890');assert.equal(options.method,'GET');return Response.json({status:true,data:{reference:'hotel-1234567890',status:'pending',amount:100,currency:'ZAR'}});};
 assert.equal((await verifyPaystack('hotel-1234567890')).status,'pending');
 globalThis.fetch=async()=>Response.json({status:false,message:'private provider detail'});
 await assert.rejects(verifyPaystack('hotel-1234567890'),error=>!error.message.includes('private provider detail'));
});
test('missing keys and provider authentication failures are reported without leaking secrets',async()=>{
 delete process.env.PAYSTACK_SECRET_KEY;await assert.rejects(verifyPaystack('hotel-1234567890'),/not configured/);
 process.env.PAYSTACK_SECRET_KEY='sk_test_unit';globalThis.fetch=async()=>Response.json({status:false},{status:401});
 await assert.rejects(verifyPaystack('hotel-1234567890'),error=>error.status===503&&!error.message.includes('sk_test_unit'));
});
