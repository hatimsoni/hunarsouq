'use client';
import {Button} from '@/components/ui/button';
export default function AdminError({reset}:{reset:()=>void}){return <div role="alert" className="rounded-xl border bg-background p-7"><h1 className="text-2xl">We couldn’t load this admin view.</h1><p className="my-5 text-sm leading-7 text-muted-foreground">Try again. If this persists, check the database connection and Phase 3 migration.</p><Button onClick={reset}>Try again</Button></div>;}
