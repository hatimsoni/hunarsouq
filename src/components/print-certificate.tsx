"use client";
import { Button } from "@/components/ui/button";
export function PrintCertificate(){return <Button className="mt-8 print:hidden" onClick={()=>window.print()}>Print or save as PDF</Button>}
