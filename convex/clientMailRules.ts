export const ACK_TEXT = "Your email was received and is awaiting review. We are working on it and will respond as soon as possible.";
export function senderAddress(value:string){const match=value.trim().match(/^(?:[^<>\r\n]*<)?([^<>\s,;]+@[^<>\s,;]+\.[^<>\s,;]+)>?$/);return match?.[1].toLowerCase()??null;}
export function clientCode(subject:string,body:string){const codes=[...new Set((subject+"\n"+body.slice(0,2000)).toUpperCase().match(/\bLM-[A-Z0-9]{20,40}\b/g)??[])];return codes.length===1?codes[0]:null;}
export function automaticMail(headers:Record<string,string>|undefined,sender:string){
 if(!headers)return true; // Missing header evidence is not eligible for unattended replies.
 const h=Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),v.toLowerCase()]));
 return !!((h["auto-submitted"]&&h["auto-submitted"]!=="no")||h["x-auto-response-suppress"]||h["list-id"]||/bulk|junk|list/.test(h.precedence??"")||/mailer-daemon|postmaster|no-?reply/i.test(sender)||h["return-path"]==="<>");
}
