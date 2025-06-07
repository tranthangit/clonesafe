import React, { useEffect, useState, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import goongjs from '@goongmaps/goong-js';

interface GoongMapMarkerProps {
  map: goongjs.Map;
  position: { lat: number; lng: number };
  title: string;
  color?: string; // Used if no children are provided
  onClick?: () => void;
  children?: ReactNode; // For custom marker elements
}

const GoongMapMarker: React.FC<GoongMapMarkerProps> = ({ 
  map, 
  position, 
  title, 
  color = '#FF0000', // Default color if no children
  onClick,
  children
}) => {
  const [marker, setMarker] = useState<goongjs.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    let markerElement: HTMLElement;

    if (children) {
      markerElement = document.createElement('div');
      // Ensure the container itself doesn't add extra layout shifts if children have specific sizing
      markerElement.style.lineHeight = '0'; // Avoids potential extra space from line height
      const root = createRoot(markerElement);
      root.render(<>{children}</>); // Render children into the div
      if (onClick) {
        markerElement.addEventListener('click', onClick);
      }
      // Apply title to the custom element if needed, or ensure children handle it
      markerElement.title = title; 
    } else {
      // Fallback to default colored circle marker
      markerElement = document.createElement('div');
      markerElement.className = 'marker'; // You can add default styling via CSS if needed
      markerElement.style.backgroundColor = color;
      markerElement.style.width = '20px';
      markerElement.style.height = '20px';
      markerElement.style.borderRadius = '50%';
      markerElement.style.border = '2px solid white';
      markerElement.style.cursor = 'pointer';
      markerElement.title = title;
      if (onClick) {
        markerElement.addEventListener('click', onClick);
      }
    }

    const newMarker = new goongjs.Marker(markerElement)
      .setLngLat([position.lng, position.lat])
      .addTo(map);

    setMarker(newMarker);

    return () => {
      if (newMarker) {
        newMarker.remove();
      }
    };
  }, [map, position, title, color, onClick]);

  return null;
};

export default GoongMapMarker;
