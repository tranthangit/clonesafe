import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Heart, Clock, CheckCircle, MessageCircle, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface HelpHistoryItem {
  id: string;
  type: string;
  description: string;
  urgency: string;
  status: string | null;
  created_at: string | null;
  completed_at: string | null;
  requester_profile?: {
    name: string;
  };
  user_id: string;
}

interface HelpHistoryProps {
  onStartChat?: (requesterId: string, requesterName: string, sosId: string) => void;
}

const HelpHistory: React.FC<HelpHistoryProps> = ({ onStartChat }) => {
  const { profile } = useAuth();
  const [helpRequests, setHelpRequests] = useState<HelpHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isOpen && profile) {
      fetchHelpHistory();
    }
  }, [isOpen, profile]);

  const fetchHelpHistory = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sos_requests')
        .select(`
          *,
          requester_profile:profiles!sos_requests_user_id_fkey(name)
        `)
        .eq('helper_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setHelpRequests(data || []);
    } catch (error) {
      console.error('Error fetching help history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'helping':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    const variants = {
      'completed': 'default',
      'helping': 'secondary'
    } as const;

    const labels = {
      'completed': 'Đã hoàn thành',
      'helping': 'Đang giúp đỡ'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
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

  const markAsCompleted = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('sos_requests')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      fetchHelpHistory();
    } catch (error) {
      console.error('Error marking as completed:', error);
    }
  };

  return (
    <>
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Heart className="w-4 h-4" />
              Lịch sử giúp đỡ
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-w-md h-[600px] flex flex-col">
            <DrawerHeader>
              <DrawerTitle>Lịch sử giúp đỡ của bạn</DrawerTitle>
            </DrawerHeader>
            
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : helpRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Bạn chưa giúp đỡ ai
                </div>
              ) : (
                <div className="space-y-4 p-1">
                  {helpRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(request.status)}
                          <h3 className="font-semibold">{request.type}</h3>
                          <span className={`text-sm font-medium ${getUrgencyColor(request.urgency)}`}>
                            ({request.urgency})
                          </span>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      <p className="text-sm text-gray-600">{request.description}</p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          Bắt đầu giúp: {formatDistanceToNow(new Date(request.created_at!), { addSuffix: true })}
                        </span>
                        {request.completed_at && (
                          <span>
                            Hoàn thành: {formatDistanceToNow(new Date(request.completed_at!), { addSuffix: true })}
                          </span>
                        )}
                      </div>

                      {request.requester_profile && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-sm">
                            <strong>Người cần giúp:</strong> {request.requester_profile.name}
                          </span>
                          <div className="flex gap-2">
                            {onStartChat && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onStartChat(request.user_id, request.requester_profile!.name, request.id)}
                                className="gap-1"
                              >
                                <MessageCircle className="w-3 h-3" />
                                Chat
                              </Button>
                            )}
                            {request.status === 'helping' && (
                              <Button
                                size="sm"
                                onClick={() => markAsCompleted(request.id)}
                                className="gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Hoàn thành
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Heart className="w-4 h-4" />
              Lịch sử giúp đỡ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl h-[600px] flex flex-col">
            <DialogHeader>
              <DialogTitle>Lịch sử giúp đỡ của bạn</DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : helpRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Bạn chưa giúp đỡ ai
                </div>
              ) : (
                <div className="space-y-4 p-1">
                  {helpRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(request.status)}
                          <h3 className="font-semibold">{request.type}</h3>
                          <span className={`text-sm font-medium ${getUrgencyColor(request.urgency)}`}>
                            ({request.urgency})
                          </span>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      <p className="text-sm text-gray-600">{request.description}</p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          Bắt đầu giúp: {formatDistanceToNow(new Date(request.created_at!), { addSuffix: true })}
                        </span>
                        {request.completed_at && (
                          <span>
                            Hoàn thành: {formatDistanceToNow(new Date(request.completed_at!), { addSuffix: true })}
                          </span>
                        )}
                      </div>

                      {request.requester_profile && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-sm">
                            <strong>Người cần giúp:</strong> {request.requester_profile.name}
                          </span>
                          <div className="flex gap-2">
                            {onStartChat && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onStartChat(request.user_id, request.requester_profile!.name, request.id)}
                                className="gap-1"
                              >
                                <MessageCircle className="w-3 h-3" />
                                Chat
                              </Button>
                            )}
                            {request.status === 'helping' && (
                              <Button
                                size="sm"
                                onClick={() => markAsCompleted(request.id)}
                                className="gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Hoàn thành
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default HelpHistory;
