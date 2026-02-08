import { Outlet } from "react-router-dom"
import { Sidebar, MobileHeader } from "./Sidebar"

export function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <MobileHeader />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
