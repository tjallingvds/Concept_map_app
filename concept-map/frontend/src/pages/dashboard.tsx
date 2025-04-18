import { useState, useEffect } from "react"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { useAuth } from "../contexts/auth-context"
import { Input } from "../components/ui/input"
import { PlusIcon, Search, Clock, MoreHorizontal } from "lucide-react"
import { CreateMapDialog } from "../components/create-map-dialog"
import { ImportMapDialog } from "../components/import-map-dialog"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu"
import { Badge } from "../components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { MapItem } from "../components/file-system"
import conceptMapsApi from "../services/api"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

type ExtendedMapItem = MapItem

const mockConceptMaps: ExtendedMapItem[] = [
  {
    id: 1,
    title: "Web Development Fundamentals",
    description: "HTML, CSS, JavaScript basics and their relationships",
    createdAt: "2023-09-15",
    lastEdited: "2023-10-20",
    nodes: 32,
    shareId: undefined,
  },
  {
    id: 2,
    title: "Machine Learning Pipeline",
    description: "Data preparation, model training, and evaluation flow",
    createdAt: "2023-10-01",
    lastEdited: "2023-10-18",
    nodes: 24,
    shareId: "abc123",
  },
  {
    id: 3,
    title: "Biology Cell Structure",
    description: "Organelles and their functions in eukaryotic cells",
    createdAt: "2023-08-22",
    lastEdited: "2023-09-30",
    nodes: 18,
    shareId: undefined,
  },
]

const ConceptMapItem = ({
  map,
  onSelect,
}: {
  map: ExtendedMapItem
  onSelect: () => void
}) => (
  <div
    onClick={onSelect}
    className="border rounded-md p-4 cursor-pointer hover:bg-accent transition-colors"
  >
    <div className="flex justify-between items-start mb-2">
      <h3 className="font-medium truncate">{map.title}</h3>
      {map.shareId && (
        <Badge variant="outline" className="text-xs">
          Shared
        </Badge>
      )}
    </div>

    <p className="text-sm text-muted-foreground mb-2">{map.description}</p>

    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>Updated on {new Date(map.lastEdited).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </div>
  </div>
)

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const displayName = user?.email.split("@")[0] ?? ""
  const [createMapOpen, setCreateMapOpen] = useState(false)
  const [importMapOpen, setImportMapOpen] = useState(false)
  const [maps, setMaps] = useState<ExtendedMapItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const userMaps = await conceptMapsApi.getMyMaps()
        setMaps(userMaps)
      } catch (error) {
        console.error("Error fetching maps:", error)
        toast.error("Failed to load your concept maps")
      } finally {
        setLoading(false)
      }
    }
    fetchMaps()
  }, [])

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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded hover:bg-muted transition">
                  <Avatar>
                    <AvatarFallback>
                      {user?.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-48">
                <div className="px-4 py-2 border-b">
                  <div className="font-medium">{displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    {user?.email}
                  </div>
                </div>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={handleLogout}
                  className="text-destructive"
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div className="max-w-3xl w-full space-y-10 text-center">
              <h1 className="text-4xl font-bold">
                Ready to supercharge your learning?🚀
              </h1>
              <p className="text-muted-foreground">
                Create, explore, or search your concept maps to begin!
              </p>

              <div className="relative w-full">
                <Input
                  placeholder="Search for concept maps..."
                  className="w-full pl-10 py-6 text-lg rounded-md border border-input"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>

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
                        <svg
                          className="h-6 w-6 text-primary"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <h3 className="font-medium">Import Map</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Import from a local file
                      </p>
                    </div>
                  }
                  onMapImported={() => toast.success("Imported successfully")}
                />

                <div className="flex flex-col items-center p-6 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <svg
                      className="h-6 w-6 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <h3 className="font-medium">Explore Public Maps</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Learn right away
                  </p>
                </div>
              </div>

              {!loading && (
                <div className="mt-10 w-full">
                  <h2 className="text-xl font-semibold mb-4">Your Maps</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {(maps.length ? maps : mockConceptMaps).map((map) => (
                      <ConceptMapItem
                        key={map.id}
                        map={map}
                        onSelect={() => navigate(`/editor/${map.id}`)}
                      />
                    ))}
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
