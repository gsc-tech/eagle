"use client";

import {
  Home,
  LayoutDashboard,
  Server,
  TvMinimal,
  PanelsTopLeft,
  Users
} from "lucide-react";
import { NavUser } from "./nav-user";
import { getUser } from "@/firebase/authService";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";
import { Link, useLocation } from "react-router-dom";

const data = {
  user: {
    name: "developer1",
    email: "user@dev.com",
    avatar: "/avatars/shadcn.jpg",
  },

  items: [
    {
      title: "Home",
      url: "/",
      icon: Home,
    },
    {
      title: "Backends",
      url: "/backends",
      icon: Server,
    },
    {
      title: "Widgets",
      url: "/widgets",
      icon: LayoutDashboard,
    },
    {
      title: "Dashboards",
      url: "/dashboards",
      icon: TvMinimal,
    },
    {
      title: "Dashboard Builder",
      url: "/dashboard-builder",
      icon: PanelsTopLeft,
    },
    {
      title: "Users",
      url: "/users",
      icon: Users,
    },
  ],
};

export function AppSidebar({
  onLogout,
}: React.ComponentProps<typeof Sidebar> & { onLogout: () => void }) {
  const location = useLocation();

  const user = getUser();
  console.log(user);
  const name = user?.email?.split(".")[0] || "user";
  const CapitalizeName = name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <Sidebar>
      <SidebarHeader>
        <NavUser user={{ name: CapitalizeName, email: user?.email || "user@gmail.com", avatar: "/avatars/shadcn.jpg" }} onLogout={onLogout} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {data.items.map((item) => {
            // Check if current route matches this menu item
            const isActive = location.pathname === item.url ||
              (item.url !== "/" && location.pathname.startsWith(item.url));

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
