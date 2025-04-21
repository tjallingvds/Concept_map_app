import { useState, useEffect, useCallback } from 'react';
import { SidebarProvider, SidebarTrigger } from '../components/ui/sidebar';
import { AppSidebar } from '../components/app-sidebar';
import { useAuth } from '../contexts/auth-context';
import { Input } from '../components/ui/input';
import { PlusIcon, Search, Clock } from 'lucide-react';
import { CreateMapDialog } from '../components/create-map-dialog';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { MapItem } from '../components/file-system';
import { useConceptMapsApi } from '../services/api';
import { toast } from 'sonner';

// Mock data for concept maps (to be replaced with real data later)
const mockConceptMaps = [
  {
    id: 1,
    title: 'Web Development Fundamentals',
    description: 'HTML, CSS, JavaScript basics and their relationships',
    createdAt: '2023-09-15',
    lastEdited: '2023-10-20',
    nodes: 32,
  },
  {
    id: 2,
    title: 'Machine Learning Pipeline',
    description: 'Data preparation, model training, and evaluation flow',
    createdAt: '2023-10-01',
    lastEdited: '2023-10-18',
    nodes: 24,
  },
  {
    id: 3,
    title: 'Biology Cell Structure',
    description: 'Organelles and their functions in eukaryotic cells',
    createdAt: '2023-08-22',
    lastEdited: '2023-09-30',
    nodes: 18,
  },
  {
    id: 4,
    title: 'Project Management',
    description: 'Agile vs Waterfall methodologies comparison',
    createdAt: '2023-07-10',
    lastEdited: '2023-10-05',
    nodes: 15,
  },
  {
    id: 5,
    title: 'Physics Mechanics',
    description: "Newton's laws and their applications",
    createdAt: '2023-09-05',
    lastEdited: '2023-10-10',
    nodes: 22,
  },
];

const ConceptMapItem = ({ map, onSelect }: { map: MapItem; onSelect: () => void }) => {
  return (
    <div onClick={onSelect} className="border rounded-md p-4 cursor-pointer hover:bg-accent transition-colors">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium truncate">{map.title}</h3>
        <div className="flex items-center gap-1">
          {map.shareId && (
            <Badge variant="outline" className="text-xs">
              Shared
            </Badge>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{map.description}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Updated {formatDistanceToNow(new Date(map.lastEdited))} ago</span>
      </div>
    </div>
  );
};
interface TemplateData {
  name: string;
  description?: string;
  nodes?: any[];
  edges?: any[];
  input_text?: string;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [createMapOpen, setCreateMapOpen] = useState(false);
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { createMap, getMyMaps } = useConceptMapsApi();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMaps = maps.filter((map) =>
    map.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    map.description.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const [createMapOpen, setCreateMapOpen] = useState(false);
  const [initialDialogData, setInitialDialogData] = useState<TemplateData | null>(null);
  const { createMap, getTemplate } = useConceptMapsApi();

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const templateId = queryParams.get('templateId');

    if (templateId) {
      navigate(location.pathname, { replace: true });

      const fetchTemplate = async () => {
        try {
          console.log(`Fetching template data for ID: ${templateId}`);
          const templateData = await getTemplate(templateId);
          console.log('Template data fetched:', templateData);

          setInitialDialogData(templateData);

          setCreateMapOpen(true);
        } catch (error) {
          console.error('Error fetching template:', error);
          toast.error(`Failed to load template: ${templateId}`);
          setInitialDialogData(null);
        }
      };

      fetchTemplate();
    }
  }, [location.search, navigate, getTemplate]);

  const handleSelectMap = (mapId: string) => {
    console.log('Selecting map:', mapId);
    navigate(`/editor/${mapId}`); // Navigate to the editor page for the selected map
  };

  const handleLogout = useCallback(async () => {
    if (logout) {
      await logout();
    } else {
      console.warn('Logout function not provided by auth context.');
      // Fallback or error handling
      navigate('/'); // Redirect manually
    }
  }, [logout, navigate]);

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
            <div className="max-w-4xl w-full space-y-10 text-center">
              <h1 className="text-4xl font-bold">Ready to supercharge your learning?🚀</h1>
              <p className="text-muted-foreground">
                Search for concept maps, create new ones, or explore templates to get started!
              </p>

              {/* Search Input */}
              <div className="relative w-full">
                <Input 
                  placeholder="Search for concept maps..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                  className="w-full pl-10 py-6 text-lg rounded-md border border-input"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>
              {/* Filtered Maps */}
              {filteredMaps.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-center">
                  No concept maps found.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
                  {filteredMaps.map((map) => (
                    <ConceptMapItem
                      key={map.id}
                      map={map}
                      onSelect={() => navigate(`/editor/${map.id}`)}
                    />
                  ))}
                </div>
              )}

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                <CreateMapDialog
                  open={createMapOpen}
                  onOpenChange={setCreateMapOpen}
                  initialData={initialDialogData}
                  trigger={
                    <div
                      onClick={() => setCreateMapOpen(true)}
                      className="flex flex-col items-center p-6 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors bg-white shadow-sm" // Added bg-white, shadow-sm
                    >
                      <div className="p-3 bg-primary/10 rounded-full mb-4">
                        <PlusIcon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-medium text-gray-900">Create New Map</h3>{' '}
                      <p className="text-sm text-muted-foreground mt-2">Start a new concept map from text</p>
                    </div>
                  }
                />

                <Link to="/notes" className="block">
                  <div className="flex flex-col items-center p-6 border border-border rounded-lg hover:bg-muted/50 cursor-pointer shadow-sm transition-colors">
                    <div className="p-3 bg-primary/10 rounded-full mb-4">
                      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="font-medium">Notes & Learn</h3>
                    <p className="text-sm text-muted-foreground mt-2">Access your study materials</p>
                  </div>
                </Link>

                <div
                  onClick={() => navigate('/library')}
                  className="flex flex-col items-center p-6 border border-border rounded-lg shadow-sm hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <h3 className="font-medium">Explore Public Maps</h3>
                  <p className="text-sm text-muted-foreground mt-2">Learn right away</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
