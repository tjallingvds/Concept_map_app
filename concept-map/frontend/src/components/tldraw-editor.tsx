import React from 'react';
import { 
  Tldraw, 
  createTLStore,
  TLComponents
} from 'tldraw';
import 'tldraw/tldraw.css';

interface TLDrawEditorProps {
  className?: string;
  onSave?: (svgContent: string) => void;
}

export function TLDrawEditor({ className = '', onSave }: TLDrawEditorProps) {
  const store = React.useMemo(() => {
    return createTLStore();
  }, []);

  // Reference to the editor instance
  const editorRef = React.useRef<any>(null);

  // Button to export the canvas as SVG
  const handleExport = React.useCallback(() => {
    if (editorRef.current && onSave) {
      // Get the SVG element from the canvas
      const svg = editorRef.current.getSvg();
      if (svg) {
        const svgString = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        const svgUrl = URL.createObjectURL(svgBlob);
        onSave(svgUrl);
      }
    }
  }, [onSave]);

  // Custom components to add to the UI
  const components = React.useMemo<TLComponents>(() => {
    return {}
  }, []);

  return (
    <div className={`w-full h-full ${className} relative`}>
      <Tldraw
        store={store}
        components={components}
        autoFocus
        onMount={(editor) => {
          editorRef.current = editor;
        }}
      />
      {onSave && (
        <button 
          className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium shadow-sm hover:bg-primary/90 z-10"
          onClick={handleExport}
        >
          Save Concept Map
        </button>
      )}
    </div>
  );
} 