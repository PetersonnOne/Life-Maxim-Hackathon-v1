"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useSignInWithPassword, useSignUpWithPassword } from "@convex-dev/auth/providers/password/react";
import { MIN_PASSWORD_LENGTH } from "@convex-dev/auth/providers/password/validation";
import { Compass, ArrowRight, ShieldCheck, Layers3, Sparkles, Eye, EyeOff } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AppProvider } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dashboardDestination } from "@/lib/navigation-intent";

export function AuthPage({signup=false}:{signup?:boolean}) {
  return <AppProvider><AuthForm signup={signup}/></AppProvider>;
}
function AuthForm({signup}:{signup:boolean}) {
  const {signUp,pending:creating} = useSignUpWithPassword(api.auth.signUpWithPassword);
  const {signIn,pending:entering} = useSignInWithPassword(api.auth.signInWithPassword);
  const {isAuthenticated}=useConvexAuth();
  const router=useRouter();
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const [visible,setVisible]=useState(false);
  const [error,setError]=useState("");
  const pending=creating||entering;
  useEffect(()=>{if(isAuthenticated) router.replace(dashboardDestination(window.location.search));},[isAuthenticated,router]);
  async function submit(e:React.FormEvent) {
    e.preventDefault();setError("");
    if(signup&&password!==confirmation){setError("Your passwords do not match.");return;}
    try {
      const result=await (signup?signUp:signIn)({username,password});
      if(!result.success) {
        const code=result.userError.error;
        const messages:Record<string,string>={USERNAME_TAKEN:"That username is already taken.",USERNAME_TOO_SHORT:"Please choose a longer username.",USERNAME_HAS_INVALID_CHARACTERS:"Use letters, numbers, and supported username characters.",USERNAME_HAS_SURROUNDING_WHITESPACE:"Remove spaces at the beginning or end of your username.",PASSWORD_TOO_SHORT:"Choose a password with at least "+MIN_PASSWORD_LENGTH+" characters.",PASSWORD_TOO_LONG:"Your password is too long.",PASSWORD_TOO_COMMON:"Choose a less common password.",PASSWORD_HAS_SURROUNDING_WHITESPACE:"Remove spaces at the beginning or end of your password.",USER_NOT_FOUND:"Incorrect username or password.",INVALID_CREDENTIALS:"Incorrect username or password.",RATE_LIMITED:"Too many attempts. Please wait before trying again."};
        setError(messages[code]??"We could not complete sign-in. Please try again.");
      }
    } catch {setError("We could not connect. Please try again.");}
  }
  return <main className="auth-page"><aside className="auth-story"><Link href="/" className="brand"><Compass/>Life Maxim</Link><div><span className="eyebrow">YOUR AI LIFE MANAGER</span><h1>A little more clarity.<br/>A lot more possibility.</h1><p>One place for everything you want to move forward.</p><ul><li><Layers3/>Space for every part of your life</li><li><Sparkles/>Context that grows with you</li><li><ShieldCheck/>Actions stay in your control</li></ul></div><span className="auth-footnote">Your life. Your pace. Your next step.</span></aside><section className="auth-main"><Link href="/" className="back-link">← Back to Life Maxim</Link><div className="auth-form-wrap"><span className="eyebrow">{signup?"START YOUR NEXT CHAPTER":"GOOD TO HAVE YOU BACK"}</span><h2>{signup?"Make space for what matters.":"Welcome back."}</h2><p>{signup?"Create your account, then choose your first profile.":"Your goals and next steps are right where you left them."}</p><form onSubmit={submit}><Label htmlFor="username">Username</Label><Input id="username" name="username" autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)} disabled={pending}/><Label htmlFor="password">Password</Label><div className="password-input"><Input id="password" name="password" type={visible?"text":"password"} autoComplete={signup?"new-password":"current-password"} minLength={signup?MIN_PASSWORD_LENGTH:undefined} required value={password} onChange={e=>setPassword(e.target.value)} disabled={pending}/><Button type="button" variant="ghost" size="icon" aria-label={visible?"Hide password":"Show password"} onClick={()=>setVisible(!visible)}>{visible?<EyeOff/>:<Eye/>}</Button></div>{signup&&<><span className="field-hint">Use at least {MIN_PASSWORD_LENGTH} characters and a unique password.</span><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" name="confirm-password" type={visible?"text":"password"} autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={pending}/></>}{error&&<p role="alert" className="form-error">{error}</p>}<Button type="submit" size="lg" disabled={pending}>{pending?"Please wait…":signup?"Create account":"Sign in"}<ArrowRight size={18}/></Button></form><p className="auth-switch">{signup?"Already have an account?":"New to Life Maxim?"} <Link href={signup?"/signin":"/signup"} onClick={event=>{if(new URLSearchParams(window.location.search).get("intent")==="profile"){event.preventDefault();router.push((signup?"/signin":"/signup")+"?intent=profile");}}}>{signup?"Sign in":"Create an account"}</Link></p></div></section></main>;
}
