import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { WhiteboardEditor } from "../components/whiteboard-editor"
import { Button } from "../components/ui/button"
import {useConceptMapsApi} from "../services/concept_map_api.ts";
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"

export default function WhiteboardEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [map, setMap] = React.useState<any>(null)
  const { getMap, updateMap } = useConceptMapsApi()

  // Load the map data
  React.useEffect(() => {
    const loadMap = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        console.log("Loading whiteboard map with ID:", id)
        const mapData = await getMap(Number(id))
        
        if (!mapData) {
          console.error("Map not found:", id)
          toast.error("Failed to load whiteboard")
          navigate("/maps")
          return
        }
        
        // Log detailed info about the map data for debugging
        console.log("Loaded map data:", {
          id: mapData.id,
          format: mapData.format,
          hasWhiteboardContent: !!mapData.whiteboardContent,
          contentSize: mapData.whiteboardContent ? JSON.stringify(mapData.whiteboardContent).length : 0
        })
        
        // First check if this is actually a hand-drawn whiteboard by format
        if (mapData.format !== "handdrawn") {
          console.error("Map is not a hand-drawn whiteboard:", mapData.format)
          toast.error("This is not a hand-drawn whiteboard")
          navigate(`/editor/${id}`)
          return
        }
        
        // Then check if it has whiteboard content
        if (!mapData.whiteboardContent || Object.keys(mapData.whiteboardContent).length === 0) {
          console.error("Map doesn't contain editable whiteboard content")
          
          console.log("Creating empty whiteboard content for map:", mapData.id)
          // Create empty whiteboard content if missing - initialize with base structure
          const emptyContent = { 
            document: {
              id: "doc",
              name: "New Whiteboard",
              version: 15.5,
              pages: {
                page: {
                  id: "page",
                  name: "Page 1",
                  shapes: {},
                  bindings: {}
                }
              },
              pageStates: {
                page: {
                  id: "page",
                  selectedIds: [],
                  camera: {
                    point: [0, 0],
                    zoom: 1
                  }
                }
              },
              assets: {}
            }
          }
          
          // Use emptyContent but save it immediately after the component mounts
          setMap({...mapData, whiteboardContent: emptyContent})
          return
        }
        
        setMap(mapData)
      } catch (error) {
        console.error("Error loading whiteboard:", error)
        toast.error("Failed to load whiteboard")
      } finally {
        setLoading(false)
      }
    }
    
    loadMap()
  }, [id, navigate, getMap])

  // Save changes to the whiteboard
  const handleSave = async (whiteboardContent: any) => {
    if (!id || !map) return
    
    try {
      setSaving(true)
      console.log("Saving whiteboard content:", {
        mapId: id,
        contentSize: JSON.stringify(whiteboardContent).length
      })
      
      // Save only the whiteboard content
      const updatedMap = await updateMap(Number(id), {
        whiteboard_content: whiteboardContent,
      })
      
      if (!updatedMap) {
        throw new Error("Failed to save whiteboard")
      }
      
      // Debug to check if the content is correctly returned after saving
      console.log("Whiteboard saved successfully. Updated map:", {
        id: updatedMap.id, 
        hasWhiteboardContent: !!updatedMap.whiteboardContent,
        contentSize: updatedMap.whiteboardContent ? JSON.stringify(updatedMap.whiteboardContent).length : 0
      })
      
      toast.success("Whiteboard saved successfully")
      setMap(updatedMap)
    } catch (error) {
      console.error("Error saving whiteboard:", error)
      toast.error("Failed to save whiteboard")
    } finally {
      setSaving(false)
    }
  }

  // Reference to the whiteboard editor component
  const editorRef = React.useRef<React.ElementRef<typeof WhiteboardEditor>>(null)
  
  // Function to save the current whiteboard state
  const saveWhiteboard = React.useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.getCurrentContent()
      if (content) {
        handleSave(content)
      }
    }
  }, [handleSave])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-2">Loading whiteboard...</span>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col w-full overflow-hidden bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm font-medium">{map?.name || "Hand-Drawn Whiteboard"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={saveWhiteboard} 
                disabled={saving}
                className="shadow-sm"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => navigate("/maps")}>
                Back to Maps
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="h-full w-full">
              <WhiteboardEditor 
                ref={editorRef}
                whiteboardContent={map.whiteboardContent}
                onSave={handleSave}
                hideSaveButton={true}
              />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
} 