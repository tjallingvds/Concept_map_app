import React, { useEffect, useRef, useState } from 'react';
import * as fabric from "fabric"; // ✅ This is what actually works;
import { Button } from '../ui/button';
import { Edit, Move, PenLine, Square, Circle, Type, Eraser, Undo, Redo, Save } from 'lucide-react';

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

  // Initialize the Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Create canvas instance
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasRef.current.parentElement?.clientWidth || 800,
      height: 600,
      backgroundColor: '#ffffff',
    });
    
    fabricCanvasRef.current = canvas;
    
    // Set up event listeners
    canvas.on('object:added', saveToHistory);
    canvas.on('object:modified', saveToHistory);
    canvas.on('object:removed', saveToHistory);
    
    // Clean up
    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);
  
  // Load SVG content when it changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    loadSvgContent(svgContent);
  }, [svgContent]);
  
  // Adjust canvas size when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !fabricCanvasRef.current) return;
      
      const width = canvasRef.current.parentElement?.clientWidth || 800;
      const height = 600;
      
      fabricCanvasRef.current.setWidth(width);
      fabricCanvasRef.current.setHeight(height);
      fabricCanvasRef.current.renderAll();
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial size
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Save state to history
  const saveToHistory = () => {
    if (!fabricCanvasRef.current) return;
    
    // Get current state
    const json = JSON.stringify(fabricCanvasRef.current.toJSON());
    
    // If we're not at the end of history, truncate it
    if (historyIndex < history.length - 1) {
      setHistory(prev => prev.slice(0, historyIndex + 1));
    }
    
    // Add new state to history
    setHistory(prev => [...prev, json]);
    setHistoryIndex(prev => prev + 1);
  };
  
  // Load SVG content into canvas
  const loadSvgContent = (content: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // Clear canvas first
    canvas.clear();
    
    if (content.startsWith('data:image/svg') || content.startsWith('blob:')) {
      // It's a data URL or blob URL, we need to load it as an image
      fabric.Image.fromURL(content, (img: fabric.Image) => {
        // Scale image to fit canvas while maintaining aspect ratio
        const scaling = Math.min(
          (canvas.width || 800) / (img.width || 100),
          (canvas.height || 600) / (img.height || 100)
        ) * 0.9;
        
        img.scale(scaling);
        
        // Center the image
        img.center();
        
        // Add to canvas
        canvas.add(img);
        canvas.renderAll();
        
        // Save initial state to history
        saveToHistory();
      }, { crossOrigin: 'anonymous' }); // Add crossOrigin for blob URLs
    } else if (content.startsWith('<svg') || content.includes('<?xml')) {
      // It's raw SVG content
      fabric.loadSVGFromString(content, (objects: fabric.Object[], options: Record<string, any>) => {
        const svgGroup = new fabric.Group(objects);
        
        // Scale to fit canvas
        const scaling = Math.min(
          (canvas.width || 800) / (svgGroup.width || 100),
          (canvas.height || 600) / (svgGroup.height || 100)
        ) * 0.9;
        
        svgGroup.scale(scaling);
        
        // Center the SVG
        svgGroup.center();
        
        // Add to canvas
        canvas.add(svgGroup);
        canvas.renderAll();
        
        // Save initial state to history
        saveToHistory();
      });
    }
  };
  
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
  
  // Save the current state
  const handleSave = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    try {
      // Convert to SVG with proper scaling options
      const svgOptions = {
        width: canvas.width || 800,
        height: canvas.height || 600,
        viewBox: {
          x: 0,
          y: 0,
          width: canvas.width || 800,
          height: canvas.height || 600
        },
        encoding: 'base64'
      };
      
      const svgData = canvas.toSVG(svgOptions);
      
      // Ensure SVG has a white background
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgData, 'image/svg+xml');
      const svgElement = svgDoc.documentElement;
      
      // Add a white background rect if one doesn't already exist
      const existingBg = svgElement.querySelector('rect[width="100%"][height="100%"][fill="white"]');
      if (!existingBg) {
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('width', '100%');
        bgRect.setAttribute('height', '100%');
        bgRect.setAttribute('fill', 'white');
        svgElement.insertBefore(bgRect, svgElement.firstChild);
      }
      
      // Serialize back to string
      const serializer = new XMLSerializer();
      const finalSvgString = serializer.serializeToString(svgElement);
      
      // Create a data URL
      const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(finalSvgString)))}`;
      
      console.log('Saving SVG, content length:', finalSvgString.length);
      console.log('Data URL starts with:', svgDataUrl.substring(0, 30) + '...');
      
      // Call the onSave callback with the SVG data URL
      onSave(svgDataUrl);
    } catch (error) {
      console.error('Error saving SVG:', error);
      alert('Failed to save the concept map. Please try again.');
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