import { useEffect } from 'react';
import { useAuth } from '../contexts/auth-context.tsx';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '../components/ui/sidebar.tsx';
import TemplateCard from '../components/template-card.tsx';
import { AppSidebar } from '../components/app-sidebar.tsx';

const mockTemplates = [
  {
    id: 'simple',
    name: 'Simple Flowchart',
    input_text: 'A basic template for linear processes.',
    description: 'This is a sample template for creating a simple flowchart.',
    imageUrl: '/placeholder.svg',
  },
  {
    id: 'mindmap',
    name: 'Mind Map Basic',
    input_text: 'Ideal for brainstorming and idea generation.',
    description: 'Make a mind map to organize my thoughts and ideas.',
    imageUrl: '/placeholder.svg',
  },
  {
    id: 'academic',
    name: 'Academic Study Map',
    input_text: 'Structured for organizing study notes and concepts.',
    description: 'Create a study map to organize my notes and concepts.',
    imageUrl: '/placeholder.svg',
  },
  {
    id: 'timeline',
    name: 'Timeline',
    input_text: 'Visualize events or steps in chronological order.',
    description: 'Create a timeline to visualize events or steps in chronological order.',
    imageUrl: '/placeholder.svg',
  },
  {
    id: 'hierarchy',
    name: 'Organizational Chart',
    input_text: 'Represent hierarchical structures easily.',
    description: 'Create an organizational chart to represent hierarchical structures easily.',
    imageUrl: '/placeholder.svg',
  },
];

export default function TemplatesPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/');
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-xl text-gray-700">Loading...</div>;
  }

  if (!isAuthenticated && !loading) {
    return null;
  }

  const handleUseTemplate = (templateId: string) => {
    console.log(`Selected template: ${templateId}. Redirecting to dashboard.`);
    navigate(`/dashboard?templateId=${templateId}`);
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm font-medium">Template Gallery</span>
            </div>
          </div>

          <main className="flex-1 flex flex-col p-6 overflow-y-auto">
            <div className="container mx-auto max-w-7xl">
              <div className="mb-8 text-center">
                <p className="text-gray-600">
                  Choose from our collection of pre-designed concept map templates to quickly start your project.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {mockTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} onUseTemplate={handleUseTemplate} />
                ))}
              </div>
            </div>
          </main>
        </main>
      </div>
    </SidebarProvider>
  );
}
