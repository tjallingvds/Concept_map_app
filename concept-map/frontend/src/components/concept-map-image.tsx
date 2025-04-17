import React, { useEffect, useRef, useState } from 'react';

interface ConceptMapImageProps {
  svgContent: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onSvgLoaded?: (svgElement: SVGSVGElement) => void;
}

export function ConceptMapImage({ 
  svgContent, 
  alt = "Concept Map", 
  className = "max-w-full max-h-full object-contain", 
  style = {},
  onSvgLoaded
}: ConceptMapImageProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [svgError, setSvgError] = useState<boolean>(false);
  
  // Check if the content is a data URL or raw SVG
  const isDataUrl = svgContent.startsWith('data:');
  const isSvgContent = !isDataUrl && (svgContent.trim().startsWith('<svg') || svgContent.includes('<?xml'));
  
  // Function to get the current SVG data URL
  const getSvgDataUrl = (): string | null => {
    if (isDataUrl) {
      return svgContent;
    } else if (isSvgContent && svgContainerRef.current) {
      const svgElement = svgContainerRef.current.querySelector('svg');
      if (svgElement) {
        try {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
        } catch (error) {
          console.error('Error creating SVG data URL:', error);
          return null;
        }
      }
    }
    return null;
  };
  
  // Effect to handle SVG element after rendering
  useEffect(() => {
    if (isSvgContent && svgContainerRef.current) {
      const svgElement = svgContainerRef.current.querySelector('svg');
      if (svgElement) {
        try {
          // Make the SVG responsive
          if (!svgElement.getAttribute('width')) {
            svgElement.setAttribute('width', '100%');
          }
          if (!svgElement.getAttribute('height')) {
            svgElement.setAttribute('height', '100%');
          }
          
          // Add preserveAspectRatio if not present
          if (!svgElement.getAttribute('preserveAspectRatio')) {
            svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          }
          
          // Make sure SVG has an ID for export functionality
          if (!svgElement.id) {
            svgElement.id = `concept-map-${Math.random().toString(36).substring(2, 9)}`;
          }
          
          // Add accessibility attributes
          svgElement.setAttribute('role', 'img');
          if (!svgElement.getAttribute('aria-labelledby')) {
            const titleId = `svg-title-${Math.random().toString(36).substr(2, 9)}`;
            svgElement.setAttribute('aria-labelledby', titleId);
            
            // Add title element if not present
            if (!svgElement.querySelector('title')) {
              const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'title');
              titleElement.id = titleId;
              titleElement.textContent = alt;
              svgElement.insertBefore(titleElement, svgElement.firstChild);
            }
          }
          
          // Call the callback with the SVG element
          if (onSvgLoaded) {
            onSvgLoaded(svgElement as SVGSVGElement);
          }
        } catch (error) {
          console.error('Error processing SVG element:', error);
          setSvgError(true);
        }
      }
    }
  }, [svgContent, isSvgContent, onSvgLoaded, alt]);

  // Effect for handling image loads
  useEffect(() => {
    if (isDataUrl && imgRef.current) {
      // When image loads, let parent know
      const handleImageLoad = () => {
        if (imgRef.current && onSvgLoaded) {
          // For data URLs, we don't have a direct SVG element
          // but we can let the parent component know the image is ready
          try {
            // Try to convert the img to SVG for consistent handling
            const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgElement.setAttribute('width', imgRef.current.width.toString());
            svgElement.setAttribute('height', imgRef.current.height.toString());
            
            // Add the image as a child of the SVG
            const imageElement = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            imageElement.setAttribute('href', imgRef.current.src);
            imageElement.setAttribute('width', '100%');
            imageElement.setAttribute('height', '100%');
            svgElement.appendChild(imageElement);
            
            // Call the callback with the SVG element
            onSvgLoaded(svgElement);
          } catch (error) {
            console.error('Error creating SVG from image:', error);
          }
        }
      };
      
      imgRef.current.addEventListener('load', handleImageLoad);
      return () => {
        imgRef.current?.removeEventListener('load', handleImageLoad);
      };
    }
  }, [isDataUrl, onSvgLoaded]);
  
  // Handle data URL
  if (isDataUrl) {
    return (
      <img 
        ref={imgRef}
        src={svgContent} 
        alt={alt}
        className={className}
        style={style}
        onError={() => setSvgError(true)}
      />
    );
  }
  
  // Handle SVG content
  if (isSvgContent) {
    return (
      <div
        ref={svgContainerRef}
        className={className}
        style={style}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  }
  
  // Handle error case or unsupported content
  if (svgError || (!isDataUrl && !isSvgContent)) {
    return (
      <div className={className} style={style}>
        <div className="flex items-center justify-center h-full w-full bg-gray-100 text-gray-500">
          <p>Unable to display SVG content</p>
        </div>
      </div>
    );
  }
  
  // Default fallback
  return null;
} 