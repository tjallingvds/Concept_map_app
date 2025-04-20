import { useState } from "react"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { useAuth } from "../contexts/auth-context"
import { Button } from "../components/ui/button"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../components/ui/card"
import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog"
import { useNavigate } from "react-router-dom"

export default function SettingsPage() {
  const { user, logout, deleteAccount } = useAuth()
  const navigate = useNavigate()
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true)
      
      // Call the deleteAccount function from auth context
      await deleteAccount()
      
      // Show success notification
      toast.success("Account deleted successfully")
      
      // Navigate to the landing page
      navigate("/")
    } catch (error) {
      toast.error("Failed to delete account")
      console.error("Account deletion error:", error)
    } finally {
      setIsDeleting(false)
    }
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
              <span className="text-sm font-medium">Settings</span>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-8">
              <div>
                <h1 className="text-2xl font-bold">Account Settings</h1>
                <p className="text-muted-foreground">Manage your account settings and information.</p>
              </div>
              
              <div className="space-y-6">
                {/* Account Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>
                      View and update your account details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p>{user?.email || "No email provided"}</p>
                    </div>
                    
                    <div>
                      <Button variant="outline" asChild>
                        <a href="/profile">Edit Profile</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Logout */}
                <Card>
                  <CardHeader>
                    <CardTitle>Session</CardTitle>
                    <CardDescription>
                      Manage your current session
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      onClick={logout}
                    >
                      Log Out
                    </Button>
                  </CardContent>
                </Card>
                
                {/* Danger Zone */}
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Danger Zone</AlertTitle>
                  <AlertDescription>
                    Actions in this section can't be undone.
                  </AlertDescription>
                </Alert>
                
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-destructive">Delete Account</CardTitle>
                    <CardDescription>
                      Permanently delete your account and all your data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete Account</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            account and remove all your data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteAccount}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                          >
                            {isDeleting ? "Deleting..." : "Yes, delete my account"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
} 