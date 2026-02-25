import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { Outlet } from "react-router-dom"

export default function Home({onLogout}:{onLogout: ()=> void}) {
  return (
    <SidebarProvider>
      <AppSidebar onLogout={onLogout}/>
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
