import { useState } from "react"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { useAuth } from "../contexts/auth-context"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { PlusIcon, Search } from "lucide-react"
import { CreateMapDialog } from "../components/create-map-dialog"
import { ImportMapDialog } from "../components/import-map-dialog"

// Mock data for concept maps (to be replaced with real data later)
const mockConceptMaps = [
  { id: 1, title: "Web Development Fundamentals", description: "HTML, CSS, JavaScript basics and their relationships", createdAt: "2023-09-15", lastEdited: "2023-10-20", nodes: 32 },
  { id: 2, title: "Machine Learning Pipeline", description: "Data preparation, model training, and evaluation flow", createdAt: "2023-10-01", lastEdited: "2023-10-18", nodes: 24 },
  { id: 3, title: "Biology Cell Structure", description: "Organelles and their functions in eukaryotic cells", createdAt: "2023-08-22", lastEdited: "2023-09-30", nodes: 18 },
  { id: 4, title: "Project Management", description: "Agile vs Waterfall methodologies comparison", createdAt: "2023-07-10", lastEdited: "2023-10-05", nodes: 15 },
  { id: 5, title: "Physics Mechanics", description: "Newton's laws and their applications", createdAt: "2023-09-05", lastEdited: "2023-10-10", nodes: 22 },
]

export default function DashboardPage() {
  const { user, logout } = useAuth()
  
  const handleLogout = async () => {
    await logout()
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col w-full overflow-hidden bg-background">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm font-medium">Dashboard</span>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div className="max-w-3xl w-full space-y-10 text-center">
              <h1 className="text-4xl font-bold">Ready to supercharge your learning?🚀</h1>
              <p className="text-muted-foreground">
                Search for concept maps, create new ones, or explore templates to get started!
              </p>
              
              {/* Search Input */}
              <div className="relative w-full">
                <Input 
                  placeholder="Search for concept maps..." 
                  className="w-full pl-10 py-6 text-lg rounded-md border border-input"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>
              
              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                <CreateMapDialog
                  trigger={
                    <div className="flex flex-col items-center p-6 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="p-3 bg-primary/10 rounded-full mb-4">
                        <PlusIcon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-medium">Create New Map</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Start a new concept map
                      </p>
                    </div>
                  }
                />
                
                <ImportMapDialog
                  trigger={
                    <div className="flex flex-col items-center p-6 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="p-3 bg-primary/10 rounded-full mb-4">
                        <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="font-medium">Import Map</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Import from a local file 
                      </p>
                    </div>
                  }
                  onMapImported={(file) => {
                    // Handle the imported file
                    console.log('Imported file:', file)
                    // TODO: Implement file processing logic
                  }}
                />
                
                <div className="flex flex-col items-center p-6 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="font-medium">Explore Public Maps</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Learn right away
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}