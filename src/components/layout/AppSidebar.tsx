import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Trophy,
  FileText,
  Settings,
  Activity,
  Calendar,
  Download,
  UserPlus,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/lib/constants';

export function AppSidebar() {
  const location = useLocation();
  const { profile } = useAuth();

  const adminItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Sports Management', url: '/sports', icon: Trophy },
    { title: 'Students', url: '/students', icon: Users },
    { title: 'Registrations', url: '/registrations', icon: FileText },
    { title: 'Activity Logs', url: '/activity-logs', icon: Activity },
    { title: 'Settings', url: '/settings', icon: Settings },
  ];

  const coordinatorItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'My Students', url: '/students', icon: Users },
    { title: 'Sports Registration', url: '/sports', icon: Trophy },
    { title: 'My Registrations', url: '/registrations', icon: FileText },
  ];

  const items = profile?.role === USER_ROLES.ADMIN ? adminItems : coordinatorItems;

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Trophy className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">Sports Hub</h2>
              <p className="text-xs text-muted-foreground">Management System</p>
            </div>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}