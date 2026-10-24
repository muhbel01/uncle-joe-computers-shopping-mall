import { storeConfig } from "@/lib/store-config";
type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };
function partsAt(date: Date, timeZone: string): Parts {
 const entries = new Intl.DateTimeFormat("en-GB",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(date);
 const p = Object.fromEntries(entries.map(x=>[x.type,x.value]));
 return {year:+p.year,month:+p.month,day:+p.day,hour:+p.hour,minute:+p.minute,second:+p.second};
}
function parseParts(value: string): Parts | null {
 const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value); if(!m)return null;
 const p={year:+m[1],month:+m[2],day:+m[3],hour:+m[4],minute:+m[5],second:0};
 const d=new Date(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute));
 return d.getUTCFullYear()===p.year&&d.getUTCMonth()+1===p.month&&d.getUTCDate()===p.day&&p.hour<24&&p.minute<60?p:null;
}
/** Convert a datetime-local input in the configured store timezone to UTC. */
export function parseStoreDateTimeInput(value: string): string | null {
 const target=parseParts(value); if(!target)return null;
 const targetMs=Date.UTC(target.year,target.month-1,target.day,target.hour,target.minute); let ms=targetMs;
 try {
  for(let i=0;i<4;i++){const p=partsAt(new Date(ms),storeConfig.timeZone);const seen=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);const delta=targetMs-seen;if(!delta)break;ms+=delta;}
  const p=partsAt(new Date(ms),storeConfig.timeZone);
  if(p.year!==target.year||p.month!==target.month||p.day!==target.day||p.hour!==target.hour||p.minute!==target.minute)return null;
  return new Date(ms).toISOString();
 } catch { return null; }
}
export function formatStoreDateTime(value: string | null): string {
 if(!value)return "—";const date=new Date(value);if(Number.isNaN(date.getTime()))return "—";
 try{return date.toLocaleString(storeConfig.language,{timeZone:storeConfig.timeZone,dateStyle:"medium",timeStyle:"short"});}catch{return date.toLocaleString(storeConfig.language,{dateStyle:"medium",timeStyle:"short"});}
}
export function toStoreDateTimeInput(value: string | null): string {
 if(!value)return "";const date=new Date(value);if(Number.isNaN(date.getTime()))return "";
 try{const p=partsAt(date,storeConfig.timeZone);return String(p.year).padStart(4,"0")+"-"+String(p.month).padStart(2,"0")+"-"+String(p.day).padStart(2,"0")+"T"+String(p.hour).padStart(2,"0")+":"+String(p.minute).padStart(2,"0");}catch{return "";}
}