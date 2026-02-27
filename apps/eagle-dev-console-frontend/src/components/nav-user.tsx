import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Moon,
  Sun,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function NavUser({
  user, onLogout
}: {
  user: {
    name: string
    email: string
    avatar: string
  },
  onLogout: () => void
}) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const { hasUnsavedChanges } = useUnsavedChanges()
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  useEffect(() => {
    // Check if user has a saved preference
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    const initialTheme = savedTheme || (prefersDark ? "dark" : "light")
    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  const applyTheme = (newTheme: "light" | "dark") => {
    const root = document.documentElement
    if (newTheme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    applyTheme(newTheme)
    localStorage.setItem("theme", newTheme)

    // Dispatch custom event to notify other components of theme change
    window.dispatchEvent(new Event("theme-change"))
  }

  const handleLogoutClick = () => {
    if (hasUnsavedChanges) {
      setShowLogoutDialog(true)
    } else {
      confirmLogout()
    }
  }

  const confirmLogout = () => {
    onLogout()
    navigate("/login")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === "light" ? <Moon /> : <Sun />}
                {theme === "light" ? "Dark" : "Light"} Mode
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogoutClick}>
              <LogOut />
              Log out
              {/* //TODO: add logout button to return to login page. */}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. If you leave now, your changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-1">
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              Stay on Page
            </Button>
            <Button variant="outline" onClick={confirmLogout}>
              Leave Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  )
}
