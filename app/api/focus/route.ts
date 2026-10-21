import { z } from 'zod';
import { user,db,settings,publish,failure } from '@/lib/server';
export async function POST(req:Request){try{const u=await user();const {focus}=z.object({focus:z.string().trim().min(1).max(100)}).parse(await req.json());const s=await settings();s.members=s.members.map(m=>m.id===u.id?{...m,focus}:m);await (await db()).collection('settings').updateOne({_id:'workspace' as never},{$set:s},{upsert:true});await publish();return Response.json({ok:true});}catch(e){return failure(e);}}
