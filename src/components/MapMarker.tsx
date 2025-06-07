
import React, { useEffect, useState } from 'react';

interface MapMarkerProps {
  map: google.maps.Map;
  position: { lat: number; lng: number };
  title: string;
  icon?: string;
  onClick?: () => void;
}

const MapMarker: React.FC<MapMarkerProps> = ({ 
  map, 
  position, 
  title, 
  icon,
  onClick 
}) => {
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    const newMarker = new google.maps.Marker({
      position,
      map,
      title,
      icon: icon || undefined,
    });

    if (onClick) {
      newMarker.addListener('click', onClick);
    }

    setMarker(newMarker);

    return () => {
      newMarker.setMap(null);
    };
  }, [map, position, title, icon, onClick]);

  return null;
};

export default MapMarker;
