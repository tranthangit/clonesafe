import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  MapPin, 
  Loader2, 
  MessageCircle, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Image, 
  Navigation, 
  Shield, 
  PhoneCall, 
  HeartHandshake, 
  ChevronLeft, 
  ChevronRight,
  Download // Added Download icon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile, useIsXS } from '@/hooks/use-mobile';
import GoongMap from '@/components/GoongMap';
import GoongMapMarker from '@/components/GoongMapMarker';
import MapControls from '@/components/MapControls';
import ChatWindow from '@/components/ChatWindow';
import RequestHistory from '@/components/RequestHistory';
import HelpHistory from '@/components/HelpHistory';
import ImageUpload from '@/components/ImageUpload';
import SOSLocationInfo from '@/components/SOSLocationInfo';
import GoongMapSearch from '@/components/GoongMapSearch';
import { useGoongMapsApiKey } from '@/hooks/useGoongMapsApiKey';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';

interface SOSRequest {
  id: string;
  type: string;
  description: string;
  urgency: string | null;
  people_affected: number | null;
  latitude: number;
  longitude: number;
  status: string | null;
  user_id: string;
  helper_id: string | null;
  created_at: string | null;
  completed_at?: string | null;
  manual_address?: string;
  images?: string[] | null;
  profiles: {
    name: string;
  };
  helper_profile?: { name: string; } | null;
}

interface SupportPoint {
  id: string;
  name: string;
  type: string;
  description: string | null;
  operating_hours: string | null;
  contact_info: { phone?: string; [key: string]: any; } | null;
  is_verified: boolean | null;
  latitude: number;
  longitude: number;
  is_active: boolean | null;
  address?: string | null;
}

interface HelpOffer {
  id: string;
  volunteer_id: string;
  status: string;
  message?: string;
  created_at: string;
  profiles: {
    name: string;
  };
}

interface DistanceInfo {
  distance: string;
  duration: string;
  loading: boolean;
}

const Map: React.FC = () => {
  const { profile, toggleVolunteerStatus, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isXS = useIsXS();
  const { mapsApiKey, servicesApiKey, loading: apiKeyLoading, error: apiKeyError } = useGoongMapsApiKey();
  const [sosRequests, setSOSRequests] = useState<SOSRequest[]>([]);
  const [supportPoints, setSupportPoints] = useState<SupportPoint[]>([]);
  const [map, setMap] = useState<any>(null);
  
  // Use ref to prevent unnecessary re-renders when location changes
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const locationWatchIdRef = useRef<number | null>(null);
  const lastLocationUpdateRef = useRef<number>(0);
  
  const [userActiveSOS, setUserActiveSOS] = useState<SOSRequest | null>(null);
  const [helpOffers, setHelpOffers] = useState<{ [key: string]: HelpOffer[] }>({});
  const [distanceInfo, setDistanceInfo] = useState<DistanceInfo>({ distance: '', duration: '', loading: false });

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState<{id: string, name: string, sosId?: string} | null>(null);

  const [sosForm, setSOSForm] = useState({
    type: '',
    description: '',
    urgency: '',
    people_affected: 1,
    manual_address: ''
  });

  const [sosImages, setSOSImages] = useState<string[]>([]);
  const [selectedSOS, setSelectedSOS] = useState<SOSRequest | null>(null);
  const [sosDialogOpen, setSOSDialogOpen] = useState(false);
  
  // Add support point dialog state
  const [selectedSupportPoint, setSelectedSupportPoint] = useState<SupportPoint | null>(null);

  // Throttled location update function
  const updateUserLocation = useCallback((newLocation: { lat: number; lng: number }) => {
    const now = Date.now();
    const LOCATION_UPDATE_THROTTLE = 10000;
    
    if (userLocationRef.current) {
      const distance = Math.sqrt(
        Math.pow((newLocation.lat - userLocationRef.current.lat) * 111320, 2) +
        Math.pow((newLocation.lng - userLocationRef.current.lng) * 111320 * Math.cos(newLocation.lat * Math.PI / 180), 2)
      );
      
      if (distance < 50 && now - lastLocationUpdateRef.current < LOCATION_UPDATE_THROTTLE) {
        return;
      }
    }
    
    console.log('User location updated:', newLocation);
    userLocationRef.current = newLocation;
    setUserLocation(newLocation);
    lastLocationUpdateRef.current = now;
  }, []);

  const calculateDistanceAndTime = async (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    if (!servicesApiKey) return null;

    try {
      const response = await fetch(
        `https://rsapi.goong.io/DistanceMatrix?origins=${from.lat},${from.lng}&destinations=${to.lat},${to.lng}&vehicle=car&api_key=${servicesApiKey}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch distance data');
      }

      const data = await response.json();
      
      if (data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0]) {
        const element = data.rows[0].elements[0];
        if (element.status === 'OK') {
          return {
            distance: element.distance.text,
            duration: element.duration.text
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return null;
    }
  };

  useEffect(() => {
    const updateDistanceInfo = async () => {
      if (userActiveSOS && userActiveSOS.status === 'helping' && userActiveSOS.helper_id === profile?.id && userLocation) {
        setDistanceInfo(prev => ({ ...prev, loading: true }));
        
        const result = await calculateDistanceAndTime(
          userLocation,
          { lat: Number(userActiveSOS.latitude), lng: Number(userActiveSOS.longitude) }
        );
        
        if (result) {
          setDistanceInfo({
            distance: result.distance,
            duration: result.duration,
            loading: false
          });
        } else {
          setDistanceInfo({
            distance: 'Không xác định',
            duration: 'Không xác định',
            loading: false
          });
        }
      } else {
        setDistanceInfo({ distance: '', duration: '', loading: false });
      }
    };

    updateDistanceInfo();
  }, [userActiveSOS, profile?.id, userLocation]);

  const getCurrentLocation = useCallback(() => {
    setLocationLoading(true);
    
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      const fallbackLocation = { lat: 21.0285, lng: 105.8542 };
      updateUserLocation(fallbackLocation);
      setLocationLoading(false);
      toast({
        title: "Không thể lấy vị trí",
        description: "Trình duyệt không hỗ trợ định vị. Sử dụng vị trí mặc định.",
        variant: "destructive"
      });
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('Initial user location obtained:', newLocation);
        updateUserLocation(newLocation);
        setLocationLoading(false);
        
        if (!userLocation) {
          toast({
            title: "Đã cập nhật vị trí",
            description: "Vị trí hiện tại của bạn đã được cập nhật",
          });
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = "Không thể lấy vị trí hiện tại";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Bạn đã từ chối chia sẻ vị trí. Vui lòng cho phép truy cập vị trí trong cài đặt trình duyệt.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Thông tin vị trí không khả dụng";
            break;
          case error.TIMEOUT:
            errorMessage = "Hết thởi gian chờ lấy vị trí";
            break;
        }
        
        const fallbackLocation = { lat: 21.0285, lng: 105.8542 };
        updateUserLocation(fallbackLocation);
        setLocationLoading(false);
        
        toast({
          title: "Lỗi định vị",
          description: errorMessage + ". Sử dụng vị trí mặc định.",
          variant: "destructive"
        });
      },
      options
    );
  }, [updateUserLocation, toast, userLocation]);

  const startLocationWatch = useCallback(() => {
    if (locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }

    if (!navigator.geolocation) return;

    const options = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 300000
    };

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        updateUserLocation(newLocation);
      },
      (error) => {
        console.error('Error watching location:', error);
      },
      options
    );
  }, [updateUserLocation]);

  useEffect(() => {
    console.log('Setting up location tracking...');
    
    getCurrentLocation();

    const watchTimer = setTimeout(() => {
      if (!locationLoading) {
        startLocationWatch();
      }
    }, 2000);

    return () => {
      clearTimeout(watchTimer);
      if (locationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    fetchSOSRequests();
    fetchSupportPoints();
    if (profile) {
      fetchUserActiveSOS();
    }
  }, [profile]);

  useEffect(() => {
    console.log('Setting up realtime subscription for SOS requests');
    const sosChannel = supabase
      .channel('sos-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sos_requests'
        },
        (payload) => {
          console.log('Realtime SOS update:', payload);
          fetchSOSRequests();
          if (profile) {
            fetchUserActiveSOS();
          }
        }
      )
      .subscribe();

    const helpOffersChannel = supabase
      .channel('help-offers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'help_offers'
        },
        (payload) => {
          console.log('Realtime help offers update:', payload);
          fetchHelpOffers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sosChannel);
      supabase.removeChannel(helpOffersChannel);
    };
  }, [profile]);

  const fetchSOSRequests = async () => {
    console.log('Fetching SOS requests...');
    const { data, error } = await supabase
      .from('sos_requests')
      .select(`
        *,
        profiles!sos_requests_user_id_fkey(name),
        helper_profile:profiles!sos_requests_helper_id_fkey(name)
      `)
      .in('status', ['active', 'helping'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching SOS requests:', error);
      return;
    }

    console.log('Fetched SOS requests:', data);
    setSOSRequests(data);
    
    if (data && data.length > 0) {
      fetchHelpOffers();
    }
  };

  const fetchHelpOffers = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('help_offers')
        .select(`
          *,
          profiles!help_offers_volunteer_id_fkey(name)
        `)
        .eq('status', 'pending');

      if (error) throw error;

      const offersMap: { [key: string]: HelpOffer[] } = {};
      data?.forEach(offer => {
        if (!offersMap[offer.sos_request_id]) {
          offersMap[offer.sos_request_id] = [];
        }
        offersMap[offer.sos_request_id].push({ ...offer, message: offer.message === null ? undefined : offer.message });
      });

      setHelpOffers(offersMap);
    } catch (error) {
      console.error('Error fetching help offers:', error);
    }
  };

  const fetchUserActiveSOS = async () => {
    if (!profile) return;

    console.log('Fetching user active SOS for profile:', profile.id);
    const { data, error } = await supabase
      .from('sos_requests')
      .select(`
        *,
        profiles!sos_requests_user_id_fkey(name),
        helper_profile:profiles!sos_requests_helper_id_fkey(name)
      `)
      .eq('user_id', profile.id)
      .in('status', ['active', 'helping'])
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user active SOS:', error);
      return;
    }

    console.log('User active SOS:', data);
    setUserActiveSOS(data || null);
  };

  const fetchSupportPoints = async () => {
    console.log('Fetching support points...');
    const { data, error } = await supabase
      .from('support_points')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching support points:', error);
      return;
    }

    console.log('Fetched support points:', data);

    if (data) {
      const transformedData = data.map(point => {
        let parsedContactInfo: { phone?: string; [key: string]: any; } | null = null;
        if (typeof point.contact_info === 'string') {
          try {
            parsedContactInfo = JSON.parse(point.contact_info);
          } catch (e) {
            console.error('Failed to parse contact_info for point ID ' + point.id + ':', point.contact_info, e);
            // If parsing fails, contact_info will remain null, which is allowed by the SupportPoint interface
          }
        } else if (typeof point.contact_info === 'object' && point.contact_info !== null) {
          // It's already an object, assume it fits the structure or is at least a generic object
          parsedContactInfo = point.contact_info as { phone?: string; [key: string]: any; };
        } else if (point.contact_info === null) {
          // It's already null, which is fine
          parsedContactInfo = null;
        }

        return {
          ...point,
          contact_info: parsedContactInfo,
        };
      });
      setSupportPoints(transformedData);
    } else {
      setSupportPoints([]);
    }
  };

  const handleSOSSubmit = async () => {
    if (!profile) {
      toast({
        title: "Lỗi",
        description: "Bạn cần đăng nhập để gửi yêu cầu SOS",
        variant: "destructive"
      });
      return;
    }

    if (!sosForm.type || !sosForm.description || !sosForm.urgency) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc",
        variant: "destructive"
      });
      return;
    }

    if (!userLocation) {
      toast({
        title: "Lỗi",
        description: "Không thể xác định vị trí hiện tại. Vui lòng thử lại.",
        variant: "destructive"
      });
      return;
    }

    try {
      const sosData: {
        user_id: string;
        type: string;
        description: string;
        urgency: string;
        people_affected: number;
        latitude: number;
        longitude: number;
        manual_address?: string;
        images?: string[];
      } = {
        user_id: profile.id,
        type: sosForm.type,
        description: sosForm.description,
        urgency: sosForm.urgency,
        people_affected: sosForm.people_affected,
        latitude: userLocation.lat,
        longitude: userLocation.lng
      };

      if (sosForm.manual_address && sosForm.manual_address.trim().length > 0) {
        sosData.manual_address = sosForm.manual_address.trim();
      }

      if (sosImages && sosImages.length > 0) {
        sosData.images = sosImages;
      }

      const { data, error } = await supabase
        .from('sos_requests')
        .insert(sosData)
        .select();

      if (error) {
        console.error('Error creating SOS request:', error);
        toast({
          title: "Lỗi",
          description: `Không thể gửi yêu cầu SOS: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Thành công",
        description: "Yêu cầu SOS đã được gửi thành công!"
      });

      setSOSForm({ 
        type: '', 
        description: '', 
        urgency: '', 
        people_affected: 1,
        manual_address: ''
      });
      setSOSImages([]);
      setSOSDialogOpen(false);
      fetchSOSRequests();
      fetchUserActiveSOS();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.",
        variant: "destructive"
      });
    }
  };

  const handleCancelSOS = async () => {
    if (!userActiveSOS || !profile) return;

    const { error } = await supabase
      .from('sos_requests')
      .update({ status: 'cancelled' })
      .eq('id', userActiveSOS.id)
      .eq('user_id', profile.id);

    if (error) {
      console.error('Error cancelling SOS request:', error);
      toast({
        title: "Lỗi",
        description: "Không thể hủy yêu cầu SOS. Vui lòng thử lại.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Đã hủy",
      description: "Yêu cầu SOS đã được hủy thành công!"
    });

    setUserActiveSOS(null);
    fetchSOSRequests();
  };

  const handleCompleteSOS = async () => {
    if (!userActiveSOS || !profile) return;

    const { error } = await supabase
      .from('sos_requests')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', userActiveSOS.id)
      .eq('user_id', profile.id);

    if (error) {
      console.error('Error completing SOS request:', error);
      toast({
        title: "Lỗi",
        description: "Không thể hoàn thành yêu cầu SOS. Vui lòng thử lại.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Hoàn thành",
      description: "Yêu cầu SOS đã được hoàn thành thành công!"
    });

    setUserActiveSOS(null);
    fetchSOSRequests();
  };

  const handleHelpOffer = async (sosId: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('help_offers')
        .insert({
          sos_request_id: sosId,
          volunteer_id: profile.id,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Thông báo",
            description: "Bạn đã gửi lời đề nghị giúp đỡ cho yêu cầu này rồi",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Thành công",
        description: "Đã gửi lời đề nghị giúp đỡ! Đang chờ người yêu cầu chấp nhận."
      });

      setSelectedSOS(null);
    } catch (error) {
      console.error('Error creating help offer:', error);
      toast({
        title: "Lỗi",
        description: "Không thể gửi lời đề nghị giúp đỡ. Vui lòng thử lại.",
        variant: "destructive"
      });
    }
  };

  const handleAcceptHelpOffer = async (offerId: string, volunteerId: string, sosId: string) => {
    if (!profile) return;

    try {
      const { error: sosError } = await supabase
        .from('sos_requests')
        .update({ 
          status: 'helping',
          helper_id: volunteerId
        })
        .eq('id', sosId);

      if (sosError) throw sosError;

      const { error: offerError } = await supabase
        .from('help_offers')
        .update({ status: 'accepted' })
        .eq('id', offerId);

      if (offerError) throw offerError;

      const { error: rejectError } = await supabase
        .from('help_offers')
        .update({ status: 'rejected' })
        .eq('sos_request_id', sosId)
        .neq('id', offerId)
        .eq('status', 'pending');

      if (rejectError) throw rejectError;

      toast({
        title: "Đã chấp nhận",
        description: "Bạn đã chấp nhận lời đề nghị giúp đỡ!"
      });

      fetchSOSRequests();
      fetchUserActiveSOS();
      fetchHelpOffers();
    } catch (error) {
      console.error('Error accepting help offer:', error);
      toast({
        title: "Lỗi",
        description: "Không thể chấp nhận lời đề nghị giúp đỡ. Vui lòng thử lại.",
        variant: "destructive"
      });
    }
  };

  const handleRejectHelpOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('help_offers')
        .update({ status: 'rejected' })
        .eq('id', offerId);

      if (error) throw error;

      toast({
        title: "Đã từ chối",
        description: "Bạn đã từ chối lời đề nghị giúp đỡ"
      });

      fetchHelpOffers();
    } catch (error) {
      console.error('Error rejecting help offer:', error);
      toast({
        title: "Lỗi",
        description: "Không thể từ chối lời đề nghị giúp đỡ. Vui lòng thử lại.",
        variant: "destructive"
      });
    }
  };

  const handleToggleVolunteer = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Yêu cầu đăng nhập",
        description: "Bạn cần đăng nhập để bật chế độ tình nguyện",
        variant: "destructive"
      });
      return;
    }
    if (!profile?.is_volunteer_ready && userActiveSOS) {
      toast({
        title: "Không thể bật chế độ tình nguyện",
        description: "Bạn cần hủy yêu cầu SOS hiện tại trước khi bật chế độ tình nguyện",
        variant: "destructive"
      });
      return;
    }

    await toggleVolunteerStatus();
    toast({
      title: profile?.is_volunteer_ready ? "Đã tắt chế độ tình nguyện" : "Đã bật chế độ tình nguyện",
      description: profile?.is_volunteer_ready 
        ? "Bạn sẽ không nhận được thông báo SOS mới" 
        : "Bạn sẽ nhận được thông báo khi có SOS gần bạn"
    });
  };

  const handleStartChat = (recipientId: string, recipientName: string, sosId?: string) => {
    setChatRecipient({ id: recipientId, name: recipientName, sosId });
    setChatOpen(true);
  };

  const getSOSMarkerColor = (urgency: string, status: string) => {
    if (status === 'helping') {
      return '#00AA00';
    }
    return urgency === 'Khẩn cấp' ? '#FF0000' : urgency === 'Trung bình' ? '#FFA500' : '#FFFF00';
  };

  const getSOSMarkerTitle = (sos: SOSRequest) => {
    if (sos.status === 'helping' && sos.helper_profile) {
      return `SOS: ${sos.type} - Đang được ${sos.helper_profile.name} giúp đỡ`;
    }
    return `SOS: ${sos.type} - ${sos.urgency}`;
  };

  // SOS Details Content Component for reuse
  const SOSDetailsContent = ({ sos }: { sos: SOSRequest }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const { toast } = useToast(); // Added for notifications

    const openGallery = (index: number) => {
      setCurrentImageIndex(index);
      setIsGalleryOpen(true);
    };

    const handleNextImage = () => {
      if (sos && Array.isArray(sos.images) && sos.images.length > 0) {
        const imagesArray = sos.images;
        setCurrentImageIndex(prev => (prev + 1) % imagesArray.length);
      }
    };

    const handlePrevImage = () => {
      if (sos && Array.isArray(sos.images) && sos.images.length > 0) {
        const imagesArray = sos.images;
        setCurrentImageIndex(prev => (prev - 1 + imagesArray.length) % imagesArray.length);
      }
    };

    const handleDownloadImage = async () => {
      if (!sos || !sos.images || sos.images.length === 0) {
        toast({ title: "Lỗi", description: "Không có ảnh để tải.", variant: "destructive" });
        return;
      }
      const imageUrl = sos.images[currentImageIndex];
      if (!imageUrl) {
        toast({ title: "Lỗi", description: "Không tìm thấy URL ảnh.", variant: "destructive" });
        return;
      }

      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        // Extract filename from URL or generate one
        const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1) || `sos-image-${Date.now()}.jpg`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href); // Clean up
        toast({ title: "Thành công", description: "Ảnh đã được tải xuống." });
      } catch (error) {
        console.error("Error downloading image:", error);
        toast({ title: "Lỗi tải ảnh", description: "Không thể tải ảnh. Vui lòng thử lại.", variant: "destructive" });
      }
    };

    return (
      <div className={`space-y-${isXS ? '6' : '8'} max-h-[calc(100vh-10rem)] overflow-y-auto p-1`}>
        {/* Status Display */}
        {sos.status === 'helping' && sos.helper_profile && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">
              Đang được {sos.helper_profile.name} giúp đỡ
            </span>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className={`space-y-${isXS ? '3' : '4'}`}>
        <div className="flex items-center gap-2">
          <span className={`font-medium text-gray-700 ${isXS ? 'text-sm' : ''}`}>Loại hỗ trợ:</span>
          <Badge className="bg-red-100 text-red-800">{sos.type}</Badge>
        </div>
        
        <div>
          <span className={`font-medium text-gray-700 ${isXS ? 'text-sm' : ''}`}>Mô tả:</span>
          <p className={`text-gray-600 mt-1 p-3 bg-gray-50 rounded-lg ${isXS ? 'text-sm' : 'text-sm'}`}>{sos.description}</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-gray-700 ${isXS ? 'text-sm' : ''}`}>Mức độ:</span>
            <Badge variant={sos.urgency === 'Khẩn cấp' ? 'destructive' : 'secondary'}>
              {sos.urgency}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-medium text-gray-700 ${isXS ? 'text-sm' : ''}`}>Số người ảnh hưởng:</span>
            <span className={`text-gray-600 ${isXS ? 'text-sm' : 'text-sm'}`}>{sos.people_affected} người</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`font-medium text-gray-700 ${isXS ? 'text-sm' : ''}`}>Người gửi:</span>
          <span className={`text-gray-600 ${isXS ? 'text-sm' : 'text-sm'}`}>{sos.profiles.name}</span>
        </div>
      </div>

      {/* Detailed Date and Time */}
      <div className="border-t pt-4">
        <h4 className={`font-medium text-gray-700 mb-3 flex items-center gap-2 ${isXS ? 'text-sm' : ''}`}>
          <Clock className="w-4 h-4" />
          Thời gian
        </h4>
        <div className={`bg-blue-50 p-3 rounded-lg space-y-2 ${isXS ? 'text-sm' : ''}`}>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Thời gian gửi:</span>
            <span className="font-medium">
              {sos.created_at && format(new Date(sos.created_at), 'dd/MM/yyyy - HH:mm:ss', { locale: vi })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Khoảng thởi gian:</span>
            <span className="font-medium">
              {sos.created_at && formatDistanceToNow(new Date(sos.created_at), { 
                addSuffix: true, 
                locale: vi 
              })}
            </span>
          </div>
          {sos.completed_at && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Hoàn thành lúc:</span>
              <span className="font-medium">
                {format(new Date(sos.completed_at), 'dd/MM/yyyy - HH:mm:ss', { locale: vi })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Location Details */}
      <div className="border-t pt-4">
        <h4 className={`font-medium text-gray-700 mb-3 flex items-center gap-2 ${isXS ? 'text-sm' : ''}`}>
          <MapPin className="w-4 h-4" />
          Vị trí
        </h4>
        <div className={`bg-green-50 p-3 rounded-lg ${isXS ? 'text-sm' : ''}`}>
          <SOSLocationInfo
            latitude={Number(sos.latitude)}
            longitude={Number(sos.longitude)}
            address={sos.manual_address}
          />
        </div>
      </div>

      {/* Scene Photos - Collapsible Thumbnail */}
      {Array.isArray(sos.images) && sos.images.length > 0 && (
        <div className="border-t pt-4">
          <Accordion type="single" collapsible className="w-full" defaultValue="scene-photos-trigger">
            <AccordionItem value="scene-photos-trigger" className="border-b-0">
              <AccordionTrigger className={`py-0 hover:no-underline ${isXS ? 'text-sm' : ''}`}>
                <div className="flex items-center text-gray-700 w-full">
                  <Image className="w-4 h-4 mr-2 flex-shrink-0" />
                  <h4 className={`font-medium flex-grow text-left`}>
                    Hình ảnh hiện trường ({sos.images.length} ảnh)
                  </h4>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-3 pb-0">
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => openGallery(0)}
                >
                  <img
                    src={sos.images[0]} // Show first image as thumbnail
                    alt={`Hiện trường 1 (tổng ${sos.images.length} ảnh)`}
                    className={`w-full object-cover rounded-lg border shadow-sm group-hover:shadow-md transition-shadow ${isXS ? 'h-32' : 'h-40'}`}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                    <span className={`text-white opacity-0 group-hover:opacity-100 font-medium ${isXS ? 'text-sm' : 'text-base'}`}>
                      {sos.images.length > 1 ? `Xem ${sos.images.length} ảnh` : 'Xem ảnh'}
                    </span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {/* Image Gallery Dialog */}
      {sos.images && sos.images.length > 0 && (
        <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
          <DialogContent className="max-w-3xl p-3 sm:p-4 bg-background flex flex-col min-h-[50vh] sm:min-h-[60vh]">
            <div className="relative flex-grow flex items-center justify-center mb-3">
              <img 
                src={sos.images[currentImageIndex]} 
                alt={`Hiện trường ${currentImageIndex + 1} / ${sos.images.length}`} 
                className="rounded-md object-contain max-h-[65vh] sm:max-h-[70vh] w-auto"
              />
            </div>
            {/* Controls: Previous, Download, Next */}
            <div className="flex items-center justify-between pt-3 border-t">
              {sos.images.length > 1 ? (
                <Button onClick={handlePrevImage} variant="outline" size="icon" aria-label="Ảnh trước">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              ) : (
                <div className="w-9 h-9"></div> // Placeholder for alignment
              )}
              
              <div className="flex items-center gap-2">
                <Button onClick={handleDownloadImage} variant="outline" size="icon" aria-label="Tải ảnh">
                  <Download className="h-5 w-5" />
                </Button>
                {sos.images.length > 1 && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {currentImageIndex + 1} / {sos.images.length}
                  </span>
                )}
              </div>

              {sos.images.length > 1 ? (
                <Button onClick={handleNextImage} variant="outline" size="icon" aria-label="Ảnh tiếp theo">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              ) : (
                <div className="w-9 h-9"></div> // Placeholder for alignment
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Action Buttons */}
      <div className={`flex gap-3 pt-4 border-t ${isXS ? 'flex-col' : ''}`}>
        {profile?.is_volunteer_ready && sos.status === 'active' && sos.user_id !== profile.id && (
          <Button 
            onClick={() => handleHelpOffer(sos.id)}
            className={`bg-emerald-600 hover:bg-emerald-700 ${isXS ? 'w-full' : 'flex-1'}`}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Tôi sẽ giúp
          </Button>
        )}
        
        {sos.user_id !== profile?.id && sos.status === 'helping' && sos.helper_id === profile?.id && (
          <Button 
            onClick={() => handleStartChat(sos.user_id, sos.profiles.name, sos.id)}
            variant="outline"
            className={isXS ? 'w-full' : 'flex-1'}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Liên hệ
          </Button>
        )}
      </div> {/* End of Action Buttons div */}
    </div> /* End of main wrapper div for SOSDetailsContent */
  ); // End of return for SOSDetailsContent
}; // End of SOSDetailsContent function

  const navigate = useNavigate();

  const handleSOSClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setSOSDialogOpen(true);
  };

  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  if (apiKeyLoading || locationLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">
            {apiKeyLoading ? 'Đang tải bản đồ...' : 'Đang lấy vị trí của bạn...'}
          </p>
        </div>
      </div>
    );
  }

  if (apiKeyError || !mapsApiKey || !servicesApiKey) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-4">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Lỗi tải bản đồ</h3>
          <p className="text-gray-600 mb-4">
            {apiKeyError || "Không thể tải Goong Maps. Vui lòng thử lại sau."}
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Tải lại
          </Button>
        </div>
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Đang xác định vị trí của bạn...</p>
          <Button 
            onClick={getCurrentLocation}
            variant="outline"
            className="mt-4"
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  console.log('Rendering Map component with:', {
    sosRequestsCount: sosRequests.length,
    supportPointsCount: supportPoints.length,
    mapLoaded: !!map,
    userLocation
  });

  return (
    <div className="fixed inset-0 top-16 bottom-16">
      {/* Goong Maps Style Navigation Info - When helper is assigned */}
      {profile?.is_volunteer_ready && userActiveSOS && userActiveSOS.status === 'helping' && userActiveSOS.helper_id === profile.id && (
        <div className="absolute top-3 left-2 right-20 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-blue-600 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Navigation className="w-5 h-5" />
                <span className="font-medium text-sm">Đến điểm cần trợ giúp</span>
              </div>
            </div>
            
            <div className="p-4">
              {distanceInfo.loading ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Đang tính toán...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-baseline gap-3">
                    <div className="text-3xl font-bold text-blue-600">{distanceInfo.duration}</div>
                    <div className="text-lg text-gray-600">({distanceInfo.distance})</div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Tuyến đường nhanh nhất
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        if (userActiveSOS) {
                          const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${userActiveSOS.latitude},${userActiveSOS.longitude}&travelmode=driving`;
                          
                          window.open(googleMapsUrl, '_blank');
                        }
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Dẫn đường
                    </Button>
                    
                    <Button
                      onClick={() => handleStartChat(userActiveSOS.user_id, userActiveSOS.profiles.name, userActiveSOS.id)}
                      variant="outline"
                      size="sm"
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Chat
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Goong Map Container */}
      <div className="absolute inset-0 w-full h-full">
        <GoongMap
          center={userLocation}
          zoom={13}
          onMapLoad={setMap}
          goongMapsApiKey={mapsApiKey}
        >
          {/* SOS Request Markers */}
          {map && sosRequests.map((sos) => {
            console.log('Rendering SOS marker for:', sos);
            return (
              <GoongMapMarker
                key={sos.id}
                map={map}
                position={{ lat: Number(sos.latitude), lng: Number(sos.longitude) }}
                title={getSOSMarkerTitle(sos) ?? ""}
                color={getSOSMarkerColor(sos.urgency || "Trung bình", sos.status !== null ? sos.status : "unknown")}
                onClick={() => setSelectedSOS(sos)}
              />
            );
          })}

          {/* Support Point Markers */}
          {map && supportPoints.map((point) => (
            <GoongMapMarker
              key={point.id}
              map={map}
              position={{ lat: Number(point.latitude), lng: Number(point.longitude) }}
              title={`Điểm hỗ trợ: ${point.name}`}
              onClick={() => setSelectedSupportPoint(point)}
            >
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                <HeartHandshake size={16} className="text-white" />
              </div>
            </GoongMapMarker>
          ))}
        </GoongMap>
      </div>

      {/* Left Side Controls */}
      <div className={`absolute ${
        profile?.is_volunteer_ready && userActiveSOS && userActiveSOS.status === 'helping' && userActiveSOS.helper_id === profile.id
          ? (isXS ? 'top-48' : 'top-52')
          : (isXS ? 'top-8' : 'top-10')
      } left-2 z-30`}>
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {/* Volunteer Status */}
          <div className="flex items-center justify-start">
            <Button
              onClick={handleToggleVolunteer}
              variant={profile?.is_volunteer_ready ? "default" : "outline"}
              disabled={!profile?.is_volunteer_ready && !!userActiveSOS}
              size="sm"
              className={`${
                profile?.is_volunteer_ready
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg'
                  : userActiveSOS
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                  : 'border-emerald-600 text-emerald-600 hover:bg-emerald-50 shadow-md'
              } font-medium transition-all duration-200 ${
                isXS ? 'text-xs px-2 py-1 h-8' : 'text-xs px-2 py-1 sm:text-sm sm:px-3 sm:py-2'
              }`}
            >
              <User className={`${isXS ? 'w-3 h-3 mr-1' : 'w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2'}`} />
              <span className={`${isXS ? 'hidden' : 'hidden xs:inline'}`}>
                {profile?.is_volunteer_ready ? 'Sẵn sàng giúp đỡ' : 'Chế độ tình nguyện'}
              </span>
              <span className={`${isXS ? 'inline' : 'xs:hidden'}`}>
                {profile?.is_volunteer_ready ? 'Sẵn sàng' : 'Tình nguyện'}
              </span>
            </Button>
          </div>
          
          {/* History Controls */}
          <div className={`flex flex-col gap-1 ${isXS ? 'scale-90' : ''}`}>
            {isAuthenticated && (
              <RequestHistory onStartChat={handleStartChat} />
            )}
            {profile?.is_volunteer_ready && (
              <HelpHistory onStartChat={handleStartChat} />
            )}
          </div>
        </div>
      </div>

      {/* SOS Button - Now moved to top right */}
      <div className={`absolute ${
        profile?.is_volunteer_ready && userActiveSOS && userActiveSOS.status === 'helping' && userActiveSOS.helper_id === profile.id
          ? (isXS ? 'bottom-16' : 'bottom-16') // Moved to bottom
          : (isXS ? 'bottom-16' : 'bottom-16')  // Moved to bottom
      } right-6 z-30`}>
        <div className="flex flex-col gap-2 items-end">
          {/* SOS Button - Now moved to top right */}
          {!profile?.is_volunteer_ready && (
            <>
              {/* Mobile: Use Sheet */}
              {isMobile && (
                <Drawer open={sosDialogOpen} onOpenChange={setSOSDialogOpen}>
                  <DrawerTrigger asChild>
                    <div className={`relative ${isXS ? 'w-12 h-12' : 'w-16 h-16 sm:w-16 sm:h-16'} ${userActiveSOS ? 'cursor-not-allowed' : ''}`} onClick={handleSOSClick}>
                      <motion.button
                        // onClick is implicitly handled by DrawerTrigger as this div is its child with asChild prop
                        disabled={!!userActiveSOS}
                        className={`absolute inset-0 z-10 flex flex-col items-center justify-center w-full h-full rounded-full text-white shadow-xl focus:outline-none
                          ${userActiveSOS ? 'bg-gray-400' : 'bg-red-500'}`}
                        whileTap={!userActiveSOS ? { scale: 0.95 } : {}}
                        whileHover={!userActiveSOS ? { scale: 1.05, backgroundColor: "#dc2626" } : {}} // bg-red-600
                        aria-label="Yêu cầu SOS"
                      >
                        <PhoneCall size={isXS ? 12 : 14} className="mb-0.5" />
                        <span className={`font-semibold tracking-wider ${isXS ? 'text-[10px]' : 'text-xs'}`}>SOS</span>
                      </motion.button>
                      {!userActiveSOS && (
                        <motion.div
                          initial={{ scale: 1, opacity: 0.6 }}
                          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.3, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-0 z-0 w-full h-full bg-red-400 rounded-full pointer-events-none"
                        />
                      )}
                    </div>
                  </DrawerTrigger>
                  <DrawerContent>
                    <div className="flex flex-col h-full">
                      <DrawerHeader className="p-4 pb-2 border-b border-gray-100 flex-shrink-0 text-left">
                        <DrawerTitle className="text-red-600 flex items-center gap-2 text-lg">
                          <AlertTriangle className="w-5 h-5" />
                          Gửi yêu cầu SOS
                        </DrawerTitle>
                      </DrawerHeader>
                      <ScrollArea className="flex-1 px-4">
                        <div className="py-4 space-y-4">
                          <div>
                            <Label htmlFor="type" className="text-red-600 text-sm">Loại hỗ trợ cần thiết *</Label>
                            <Select value={sosForm.type} onValueChange={(value) => setSOSForm(prev => ({ ...prev, type: value }))}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Chọn loại hỗ trợ" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Y tế khẩn cấp">🚑 Y tế khẩn cấp</SelectItem>
                                <SelectItem value="Sơ tán">🏃‍♂️ Sơ tán khẩn cấp</SelectItem>
                                <SelectItem value="Cứu hộ">⛑️ Cứu hộ</SelectItem>
                                <SelectItem value="Thực phẩm">🍞 Thực phẩm</SelectItem>
                                <SelectItem value="Nước uống">💧 Nước sạch</SelectItem>
                                <SelectItem value="Chỗ ở">🏠 Chỗ ở tạm thởi</SelectItem>
                                <SelectItem value="Thuốc men">💊 Thuốc men</SelectItem>
                                <SelectItem value="Quần áo">👕 Quần áo</SelectItem>
                                <SelectItem value="Vận chuyển">🚗 Vận chuyển</SelectItem>
                                <SelectItem value="Liên lạc">📞 Liên lạc/Thông tin</SelectItem>
                                <SelectItem value="Điện">⚡ Điện/Năng lượng</SelectItem>
                                <SelectItem value="Vệ sinh">🧼 Vật dụng vệ sinh</SelectItem>
                                <SelectItem value="Khác">❓ Khác</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="manual_address" className="text-sm">Địa chỉ chi tiết</Label>
                            {servicesApiKey ? (
                              <div className="mt-1">
                                <GoongMapSearch
                                  map={map}
                                  mapsApiKey={servicesApiKey}
                                  servicesApiKey={servicesApiKey}
                                  onLocationSelect={(location) => {
                                    setSOSForm(prev => ({ ...prev, manual_address: location.address }));
                                  }}
                                />
                              </div>
                            ) : (
                              <Input
                                id="manual_address"
                                placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                                value={sosForm.manual_address}
                                onChange={(e) => setSOSForm(prev => ({ ...prev, manual_address: e.target.value }))}
                                className="w-full mt-1"
                              />
                            )}
                          </div>

                          <div>
                            <Label htmlFor="description" className="text-red-600 text-sm">Mô tả tình huống *</Label>
                            <Textarea
                              id="description"
                              placeholder="Mô tả chi tiết tình huống cần hỗ trợ..."
                              value={sosForm.description}
                              onChange={(e) => setSOSForm(prev => ({ ...prev, description: e.target.value }))}
                              className="w-full resize-none min-h-[80px]"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="urgency" className="text-red-600 text-sm">Mức độ khẩn cấp *</Label>
                              <Select value={sosForm.urgency} onValueChange={(value) => setSOSForm(prev => ({ ...prev, urgency: value }))}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Chọn mức độ" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Khẩn cấp">🔴 Khẩn cấp</SelectItem>
                                  <SelectItem value="Trung bình">🟡 Trung bình</SelectItem>
                                  <SelectItem value="Thấp">🟢 Thấp</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="people" className="text-sm">Số người ảnh hưởng</Label>
                              <Input
                                id="people"
                                type="number"
                                min="1"
                                value={sosForm.people_affected}
                                onChange={(e) => setSOSForm(prev => ({ ...prev, people_affected: parseInt(e.target.value) || 1 }))}
                                className="w-full"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm">Hình ảnh hiện trường</Label>
                            <ImageUpload 
                              onImagesChange={(images) => {
                                console.log('Images changed:', images);
                                setSOSImages(Array.isArray(images) ? images : []);
                              }}
                              maxImages={4}
                            />
                          </div>

                          <Button 
                            onClick={handleSOSSubmit} 
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3"
                            disabled={!sosForm.type || !sosForm.description || !sosForm.urgency}
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Gửi yêu cầu SOS ngay
                          </Button>
                        </div>
                      </ScrollArea>
                    </div>
                  </DrawerContent>
                </Drawer>
              )}

              {/* Desktop: Use Dialog */}
              {!isMobile && (
                <Dialog open={sosDialogOpen} onOpenChange={setSOSDialogOpen}>
                  <DialogTrigger asChild>
                    <div className={`relative ${isXS ? 'w-12 h-12' : 'w-16 h-16 sm:w-16 sm:h-16'} ${userActiveSOS ? 'cursor-not-allowed' : ''}`} onClick={handleSOSClick}>
                      <motion.button
                        // onClick is implicitly handled by DialogTrigger
                        disabled={!!userActiveSOS}
                        className={`absolute inset-0 z-10 flex flex-col items-center justify-center w-full h-full rounded-full text-white shadow-xl focus:outline-none
                          ${userActiveSOS ? 'bg-gray-400' : 'bg-red-500'}`}
                        whileTap={!userActiveSOS ? { scale: 0.95 } : {}}
                        whileHover={!userActiveSOS ? { scale: 1.05, backgroundColor: "#dc2626" } : {}} // bg-red-600
                        aria-label="Yêu cầu SOS"
                      >
                        <PhoneCall size={isXS ? 12 : 14} className="mb-0.5" />
                        <span className={`font-semibold tracking-wider ${isXS ? 'text-[10px]' : 'text-xs'}`}>SOS</span>
                      </motion.button>
                      {!userActiveSOS && (
                        <motion.div
                          initial={{ scale: 1, opacity: 0.6 }}
                          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.3, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-0 z-0 w-full h-full bg-red-400 rounded-full pointer-events-none"
                        />
                      )}
                    </div>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-red-600 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Gửi yêu cầu SOS
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="type" className="text-red-600">Loại hỗ trợ cần thiết *</Label>
                        <Select value={sosForm.type} onValueChange={(value) => setSOSForm(prev => ({ ...prev, type: value }))}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Chọn loại hỗ trợ" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Y tế khẩn cấp">🚑 Y tế khẩn cấp</SelectItem>
                            <SelectItem value="Sơ tán">🏃‍♂️ Sơ tán khẩn cấp</SelectItem>
                            <SelectItem value="Cứu hộ">⛑️ Cứu hộ</SelectItem>
                            <SelectItem value="Thực phẩm">🍞 Thực phẩm</SelectItem>
                            <SelectItem value="Nước uống">💧 Nước sạch</SelectItem>
                            <SelectItem value="Chỗ ở">🏠 Chỗ ở tạm thởi</SelectItem>
                            <SelectItem value="Thuốc men">💊 Thuốc men</SelectItem>
                            <SelectItem value="Quần áo">👕 Quần áo</SelectItem>
                            <SelectItem value="Vận chuyển">🚗 Vận chuyển</SelectItem>
                            <SelectItem value="Liên lạc">📞 Liên lạc/Thông tin</SelectItem>
                            <SelectItem value="Điện">⚡ Điện/Năng lượng</SelectItem>
                            <SelectItem value="Vệ sinh">🧼 Vật dụng vệ sinh</SelectItem>
                            <SelectItem value="Khác">❓ Khác</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="manual_address">Địa chỉ chi tiết</Label>
                        {servicesApiKey ? (
                          <div className="mt-1">
                            <GoongMapSearch
                              map={map}
                              mapsApiKey={servicesApiKey}
                              servicesApiKey={servicesApiKey}
                              onLocationSelect={(location) => {
                                setSOSForm(prev => ({ ...prev, manual_address: location.address }));
                              }}
                            />
                          </div>
                        ) : (
                          <Input
                            id="manual_address"
                            placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                            value={sosForm.manual_address}
                            onChange={(e) => setSOSForm(prev => ({ ...prev, manual_address: e.target.value }))}
                            className="w-full mt-1"
                          />
                        )}
                      </div>

                      <div>
                        <Label htmlFor="description" className="text-red-600">Mô tả tình huống *</Label>
                        <Textarea
                          id="description"
                          placeholder="Mô tả chi tiết tình huống cần hỗ trợ..."
                          value={sosForm.description}
                          onChange={(e) => setSOSForm(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full resize-none"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="urgency" className="text-red-600">Mức độ khẩn cấp *</Label>
                          <Select value={sosForm.urgency} onValueChange={(value) => setSOSForm(prev => ({ ...prev, urgency: value }))}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Chọn mức độ" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Khẩn cấp">🔴 Khẩn cấp</SelectItem>
                              <SelectItem value="Trung bình">🟡 Trung bình</SelectItem>
                              <SelectItem value="Thấp">🟢 Thấp</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="people">Số người ảnh hưởng</Label>
                          <Input
                            id="people"
                            type="number"
                            min="1"
                            value={sosForm.people_affected}
                            onChange={(e) => setSOSForm(prev => ({ ...prev, people_affected: parseInt(e.target.value) || 1 }))}
                            className="w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Hình ảnh hiện trường</Label>
                        <ImageUpload 
                          onImagesChange={(images) => {
                            console.log('Images changed:', images);
                            setSOSImages(Array.isArray(images) ? images : []);
                          }}
                          maxImages={4}
                        />
                      </div>

                      <Button 
                        onClick={handleSOSSubmit} 
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold"
                        disabled={!sosForm.type || !sosForm.description || !sosForm.urgency}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Gửi yêu cầu SOS ngay
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
          
          {/* Map Controls */}
          <MapControls map={map} />
        </div>
      </div>

      {/* Compact SOS Status - Bottom Position - Mobile Optimized */}
      {userActiveSOS && (
        <div className="absolute bottom-20 left-2 right-2 z-40">
          <div className="bg-white rounded-lg border-l-4 border-red-500 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="bg-red-100 rounded-full flex-shrink-0 p-1">
                  <AlertTriangle className="text-red-600 w-4 h-4" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">SOS đang hoạt động</span>
                    <Badge variant="destructive" className="text-xs scale-90">
                      {userActiveSOS.urgency}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 truncate">{userActiveSOS.type}</div>
                  {userActiveSOS.manual_address && (
                    <div className="text-xs text-gray-500 truncate">{userActiveSOS.manual_address}</div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons - Compact */}
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                {/* Help Offers Section - Compact */}
                {userActiveSOS.status === 'active' && helpOffers[userActiveSOS.id] && helpOffers[userActiveSOS.id].length > 0 && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {helpOffers[userActiveSOS.id].length} người giúp
                    </Badge>
                  </div>
                )}
                
                {/* Helper Info - Compact */}
                {userActiveSOS.status === 'helping' && userActiveSOS.helper_profile && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                      {userActiveSOS.helper_profile.name} giúp
                    </Badge>
                    <Button
                      onClick={() => handleStartChat(userActiveSOS.helper_id!, userActiveSOS.helper_profile!.name, userActiveSOS.id)}
                      size="sm"
                      variant="outline"
                      className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 px-2 py-1 h-6 text-xs"
                    >
                      <MessageCircle className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={handleCompleteSOS}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 h-6 text-xs"
                    >
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                
                {/* Cancel Button */}
                {userActiveSOS.user_id === profile?.id && userActiveSOS.status === 'active' && (
                  <>
                    <Button
                      onClick={() => setIsCancelConfirmOpen(true)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Hủy SOS
                    </Button>
                    <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Xác nhận hủy SOS</DialogTitle>
                        </DialogHeader>
                        <p>Bạn có chắc chắn muốn hủy yêu cầu SOS này không?</p>
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => setIsCancelConfirmOpen(false)}
                            variant="outline"
                          >
                            Không hủy
                          </Button>
                          <Button
                            onClick={() => {
                              handleCancelSOS();
                              setIsCancelConfirmOpen(false);
                            }}
                            variant="destructive"
                          >
                            Xác nhận hủy
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </div>
            
            {/* Expandable Help Offers Details */}
            {userActiveSOS.status === 'active' && helpOffers[userActiveSOS.id] && helpOffers[userActiveSOS.id].length > 0 && (
              <div className="border-t bg-blue-50 p-2">
                <div className="space-y-1">
                  {helpOffers[userActiveSOS.id].map((offer) => (
                    <div
                      key={offer.id}
                      className="flex items-center justify-between bg-white rounded border p-1.5"
                    >
                      <span className="font-medium truncate mr-2 text-xs">{offer.profiles.name}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptHelpOffer(offer.id, offer.volunteer_id, userActiveSOS.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-1.5 py-0.5 h-5"
                        >
                          <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                          OK
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectHelpOffer(offer.id)}
                          className="text-red-600 border-red-300 hover:bg-red-50 text-xs px-1.5 py-0.5 h-5"
                        >
                          <X className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced SOS Details - Mobile optimized with Sheet for mobile, Dialog for desktop */}
      {selectedSOS && (
        <AnimatePresence mode="wait">
          {/* Mobile: Use Drawer with slide animation */}
          {isMobile && (
            <Drawer open={!!selectedSOS} onOpenChange={() => setSelectedSOS(null)}>
              <DrawerContent>
                <div className="flex flex-col h-full">
                  <DrawerHeader className="p-4 pb-2 border-b border-gray-100 flex-shrink-0 text-left">
                    <DrawerTitle className="text-red-600 flex items-center gap-2 text-lg">
                      <AlertTriangle className="w-5 h-5" />
                      Chi tiết yêu cầu SOS
                    </DrawerTitle>
                  </DrawerHeader>
                  <ScrollArea className="flex-1 px-4">
                    <div className="py-4">
                      <SOSDetailsContent sos={selectedSOS} />
                    </div>
                  </ScrollArea>
                </div>
              </DrawerContent>
            </Drawer>
          )}

          {/* Desktop: Keep using Dialog */}
          {!isMobile && (
            <Dialog open={!!selectedSOS} onOpenChange={() => setSelectedSOS(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Chi tiết yêu cầu SOS
                  </DialogTitle>
                </DialogHeader>
                <SOSDetailsContent sos={selectedSOS} />
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>
      )}

      {/* Support Point Details Modal - Now with Sheet for mobile */}
      {selectedSupportPoint && (
        <>
          {/* Mobile: Use Drawer */}
          {isMobile && (
            <Drawer open={!!selectedSupportPoint} onOpenChange={(isOpen) => !isOpen && setSelectedSupportPoint(null)}>
              <DrawerContent>
                <div className="flex flex-col h-full">
                  <DrawerHeader className="p-4 pb-2 border-b border-gray-100 flex-shrink-0 text-left">
                    <DrawerTitle className="text-green-600 flex items-center gap-2 text-lg">
                      <Shield className="w-5 h-5" />
                      Thông tin điểm hỗ trợ
                    </DrawerTitle>
                  </DrawerHeader>
                  <ScrollArea className="flex-1 px-4">
                    <div className="py-4 space-y-4">
                      {/* Basic Information */}
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {selectedSupportPoint.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={(selectedSupportPoint.is_verified ?? false) ? "default" : "secondary"} 
                                   className={(selectedSupportPoint.is_verified ?? false) ? "bg-green-100 text-green-800" : ""}>
                              {(selectedSupportPoint.is_verified ?? false) ? "✓ Đã xác minh" : "Chưa xác minh"}
                            </Badge>
                            <Badge variant="outline">
                              {selectedSupportPoint.type}
                            </Badge>
                          </div>
                        </div>

                        {/* Status */}
                        <div className={`${(selectedSupportPoint.is_active ?? false) ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} 
                                      border rounded-lg p-3`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${(selectedSupportPoint.is_active ?? false) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className={`font-medium ${(selectedSupportPoint.is_active ?? false) ? 'text-green-800' : 'text-red-800'}`}>
                              {(selectedSupportPoint.is_active ?? false) ? 'Đang hoạt động' : 'Tạm ngừng hoạt động'}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        {selectedSupportPoint.description && (
                          <div className="border-t pt-3 mt-3">
                            <h4 className="font-medium text-gray-700 mb-1 flex items-center gap-2 text-sm">
                              Mô tả
                            </h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {selectedSupportPoint.description}
                            </p>
                          </div>
                        )}

                        {/* Operating Hours */}
                        {selectedSupportPoint.operating_hours && (
                          <div className="border-t pt-3 mt-3">
                            <h4 className="font-medium text-gray-700 mb-1 flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4" />
                              Thời gian hoạt động
                            </h4>
                            <p className="text-sm text-gray-600">
                              {selectedSupportPoint.operating_hours}
                            </p>
                          </div>
                        )}

                        {/* Contact Info */}
                        {selectedSupportPoint.contact_info?.phone && (
                          <div className="border-t pt-3 mt-3">
                            <h4 className="font-medium text-gray-700 mb-1 flex items-center gap-2 text-sm">
                              <PhoneCall className="w-4 h-4" />
                              Liên hệ
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (selectedSupportPoint.contact_info?.phone) {
                                  window.location.href = `tel:${selectedSupportPoint.contact_info.phone}`;
                                }
                              }}
                              className="flex items-center text-green-600 border-green-600 hover:bg-green-50 px-3 py-1.5 text-sm mt-1"
                            >
                              <PhoneCall size={14} className="mr-2 flex-shrink-0" />
                              <span className="truncate">{selectedSupportPoint.contact_info.phone}</span>
                            </Button>
                          </div>
                        )}

                        {/* Location */}
                        <div className="border-t pt-4 mt-3">
                          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4" />
                            Vị trí
                          </h4>
                          <div className="bg-blue-50 p-3 rounded-lg text-sm">
                            <SOSLocationInfo
                              latitude={Number(selectedSupportPoint.latitude)}
                              longitude={Number(selectedSupportPoint.longitude)}
                              address={selectedSupportPoint.address ?? undefined}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </DrawerContent>
            </Drawer>
          )}

          {/* Desktop: Keep using Dialog */}
          {!isMobile && (
            <Dialog open={!!selectedSupportPoint} onOpenChange={() => setSelectedSupportPoint(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-green-600 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Thông tin điểm hỗ trợ
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Basic Information */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {selectedSupportPoint.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={(selectedSupportPoint.is_verified ?? false) ? "default" : "secondary"} 
                               className={(selectedSupportPoint.is_verified ?? false) ? "bg-green-100 text-green-800" : ""}>
                          {(selectedSupportPoint.is_verified ?? false) ? "✓ Đã xác minh" : "Chưa xác minh"}
                        </Badge>
                        <Badge variant="outline">
                          {selectedSupportPoint.type}
                        </Badge>
                      </div>
                    </div>

                    {/* Status */}
                    <div className={`${(selectedSupportPoint.is_active ?? false) ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} 
                                  border rounded-lg p-3`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${(selectedSupportPoint.is_active ?? false) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className={`font-medium ${(selectedSupportPoint.is_active ?? false) ? 'text-green-800' : 'text-red-800'}`}>
                          {(selectedSupportPoint.is_active ?? false) ? 'Đang hoạt động' : 'Tạm ngừng hoạt động'}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedSupportPoint.description && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                          Mô tả
                        </h4>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {selectedSupportPoint.description}
                        </p>
                      </div>
                    )}

                    {/* Operating Hours */}
                    {selectedSupportPoint.operating_hours && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Thời gian hoạt động
                        </h4>
                        <p className="text-sm text-gray-600">
                          {selectedSupportPoint.operating_hours}
                        </p>
                      </div>
                    )}

                    {/* Contact Info */}
                    {selectedSupportPoint.contact_info?.phone && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <PhoneCall className="w-4 h-4" />
                          Liên hệ
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedSupportPoint.contact_info?.phone) {
                              window.location.href = `tel:${selectedSupportPoint.contact_info.phone}`;
                            }
                          }}
                          className="flex items-center text-green-600 border-green-600 hover:bg-green-50 px-3 py-1.5 text-sm mt-1"
                        >
                          <PhoneCall size={14} className="mr-2 flex-shrink-0" />
                          <span className="truncate">{selectedSupportPoint.contact_info.phone}</span>
                        </Button>
                      </div>
                    )}

                    {/* Location */}
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Vị trí
                      </h4>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <SOSLocationInfo
                          latitude={Number(selectedSupportPoint.latitude)}
                          longitude={Number(selectedSupportPoint.longitude)}
                          address={selectedSupportPoint.address ?? undefined}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Chat Window */}
      {chatRecipient && (
        <ChatWindow
          isOpen={chatOpen}
          onClose={() => {
            setChatOpen(false);
            setChatRecipient(null);
          }}
          receiverId={chatRecipient.id}
          receiverName={chatRecipient.name}
          sosRequestId={chatRecipient.sosId || ''}
        />
      )}
    </div>
  );
};

export default Map;
