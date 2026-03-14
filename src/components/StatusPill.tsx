export default function StatusPill({ label = 'Scaffold Ready' }: { label?: string }) {
  return <div className="badge">● {label}</div>;
}
