import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import BlockNoteEditor from "../components/BlockNoteEditor";
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { AppSidebar } from "../components/app-sidebar";
import { Button } from "../components/ui/button";
import { PlusCircle } from "lucide-react";
import { CreateMapDialog } from "../components/create-map-dialog";

export default function WriteAndLearn() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col w-full overflow-hidden bg-background">
          {/* Header with breadcrumb */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm font-medium">Write and Learn</span>
            </div>
            <CreateMapDialog 
              trigger={
                <Button variant="outline" size="sm" className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Create Concept Map
                </Button>
              }
            />
          </div>
          
          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <div className="container mx-auto p-4">
              <div className="border rounded-lg p-4 h-[calc(100vh-200px)]">
                <BlockNoteEditor />
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
} 