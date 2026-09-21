"use client";
import { useState } from "react";
import { useAction,useMutation,useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { TIERS,type Tier } from "@/convex/tierPolicy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { PAID_PLANS_ENABLED } from "@/lib/release-policy";
import { LaunchPlans } from "@/components/launch-plans";
export function BillingPanel(){ return PAID_PLANS_ENABLED ? <PaidBillingPanel/> : <LaunchPlans/>; }
function PaidBillingPanel(){const account=useQuery(api.billing.current,{});const checkout=useAction(api.billingActions.checkout);const portal=useAction(api.billingActions.portal);const refresh=useMutation(api.billing.refresh);const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function go(task:()=>Promise<string>){setBusy(true);setError("");try{window.location.assign(await task());}catch(e){setError(e instanceof ConvexError&&typeof e.data==="string"?e.data:"Billing is unavailable. Please try later.");}finally{setBusy(false);}}
 return <section><h2>Plans &amp; Billing</h2><p>Current plan: {TIERS[account?.tier??"free"].label} · {account?.status??"Free account"}{account?.environment==="test"?" · TEST MODE — no live subscription":""}</p><p>Monthly allowances reset on the first day of each calendar month (UTC), not the payment date. Attempts reserve allowance before provider work. No automatic overage charges. Provider and shared safety limits can also apply.</p>{error&&<p role="alert" className="form-error">{error}</p>}<Label htmlFor="billing-email">Your Billing Email</Label><Input id="billing-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254}/>
 <div className="tier-grid">{(Object.keys(TIERS) as Tier[]).map(tier=>{const t=TIERS[tier];return <Card key={tier} className="detail-card"><h3>{t.label}</h3><p>{tier==="free"?"No payment required":"Price and taxes shown securely at Paystack checkout"}</p><ul><li>{t.profiles} profiles · {t.clients} active clients · {t.inboxes} inboxes</li><li>{t.lightAI} lightweight AI requests / month</li><li>{t.heavyAI} guidance or planning requests / month</li><li>{t.research} research runs / month</li><li>{t.triage} incoming-mail AI analyses / month</li><li>{t.mail} outgoing messages, including acknowledgements / month</li><li>{t.voice} pilot voice starts / month, up to 5 minutes each; voice acceptance remains pending</li></ul>{tier!=="free"&&<Button disabled={busy||!email||account!==null} onClick={()=>void go(()=>checkout({tier,email}))}>Choose {t.label}</Button>}</Card>;})}</div>
 {account?.checkoutUrl&&!account.subscriptionId&&<Button disabled={busy} onClick={()=>window.location.assign(account.checkoutUrl!)}>Resume Saved Checkout</Button>} {account?.customerId&&<Button disabled={busy} onClick={()=>void go(()=>portal({}))}>Manage Subscription in Paystack</Button>}<Button variant="outline" disabled={busy||!account} onClick={()=>{setError("");void refresh({}).catch(()=>setError("Could not request a billing refresh."));}}>Refresh Billing Status</Button><p>Subscriptions are verified by backend API checks, normally every five minutes. Returning from checkout alone does not upgrade your account. Existing subscriptions are managed through Paystack; do not create duplicate subscriptions.</p></section>;
}
