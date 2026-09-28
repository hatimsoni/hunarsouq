import {listMembers} from '@/lib/admin-data';
import {ProfileTable} from '@/components/admin/profile-table';
import {inputClass} from '@/components/form-field';
import {Button} from '@/components/ui/button';
export const metadata={title:'Review queue'};
export default async function Reviews({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}) {
  const data=await listMembers(await searchParams,true);
  return <><h1 className="text-3xl">Ready for your review.</h1><p className="mb-7 mt-3 text-sm leading-7 text-muted-foreground">Pending profiles, oldest first. Open a submission to inspect its details, images, and links.</p><form className="mb-6 flex max-w-lg gap-3"><label className="min-w-0 flex-1"><span className="sr-only">Search pending profiles</span><input name="q" placeholder="Search name, username, or city" defaultValue={data.query} className={inputClass}/></label><Button type="submit" className="h-12">Search</Button></form><ProfileTable {...data} path="/admin/reviews"/><p className="mt-8 text-xs text-muted-foreground">Business and course review queues will appear when their submission features are introduced.</p></>;
}
