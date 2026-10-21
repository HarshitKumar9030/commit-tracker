import { z } from 'zod';
import type { Settings } from '@/lib/types';
import { user,db,settings,publish,failure } from '@/lib/server';
export async function POST(req:Request){try{
 const u=await user();const {focus}=z.object({focus:z.string().trim().min(1).max(100)}).parse(await req.json());
 const s=await settings();const col=(await db()).collection<Settings & {_id:string}>('settings');
 await col.updateOne({_id:'workspace'},{$setOnInsert:s},{upsert:true});
 await col.updateOne({_id:'workspace','members.id':u.id},{$set:{'members.$.focus':focus}});
 await publish();return Response.json({ok:true});
}catch(e){return failure(e);}}
