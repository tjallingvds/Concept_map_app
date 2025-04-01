import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { useAuth } from "../contexts/auth-context"
import { Button } from "../components/ui/button"

export default function DashboardPage() {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex-1 relative">
          <div className="flex items-center justify-between px-4 py-3 border-b-[1px] border-b-slate-200 dark:border-b-slate-800">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm font-medium">Dashboard</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm">
                {user?.email}
              </div>
              <Button size="sm" variant="ghost" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
          
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-2">Welcome to Concept Map</h1>
            <p className="text-muted-foreground max-w-2xl mb-8">
              Create, manage, and share your concept maps with ease.
              Get started by creating a new map or exploring the public library.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-6 flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold">My Maps</h2>
                <p className="text-muted-foreground text-sm">
                  View, edit, and manage your concept maps. You can organize your maps into folders and share them with others.
                </p>
                <Button variant="outline" className="w-full">View My Maps</Button>
              </div>
              
              <div className="border rounded-lg p-6 flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold">Create New Map</h2>
                <p className="text-muted-foreground text-sm">
                  Start a new concept map from scratch. Organize your ideas visually and connect related concepts.
                </p>
                <Button className="w-full">Create New Map</Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
} 