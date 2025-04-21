import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { WhiteboardEditor } from "../components/whiteboard-editor"
import { Button } from "../components/ui/button"
import { useConceptMapsApi } from "../services/api"

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
        
        console.log("Loaded map data:", {
          id: mapData.id,
          format: mapData.format,
          hasWhiteboardContent: !!mapData.whiteboardContent,
          contentSize: mapData.whiteboardContent ? JSON.stringify(mapData.whiteboardContent).length : 0
        })
        
        // Check if this is actually a hand-drawn whiteboard
        if (mapData.format !== "handdrawn") {
          console.error("Map is not a hand-drawn whiteboard:", mapData.format)
          toast.error("This is not a hand-drawn whiteboard")
          navigate(`/editor/${id}`)
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
      
      const updatedMap = await updateMap(Number(id), {
        whiteboard_content: whiteboardContent,
      })
      
      if (!updatedMap) {
        throw new Error("Failed to save whiteboard")
      }
      
      console.log("Whiteboard saved successfully")
      toast.success("Whiteboard saved successfully")
      setMap(updatedMap)
    } catch (error) {
      console.error("Error saving whiteboard:", error)
      toast.error("Failed to save whiteboard")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-2">Loading whiteboard...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 flex flex-col h-screen">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{map?.name || "Hand-Drawn Whiteboard"}</h1>
          <p className="text-muted-foreground">{map?.description || "Edit your hand-drawn whiteboard"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/maps")}>
            Back to Maps
          </Button>
        </div>
      </header>
      
      <div className="flex-1 border rounded-lg overflow-hidden">
        {map?.whiteboardContent ? (
          <WhiteboardEditor 
            whiteboardContent={map.whiteboardContent}
            onSave={handleSave}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-muted-foreground mb-4">No whiteboard content found</p>
            <Button onClick={() => navigate("/maps")}>
              Go back to Maps
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 