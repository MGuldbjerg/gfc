export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gfc-app">
      <div className="container">
        {children}
      </div>
    </div>
  )
}
