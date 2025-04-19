import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { MapItem } from '../components/file-system';
import { ConceptMapViewer } from '../components/concept-map-viewer';
import {useConceptMapsApi} from "../services/api.ts";

export default function SharedMapPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [map, setMap] = useState<MapItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getSharedMap } = useConceptMapsApi();

  useEffect(() => {
    const fetchSharedMap = async () => {
      if (!shareId) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        console.log('Attempting to fetch shared map with ID:', shareId);
        console.log('getSharedMap exists:', typeof getSharedMap === 'function');
        
        const sharedMap = await getSharedMap(shareId);
        console.log('Shared map result:', sharedMap);
        
        if (sharedMap) {
          setMap(sharedMap);
        } else {
          setError('Shared map not found or no longer available');
        }
      } catch (err) {
        console.error('Error fetching shared map:', err);
        setError('Failed to load the shared concept map');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedMap();
  }, [shareId]);

  // Handle downloading the map as SVG
  const handleDownload = () => {
    if (!map || !map.svgContent) {
      toast.error('No image available to download');
      return;
    }

    // Create a link and trigger download
    const link = document.createElement('a');
    link.href = map.svgContent;
    link.download = `${map.title}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Download started');
  };

  if (loading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error || !map) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex flex-col items-center justify-center h-[600px] text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-muted-foreground mb-6">{error || 'Map not found'}</p>
          <Button asChild>
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{map.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleDownload}>
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Concept Map Viewer */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {map.svgContent ? (
          <ConceptMapViewer svgContent={map.svgContent} />
        ) : (
          <div className="flex items-center justify-center h-[600px] text-muted-foreground">
            No preview available
          </div>
        )}
      </div>
    </div>
  );
}