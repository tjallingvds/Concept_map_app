import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { Button } from '../ui/button';
import { Edit, Move, PenLine, Square, Circle, Type, Eraser, Undo, Redo, Save } from 'lucide-react';
import { toast } from 'sonner';

interface FabricEditorProps {
  svgContent: string;
  onSave: (content: string) => void;
  className?: string;
}

export function FabricEditor({ svgContent, onSave, className = '' }: FabricEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [mode, setMode] = useState<'select' | 'draw' | 'rectangle' | 'circle' | 'text' | 'eraser'>('select');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [canvasInitialized, setCanvasInitialized] = useState<boolean>(false);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [initAttempts, setInitAttempts] = useState<number>(0);
  const maxInitAttempts = 5;
  
  // Create a stable reference to the svgContent
  const svgContentRef = useRef(svgContent);
  useEffect(() => {
    svgContentRef.current = svgContent;
  }, [svgContent]);

  // Initialize the Fabric.js canvas
  useEffect(() => {
    let initTimer: NodeJS.Timeout;
    
    const initializeCanvas = () => {
      if (!canvasRef.current) {
        // If the canvas element isn't available yet, try again after a delay
        if (initAttempts < maxInitAttempts) {
          console.log(`Canvas element not available, retry attempt ${initAttempts + 1}/${maxInitAttempts}`);
          initTimer = setTimeout(() => {
            setInitAttempts(prev => prev + 1);
          }, 100);
        }
        return;
      }
      
      try {
        // Check if canvas is already initialized
        if (fabricCanvasRef.current) {
          console.log('Disposing existing canvas');
          fabricCanvasRef.current.dispose();
        }
        
        // Ensure parent element has rendered and has dimensions
        const parent = canvasRef.current.parentElement;
        if (!parent || parent.clientWidth === 0) {
          if (initAttempts < maxInitAttempts) {
            console.log(`Parent element not ready, retry attempt ${initAttempts + 1}/${maxInitAttempts}`);
            initTimer = setTimeout(() => {
              setInitAttempts(prev => prev + 1);
            }, 100);
          }
          return;
        }
        
        // Create canvas with explicit dimensions
        const parentWidth = parent.clientWidth || 800;
        const parentHeight = 600;
        
        // Make sure canvas element has correct dimensions first
        canvasRef.current.width = parentWidth;
        canvasRef.current.height = parentHeight;
        canvasRef.current.style.width = `${parentWidth}px`;
        canvasRef.current.style.height = `${parentHeight}px`;
        
        // Verify the dimensions are properly set
        if (canvasRef.current.width === 0 || canvasRef.current.height === 0) {
          console.error('Canvas has zero dimensions:', canvasRef.current.width, canvasRef.current.height);
          if (initAttempts < maxInitAttempts) {
            initTimer = setTimeout(() => {
              setInitAttempts(prev => prev + 1);
            }, 100);
          }
          return;
        }
        
        console.log('Creating Canvas with dimensions:', parentWidth, 'x', parentHeight);
        
        // Create new fabric canvas
        const canvas = new fabric.Canvas(canvasRef.current, {
          width: parentWidth,
          height: parentHeight,
          backgroundColor: '#ffffff',
          preserveObjectStacking: true,
        });
        
        fabricCanvasRef.current = canvas;
        
        // Set up event listeners
        canvas.on('object:added', saveToHistory);
        canvas.on('object:modified', saveToHistory);
        canvas.on('object:removed', saveToHistory);
        
        // Indicate canvas is initialized
        setCanvasInitialized(true);
        console.log('Fabric canvas initialized successfully with dimensions:', parentWidth, 'x', parentHeight);
      } catch (error) {
        console.error('Error initializing Fabric canvas:', error);
        toast.error('Error initializing editor. Please refresh the page.');
        
        // Try again if under max attempts
        if (initAttempts < maxInitAttempts) {
          initTimer = setTimeout(() => {
            setInitAttempts(prev => prev + 1);
          }, 500); // Longer delay on error
        }
      }
    };
    
    initializeCanvas();
    
    // Clean up
    return () => {
      if (initTimer) {
        clearTimeout(initTimer);
      }
      
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
        } catch (error) {
          console.error('Error disposing canvas:', error);
        }
        fabricCanvasRef.current = null;
      }
      setCanvasInitialized(false);
    };
  }, [initAttempts]);
  
  // Define saveToHistory here, before it's used in other functions
  const saveToHistory = useCallback(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    
    try {
      // Get current state
      const json = JSON.stringify(fabricCanvasRef.current.toJSON());
      
      // If we're not at the end of history, truncate it
      if (historyIndex < history.length - 1) {
        setHistory(prev => prev.slice(0, historyIndex + 1));
      }
      
      // Add new state to history
      setHistory(prev => [...prev, json]);
      setHistoryIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error saving state to history:', error);
    }
  }, [canvasInitialized, history, historyIndex]);
  
  // Load SVG content into canvas - defined as useCallback to avoid recreating on every render
  const loadSvgContent = useCallback((content: string) => {
    if (!fabricCanvasRef.current || !canvasRef.current) {
      console.error('Cannot load content - canvas not initialized');
      return;
    }

    console.log('Starting to load content, type:', 
      content.startsWith('data:image/svg') ? 'SVG data URL' : 
      content.startsWith('<svg') ? 'raw SVG' : 
      content.includes('<?xml') ? 'XML SVG' : 
      'unknown format');
    
    setLoadingContent(true);

    try {
      // Clear existing canvas
      fabricCanvasRef.current.clear();
      
      // Process content based on its format
      if (content.startsWith('data:image/svg')) {
        // Handle SVG data URL
        console.log('Processing SVG data URL');
        
        try {
          // Extract the base64 part
          const base64Content = content.split(',')[1];
          if (!base64Content) {
            throw new Error('Invalid data URL format - no comma found');
          }
          
          // Decode the base64 content
          const decodedContent = decodeURIComponent(escape(atob(base64Content)));
          console.log('Successfully decoded base64 content, length:', decodedContent.length);
          
          // Now load the decoded SVG string
          processRawSvg(decodedContent);
        } catch (decodeError) {
          console.error('Error decoding SVG data URL:', decodeError);
          
          // Fallback to loading as image
          loadAsImage(content);
        }
      } else if (content.startsWith('<svg') || content.includes('<?xml')) {
        // It's raw SVG content
        console.log('Processing raw SVG content');
        processRawSvg(content);
      } else if (content.startsWith('blob:')) {
        // Handle blob URL
        console.log('Processing blob URL');
        loadAsImage(content);
      } else {
        console.error('Unrecognized content format');
        setLoadingContent(false);
        toast.error('Unsupported content format');
      }
    } catch (error) {
      console.error('Error in loadSvgContent:', error);
      setLoadingContent(false);
      toast.error('Error loading content. Please try again.');
    }
  }, [canvasInitialized]);
  
  // Process raw SVG string
  const processRawSvg = useCallback((svgString: string) => {
    if (!fabricCanvasRef.current) {
      console.error('Canvas not available for processing SVG');
      setLoadingContent(false);
      return;
    }
    
    console.log('Processing raw SVG, starts with:', svgString.substring(0, 50) + '...');
    
    try {
      fabric.loadSVGFromString(svgString, (objects, options) => {
        if (!fabricCanvasRef.current) {
          console.error('Canvas reference lost during SVG loading');
          setLoadingContent(false);
          return;
        }
        
        try {
          if (!objects || objects.length === 0) {
            console.error('No objects loaded from SVG');
            setLoadingContent(false);
            return;
          }
          
          console.log(`Loaded ${objects.length} objects from SVG`);
          
          // Create a group containing all the SVG elements
          const svgGroup = new fabric.Group(objects);
          
          // Get canvas dimensions
          const canvasWidth = fabricCanvasRef.current.width || 800;
          const canvasHeight = fabricCanvasRef.current.height || 600;
          
          // Get SVG dimensions
          const svgWidth = svgGroup.width || 100;
          const svgHeight = svgGroup.height || 100;
          
          console.log('SVG dimensions:', svgWidth, 'x', svgHeight);
          console.log('Canvas dimensions:', canvasWidth, 'x', canvasHeight);
          
          // Scale to fit canvas while maintaining aspect ratio
          const scaling = Math.min(
            canvasWidth / svgWidth,
            canvasHeight / svgHeight
          ) * 0.9; // 90% of available space
          
          console.log('Applying scaling factor:', scaling);
          
          // Apply scaling
          svgGroup.scale(scaling);
          
          // Center the SVG on the canvas
          svgGroup.center();
          
          // Add the SVG to the canvas
          fabricCanvasRef.current.add(svgGroup);
          fabricCanvasRef.current.renderAll();
          
          // Save to history
          saveToHistory();
          
          console.log('SVG loaded and rendered successfully');
        } catch (groupError) {
          console.error('Error creating group from SVG objects:', groupError);
          
          // Try adding objects individually if grouping fails
          try {
            console.log('Attempting to add objects individually');
            objects.forEach(obj => {
              fabricCanvasRef.current?.add(obj);
            });
            fabricCanvasRef.current?.renderAll();
            saveToHistory();
          } catch (fallbackError) {
            console.error('Fallback rendering failed:', fallbackError);
          }
        } finally {
          setLoadingContent(false);
        }
      });
    } catch (error) {
      console.error('Error in loadSVGFromString:', error);
      setLoadingContent(false);
      
      // Try loading as an image as last resort
      if (svgString.includes('<svg')) {
        try {
          const tempSvg = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
          loadAsImage(tempSvg);
        } catch (e) {
          console.error('Final fallback failed:', e);
          toast.error('Failed to load SVG content');
        }
      }
    }
  }, [canvasInitialized, saveToHistory]);
  
  // Load content as an image
  const loadAsImage = useCallback((url: string) => {
    if (!fabricCanvasRef.current) {
      console.error('Canvas not available for image loading');
      setLoadingContent(false);
      return;
    }
    
    console.log('Loading as image:', url.substring(0, 30) + '...');
    
    try {
      // Create a temporary image to validate
      const tempImg = new Image();
      
      tempImg.onload = () => {
        console.log('Temp image loaded successfully', tempImg.width, 'x', tempImg.height);
        
        fabric.Image.fromURL(url, (img) => {
          if (!fabricCanvasRef.current || !img) {
            console.error('Canvas or image not available');
            setLoadingContent(false);
            return;
          }
          
          try {
            // Get canvas dimensions
            const canvasWidth = fabricCanvasRef.current.width || 800;
            const canvasHeight = fabricCanvasRef.current.height || 600;
            
            // Scale image to fit canvas
            const scaling = Math.min(
              canvasWidth / (img.width || 100),
              canvasHeight / (img.height || 100)
            ) * 0.9;
            
            console.log('Image scaling factor:', scaling);
            
            img.scale(scaling);
            img.center();
            
            fabricCanvasRef.current.add(img);
            fabricCanvasRef.current.renderAll();
            
            saveToHistory();
            console.log('Image added to canvas successfully');
          } catch (renderError) {
            console.error('Error rendering image on canvas:', renderError);
          } finally {
            setLoadingContent(false);
          }
        }, {
          crossOrigin: 'anonymous'
        });
      };
      
      tempImg.onerror = (err) => {
        console.error('Error loading temporary image:', err);
        setLoadingContent(false);
        toast.error('Failed to load image');
      };
      
      tempImg.src = url;
    } catch (error) {
      console.error('Error in loadAsImage:', error);
      setLoadingContent(false);
    }
  }, [canvasInitialized, saveToHistory]);
  
  // Load SVG content when canvas is ready or content changes
  useEffect(() => {
    let loadTimer: NodeJS.Timeout;
    
    const attemptContentLoad = () => {
      // Only proceed if canvas is initialized and not already loading
      if (canvasInitialized && fabricCanvasRef.current && !loadingContent && svgContent) {
        console.log('Canvas is ready, loading content');
        loadSvgContent(svgContent);
      } else if (canvasInitialized && !loadingContent) {
        console.log('Canvas is ready but no content to load');
      } else if (!canvasInitialized && svgContent) {
        console.log('Canvas not initialized yet, waiting to load content');
        loadTimer = setTimeout(attemptContentLoad, 200);
      }
    };
    
    // Attempt to load content
    attemptContentLoad();
    
    return () => {
      if (loadTimer) {
        clearTimeout(loadTimer);
      }
    };
  }, [canvasInitialized, svgContent, loadingContent, loadSvgContent]);
  
  // Adjust canvas size when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !fabricCanvasRef.current || !canvasInitialized) return;
      
      try {
        const width = canvasRef.current.parentElement?.clientWidth || 800;
        const height = 600;
        
        fabricCanvasRef.current.setWidth(width);
        fabricCanvasRef.current.setHeight(height);
        fabricCanvasRef.current.renderAll();
      } catch (error) {
        console.error('Error resizing canvas:', error);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Call resize after a small delay to ensure measurements are accurate
    if (canvasInitialized) {
      setTimeout(handleResize, 100);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [canvasInitialized]);
  
  // Handle tool selection
  const handleToolSelect = (toolMode: typeof mode) => {
    setMode(toolMode);
    
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // Disable drawing mode by default
    canvas.isDrawingMode = false;
    
    // Configure based on selected tool
    switch (toolMode) {
      case 'draw':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.width = 3;
        canvas.freeDrawingBrush.color = '#000000';
        break;
      case 'eraser':
        // Implement eraser logic (remove selected objects)
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          canvas.remove(activeObject);
        }
        break;
      case 'select':
      default:
        // Default selection mode
        break;
    }
  };
  
  // Add shapes to canvas
  const addShape = (shapeType: 'rectangle' | 'circle') => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    let shape;
    
    if (shapeType === 'rectangle') {
      shape = new fabric.Rect({
        width: 100,
        height: 50,
        fill: 'rgba(255,255,255,0.8)',
        stroke: '#000000',
        strokeWidth: 1,
      });
    } else if (shapeType === 'circle') {
      shape = new fabric.Circle({
        radius: 40,
        fill: 'rgba(255,255,255,0.8)',
        stroke: '#000000',
        strokeWidth: 1,
      });
    }
    
    if (shape) {
      canvas.add(shape);
      shape.center();
      canvas.setActiveObject(shape);
      canvas.renderAll();
      saveToHistory();
    }
  };
  
  // Add text to canvas
  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const text = new fabric.Textbox('Text', {
      fontFamily: 'Arial',
      fontSize: 20,
      fill: '#000000',
      width: 120,
      editable: true,
    });
    
    canvas.add(text);
    text.center();
    canvas.setActiveObject(text);
    canvas.renderAll();
    saveToHistory();
  };
  
  // Undo/Redo functions
  const handleUndo = () => {
    if (historyIndex <= 0 || !fabricCanvasRef.current) return;
    
    setHistoryIndex(prev => prev - 1);
    loadHistoryState(historyIndex - 1);
  };
  
  const handleRedo = () => {
    if (historyIndex >= history.length - 1 || !fabricCanvasRef.current) return;
    
    setHistoryIndex(prev => prev + 1);
    loadHistoryState(historyIndex + 1);
  };
  
  const loadHistoryState = (index: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !history[index]) return;
    
    canvas.loadFromJSON(JSON.parse(history[index]), () => {
      canvas.renderAll();
    });
  };
  
  // Save the current state of the canvas
  const handleSave = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error("Canvas not initialized");
      return;
    }
    
    try {
      // Force a final render to ensure all changes are included
      canvas.renderAll();
      
      console.log("Capturing current canvas state as SVG");
      
      // Get the SVG representation of the CURRENT canvas state
      const svgOptions = {
        width: canvas.width || 800,
        height: canvas.height || 600,
        viewBox: {
          x: 0,
          y: 0,
          width: canvas.width || 800,
          height: canvas.height || 600
        },
        suppressPreamble: false,
        withoutTransform: false,
        includeDefaultAttributes: true
      };
      
      // Generate SVG content directly from the canvas
      const rawSvgContent = canvas.toSVG(svgOptions);
      
      // Add a proper XML declaration if not already present
      const formattedSvgContent = !rawSvgContent.includes('<?xml') 
        ? `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${rawSvgContent}`
        : rawSvgContent;
      
      // Convert to data URL for the API
      const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(formattedSvgContent)))}`;
      
      console.log('Saving canvas as SVG, content length:', formattedSvgContent.length);
      console.log('Data URL starts with:', svgDataUrl.substring(0, 30) + '...');
      
      // Save a backup in localStorage
      try {
        localStorage.setItem('fabric-editor-svg-backup', svgDataUrl);
      } catch (storageError) {
        console.warn('Could not save backup to localStorage:', storageError);
      }
      
      // Pass the SVG data URL to the parent component
      await onSave(svgDataUrl);
      toast.success("Changes saved successfully");
      
    } catch (error) {
      console.error('Error saving canvas as SVG:', error);
      
      // Try again with a simpler approach if the standard method fails
      try {
        console.log("Trying alternative SVG export method");
        
        // Get the raw SVG from the canvas (simpler options)
        const simpleSvg = canvas.toSVG({
          suppressPreamble: true,
          viewBox: {
            x: 0, 
            y: 0, 
            width: canvas.width || 800, 
            height: canvas.height || 600
          }
        });
        
        // Add a proper XML declaration
        const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';
        const fullSvg = xmlHeader + simpleSvg;
        
        // Convert to data URL
        const fallbackDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(fullSvg)))}`;
        
        console.log("Fallback SVG export successful, length:", fullSvg.length);
        
        // Save backup and call parent save method
        localStorage.setItem('fabric-editor-svg-backup', fallbackDataUrl);
        await onSave(fallbackDataUrl);
        toast.success("Changes saved successfully (using fallback method)");
        
      } catch (fallbackError) {
        console.error('Fallback save method also failed:', fallbackError);
        
        // Final attempt - create a PNG if SVG methods fail
        try {
          console.log("Attempting to save as PNG instead");
          const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 0.8
          });
          
          await onSave(dataURL);
          toast.success("Saved as PNG (SVG export failed)");
          
        } catch (finalError) {
          console.error('All save methods failed:', finalError);
          toast.error('Failed to save changes. Please try again or copy your work.');
          
          // Check if we have a backup to recover from
          const backup = localStorage.getItem('fabric-editor-svg-backup');
          if (backup) {
            toast.info('A previous backup is available', {
              action: {
                label: 'Use Backup',
                onClick: () => onSave(backup)
              }
            });
          }
        }
      }
    }
  };
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="mb-2 p-2 bg-white border rounded-md flex gap-2 flex-wrap">
        <Button 
          variant={mode === 'select' ? 'default' : 'outline'} 
          size="icon" 
          onClick={() => handleToolSelect('select')}
          title="Select"
        >
          <Move className="h-4 w-4" />
        </Button>
        
        <Button 
          variant={mode === 'draw' ? 'default' : 'outline'} 
          size="icon" 
          onClick={() => handleToolSelect('draw')}
          title="Draw"
        >
          <PenLine className="h-4 w-4" />
        </Button>
        
        <Button 
          variant={mode === 'rectangle' ? 'default' : 'outline'} 
          size="icon" 
          onClick={() => {
            setMode('rectangle');
            addShape('rectangle');
          }}
          title="Add Rectangle"
        >
          <Square className="h-4 w-4" />
        </Button>
        
        <Button 
          variant={mode === 'circle' ? 'default' : 'outline'} 
          size="icon" 
          onClick={() => {
            setMode('circle');
            addShape('circle');
          }}
          title="Add Circle"
        >
          <Circle className="h-4 w-4" />
        </Button>
        
        <Button 
          variant={mode === 'text' ? 'default' : 'outline'} 
          size="icon" 
          onClick={() => {
            setMode('text');
            addText();
          }}
          title="Add Text"
        >
          <Type className="h-4 w-4" />
        </Button>
        
        <Button 
          variant={mode === 'eraser' ? 'default' : 'outline'} 
          size="icon" 
          onClick={() => handleToolSelect('eraser')}
          title="Eraser"
        >
          <Eraser className="h-4 w-4" />
        </Button>
        
        <div className="border-l mx-1 h-6"></div>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
        
        <div className="flex-1"></div>
        
        <Button onClick={handleSave} className="ml-auto">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
      
      <div className="flex-1 border rounded-md overflow-hidden bg-gray-50 relative">
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
      </div>
    </div>
  );
} 