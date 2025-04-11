import React, { useState } from 'react';
import { Button } from './ui/button';
import { TLDrawEditor } from './tldraw-editor';

interface ConceptMapViewerProps {
  svgContent: string;
  onSave?: (newSvgContent: string) => void;
}

export function ConceptMapViewer({ svgContent, onSave }: ConceptMapViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Check if the content is a base64 encoded image
  const isBase64Image = svgContent.startsWith('data:image');
  // Check if the content is SVG
  const isSvgContent = svgContent.trim().startsWith('<svg') || svgContent.includes('<?xml');

  const handleSave = (newSvgContent: string) => {
    onSave?.(newSvgContent);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="w-full h-[600px]">
        <TLDrawEditor 
          className="h-full" 
          onSave={handleSave} 
        />
      </div>
    );
  }

  if (isBase64Image) {
    return (
      <div className="w-full h-[600px] overflow-auto p-4 flex flex-col">
        <div className="flex justify-end mb-2">
          {onSave && (
            <Button onClick={() => setIsEditing(true)}>
              Edit with TLDraw
            </Button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <img 
            src={svgContent} 
            alt="Concept Map" 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </div>
    );
  } else if (isSvgContent) {
    return (
      <div className="w-full h-[600px] overflow-auto p-4 flex flex-col">
        <div className="flex justify-end mb-2">
          {onSave && (
            <Button onClick={() => setIsEditing(true)}>
              Edit with TLDraw
            </Button>
          )}
        </div>
        <div 
          className="flex-1"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
    );
  } else {
    // Fallback for other content types
    return (
      <div className="w-full h-[600px] overflow-auto p-4 flex items-center justify-center text-muted-foreground">
        <p>Unable to display content. Unsupported format.</p>
      </div>
    );
  }
}