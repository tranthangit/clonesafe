
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface GoogleMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  onMapLoad?: (map: google.maps.Map) => void;
  children?: React.ReactNode;
  googleMapsApiKey: string;
}

const GoogleMap: React.FC<GoogleMapProps> = ({ 
  center, 
  zoom, 
  onMapLoad, 
  children,
  googleMapsApiKey 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!googleMapsApiKey) {
      console.error('Google Maps API key is missing');
      return;
    }

    const loader = new Loader({
      apiKey: googleMapsApiKey,
      version: 'weekly',
      libraries: ['places'],
      region: 'VN',
      language: 'vi'
    });

    loader.load().then(() => {
      if (mapRef.current) {
        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_RIGHT,
            mapTypeIds: [
              google.maps.MapTypeId.ROADMAP,
              google.maps.MapTypeId.SATELLITE,
              google.maps.MapTypeId.HYBRID,
              google.maps.MapTypeId.TERRAIN
            ]
          },
          streetViewControl: true,
          streetViewControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
          },
          fullscreenControl: false,
          zoomControl: false,
          scaleControl: false,
          rotateControl: false,
          gestureHandling: 'greedy',
          clickableIcons: true,
          restriction: {
            latLngBounds: {
              north: 23.5,
              south: 8.0,
              west: 102.0,
              east: 110.0
            },
            strictBounds: false
          },
          styles: [
            {
              featureType: 'poi.business',
              elementType: 'labels',
              stylers: [{ visibility: 'simplified' }]
            },
            {
              featureType: 'poi.park',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }]
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ visibility: 'simplified' }]
            }
          ]
        });

        setMap(mapInstance);
        setIsLoaded(true);
        onMapLoad?.(mapInstance);

        const resizeListener = () => {
          google.maps.event.trigger(mapInstance, 'resize');
          mapInstance.setCenter(center);
        };

        window.addEventListener('resize', resizeListener);
        
        return () => {
          window.removeEventListener('resize', resizeListener);
        };
      }
    }).catch(error => {
      console.error('Error loading Google Maps:', error);
    });
  }, [googleMapsApiKey, center, zoom, onMapLoad]);

  useEffect(() => {
    if (map && center) {
      map.setCenter(center);
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

export default GoogleMap;
