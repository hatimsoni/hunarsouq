import type { StatusEmail } from './supabase/database.types';
const descriptions:Record<string,string>={
  draft:'Your profile is now a draft. You can finish it and submit it from your account.',
  pending:'Your profile is waiting for human review. It will become public only after approval.',
  approved:'Your Hunar profile has been approved and is now verified. Thank you for sharing your skills with our community.',
  rejected:'Your profile was not approved. Read the review note below, update your details, and submit it again.',
  changes_requested:'Our review team needs a few changes before your profile can be approved.',
  suspended:'Your profile has been suspended and is no longer publicly listed. Editing is paused until an administrator restores it.',
};
export function statusEmailPayload(event:Pick<StatusEmail,'to_email'|'full_name'|'new_status'|'note'>,from:string,origin:string) {
  const label=event.new_status.replaceAll('_',' ');
  return {from,to:[event.to_email],subject:`Your Hunar Souq profile: ${label}`,
    text:`Hello ${event.full_name||'there'},\n\n${descriptions[event.new_status]??'Your profile status has changed.'}${event.note?`\n\nReview note:\n${event.note}`:''}\n\nVisit your account: ${origin}/account\n\nWith care,\nThe Hunar Souq team`};
}
export async function sendResendEmail(apiKey:string,payload:unknown,eventId:string,fetcher:typeof fetch=fetch):Promise<{id?:string;error?:string}> {
  try {
    const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':`profile-status/${eventId}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
    if(!response.ok) return {error:`Resend returned HTTP ${response.status}.`};
    const result:unknown=await response.json();
    return result&&typeof result==='object'&&'id' in result&&typeof result.id==='string'?{id:result.id}:{error:'Resend returned an unexpected response.'};
  }catch{return {error:'Delivery could not be confirmed. Retry within the delivery window.'};}
}
