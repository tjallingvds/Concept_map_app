import React from 'react';

interface ConceptMapViewerProps {
  svgContent: string;
}

export function ConceptMapViewer({ svgContent }: ConceptMapViewerProps) {
  // Check if the content is a base64 encoded image
  const isBase64Image = svgContent.startsWith('data:image');
  // Check if the content is SVG
  const isSvgContent = svgContent.trim().startsWith('<svg') || svgContent.includes('<?xml');

  if (isBase64Image) {
    return (
      <div className="w-full h-[600px] overflow-auto p-4 flex items-center justify-center">
        <img 
          src={svgContent} 
          alt="Concept Map" 
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  } else if (isSvgContent) {
    return (
      <div 
        className="w-full h-[600px] overflow-auto p-4"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
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