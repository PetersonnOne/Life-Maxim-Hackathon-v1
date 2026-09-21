import { env } from "./_generated/server";
import { ConvexError,v } from "convex/values";
import { z } from "zod";
import { action,internalAction } from "./_generated/server";
import { api,internal } from "./_generated/api";
import { PAID_PLANS_ENABLED, PAID_PLANS_DISABLED_MESSAGE } from "../lib/release-policy";
const paid=v.union(v.literal("premium"),v.literal("premium_plus"));
function settings(){
 const environment=env.PAYSTACK_ENVIRONMENT==="live"?"live":"test";
 const key=env.PAYSTACK_SECRET_KEY;
 if(!key)throw new ConvexError("Paystack is not configured yet.");
 if(!key.startsWith("sk_"+environment+"_"))throw new ConvexError("Paystack key and environment do not match.");
 return {environment,key} as const;
}
async function call(path:string,body?:unknown){
 const c=settings();const res=await fetch("https://api.paystack.co"+path,{method:body===undefined?"GET":"POST",headers:{Authorization:"Bearer "+c.key,"Content-Type":"application/json"},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:"error",signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw new ConvexError("Paystack could not complete this request. No automatic payment retry was made.");
 return z.object({status:z.literal(true),data:z.unknown()}).parse(await res.json()).data;
}
function product(tier:"premium"|"premium_plus"){
 const id=tier==="premium"?env.PAYSTACK_PREMIUM_PLAN_CODE:env.PAYSTACK_PREMIUM_PLUS_PLAN_CODE;
 if(!id?.startsWith("PLN_"))throw new ConvexError("This monthly subscription plan is not configured yet.");return id;
}
function safeLink(value:string){const u=new URL(value);if(u.protocol!=="https:"||u.username||u.password||!(u.hostname==="paystack.com"||u.hostname.endsWith(".paystack.com")))throw new ConvexError("Unexpected payment address.");return value;}
const planSchema=z.object({id:z.number().int(),plan_code:z.string(),amount:z.number().int().positive(),currency:z.string(),interval:z.literal("monthly"),domain:z.enum(["test","live"])});
const customerSchema=z.object({id:z.number().int(),customer_code:z.string()});
const paymentSchema=z.object({status:z.string(),reference:z.string(),domain:z.string(),amount:z.number(),currency:z.string(),paid_at:z.string().nullable(),customer:customerSchema,metadata:z.unknown(),authorization:z.object({authorization_code:z.string()}).nullish(),plan:z.unknown().optional(),plan_object:z.object({plan_code:z.string().optional()}).optional()});
const subscriptionSchema=z.object({subscription_code:z.string(),domain:z.string(),status:z.string(),customer:customerSchema,plan:planSchema,authorization:z.object({authorization_code:z.string()}),createdAt:z.string(),next_payment_date:z.string().nullish(),most_recent_invoice:z.object({paid:z.union([z.number(),z.boolean()]),transaction:z.number().int().safe().nullable(),period_end:z.string()}).nullish()});
export function monthEnd(iso:string){const d=new Date(iso);if(!Number.isFinite(d.getTime()))return 0;const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+1);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.getTime();}
function paymentMatches(tx:z.infer<typeof paymentSchema>,plan:z.infer<typeof planSchema>,customerId?:string){
 const code=typeof tx.plan==="string"?tx.plan:typeof tx.plan==="object"&&tx.plan!==null&&"plan_code" in tx.plan?tx.plan.plan_code:tx.plan_object?.plan_code;
 return tx.status==="success"&&tx.domain===plan.domain&&tx.amount===plan.amount&&tx.currency===plan.currency&&code===plan.plan_code&&(!customerId||tx.customer.customer_code===customerId)&&!!tx.paid_at;
}
export const checkout=action({args:{tier:paid,email:v.string()},returns:v.string(),handler:async(ctx,{tier,email}):Promise<string>=>{
 if(!PAID_PLANS_ENABLED)throw new ConvexError(PAID_PLANS_DISABLED_MESSAGE);
 await ctx.runQuery(api.billing.current,{});
 const parsed=z.string().email().max(254).safeParse(email);if(!parsed.success)throw new ConvexError("Enter your billing email.");
 const c=settings();const productId=product(tier);const returnUrl=env.APP_URL;if(!returnUrl)throw new ConvexError("Configure the application return URL first.");
 const callback=new URL("/dashboard",returnUrl);if(callback.protocol!=="https:"&&!(callback.protocol==="http:"&&["localhost","127.0.0.1"].includes(callback.hostname)))throw new ConvexError("Invalid application return URL.");
 const plan=planSchema.parse(await call("/plan/"+encodeURIComponent(productId)));if(plan.plan_code!==productId||plan.domain!==c.environment)throw new ConvexError("Check the configured Paystack plan.");
 const id=await ctx.runMutation(internal.billing.reserve,{productId,environment:c.environment});
 const reference="lm-"+id;
 await ctx.runMutation(internal.billing.setReference,{id,reference});
 const result=z.object({reference:z.string(),authorization_url:z.string()}).parse(await call("/transaction/initialize",{email:parsed.data,amount:String(plan.amount),currency:plan.currency,plan:productId,reference,channels:["card"],metadata:JSON.stringify({life_maxim_billing:id}),callback_url:callback.href}));
 if(result.reference!==reference)throw new ConvexError("Payment reference mismatch.");const url=safeLink(result.authorization_url);
 await ctx.runMutation(internal.billing.attach,{id,checkoutId:reference,checkoutUrl:url});return url;
}});
export const portal=action({args:{},returns:v.string(),handler:async(ctx):Promise<string>=>{
 const row=await ctx.runQuery(api.billing.current,{});if(row?.provider!=="paystack"||!row.subscriptionId||row.environment!==settings().environment)throw new ConvexError("No verified Paystack subscription yet.");
 return safeLink(z.object({link:z.string()}).parse(await call("/subscription/"+encodeURIComponent(row.subscriptionId)+"/manage/link")).link);
}});
export const sync=internalAction({args:{id:v.id("billingAccounts")},returns:v.null(),handler:async(ctx,{id}):Promise<null>=>{
 const row=await ctx.runMutation(internal.billing.claim,{id});if(row?.provider!=="paystack"||!row.checkoutId||!row.productId)return null;
 try{
 const c=settings();if(row.environment!==c.environment)return null;
 const plan=planSchema.parse(await call("/plan/"+encodeURIComponent(row.productId)));if(plan.plan_code!==row.productId||plan.domain!==c.environment)return null;
 const first=paymentSchema.parse(await call("/transaction/verify/"+encodeURIComponent(row.checkoutId)));
 const metadata=z.object({life_maxim_billing:z.string()}).safeParse(first.metadata);
 if(first.reference!==row.checkoutId||!metadata.success||metadata.data.life_maxim_billing!==id||!paymentMatches(first,plan))return null;
 let subscriptionId=row.subscriptionId;
 if(!subscriptionId){
  const subscriptions=z.array(subscriptionSchema).max(100).parse(await call("/subscription?customer="+first.customer.id+"&plan="+plan.id+"&perPage=100"));
  const matches=subscriptions.filter(s=>s.domain===c.environment&&s.customer.customer_code===first.customer.customer_code&&s.plan.plan_code===plan.plan_code&&s.authorization.authorization_code===first.authorization?.authorization_code&&Date.parse(s.createdAt)>=row._creationTime-60000);
  if(matches.length!==1)return null;subscriptionId=matches[0].subscription_code;
 }
 const sub=subscriptionSchema.parse(await call("/subscription/"+encodeURIComponent(subscriptionId)));
 if(sub.subscription_code!==subscriptionId||sub.domain!==c.environment||sub.customer.customer_code!==first.customer.customer_code||sub.plan.plan_code!==plan.plan_code)return null;
 let until=monthEnd(first.paid_at!);
 // A future next-payment date alone is not proof of a successful renewal.
 const invoice=sub.most_recent_invoice;
 if(invoice?.paid&&invoice.transaction){
  const renewal=paymentSchema.parse(await call("/transaction/"+invoice.transaction));const end=Date.parse(invoice.period_end);
  if(paymentMatches(renewal,plan,first.customer.customer_code)&&Number.isFinite(end)&&end<=monthEnd(renewal.paid_at!)+86400000)until=Math.max(until,end);
 }
 const tier=plan.plan_code===env.PAYSTACK_PREMIUM_PLAN_CODE?"premium":plan.plan_code===env.PAYSTACK_PREMIUM_PLUS_PLAN_CODE?"premium_plus":"free";
 await ctx.runMutation(internal.billing.apply,{id,generation:row.generation,tier:until>Date.now()?tier:"free",expiresAt:until,status:sub.status,subscriptionId,customerId:first.customer.customer_code,productId:plan.plan_code});
 }catch{/* Reads retry at the next poll. Unverified dates never extend access. */}return null;
}});
