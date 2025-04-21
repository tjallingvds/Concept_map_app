import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Pencil, Download, Share2, Star, StarOff, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { MapItem } from './file-system';
import { toast } from 'sonner';

interface MapItemActionsProps {
  map: MapItem;
  onDelete?: () => void;
  onShare?: () => void;
  onFavorite?: () => void;
  onDownload?: () => void;
}

export function MapItemActions({ map, onDelete, onShare, onFavorite, onDownload }: MapItemActionsProps) {
  const navigate = useNavigate();
  
  const handleEdit = () => {
    if (map.format === 'handdrawn') {
      // For hand-drawn whiteboards, navigate to the whiteboard editor
      navigate(`/whiteboard-editor/${map.id}`);
    } else {
      // For regular concept maps, navigate to the concept map editor
      navigate(`/editor/${map.id}`);
    }
  };
  
  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleEdit} 
        title={map.format === 'handdrawn' ? 'Edit Whiteboard' : 'Edit Concept Map'}
      >
        {map.format === 'handdrawn' ? <Pencil className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
        <span className="ml-2">Edit</span>
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onShare && (
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" />
              <span>Share</span>
            </DropdownMenuItem>
          )}
          
          {onDownload && (
            <DropdownMenuItem onClick={onDownload}>
              <Download className="mr-2 h-4 w-4" />
              <span>Download</span>
            </DropdownMenuItem>
          )}
          
          {onFavorite && (
            <DropdownMenuItem onClick={onFavorite}>
              {map.isFavorite ? (
                <>
                  <StarOff className="mr-2 h-4 w-4" />
                  <span>Remove from favorites</span>
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  <span>Add to favorites</span>
                </>
              )}
            </DropdownMenuItem>
          )}
          
          {onDelete && (
            <DropdownMenuItem 
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 