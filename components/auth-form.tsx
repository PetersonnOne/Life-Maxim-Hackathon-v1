"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Auth entry/exit uses full navigation to avoid stale client-router auth state. */
import { ThemeToggle } from "@/components/theme-control";
import { useEffect, useState } from "react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { BrandMark } from "@/components/brand-mark";
import { ArrowRight, ShieldCheck, Layers3, Sparkles, Eye, EyeOff } from "lucide-react";
import { AppProvider } from "@/app/providers";
import { LaunchPlans } from "@/components/launch-plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dashboardDestination } from "@/lib/navigation-intent";
const MIN_PASSWORD_LENGTH = 12;

export function AuthPage({signup=false}:{signup?:boolean}) {
  return <AppProvider><AuthForm signup={signup}/></AppProvider>;
}
function AuthForm({signup}:{signup:boolean}) {
  const {signIn} = useAuthActions();
  const [pending,setPending] = useState(false);
  const {isAuthenticated}=useConvexAuth();
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const [visible,setVisible]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{if(isAuthenticated) window.location.replace(dashboardDestination(window.location.search));},[isAuthenticated]);
  async function submit(e:React.FormEvent) {
    e.preventDefault();setError("");
    if(signup&&password!==confirmation){setError("Your passwords do not match.");return;}
    setPending(true);
    try {
      await signIn("password",{username,password,flow:signup?"signUp":"signIn"});
    } catch {setError(signup?"Could not create this account. Try another username, use at least 12 password characters, or wait before retrying.":"Could not sign in. Check your username and password, or wait before retrying.");}
    finally {setPending(false);}
  }
  return <main className="auth-page"><aside className="auth-story"><a href="/" className="brand"><BrandMark/>Life Maxim</a><div><span className="eyebrow">YOUR AI LIFE MANAGER</span><h1>A little more clarity.<br/>A lot more possibility.</h1><p>One place for everything you want to move forward.</p><ul><li><Layers3/>Space for every part of your life</li><li><Sparkles/>Context that grows with you</li><li><ShieldCheck/>Actions stay in your control</li></ul></div><span className="auth-footnote">Your life. Your pace. Your next step.</span></aside><section className="auth-main"><div className="auth-topbar"><a href="/" className="back-link">← Back to Life Maxim</a><ThemeToggle/></div><div className="auth-form-wrap"><span className="eyebrow">{signup?"START YOUR NEXT CHAPTER":"GOOD TO HAVE YOU BACK"}</span><h2>{signup?"Make space for what matters.":"Welcome back."}</h2><p>{signup?"Create your account, then choose your first profile.":"Your goals and next steps are right where you left them."}</p>{signup&&<LaunchPlans compact/>}<form onSubmit={submit}><Label htmlFor="username">Username</Label><Input id="username" name="username" autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)} disabled={pending}/><Label htmlFor="password">Password</Label><div className="password-input"><Input id="password" name="password" type={visible?"text":"password"} autoComplete={signup?"new-password":"current-password"} minLength={signup?MIN_PASSWORD_LENGTH:undefined} required value={password} onChange={e=>setPassword(e.target.value)} disabled={pending}/><Button type="button" variant="ghost" size="icon" aria-label={visible?"Hide password":"Show password"} onClick={()=>setVisible(!visible)}>{visible?<EyeOff/>:<Eye/>}</Button></div>{signup&&<><span className="field-hint">Use at least {MIN_PASSWORD_LENGTH} characters and a unique password.</span><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" name="confirm-password" type={visible?"text":"password"} autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={pending}/></>}{error&&<p role="alert" className="form-error">{error}</p>}<Button type="submit" size="lg" disabled={pending}>{pending?"Please wait…":signup?"Create account":"Sign in"}<ArrowRight size={18}/></Button></form><p className="auth-switch">{signup?"Already have an account?":"New to Life Maxim?"} <a href={signup?"/signin":"/signup"} onClick={event=>{if(new URLSearchParams(window.location.search).get("intent")==="profile"){event.preventDefault();window.location.assign((signup?"/signin":"/signup")+"?intent=profile");}}}>{signup?"Sign in":"Create an account"}</a></p></div></section></main>;
}
