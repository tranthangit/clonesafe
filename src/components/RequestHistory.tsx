import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { History, Clock, CheckCircle, XCircle, MessageCircle, UserCheck, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface RequestHistoryItem {
  id: string;
  type: string;
  description: string;
  urgency: string;
  status: string | null;
  created_at: string | null;
  completed_at?: string | null;
  helper_id?: string | null;
  helper_profile?: {
    name: string;
  } | null;
}

interface HelpOffer {
  id: string;
  volunteer_id: string;
  sos_request_id: string;
  status: string;
  created_at: string;
  profiles: {
    name: string;
  };
}

interface RequestHistoryProps {
  onStartChat?: (helperId: string, helperName: string, sosId: string) => void;
}

const RequestHistory: React.FC<RequestHistoryProps> = ({ onStartChat }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestHistoryItem[]>([]);
  const [helpOffers, setHelpOffers] = useState<{ [key: string]: HelpOffer[] }>({});
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isOpen && profile) {
      fetchRequestHistory();
    }
  }, [isOpen, profile]);

  const fetchRequestHistory = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sos_requests')
        .select(`
          *,
          helper_profile:profiles!sos_requests_helper_id_fkey(name)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);

      // Fetch help offers for active requests
      const activeRequests = data?.filter(req => req.status === 'active') || [];
      if (activeRequests.length > 0) {
        await fetchHelpOffers(activeRequests.map(req => req.id));
      }
    } catch (error) {
      console.error('Error fetching request history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHelpOffers = async (sosRequestIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('help_offers')
        .select(`
          *,
          profiles!help_offers_volunteer_id_fkey(name)
        `)
        .in('sos_request_id', sosRequestIds)
        .eq('status', 'pending');

      if (error) throw error;

      // Group help offers by SOS request ID
      const offersMap: { [key: string]: HelpOffer[] } = {};
      sosRequestIds.forEach(id => {
        offersMap[id] = [];
      });

      data?.forEach(offer => {
        if (offersMap[offer.sos_request_id]) {
          offersMap[offer.sos_request_id].push(offer);
        }
      });

      setHelpOffers(offersMap);
    } catch (error) {
      console.error('Error fetching help offers:', error);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('sos_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('user_id', profile?.id || '');

      if (error) throw error;

      toast({
        title: "Đã hủy yêu cầu",
        description: "Yêu cầu SOS đã được hủy thành công"
      });

      fetchRequestHistory();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: "Lỗi",
        description: "Không thể hủy yêu cầu. Vui lòng thử lại.",
        variant: "destructive"
      });
    }
  };

  const handleAcceptHelp = async (requestId: string, offerId: string, helperId: string) => {
    try {
      // Update the SOS request to set helper and change status to helping
      const { error: sosError } = await supabase
        .from('sos_requests')
        .update({ 
          status: 'helping',
          helper_id: helperId
        })
        .eq('id', requestId)
        .eq('user_id', profile?.id || '');

      if (sosError) throw sosError;

      // Update the accepted help offer status
      const { error: offerError } = await supabase
        .from('help_offers')
        .update({ status: 'accepted' })
        .eq('id', offerId);

      if (offerError) throw offerError;

      // Reject other pending offers for this SOS
      const { error: rejectError } = await supabase
        .from('help_offers')
        .update({ status: 'rejected' })
        .eq('sos_request_id', requestId)
        .neq('id', offerId)
        .eq('status', 'pending');

      if (rejectError) throw rejectError;

      toast({
        title: "Đã chấp nhận trợ giúp",
        description: "Bạn đã chấp nhận lời đề nghị giúp đỡ"
      });

      fetchRequestHistory();
    } catch (error) {
      console.error('Error accepting help:', error);
      toast({
        title: "Lỗi",
        description: "Không thể chấp nhận trợ giúp. Vui lòng thử lại.",
        variant: "destructive"
      });
    }
  };

  const handleRejectHelp = async (offerId: string) => {
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

      fetchRequestHistory();
    } catch (error) {
      console.error('Error rejecting help offer:', error);
      toast({
        title: "Lỗi",
        description: "Không thể từ chối lời đề nghị giúp đỡ. Vui lòng thử lại.",
        variant: "destructive"
      });
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('sos_requests')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('user_id', profile?.id || '');

      if (error) throw error;

      toast({
        title: "Đã hoàn thành",
        description: "Yêu cầu SOS đã được đánh dấu hoàn thành"
      });

      fetchRequestHistory();
    } catch (error) {
      console.error('Error completing request:', error);
      toast({
        title: "Lỗi",
        description: "Không thể hoàn thành yêu cầu. Vui lòng thử lại.",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'helping':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    const variants = {
      'completed': 'default',
      'helping': 'secondary',
      'cancelled': 'destructive',
      'active': 'outline'
    } as const;

    const labels = {
      'completed': 'Hoàn thành',
      'helping': 'Đang giúp đỡ',
      'cancelled': 'Đã hủy',
      'active': 'Đang chờ'
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

  return (
    <>
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full" title="Lịch sử yêu cầu">
              <History className="h-5 w-5" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="sm:max-w-[425px]">
            <DrawerHeader>
              <DrawerTitle>Lịch sử yêu cầu SOS</DrawerTitle>
            </DrawerHeader>
            <ScrollArea className="h-[80vh] w-full rounded-md border p-4 overflow-x-hidden">
              {loading ? (
                <div className="flex h-full items-center justify-center">Đang tải...</div>
              ) : requests.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  Chưa có yêu cầu nào
                </div>
              ) : (
                <div className="space-y-4 animate-slide-in-right sm:animate-none">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md sm:p-3"
                    >
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
                          Tạo lúc: {formatDistanceToNow(new Date(request.created_at!), { addSuffix: true })}
                        </span>
                        {request.completed_at && (
                          <span>
                            Hoàn thành: {formatDistanceToNow(new Date(request.completed_at!), { addSuffix: true })}
                          </span>
                        )}
                      </div>

                      {/* Action buttons for different statuses */}
                      {request.status === 'active' && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelRequest(request.id)}
                            className="gap-1"
                          >
                            <X className="w-3 h-3" />
                            Hủy yêu cầu
                          </Button>
                          
                          {/* Show help offers if any */}
                          {helpOffers[request.id] && helpOffers[request.id].length > 0 && (
                            <div className="w-full mt-2">
                              <p className="text-xs text-gray-600 mb-2">Lời đề nghị giúp đỡ:</p>
                              <div className="space-y-1">
                                {helpOffers[request.id].map((offer) => (
                                  <div key={offer.id} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                                    <span className="text-sm">{offer.profiles.name}</span>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        onClick={() => handleAcceptHelp(request.id, offer.id, offer.volunteer_id)}
                                        className="gap-1 bg-green-600 hover:bg-green-700"
                                      >
                                        <UserCheck className="w-3 h-3" />
                                        Chấp nhận
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRejectHelp(offer.id)}
                                        className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                                      >
                                        <X className="w-3 h-3" />
                                        Từ chối
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {request.status === 'helping' && request.helper_profile && request.helper_id && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          <span className="text-sm">
                            <strong>Người giúp đỡ:</strong> {request.helper_profile.name}
                          </span>
                          <div className="flex gap-2 w-full mt-2">
                            {onStartChat && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onStartChat(request.helper_id!, request.helper_profile!.name, request.id)}
                                className="gap-1"
                              >
                                <MessageCircle className="w-3 h-3" />
                                Chat
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleCompleteRequest(request.id)}
                              className="gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Hoàn thành
                            </Button>
                          </div>
                        </div>
                      )}

                      {request.status === 'completed' && request.helper_profile && request.helper_id && onStartChat && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-sm">
                            <strong>Người giúp đỡ:</strong> {request.helper_profile.name}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStartChat(request.helper_id!, request.helper_profile!.name, request.id)}
                            className="gap-1"
                          >
                            <MessageCircle className="w-3 h-3" />
                            Chat
                          </Button>
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
            <Button variant="outline" size="icon" className="rounded-full" title="Lịch sử yêu cầu">
              <History className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Lịch sử yêu cầu SOS</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[80vh] w-full rounded-md border p-4 overflow-x-hidden">
              {loading ? (
                <div className="flex h-full items-center justify-center">Đang tải...</div>
              ) : requests.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  Chưa có yêu cầu nào
                </div>
              ) : (
                <div className="space-y-4 animate-slide-in-right sm:animate-none">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md sm:p-3"
                    >
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
                          Tạo lúc: {formatDistanceToNow(new Date(request.created_at!), { addSuffix: true })}
                        </span>
                        {request.completed_at && (
                          <span>
                            Hoàn thành: {formatDistanceToNow(new Date(request.completed_at!), { addSuffix: true })}
                          </span>
                        )}
                      </div>

                      {/* Action buttons for different statuses */}
                      {request.status === 'active' && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelRequest(request.id)}
                            className="gap-1"
                          >
                            <X className="w-3 h-3" />
                            Hủy yêu cầu
                          </Button>
                          
                          {/* Show help offers if any */}
                          {helpOffers[request.id] && helpOffers[request.id].length > 0 && (
                            <div className="w-full mt-2">
                              <p className="text-xs text-gray-600 mb-2">Lời đề nghị giúp đỡ:</p>
                              <div className="space-y-1">
                                {helpOffers[request.id].map((offer) => (
                                  <div key={offer.id} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                                    <span className="text-sm">{offer.profiles.name}</span>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        onClick={() => handleAcceptHelp(request.id, offer.id, offer.volunteer_id)}
                                        className="gap-1 bg-green-600 hover:bg-green-700"
                                      >
                                        <UserCheck className="w-3 h-3" />
                                        Chấp nhận
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRejectHelp(offer.id)}
                                        className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                                      >
                                        <X className="w-3 h-3" />
                                        Từ chối
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {request.status === 'helping' && request.helper_profile && request.helper_id && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          <span className="text-sm">
                            <strong>Người giúp đỡ:</strong> {request.helper_profile.name}
                          </span>
                          <div className="flex gap-2 w-full mt-2">
                            {onStartChat && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onStartChat(request.helper_id!, request.helper_profile!.name, request.id)}
                                className="gap-1"
                              >
                                <MessageCircle className="w-3 h-3" />
                                Chat
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleCompleteRequest(request.id)}
                              className="gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Hoàn thành
                            </Button>
                          </div>
                        </div>
                      )}

                      {request.status === 'completed' && request.helper_profile && request.helper_id && onStartChat && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-sm">
                            <strong>Người giúp đỡ:</strong> {request.helper_profile.name}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStartChat(request.helper_id!, request.helper_profile!.name, request.id)}
                            className="gap-1"
                          >
                            <MessageCircle className="w-3 h-3" />
                            Chat
                          </Button>
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

export default RequestHistory;
