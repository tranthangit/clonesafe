import React, { useEffect } from 'react';
import { useIsXS } from '@/hooks/use-mobile';
import goongjs from '@goongmaps/goong-js';

interface MapControlsProps {
  map: goongjs.Map | null;
}

const MapControls: React.FC<MapControlsProps> = ({ map }) => {
  const isXS = useIsXS();

  useEffect(() => {
    if (map) {
      // Add geolocate control
      const geolocateControl = new goongjs.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      });

      map.addControl(geolocateControl, 'top-right');

      // Auto trigger geolocation immediately when map is ready
      const triggerGeolocate = () => {
        try {
          geolocateControl.trigger();
        } catch (error) {
          console.log('Geolocate trigger failed:', error);
        }
      };

      // If map is already loaded, trigger immediately
      if (map.isStyleLoaded()) {
        setTimeout(triggerGeolocate, 500);
      } else {
        // Otherwise wait for map to load
        map.on('load', () => {
          setTimeout(triggerGeolocate, 500);
        });
      }

      return () => {
        map.removeControl(geolocateControl);
      };
    }
  }, [map]);

  return null;
};

export default MapControls;