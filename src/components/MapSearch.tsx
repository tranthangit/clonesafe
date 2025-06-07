
import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Navigation } from 'lucide-react';

interface MapSearchProps {
  map: google.maps.Map | null;
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
}

const MapSearch: React.FC<MapSearchProps> = ({ map, onLocationSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!map || !inputRef.current) return;

    // Initialize Places Autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['geometry', 'formatted_address', 'name'],
      componentRestrictions: { country: 'vn' } // Restrict to Vietnam
    });

    const autocomplete = autocompleteRef.current;
    autocomplete.bindTo('bounds', map);

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) return;

      const location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: place.formatted_address || place.name || 'Unknown location'
      };

      onLocationSelect(location);
      map.setCenter(location);
      map.setZoom(17);
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [map, onLocationSelect]);

  const handleMyLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: 'Vị trí hiện tại'
        };
        onLocationSelect(location);
        if (map) {
          map.setCenter(location);
          map.setZoom(17);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-30 flex gap-2">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          placeholder="Tìm kiếm địa điểm..."
          className="pl-10 bg-white shadow-md border-gray-200"
        />
      </div>
    </div>
  );
};

export default MapSearch;
