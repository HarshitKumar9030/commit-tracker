import { Rest } from 'ably';
import { user, failure, ApiError } from '@/lib/server';
export async function GET(){try{const u=await user();if(!process.env.ABLY_API_KEY)throw new ApiError(503,'Add ABLY_API_KEY for live presence.');const token=await new Rest(process.env.ABLY_API_KEY).auth.createTokenRequest({clientId:u.id,ttl:3600000,capability:JSON.stringify({'relay:workspace':['subscribe','presence']})});return Response.json(token,{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
