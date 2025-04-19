import { useState } from "react"
import { Link } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { Button } from "../components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function NotesPage() {
  const [activeTab, setActiveTab] = useState<"notes" | "learning">("notes")

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col w-full overflow-hidden bg-background">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm font-medium">Notes & Learn</span>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-center gap-4 mb-8">
                <Button 
                  variant={activeTab === "notes" ? "default" : "outline"}
                  onClick={() => setActiveTab("notes")}
                  className="px-6"
                >
                  Notes
                </Button>
                <Button 
                  variant={activeTab === "learning" ? "default" : "outline"}
                  onClick={() => setActiveTab("learning")}
                  className="px-6"
                >
                  Learning Materials
                </Button>
              </div>
              
              {activeTab === "notes" ? (
                <div>
                  <h1 className="text-3xl font-bold mb-6">Your Notes</h1>
                  <div className="bg-white rounded-lg border p-6">
                    <p className="text-muted-foreground text-center py-8">
                      You don't have any notes yet. Start by creating a new note or importing one.
                    </p>
                    <div className="flex justify-center">
                      <Button>Create New Note</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-3xl font-bold mb-6">Learning Materials</h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg border p-6">
                      <h2 className="text-xl font-semibold mb-4">Study Guides</h2>
                      <p className="text-muted-foreground">
                        Access your personalized study guides and materials.
                      </p>
                    </div>
                    <div className="bg-white rounded-lg border p-6">
                      <h2 className="text-xl font-semibold mb-4">Flashcards</h2>
                      <p className="text-muted-foreground">
                        Review concepts with your custom flashcard sets.
                      </p>
                    </div>
                    <div className="bg-white rounded-lg border p-6">
                      <h2 className="text-xl font-semibold mb-4">Video Resources</h2>
                      <p className="text-muted-foreground">
                        Watch educational videos related to your topics.
                      </p>
                    </div>
                    <div className="bg-white rounded-lg border p-6">
                      <h2 className="text-xl font-semibold mb-4">Practice Tests</h2>
                      <p className="text-muted-foreground">
                        Test your knowledge with practice assessments.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
} 