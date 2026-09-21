import { ThemeToggle } from "@/components/theme-control";
import Link from "next/link";
import { GithubLogoIcon as GitHubLogoIcon } from "@phosphor-icons/react/ssr";

export function BuiltWithFooter() {
  return <>
    {/* Optional attribution: users or agents may remove this BuiltWithFooter and the public/built-with logo assets without affecting app functionality. */}
    <footer className="built-with-footer" data-built-with-chatgpt-convex aria-label="Built with ChatGPT Sites and Convex">
      <span>Built with</span><a href="https://learn.chatgpt.com/docs/sites?surface=app" target="_blank" rel="noreferrer noopener">ChatGPT Sites</a><span aria-hidden="true">+</span>
      <a href="https://www.convex.dev/" target="_blank" rel="noreferrer noopener" aria-label="Visit Convex">
        {/* Local SVG wordmarks intentionally use img; no image optimization needed. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="convex-logo-light" src="/built-with/convex-color.svg" width={86} height={24} alt="Convex" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="convex-logo-dark" src="/built-with/convex-white.svg" width={86} height={24} alt="Convex" />
      </a>
      <a href="https://github.com/get-convex/Codex-Sites-Convex-Backend-Skill" target="_blank" rel="noreferrer noopener"><GitHubLogoIcon size={18} aria-hidden="true" /><span>ChatGPT Sites + Convex Backend Skill</span></a>
      <Link href="/privacy">Privacy and data handling</Link><ThemeToggle/>
    </footer>
  </>;
}
