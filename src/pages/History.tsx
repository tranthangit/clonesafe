import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Star, Bell, User, MapPin, Settings, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface SOSRequest {
  id: string;
  type: string;
  description: string;
  urgency: string;
  status: string | null;
  created_at: string | null;
  completed_at?: string | null;
  helper_profile?: {
    name: string;
  } | null;
  profiles?: {
    name: string;
  };
}

interface Rating {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  sos_request: {
    type: string;
  };
  requester: {
    name: string;
  };
}

// Skeleton component for a single history item
const HistoryItemSkeleton: React.FC = () => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-6 w-20 ml-4" />
      </div>
      <div className="mt-3 flex justify-between items-center">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </CardContent>
  </Card>
);

const History: React.FC = () => {
  const { profile } = useAuth();
  const [sosRequests, setSOSRequests] = useState<SOSRequest[]>([]);
  const [helpProvided, setHelpProvided] = useState<SOSRequest[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sos' | 'help'>('sos');

  // State for pagination
  const [sosPage, setSosPage] = useState(1);
  const [helpPage, setHelpPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (profile) {
      fetchHistory();
    }
  }, [profile]);

  const fetchHistory = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Fetch SOS requests made by the user
      const { data: sosData, error: sosError } = await supabase
        .from('sos_requests')
        .select(`
          *,
          helper_profile:profiles!sos_requests_helper_id_fkey(name)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (sosError) throw sosError;
      setSOSRequests(sosData || []);

      // Fetch help provided by the user
      const { data: helpData, error: helpError } = await supabase
        .from('sos_requests')
        .select(`
          *,
          profiles!sos_requests_user_id_fkey(name)
        `)
        .eq('helper_id', profile.id)
        .order('created_at', { ascending: false });

      if (helpError) throw helpError;
      setHelpProvided(helpData || []);

      // Fetch ratings received
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('sos_ratings')
        .select(`
          *,
          sos_request:sos_requests(type),
          requester:profiles!sos_ratings_requester_id_fkey(name)
        `)
        .eq('helper_id', profile.id)
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;
      setRatings(ratingsData || []);

    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Hoàn thành</Badge>;
      case 'helping':
        return <Badge variant="secondary">Đang giúp đỡ</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Đã hủy</Badge>;
      default:
        return <Badge variant="outline">Đang chờ</Badge>;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Khẩn cấp':
        return 'text-red-600';
      case 'Trung bình':
        return 'text-orange-600';
      case 'Thấp':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  // Calculate pagination for SOS requests
  const sosTotalPages = Math.ceil(sosRequests.length / itemsPerPage);
  const sosPaginated = sosRequests.slice((sosPage - 1) * itemsPerPage, sosPage * itemsPerPage);

  // Calculate pagination for help provided
  const helpTotalPages = Math.ceil(helpProvided.length / itemsPerPage);
  const helpPaginated = helpProvided.slice((helpPage - 1) * itemsPerPage, helpPage * itemsPerPage);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <Skeleton className="h-8 w-1/3 mb-6" /> {/* Title Skeleton */}

        {/* Summary Card Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-7 w-1/2 mx-auto" />
                  <Skeleton className="h-4 w-3/4 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tab Buttons Skeleton */}
        <div className="flex space-x-2 mb-4">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>

        {/* History Items Skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <HistoryItemSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Lịch Sử Hoạt Động</h1>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-red-600">{sosRequests.length}</p>
              <p className="text-sm text-gray-600">Yêu cầu SOS</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{helpProvided.length}</p>
              <p className="text-sm text-gray-600">Lần giúp đỡ</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{profile?.reputation || 0}</p>
              <p className="text-sm text-gray-600">Điểm uy tín</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {ratings.length > 0 
                  ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
                  : 'N/A'}
              </p>
              <p className="text-sm text-gray-600">Đánh giá TB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-2 mb-4">
        <Button
          variant={activeTab === 'sos' ? 'default' : 'outline'}
          onClick={() => setActiveTab('sos')}
        >
          <Bell className="w-4 h-4 mr-2" />
          Yêu cầu SOS ({sosRequests.length})
        </Button>
        <Button
          variant={activeTab === 'help' ? 'default' : 'outline'}
          onClick={() => setActiveTab('help')}
        >
          <Star className="w-4 h-4 mr-2" />
          Đã giúp đỡ ({helpProvided.length})
        </Button>
      </div>

      {activeTab === 'sos' && (
        <div className="space-y-4">
          {sosPaginated.length > 0 ? (
            sosPaginated.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{request.type}</h3>
                        <span className={`text-sm font-medium ${getUrgencyColor(request.urgency)}`}>
                          ({request.urgency})
                        </span>
                        {getStatusBadge(request.status ?? 'Unknown')}
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{request.description}</p>

                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDistanceToNow(request.created_at ? new Date(request.created_at) : new Date(), { 
                          addSuffix: true,
                          locale: vi 
                        })}
                      </div>

                      {request.helper_profile && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">
                              Được giúp bởi: <strong>{request.helper_profile.name}</strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Bạn chưa gửi yêu cầu SOS nào</p>
              </CardContent>
            </Card>
          )}
          {sosTotalPages > 1 && (
            <div className="flex justify-center mt-4 pb-16 md:pb-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSosPage(prev => Math.max(1, prev - 1))}
                  disabled={sosPage === 1}
                >
                  Trước
                </Button>
                {Array.from({ length: sosTotalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={page === sosPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSosPage(page)}
                    className={page === sosPage ? 'bg-blue-600 text-white' : ''}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSosPage(prev => Math.min(sosTotalPages, prev + 1))}
                  disabled={sosPage === sosTotalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'help' && (
        <div className="space-y-4">
          {helpPaginated.length > 0 ? (
            helpPaginated.map((help) => (
              <Card key={help.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{help.type}</h3>
                        <span className={`text-sm font-medium ${getUrgencyColor(help.urgency)}`}>
                          ({help.urgency})
                        </span>
                        {getStatusBadge(help.status ?? 'Unknown')}
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{help.description}</p>

                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDistanceToNow(help.created_at ? new Date(help.created_at) : new Date(), { 
                          addSuffix: true,
                          locale: vi 
                        })}
                      </div>

                      {help.profiles && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">
                              Người cần giúp: <strong>{help.profiles.name}</strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Bạn chưa giúp đỡ ai</p>
              </CardContent>
            </Card>
          )}
          {helpTotalPages > 1 && (
            <div className="flex justify-center mt-4 pb-16 md:pb-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHelpPage(prev => Math.max(1, prev - 1))}
                  disabled={helpPage === 1}
                >
                  Trước
                </Button>
                {Array.from({ length: helpTotalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={page === helpPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHelpPage(page)}
                    className={page === helpPage ? 'bg-blue-600 text-white' : ''}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHelpPage(prev => Math.min(helpTotalPages, prev + 1))}
                  disabled={helpPage === helpTotalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
          {ratings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Đánh giá nhận được</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ratings.map((rating) => (
                  <div key={rating.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex text-yellow-400">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={`w-4 h-4 ${
                              index < rating.rating ? 'fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        từ {rating.requester.name}
                      </span>
                    </div>
                    {rating.comment && (
                      <p className="text-sm text-gray-700">{rating.comment}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDistanceToNow(new Date(rating.created_at), {
                        addSuffix: true,
                        locale: vi
                      })}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default History;