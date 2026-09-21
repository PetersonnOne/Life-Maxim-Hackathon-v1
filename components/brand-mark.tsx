/** Decorative beside the accessible Life Maxim wordmark. */
export function BrandMark() {
  // A static asset works in the local and Sites runtimes without an image proxy.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/life-maxim-logo.png" className="brand-mark" width={40} height={40} alt="" />;
}
