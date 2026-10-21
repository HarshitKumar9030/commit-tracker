import { z } from 'zod';
import { user,db,settings,publish,failure,ApiError } from '@/lib/server';
export async function POST(req:Request){try{
 const u=await user();const input=z.object({sha:z.string().regex(/^[a-f0-9]{40}$/),verdict:z.enum(['approved','changes']),note:z.string().trim().min(1).max(2000)}).parse(await req.json());const s=await settings();
 const result=await (await db()).collection('commits').updateOne({_id:`${s.repo}:${input.sha}`,assignee:u.id},{$set:{review:{verdict:input.verdict,note:input.note,by:u.id,at:new Date().toISOString()}}});
 if(!result.matchedCount) throw new ApiError(403,'Only the assigned reviewer can submit this review.');
 await publish();return Response.json({ok:true});
 }catch(e){return failure(e);}}
