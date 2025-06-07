
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GoogleMapsApiKeyInputProps {
  onApiKeySubmit: (apiKey: string) => void;
}

const GoogleMapsApiKeyInput: React.FC<GoogleMapsApiKeyInputProps> = ({ onApiKeySubmit }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('googleMapsApiKey', apiKey.trim());
      onApiKeySubmit(apiKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Cần Google Maps API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="apiKey">Google Maps API Key</Label>
              <Input
                id="apiKey"
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Nhập Google Maps API Key của bạn"
                required
              />
              <p className="text-sm text-gray-600 mt-2">
                Bạn có thể lấy API key tại{' '}
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google Cloud Console
                </a>
              </p>
            </div>
            <Button type="submit" className="w-full">
              Xác nhận
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleMapsApiKeyInput;
