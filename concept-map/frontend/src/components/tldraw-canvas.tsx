import React from 'react';
import { 
  Tldraw, 
  createTLStore,
  TLComponents
} from 'tldraw';
import 'tldraw/tldraw.css';

interface TLDrawCanvasProps {
  className?: string;
}

export function TLDrawCanvas({ className = '' }: TLDrawCanvasProps) {
  // Create a new store
  const store = React.useMemo(() => {
    return createTLStore();
  }, []);

  // Custom components to add to the UI
  const components = React.useMemo<TLComponents>(() => {
    return {}
  }, []);

  return (
    <div className={`w-full h-[600px] ${className}`}>
      <Tldraw
        store={store}
        components={components}
        autoFocus
      />
    </div>
  );
} 