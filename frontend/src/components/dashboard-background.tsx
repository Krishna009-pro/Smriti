export function DashboardBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Radial gradient blobs */}
      <div
        className="absolute -left-32 -top-32 size-[600px] rounded-full opacity-10"
        style={{
          background:
            'radial-gradient(circle, var(--teal) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute -bottom-24 right-1/4 size-[400px] rounded-full opacity-5"
        style={{
          background:
            'radial-gradient(circle, var(--violet) 0%, transparent 70%)',
        }}
      />
      {/* Grid overlay */}
      <div className="grid-overlay absolute inset-0" />
    </div>
  )
}
