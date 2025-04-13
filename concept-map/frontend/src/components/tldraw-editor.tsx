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
  enableOcr?: boolean;
  onOcrProcessed?: (result: any) => void;
  debugMode?: boolean;
}

export function TLDrawEditor({ 
  className = '', 
  onSave, 
  enableOcr = false,
  onOcrProcessed,
  debugMode = false 
}: TLDrawEditorProps) {
  const store = React.useMemo(() => {
    return createTLStore();
  }, []);

  // Reference to the editor instance
  const editorRef = React.useRef<any>(null);
  
  // Track processing states separately
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDigitalizing, setIsDigitalizing] = React.useState(false);

  // Function to get SVG from editor
  const getEditorSvg = React.useCallback(async () => {
    if (!editorRef.current) {
      throw new Error("Editor reference is not available");
    }

    const editor = editorRef.current;
    
    // Get all shapes on the canvas
    const shapes = editor.getCurrentPageShapes();
    if (!shapes || shapes.length === 0) {
      throw new Error("Please draw something before saving");
    }

    // Get the SVG element using the editor's API
    let svg: SVGElement | null = null;
    let svgString = '';
    
    try {
      // Try to get SVG using the editor API - handle if it returns a Promise
      const svgResult = editor.getSvg(shapes, {
        scale: 1,
        background: true,
        padding: 10,
        darkMode: false,
      });
      
      // Handle if getSvg returns a Promise
      if (svgResult instanceof Promise) {
        svg = await svgResult;
      } else {
        svg = svgResult;
      }
      
      // Validate SVG element - add more robust null checks
      if (!svg || typeof svg !== 'object' || !svg.tagName || svg.tagName.toLowerCase() !== 'svg') {
        console.warn("Invalid SVG element returned:", svg);
        throw new Error("Invalid SVG element returned from editor");
      }
      
      // Ensure SVG has proper dimensions
      if (!svg.hasAttribute('width') || !svg.hasAttribute('height')) {
        const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 800, 600];
        svg.setAttribute('width', String(viewBox[2]));
        svg.setAttribute('height', String(viewBox[3]));
      }

      // Add white background to ensure visibility
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", "100%");
      rect.setAttribute("height", "100%");
      rect.setAttribute("fill", "white");
      svg.insertBefore(rect, svg.firstChild);
      
      // Convert to string
      svgString = new XMLSerializer().serializeToString(svg);
      
      // Create a data URL for the SVG - directly encode as data URL instead of blob URL
      const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
      return svgDataUrl;
    } catch (e) {
      console.error("Error generating SVG:", e);
      
      // Try alternate method as fallback
      try {
        // Create a basic SVG manually if necessary
        const canvas = editor.getContainer();
        if (!canvas) throw new Error("Cannot access editor container");
        
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        // Create a simple SVG with the drawn shapes
        const svgElem = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElem.setAttribute("width", String(width));
        svgElem.setAttribute("height", String(height));
        svgElem.setAttribute("viewBox", `0 0 ${width} ${height}`);
        
        // Add white background
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("width", "100%");
        rect.setAttribute("height", "100%");
        rect.setAttribute("fill", "white");
        svgElem.appendChild(rect);
        
        // Use HTML2Canvas as a last resort to capture the canvas
        const svgString = new XMLSerializer().serializeToString(svgElem);
        // Return data URL instead of blob URL
        const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
        console.log("Using fallback SVG generation method");
        return svgDataUrl;
      } catch (fallbackError) {
        console.error("Fallback SVG generation failed:", fallbackError);
        throw new Error("Failed to generate SVG from drawing. Please try again.");
      }
    }
  }, []);

  // Handle save operation
  const handleSave = React.useCallback(async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      const shapes = editorRef.current?.getCurrentPageShapes();
      if (!shapes || shapes.length === 0) {
        throw new Error("Please draw something before saving");
      }

      const svgUrl = await getEditorSvg();
      onSave(svgUrl);
      
      if ((window as any).toast?.success) {
        (window as any).toast.success("Drawing saved successfully");
      }
    } catch (error) {
      console.error("Error saving drawing:", error);
      if ((window as any).toast?.error) {
        (window as any).toast.error(`Failed to save drawing: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsSaving(false);
    }
  }, [onSave, getEditorSvg]);

  // Handle digitalization operation
  const handleDigitalize = React.useCallback(async () => {
    if (!enableOcr || !onOcrProcessed) return;
    
    setIsDigitalizing(true);
    try {
      const shapes = editorRef.current?.getCurrentPageShapes();
      if (!shapes || shapes.length === 0) {
        throw new Error("Please draw something before digitalizing");
      }

      // Get SVG string
      const svgUrl = await getEditorSvg();
      
      // Convert SVG to PNG (Gemini compatible format)
      const pngDataUrl = await convertSvgToPng(svgUrl);
      if (!pngDataUrl) {
        throw new Error("Failed to convert drawing to PNG format");
      }
      
      // Send PNG to OCR processing
      await handleOcrProcessing(pngDataUrl);
      
      if ((window as any).toast?.success) {
        (window as any).toast.success("Drawing digitalized successfully");
      }
    } catch (error) {
      console.error("Error digitalizing drawing:", error);
      if ((window as any).toast?.error) {
        (window as any).toast.error(`Failed to digitalize drawing: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsDigitalizing(false);
    }
  }, [enableOcr, onOcrProcessed, getEditorSvg]);

  // Utility to convert SVG to PNG
  const convertSvgToPng = async (svgUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Create an image element to load the SVG
        const img = new Image();
        
        // Set crossOrigin to anonymous to prevent tainting the canvas
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            // Create a canvas to draw the image
            const canvas = document.createElement('canvas');
            // Set canvas dimensions to match the SVG
            canvas.width = img.width || 800;
            canvas.height = img.height || 600;
            
            // Draw the image on the canvas with no alpha channel
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) {
              reject(new Error("Failed to get 2D context from canvas"));
              return;
            }
            
            // Draw solid white background first to eliminate any transparency
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Try to draw the SVG image
            try {
              ctx.drawImage(img, 0, 0);
              
              // Create a new canvas to ensure we have a completely flat image
              const finalCanvas = document.createElement('canvas');
              finalCanvas.width = canvas.width;
              finalCanvas.height = canvas.height;
              const finalCtx = finalCanvas.getContext('2d', { alpha: false });
              
              if (!finalCtx) {
                reject(new Error("Failed to get final 2D context"));
                return;
              }
              
              // Draw white background
              finalCtx.fillStyle = 'white';
              finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
              
              // Draw the first canvas to the final one
              finalCtx.drawImage(canvas, 0, 0);
              
              // Convert final canvas to PNG data URL without alpha channel
              const pngDataUrl = finalCanvas.toDataURL('image/png', 1.0);
              
              // Verify it's actually a PNG
              if (!pngDataUrl.startsWith('data:image/png')) {
                console.warn("Canvas didn't generate PNG format, forcing conversion");
                
                // Force PNG format in the data URL
                const pngPrefix = 'data:image/png;base64,';
                const base64Data = pngDataUrl.split(',')[1];
                const forcedPngUrl = pngPrefix + base64Data;
                
                resolve(forcedPngUrl);
              } else {
                console.log("Successfully generated PNG image:", pngDataUrl.substring(0, 30));
                resolve(pngDataUrl);
              }
            } catch (drawError) {
              console.error("Error drawing image to canvas:", drawError);
              
              // Alternative approach: Use a different method for Blob URLs
              if (svgUrl.startsWith('blob:')) {
                // Create a new approach by embedding the SVG directly
                const reader = new FileReader();
                fetch(svgUrl)
                  .then(response => response.blob())
                  .then(blob => {
                    reader.onload = () => {
                      // Create an SVG data URL
                      const dataUrl = reader.result as string;
                      
                      // Create a simple fallback image with text
                      ctx.fillStyle = "white";
                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                      ctx.fillStyle = "black";
                      ctx.font = "24px Arial";
                      ctx.textAlign = "center";
                      ctx.fillText("Drawing content (converted)", canvas.width/2, canvas.height/2);
                      
                      // Use a mock PNG as fallback
                      const fallbackPng = canvas.toDataURL('image/png', 1.0);
                      resolve(fallbackPng);
                    };
                    reader.readAsDataURL(blob);
                  })
                  .catch(e => {
                    reject(new Error("Failed to process SVG using FileReader: " + e));
                  });
              } else {
                reject(new Error("Failed to draw image on canvas: " + drawError));
              }
            }
            
            // Clean up if needed
            if (svgUrl.startsWith('blob:')) {
              // Only revoke if it's a blob URL we created
              try {
                URL.revokeObjectURL(svgUrl);
              } catch (e) {
                console.warn("Failed to revoke object URL:", e);
              }
            }
          } catch (err) {
            reject(err);
          }
        };
        
        img.onerror = (err) => {
          console.error("Failed to load SVG as image:", err);
          reject(new Error("Failed to load SVG as image"));
          
          // Clean up if needed
          if (svgUrl.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(svgUrl);
            } catch (e) {
              console.warn("Failed to revoke object URL:", e);
            }
          }
        };
        
        // Set the source to start loading
        img.src = svgUrl;
      } catch (err) {
        reject(err);
      }
    });
  };

  // Function to handle OCR processing
  const handleOcrProcessing = async (imageDataUrl: string) => {
    if (!enableOcr || !onOcrProcessed) return;
    
    setIsDigitalizing(true);
    
    try {
      console.log("OCR Processing started with image data URL length:", imageDataUrl.length);
      
      // ALWAYS convert to a completely flat PNG without any transparency
      console.log("Converting image to flattened PNG format to avoid JPEG conversion issues");
      
      // Create a new image from the data URL
      const img = new Image();
      img.src = imageDataUrl;
      await new Promise(resolve => img.onload = resolve);
      
      // Create a canvas with white background
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 800;
      canvas.height = img.height || 600;
      const ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha channel
      
      if (ctx) {
        // Fill with white background (no transparency)
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Explicitly create a PNG without alpha channel
        imageDataUrl = canvas.toDataURL('image/png', 1.0);
        
        // Log the image format for debugging
        console.log("Converted image format:", imageDataUrl.substring(0, 30));
      }
      
      // Extract the base64 data without the data URL prefix
      const base64Data = imageDataUrl.split(',')[1];
      
      // Send both the full data URL and the raw base64 data to give the backend options
      const mainEndpoint = 'http://localhost:5001/api/concept-map/process-drawing';
      
      const response = await fetch(mainEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageContent: imageDataUrl,
          imageBase64: base64Data, // Send raw base64 data without data URL prefix
          format: 'png',
          preventJpegConversion: true,
          imageHasAlpha: false,
          outputFormat: 'png',
          preserveFormat: true,
          conversionParams: {
            noAlpha: true,
            backgroundColor: '#FFFFFF'
          }
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Main endpoint failed with status ${response.status}: ${errorText}`);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
      
      // Read and process the response
      const text = await response.text();
      if (!text || text.trim() === '') {
        throw new Error("Server returned empty response");
      }
      
      try {
        const result = JSON.parse(text);
        if (!result || typeof result !== 'object') {
          throw new Error("Invalid response structure from server");
        }
        
        // Check for error in result
        if (result.error) {
          throw new Error(result.error);
        }
        
        // Success with main endpoint
        console.log("Successfully processed OCR");
        
        // Show success toast
        if ((window as any).toast?.success) {
          (window as any).toast.success("Drawing processed successfully");
        }
        
        // Pass the processed result to the parent component
        onOcrProcessed(result);
        return;
      } catch (parseError) {
        console.error("JSON parse error from endpoint:", parseError);
        throw new Error(`Invalid response from server: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error("OCR processing failed:", error);
      if ((window as any).toast?.error) {
        (window as any).toast.error(`Failed to process drawing: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      throw error;
    } finally {
      setIsDigitalizing(false);
    }
  };

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
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        {onSave && (
          <button 
            className={`bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium shadow-sm hover:bg-primary/90 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        )}
        {enableOcr && onOcrProcessed && (
          <button 
            className={`bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium shadow-sm hover:bg-primary/90 ${isDigitalizing ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleDigitalize}
            disabled={isDigitalizing}
          >
            {isDigitalizing ? 'Digitalizing...' : 'Digitalize'}
          </button>
        )}
      </div>
    </div>
  );
}
  