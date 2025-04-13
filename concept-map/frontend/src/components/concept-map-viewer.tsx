import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { TLDrawEditor } from './tldraw-editor';
import { FabricEditor } from './fabric-editor/fabric-editor';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Download, 
  Palette, 
  Edit, 
  Move, 
  X, 
  PanelTop
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { ConceptMapImage } from './concept-map-image';

interface ConceptMapViewerProps {
  svgContent: string;
  onSave?: (newSvgContent: string) => void;
}

export function ConceptMapViewer({ svgContent, onSave }: ConceptMapViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [nodeEditText, setNodeEditText] = useState('');
  const [showEditInput, setShowEditInput] = useState(false);
  const [editPosition, setEditPosition] = useState({ x: 0, y: 0 });
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [styleSettings, setStyleSettings] = useState({
    nodeColor: '#F5F5F5',
    edgeColor: '#555555',
    fontFamily: 'Arial',
    fontSize: '12px'
  });
  
  const svgRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  
  // Check if the content is a base64 encoded image
  const isBase64Image = svgContent.startsWith('data:image');
  // Check if the content is SVG
  const isSvgContent = svgContent.trim().startsWith('<svg') || svgContent.includes('<?xml');

  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<string | null>(null);
  
  const handleSvgLoaded = (element: SVGSVGElement) => {
    setSvgElement(element);
    // Initialize event listeners for the SVG elements if needed
    initializeSvgInteractions(element);
  };
  
  const initializeSvgInteractions = (svg: SVGSVGElement) => {
    // Find nodes and edges in the SVG
    const nodes = svg.querySelectorAll('.node, .concept, circle, ellipse, rect:not([width="100%"])');
    const edges = svg.querySelectorAll('.edge, path, line');
    
    // Add event listeners to nodes
    nodes.forEach(node => {
      // Clean up any existing listeners first
      node.removeEventListener('click', nodeClickHandler);
      node.removeEventListener('dblclick', nodeDoubleClickHandler);
      
      // Add new listeners
      node.addEventListener('click', nodeClickHandler);
      node.addEventListener('dblclick', nodeDoubleClickHandler);
    });
    
    // Add event listeners to edges
    edges.forEach(edge => {
      edge.removeEventListener('mouseenter', edgeMouseEnterHandler);
      edge.removeEventListener('mouseleave', edgeMouseLeaveHandler);
      
      edge.addEventListener('mouseenter', edgeMouseEnterHandler);
      edge.addEventListener('mouseleave', edgeMouseLeaveHandler);
    });
  };
  
  const nodeClickHandler = (e: Event) => {
    const target = e.currentTarget as Element;
    setActiveNode(target.id || null);
  };
  
  const nodeDoubleClickHandler = (e: Event) => {
    const target = e.currentTarget as Element;
    if (target) {
      handleNodeDoubleClick(e as unknown as MouseEvent, target);
    }
  };
  
  const edgeMouseEnterHandler = (e: Event) => {
    const target = e.currentTarget as Element;
    setHoveredEdge(target.id || null);
  };
  
  const edgeMouseLeaveHandler = () => {
    setHoveredEdge(null);
  };

  const handleSave = (newSvgContent: string) => {
    console.log('ConceptMapViewer: Saving new SVG content, type:', typeof newSvgContent);
    console.log('ConceptMapViewer: Content preview:', newSvgContent.substring(0, 50) + '...');
    console.log('ConceptMapViewer: Content length:', newSvgContent.length);
    
    try {
      // If it's a data URL, pass it directly
      if (newSvgContent.startsWith('data:')) {
        console.log('ConceptMapViewer: Passing data URL directly to parent');
        onSave?.(newSvgContent);
      }
      // If it's raw SVG content, convert it to a data URL
      else if (newSvgContent.startsWith('<svg') || newSvgContent.includes('<?xml')) {
        try {
          console.log('ConceptMapViewer: Converting raw SVG to data URL');
          const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(newSvgContent)))}`;
          console.log('ConceptMapViewer: Successfully converted SVG to data URL');
          onSave?.(dataUrl);
        } catch (error) {
          console.error('ConceptMapViewer: Error converting SVG to data URL:', error);
          // Fallback to raw content
          console.log('ConceptMapViewer: Falling back to raw SVG content');
          onSave?.(newSvgContent);
        }
      }
      // Any other format, just pass it through
      else {
        console.log('ConceptMapViewer: Passing content through as-is');
        onSave?.(newSvgContent);
      }
      
      setIsEditing(false);
      toast.success('Concept map saved successfully');
    } catch (error) {
      console.error('ConceptMapViewer: Error in handleSave:', error);
      toast.error('Failed to process map data for saving');
    }
  };

  // Export current SVG/image as a background image for TLDraw
  const prepareContentForEditing = () => {
    // If it's already a base64 image, we can use it directly
    if (isBase64Image) {
      return svgContent;
    }
    
    // If it's SVG, convert it to a data URL
    if (isSvgContent && svgRef.current) {
      const svgElement = svgRef.current.querySelector('svg');
      if (svgElement) {
        try {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          return 'data:image/svg+xml;base64,' + btoa(svgData);
        } catch (error) {
          console.error('Error converting SVG to data URL:', error);
        }
      }
    }
    
    // Return null if we couldn't prepare content
    return null;
  };

  useEffect(() => {
    if (isSvgContent && svgRef.current) {
      // Add event listeners to nodes for interactivity
      const nodes = svgRef.current.querySelectorAll('.node');
      const edges = svgRef.current.querySelectorAll('.edge');
      
      nodes.forEach(node => {
        // Double click to edit
        node.addEventListener('dblclick', (e: Event) => handleNodeDoubleClick(e as MouseEvent, node));
        
        // Toggle expansion/collapse
        node.addEventListener('click', () => toggleNodeExpansion(node));
      });
      
      // Add hover effect to edges
      edges.forEach(edge => {
        edge.addEventListener('mouseenter', () => setHoveredEdge(edge.id));
        edge.addEventListener('mouseleave', () => setHoveredEdge(null));
      });
    }
    
    // Cleanup listeners
    return () => {
      if (svgRef.current) {
        const nodes = svgRef.current.querySelectorAll('.node');
        const edges = svgRef.current.querySelectorAll('.edge');
        
        nodes.forEach(node => {
          node.removeEventListener('dblclick', (e: Event) => handleNodeDoubleClick(e as MouseEvent, node));
          node.removeEventListener('click', () => toggleNodeExpansion(node));
        });
        
        edges.forEach(edge => {
          edge.removeEventListener('mouseenter', () => setHoveredEdge(edge.id));
          edge.removeEventListener('mouseleave', () => setHoveredEdge(null));
        });
      }
    };
  }, [svgContent, svgRef.current]);
  
  useEffect(() => {
    // Focus input when editing
    if (showEditInput && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [showEditInput]);
  
  useEffect(() => {
    // Apply hover effect to edges
    if (hoveredEdge && svgRef.current) {
      const edge = svgRef.current.querySelector(`#${hoveredEdge}`);
      if (edge) {
        edge.setAttribute('stroke-width', '2.5');
        edge.setAttribute('stroke', '#3b82f6');
      }
    }
    
    // Reset previous hover effects
    return () => {
      if (hoveredEdge && svgRef.current) {
        const edge = svgRef.current.querySelector(`#${hoveredEdge}`);
        if (edge) {
          edge.setAttribute('stroke-width', '1.0');
          edge.setAttribute('stroke', styleSettings.edgeColor);
        }
      }
    };
  }, [hoveredEdge]);
  
  const handleNodeDoubleClick = (e: MouseEvent, node: Element) => {
    const nodeId = node.id;
    const textElement = node.querySelector('text');
    
    if (textElement) {
      setActiveNode(nodeId);
      setNodeEditText(textElement.textContent || '');
      setShowEditInput(true);
      
      // Position the edit input near the node
      const rect = node.getBoundingClientRect();
      const containerRect = svgRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      
      setEditPosition({
        x: rect.left - containerRect.left + 10,
        y: rect.top - containerRect.top + 10
      });
    }
  };
  
  const handleEditSave = () => {
    if (activeNode && svgRef.current && nodeEditText.trim()) {
      const node = svgRef.current.querySelector(`#${activeNode}`);
      const textElement = node?.querySelector('text');
      
      if (textElement) {
        textElement.textContent = nodeEditText;
        
        // Update the SVG content that would be saved
        if (onSave && svgRef.current.innerHTML) {
          const updatedSvgContent = svgRef.current.innerHTML;
          // Note: In a real implementation, we'd need a better way to maintain the full SVG structure
        }
        
        toast.success('Node updated');
      }
    }
    
    setShowEditInput(false);
    setActiveNode(null);
  };
  
  const toggleNodeExpansion = (node: Element) => {
    // In a real implementation, this would find child nodes and toggle their visibility
    const nodeId = node.id;
    
    // This is a simplified example - in reality, you'd need to:
    // 1. Identify all child nodes connected to this node
    // 2. Toggle their visibility with CSS or by modifying the SVG
    
    // For demonstration, we'll just highlight the clicked node
    node.setAttribute('fill', node.getAttribute('fill') === '#f0f9ff' ? '#F5F5F5' : '#f0f9ff');
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: position.x + e.movementX,
        y: position.y + e.movementY
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2.5));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };
  
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };
  
  const handleExport = (format: string) => {
    setIsExporting(true);
    setExportFormat(format);
    
    // Wrap in setTimeout to allow UI to update before potentially expensive operations
    setTimeout(() => {
      try {
        // Check if we have a reference to the SVG element from the callback
        let exportSvgElement: SVGSVGElement | null = null;
        
        if (svgElement) {
          // Use the SVG element from the callback if available
          exportSvgElement = svgElement;
        } else if (svgRef.current) {
          // Fall back to querySelector if needed
          exportSvgElement = svgRef.current.querySelector('svg');
        }
        
        // If we're dealing with an image (data URL), extract it differently
        if (!exportSvgElement && isBase64Image && svgRef.current) {
          const imgElement = svgRef.current.querySelector('img');
          if (imgElement && imgElement.src) {
            if (format === 'png' || format === 'svg') {
              // For image URLs, we can directly download them
              downloadFile(imgElement.src, `concept-map.${format === 'svg' ? 'svg' : 'png'}`);
              toast.success(`Exported concept map as ${format.toUpperCase()}`);
              setIsExporting(false);
              setExportFormat(null);
              return;
            }
          }
        }
        
        if (!exportSvgElement) {
          toast.error("Unable to export: SVG content not found");
          setIsExporting(false);
          setExportFormat(null);
          return;
        }
        
        if (format === 'svg') {
          // Export as SVG
          const svgData = new XMLSerializer().serializeToString(exportSvgElement);
          const blob = new Blob([svgData], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          downloadFile(url, 'concept-map.svg');
        } 
        else if (format === 'png') {
          // Convert SVG to PNG using canvas
          const svgData = new XMLSerializer().serializeToString(exportSvgElement);
          const img = new Image();
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Add error handling for image loading
          img.onerror = () => {
            toast.error("Error generating PNG: Failed to load SVG");
            setIsExporting(false);
            setExportFormat(null);
          };
          
          img.onload = () => {
            try {
              canvas.width = img.width || 800;
              canvas.height = img.height || 600;
              
              if (ctx) {
                // Fill with white background to avoid transparency issues
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                
                const pngUrl = canvas.toDataURL('image/png');
                downloadFile(pngUrl, 'concept-map.png');
                toast.success(`Exported concept map as PNG`);
              } else {
                toast.error("Error generating PNG: Canvas context unavailable");
              }
            } catch (error) {
              console.error("Error generating PNG:", error);
              toast.error("Error generating PNG");
            } finally {
              setIsExporting(false);
              setExportFormat(null);
            }
          };
          
          // Convert SVG to data URL with proper encoding
          try {
            const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
            const url = URL.createObjectURL(svgBlob);
            img.src = url;
            
            // Safety timeout - in case onload never fires
            setTimeout(() => {
              if (isExporting && exportFormat === 'png') {
                setIsExporting(false);
                setExportFormat(null);
                toast.error("PNG export timed out");
              }
            }, 5000);
          } catch (error) {
            console.error("Error encoding SVG:", error);
            toast.error("Error encoding SVG for PNG export");
            setIsExporting(false);
            setExportFormat(null);
          }
          
          // For PNG we return early since the actual download happens in the onload callback
          return;
        } 
        else if (format === 'json') {
          try {
            // For JSON export, we'd need to have the structured data
            // Find nodes and edges with more flexibility in selectors
            const potentialNodes = Array.from(
              exportSvgElement.querySelectorAll('.node, .concept, circle, ellipse, rect:not([width="100%"])')
            );
            
            const potentialEdges = Array.from(
              exportSvgElement.querySelectorAll('.edge, path, line')
            );
            
            // Map to a more structured format
            const jsonData = JSON.stringify({
              nodes: potentialNodes.map((node: Element, index) => ({
                id: node.id || `node-${index}`,
                label: node.querySelector('text')?.textContent || 
                      node.getAttribute('title') || 
                      node.getAttribute('data-label') || 
                      `Node ${index + 1}`
              })),
              edges: potentialEdges.map((edge: Element, index) => ({
                id: edge.id || `edge-${index}`,
                source: edge.getAttribute('source') || edge.getAttribute('data-source'),
                target: edge.getAttribute('target') || edge.getAttribute('data-target'),
                label: edge.getAttribute('label') || edge.getAttribute('data-label') || ''
              }))
            }, null, 2); // Pretty print with 2 spaces
            
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            downloadFile(url, 'concept-map.json');
          } catch (error) {
            console.error("Error generating JSON:", error);
            toast.error("Error generating JSON export");
          }
        }
        
        // For svg and json formats, success is reported here
        // PNG reports its own success in the onload handler
        if (format !== 'png') {
          toast.success(`Exported concept map as ${format.toUpperCase()}`);
        }
      } catch (error) {
        console.error(`Error exporting as ${format}:`, error);
        toast.error(`Failed to export as ${format}`);
      } finally {
        if (format !== 'png') { // PNG handles its own state cleanup
          setIsExporting(false);
          setExportFormat(null);
        }
      }
    }, 50);
  };
  
  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const applyCustomStyle = () => {
    if (!svgRef.current) return;
    
    // Apply styles to nodes
    const nodes = svgRef.current.querySelectorAll('.node');
    nodes.forEach(node => {
      node.setAttribute('fill', styleSettings.nodeColor);
      const textElement = node.querySelector('text');
      if (textElement) {
        textElement.setAttribute('font-family', styleSettings.fontFamily);
        textElement.setAttribute('font-size', styleSettings.fontSize);
      }
    });
    
    // Apply styles to edges
    const edges = svgRef.current.querySelectorAll('.edge');
    edges.forEach(edge => {
      if (edge.id !== hoveredEdge) {
        edge.setAttribute('stroke', styleSettings.edgeColor);
      }
    });
    
    toast.success('Styling applied');
  };

  if (isEditing) {
    // When editing, we'll use the Fabric.js editor for better SVG manipulation
    return (
      <div className="w-full h-[600px] relative">
        {/* Return to viewing mode button */}
        <div className="absolute bottom-2 left-2 z-50">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
            Back to View
          </Button>
        </div>
        
        <FabricEditor 
          svgContent={svgContent}
          onSave={handleSave}
          className="h-full" 
        />
      </div>
    );
  }

  // Control panel as an overlay
  const controlPanel = (
    <div className={`absolute top-2 ${controlsCollapsed ? 'right-2' : 'left-1/2 transform -translate-x-1/2'} z-50 transition-all duration-200`}>
      <div className="bg-white/90 backdrop-blur-sm shadow-md rounded-lg px-2 py-1 flex items-center gap-1 border border-gray-200">
        {/* Toggle for expanded/collapsed controls */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setControlsCollapsed(!controlsCollapsed)}>
          <PanelTop className="h-4 w-4" />
        </Button>
        
        {!controlsCollapsed && (
          <>
            {/* Zoom Controls */}
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleResetZoom}>
              <Maximize className="h-4 w-4" />
            </Button>
            
            {/* Toggle Drag Mode */}
            <Button 
              variant={isDragging ? "default" : "outline"} 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setIsDragging(!isDragging)}
            >
              <Move className="h-4 w-4" />
            </Button>
            
            {/* Custom Styling */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h4 className="font-medium">Customize Appearance</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nodeColor">Node Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="nodeColor" 
                        type="color" 
                        className="w-12 h-8 p-1"
                        value={styleSettings.nodeColor}
                        onChange={(e) => setStyleSettings({...styleSettings, nodeColor: e.target.value})}
                      />
                      <Input 
                        type="text" 
                        value={styleSettings.nodeColor}
                        onChange={(e) => setStyleSettings({...styleSettings, nodeColor: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edgeColor">Edge Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="edgeColor" 
                        type="color" 
                        className="w-12 h-8 p-1"
                        value={styleSettings.edgeColor}
                        onChange={(e) => setStyleSettings({...styleSettings, edgeColor: e.target.value})}
                      />
                      <Input 
                        type="text" 
                        value={styleSettings.edgeColor}
                        onChange={(e) => setStyleSettings({...styleSettings, edgeColor: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fontFamily">Font Family</Label>
                    <Select 
                      value={styleSettings.fontFamily}
                      onValueChange={(value) => setStyleSettings({...styleSettings, fontFamily: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Courier New">Courier New</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fontSize">Font Size</Label>
                    <Select 
                      value={styleSettings.fontSize}
                      onValueChange={(value) => setStyleSettings({...styleSettings, fontSize: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10px">Small</SelectItem>
                        <SelectItem value="12px">Medium</SelectItem>
                        <SelectItem value="14px">Large</SelectItem>
                        <SelectItem value="16px">X-Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button onClick={applyCustomStyle}>Apply Styling</Button>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Export Options */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-2">
                  <h4 className="font-medium mb-2">Export Format</h4>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="default" 
                      className="justify-center"
                      onClick={() => handleExport('svg')}
                      disabled={isExporting}
                    >
                      {isExporting && exportFormat === 'svg' ? (
                        <span className="flex items-center">
                          <span className="animate-spin mr-2">↻</span> Exporting SVG...
                        </span>
                      ) : 'SVG'}
                    </Button>
                    <Button 
                      variant="default" 
                      className="justify-center"
                      onClick={() => handleExport('png')}
                      disabled={isExporting}
                    >
                      {isExporting && exportFormat === 'png' ? (
                        <span className="flex items-center">
                          <span className="animate-spin mr-2">↻</span> Exporting PNG...
                        </span>
                      ) : 'PNG'}
                    </Button>
                    <Button 
                      variant="default" 
                      className="justify-center"
                      onClick={() => handleExport('json')}
                      disabled={isExporting}
                    >
                      {isExporting && exportFormat === 'json' ? (
                        <span className="flex items-center">
                          <span className="animate-spin mr-2">↻</span> Exporting JSON...
                        </span>
                      ) : 'JSON'}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Edit Button */}
            {onSave && (
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
  
  // In-place editing overlay
  const editingOverlay = showEditInput && (
    <div 
      className="absolute bg-white border shadow-md p-2 rounded-md flex"
      style={{ 
        left: `${editPosition.x}px`, 
        top: `${editPosition.y}px`,
        zIndex: 50 
      }}
    >
      <Input 
        ref={editInputRef}
        value={nodeEditText}
        onChange={(e) => setNodeEditText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
        className="min-w-[150px]"
      />
      <Button variant="ghost" size="icon" className="ml-1" onClick={handleEditSave}>
        <div className="sr-only">Save</div>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="ml-1" onClick={() => setShowEditInput(false)}>
        <div className="sr-only">Cancel</div>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  if (isBase64Image || isSvgContent) {
    return (
      <div className="w-full h-[600px] overflow-hidden p-4 flex flex-col relative">
        {controlPanel}
        <div 
          ref={svgRef}
          className="flex-1 relative flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            overflow: 'hidden'
          }}
        >
          <ConceptMapImage 
            svgContent={svgContent}
            alt="Concept Map"
            onSvgLoaded={handleSvgLoaded}
            style={{ 
              transform: `scale(${zoomLevel}) translate(${position.x}px, ${position.y}px)`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          />
        </div>
        {editingOverlay}
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