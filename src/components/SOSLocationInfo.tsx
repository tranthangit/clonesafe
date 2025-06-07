import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';

interface SOSLocationInfoProps {
  latitude: number;
  longitude: number;
  address?: string;
}

const SOSLocationInfo: React.FC<SOSLocationInfoProps> = ({
  latitude,
  longitude,
  address
}) => {
  const [distance, setDistance] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          setUserLocation({ lat: userLat, lng: userLng });
          
          // Calculate distance using Haversine formula
          const R = 6371; // Earth's radius in kilometers
          const dLat = (latitude - userLat) * Math.PI / 180;
          const dLng = (longitude - userLng) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(userLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distanceInKm = R * c;
          
          setDistance(distanceInKm);
          console.log('Distance calculated:', distanceInKm, 'km');
        },
        (error) => {
          console.error('Error getting user location:', error);
          setLocationError('Không thể lấy vị trí hiện tại');
        }
      );
    } else {
      setLocationError('Trình duyệt không hỗ trợ định vị');
    }
  }, [latitude, longitude]);

  const formatDistance = (dist: number) => {
    if (dist < 1) {
      return `${Math.round(dist * 1000)}m`;
    }
    return `${dist.toFixed(1)}km`;
  };

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const openInAppleMaps = () => {
    const url = `maps://?daddr=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Tọa độ:</span>
        <span className="font-mono text-sm">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
      </div>
      
      {locationError ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Khoảng cách:</span>
          <span className="text-sm text-red-500">{locationError}</span>
        </div>
      ) : distance !== null ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Khoảng cách:</span>
          <span className="font-medium text-sm text-blue-600 flex items-center">
            <Navigation className="w-3 h-3 mr-1" /> 
            {formatDistance(distance)}
          </span>
        </div>
      ) : null}

      {address && (
        <div className="flex flex-col">
          <span className="text-sm text-gray-600">Địa chỉ chi tiết:</span>
          <span className="text-sm font-medium">{address}</span>
        </div>
      )}

      <div className="pt-2 border-t flex flex-row gap-2">
        <Button onClick={openInGoogleMaps} className="w-1/2 min-w-0 bg-blue-600 hover:bg-blue-700 flex items-center justify-center">
          <MapPin className="w-4 h-4 mr-2" />Mở Google Maps
        </Button>
        <Button onClick={openInAppleMaps} className="w-1/2 min-w-0 bg-gray-700 hover:bg-gray-800 text-white flex items-center justify-center">
          <MapPin className="w-4 h-4 mr-2" /> Mở Apple Maps 
        </Button>
      </div>

    </div>
  );
};

export default SOSLocationInfo;
