import React, { useEffect, useRef, useState } from 'react';
import goongjs from '@goongmaps/goong-js';
import '@goongmaps/goong-js/dist/goong-js.css';

interface GoongMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  onMapLoad?: (map: goongjs.Map) => void;
  children?: React.ReactNode;
  goongMapsApiKey: string;
}

const GoongMap: React.FC<GoongMapProps> = ({ 
  center, 
  zoom, 
  onMapLoad, 
  children,
  goongMapsApiKey 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<goongjs.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!goongMapsApiKey) {
      console.error('Goong Maps API key is missing');
      return;
    }

    if (mapRef.current) {
      // Set access token
      goongjs.accessToken = goongMapsApiKey;
      
      // Initialize map
      const mapInstance = new goongjs.Map({
        container: mapRef.current,
        style: 'https://tiles.goong.io/assets/goong_map_web.json',
        center: [center.lng, center.lat],
        zoom: zoom
      });

      mapInstance.on('load', () => {
        setMap(mapInstance);
        setIsLoaded(true);
        onMapLoad?.(mapInstance);
      });

      // Add only navigation controls (removed GeolocateControl)
      mapInstance.addControl(new goongjs.NavigationControl());

      return () => {
        mapInstance.remove();
      };
    }
  }, [goongMapsApiKey, center, zoom, onMapLoad]);

  useEffect(() => {
    if (map && center) {
      map.setCenter([center.lng, center.lat]);
    }
  }, [map, center]);

  useEffect(() => {
    if (map && zoom) {
      map.setZoom(zoom);
    }
  }, [map, zoom]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div 
        ref={mapRef} 
        className="absolute inset-0 w-full h-full"
        style={{ minHeight: '100%' }}
      />
      {isLoaded && map && children}
    </div>
  );
};

export default GoongMap;