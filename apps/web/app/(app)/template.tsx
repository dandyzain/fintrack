/** Route transition: content rises 8px and fades in (CSS, so it never waits on hydration). */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="enter-rise">{children}</div>;
}
