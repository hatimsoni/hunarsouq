import {listMembers,profileStatuses} from '@/lib/admin-data';
import {ProfileTable} from '@/components/admin/profile-table';
import {inputClass} from '@/components/form-field';
import {Button} from '@/components/ui/button';
export const metadata={title:'Members'};
export default async function Members({searchParams}:{searchParams:Promise<{q?:string;page?:string;status?:string}>}) {
  const data=await listMembers(await searchParams);
  return <><h1 className="text-3xl">The people in our community.</h1><p className="mb-7 mt-3 text-sm text-muted-foreground">Search members, check their status, and open their review history.</p><form className="mb-6 flex flex-wrap gap-3"><label className="min-w-56 flex-1"><span className="sr-only">Search members</span><input name="q" placeholder="Search name, username, or city" defaultValue={data.query} className={inputClass}/></label><label><span className="sr-only">Filter by status</span><select name="status" defaultValue={data.status} className={inputClass}><option value="">All statuses</option>{profileStatuses.map(status=><option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}</select></label><Button type="submit" className="h-12">Apply filters</Button></form><ProfileTable {...data} path="/admin/members"/></>;
}
