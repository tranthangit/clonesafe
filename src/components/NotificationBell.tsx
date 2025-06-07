import React, { useState, useEffect, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Bell, Clock, CheckCircle, MessageCircle, AlertTriangle, Check, Trash2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'new_request' | 'message' | 'help_completed' | 'sos_accepted' | 'sos_nearby';
  title: string;
  description: string;
  created_at: string;
  is_read: boolean;
  sos_request_id?: string;
  sender_name?: string;
  sender_id?: string;
  message_id?: string;
}

interface NotificationBellProps {
  onStartChat?: (helperId: string, helperName: string, sosId: string) => void;
}

interface NotificationState {
  [notificationId: string]: {
    is_read: boolean;
    is_deleted: boolean;
  };
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onStartChat }) => {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [swipedNotificationId, setSwipedNotificationId] = useState<string | null>(null);
  const [notificationStates, setNotificationStates] = useState<NotificationState>({});

  // Load notification states from localStorage
  useEffect(() => {
    if (profile) {
      const saved = localStorage.getItem(`notification_states_${profile.id}`);
      if (saved) {
        try {
          setNotificationStates(JSON.parse(saved));
        } catch (error) {
          console.error('Error loading notification states:', error);
        }
      }
    }
  }, [profile]);

  // Save notification states to localStorage
  const saveNotificationStates = (states: NotificationState) => {
    if (profile) {
      localStorage.setItem(`notification_states_${profile.id}`, JSON.stringify(states));
      setNotificationStates(states);
    }
  };

  const getNotificationState = (notificationId: string) => {
    return notificationStates[notificationId] || { is_read: false, is_deleted: false };
  };

  const updateNotificationState = (notificationId: string, isRead: boolean = false, isDeleted: boolean = false) => {
    const newStates = {
      ...notificationStates,
      [notificationId]: { is_read: isRead, is_deleted: isDeleted }
    };
    saveNotificationStates(newStates);
  };

  useEffect(() => {
    if (profile) {
      fetchNotifications();
      
      // Set up real-time subscription for new SOS requests
      const sosChannel = supabase
        .channel('sos-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sos_requests'
          },
          (payload) => {
            // Only show notifications to volunteers who are ready
            if (profile.is_volunteer_ready && payload.new.user_id !== profile.id) {
              fetchNotifications(); // Refresh notifications
            }
          }
        )
        .subscribe();

      // Set up real-time subscription for SOS status changes (accepted)
      const sosAcceptedChannel = supabase
        .channel('sos-accepted-notifications')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sos_requests'
          },
          (payload) => {
            // Show notification if user's SOS was accepted
            if (payload.new.user_id === profile.id && 
                payload.old.status === 'active' && 
                payload.new.status === 'accepted') {
              fetchNotifications(); // Refresh notifications
            }
          }
        )
        .subscribe();

      // Set up real-time subscription for new chat messages
      const chatChannel = supabase
        .channel('message-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `receiver_id=eq.${profile.id}`
          },
          () => {
            fetchNotifications(); // Refresh notifications
          }
        )
        .subscribe();

      // Set up real-time subscription for SOS status changes
      const sosStatusChannel = supabase
        .channel('sos-status-notifications')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sos_requests'
          },
          (payload) => {
            // Show notification if user's SOS was completed
            if (payload.new.user_id === profile.id && 
                payload.old.status !== payload.new.status &&
                payload.new.status === 'completed') {
              fetchNotifications(); // Refresh notifications
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(sosChannel);
        supabase.removeChannel(sosAcceptedChannel);
        supabase.removeChannel(chatChannel);
        supabase.removeChannel(sosStatusChannel);
      };
    }
  }, [profile]);

  const fetchNotifications = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const notifications: Notification[] = [];

      // Fetch recent SOS requests for volunteers (nearby alerts)
      if (profile.is_volunteer_ready) {
        const { data: sosRequests } = await supabase
          .from('sos_requests')
          .select(`
            id,
            type,
            urgency,
            created_at,
            latitude,
            longitude,
            profiles!sos_requests_user_id_fkey(name)
          `)
          .eq('status', 'active')
          .neq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (sosRequests) {
          sosRequests.forEach(sos => {
            const notificationId = `sos-${sos.id}`;
            const state = getNotificationState(notificationId);
            
            if (!state.is_deleted) {
              notifications.push({
                id: notificationId,
                type: 'sos_nearby',
                title: 'SOS gần bạn',
                description: `${sos.type} - ${sos.urgency} từ ${sos.profiles?.name || 'Người dùng'}`,
                created_at: sos.created_at,
                is_read: state.is_read,
                sos_request_id: sos.id
              });
            }
          });
        }
      }

      // Fetch SOS requests that were accepted (for requesters)
      const { data: acceptedSOS } = await supabase
        .from('sos_requests')
        .select(`
          id,
          type,
          created_at,
          profiles!sos_requests_helper_id_fkey(name)
        `)
        .eq('user_id', profile.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(5);

      if (acceptedSOS) {
        acceptedSOS.forEach(sos => {
          const notificationId = `accepted-${sos.id}`;
          const state = getNotificationState(notificationId);
          
          if (!state.is_deleted) {
            notifications.push({
              id: notificationId,
              type: 'sos_accepted',
              title: 'Yêu cầu SOS được chấp nhận',
              description: `${sos.type} đã được chấp nhận bởi ${sos.profiles?.name || 'Người hỗ trợ'}`,
              created_at: sos.created_at,
              is_read: state.is_read,
              sos_request_id: sos.id,
              sender_name: sos.profiles?.name || 'Người hỗ trợ'
            });
          }
        });
      }

      // Fetch recent chat messages
      const { data: chatMessages } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          created_at,
          sos_request_id,
          sender_id,
          profiles!chat_messages_sender_id_fkey(name)
        `)
        .eq('receiver_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (chatMessages) {
        chatMessages.forEach(message => {
          const notificationId = `message-${message.id}`;
          const state = getNotificationState(notificationId);
          
          if (!state.is_deleted) {
            notifications.push({
              id: notificationId,
              type: 'message',
              title: 'Tin nhắn mới',
              description: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
              created_at: message.created_at,
              is_read: state.is_read,
              sos_request_id: message.sos_request_id,
              sender_name: message.profiles?.name || 'Người dùng',
              sender_id: message.sender_id,
              message_id: message.id
            });
          }
        });
      }

      // Fetch completed SOS requests where user was the requester
      const { data: completedSOS } = await supabase
        .from('sos_requests')
        .select(`
          id,
          type,
          completed_at,
          profiles!sos_requests_helper_id_fkey(name)
        `)
        .eq('user_id', profile.id)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(5);

      if (completedSOS) {
        completedSOS.forEach(sos => {
          const notificationId = `completed-${sos.id}`;
          const state = getNotificationState(notificationId);
          
          if (!state.is_deleted) {
            notifications.push({
              id: notificationId,
              type: 'help_completed',
              title: 'Hỗ trợ hoàn thành',
              description: `${sos.type} đã được hoàn thành bởi ${sos.profiles?.name || 'Người hỗ trợ'}`,
              created_at: sos.completed_at,
              is_read: state.is_read,
              sos_request_id: sos.id
            });
          }
        });
      }

      // Sort all notifications by creation time
      notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải thông báo. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notification: Notification) => {
    if (notification.is_read) return;

    // Update notification state
    updateNotificationState(notification.id, true, false);

    // Update local state
    setNotifications(prev =>
      prev.map(n =>
        n.id === notification.id
          ? { ...n, is_read: true }
          : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.is_read);
    
    // Mark all unread notifications as read
    const newStates = { ...notificationStates };
    unreadNotifications.forEach(notification => {
      newStates[notification.id] = { is_read: true, is_deleted: false };
    });
    saveNotificationStates(newStates);

    // Update local state
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    );
    setUnreadCount(0);

    toast({
      title: "Thành công",
      description: "Đã đánh dấu tất cả thông báo là đã đọc",
    });
  };

  const deleteNotification = async (notificationId: string) => {
    // Mark as deleted
    updateNotificationState(notificationId, false, true);
    
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== notificationId);
      const deletedNotification = prev.find(n => n.id === notificationId);
      
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      }
      
      return filtered;
    });
    setSwipedNotificationId(null);

    toast({
      title: "Thành công",
      description: "Đã xóa thông báo",
    });
  };

  const deleteAllNotifications = async () => {
    // Mark all notifications as deleted
    const newStates = { ...notificationStates };
    notifications.forEach(notification => {
      newStates[notification.id] = { is_read: false, is_deleted: true };
    });
    saveNotificationStates(newStates);

    setNotifications([]);
    setUnreadCount(0);

    toast({
      title: "Thành công",
      description: "Đã xóa tất cả thông báo",
    });
  };

  const handleNotificationClick = (notification: Notification) => {
    console.log('Notification clicked:', notification);
    markAsRead(notification);

    // Handle different notification types
    if (notification.type === 'message' && notification.sender_id && notification.sender_name && notification.sos_request_id && onStartChat) {
      onStartChat(notification.sender_id, notification.sender_name, notification.sos_request_id);
      setIsOpen(false);
    }
  };

  const handleTriggerClick = () => {
    console.log('Notification bell clicked, current isOpen:', isOpen);
    setIsOpen(!isOpen);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_request':
      case 'sos_nearby':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'sos_accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'message':
        return <MessageCircle className="w-4 h-4 text-blue-600" />;
      case 'help_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleSwipeStart = (e: React.TouchEvent, notificationId: string) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    
    const handleSwipeMove = (moveEvent: TouchEvent) => {
      const currentTouch = moveEvent.touches[0];
      const deltaX = startX - currentTouch.clientX;
      
      if (deltaX > 100) {
        setSwipedNotificationId(notificationId);
        document.removeEventListener('touchmove', handleSwipeMove);
        document.removeEventListener('touchend', handleSwipeEnd);
      }
    };
    
    const handleSwipeEnd = () => {
      document.removeEventListener('touchmove', handleSwipeMove);
      document.removeEventListener('touchend', handleSwipeEnd);
    };
    
    document.addEventListener('touchmove', handleSwipeMove);
    document.addEventListener('touchend', handleSwipeEnd);
  };

  const NotificationContent = () => (
    <div className="flex flex-col h-full">
      {/* Header with actions */}
      <div className="flex justify-between items-center p-3 border-b">
        <h3 className="font-semibold">Thông báo</h3>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-blue-600 hover:text-blue-700"
            >
              <Check className="w-4 h-4 mr-1" />
              Đọc hết
            </Button>
          )}
          {notifications.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Xóa hết
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa tất cả thông báo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Hành động này sẽ xóa vĩnh viễn tất cả thông báo. Bạn không thể hoàn tác sau khi xóa.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAllNotifications} className="bg-red-600 hover:bg-red-700">
                    Xóa tất cả
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Không có thông báo nào
          </div>
        ) : (
          <div className="space-y-2 p-1">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`relative border rounded-lg transition-all duration-200 ${
                  swipedNotificationId === notification.id ? 'transform translate-x-[-100px]' : ''
                } ${!notification.is_read ? 'bg-blue-50 border-blue-200' : ''}`}
                onTouchStart={(e) => handleSwipeStart(e, notification.id)}
              >
                <div className="flex items-start gap-3 p-3">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Content */}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer hover:bg-gray-50 transition-colors p-1 rounded"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.description}
                    </p>
                    {notification.sender_name && (
                      <p className="text-xs text-gray-500 mt-1">
                        Từ: {notification.sender_name}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Always visible delete button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 text-gray-400 hover:text-red-600 p-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Xóa thông báo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bạn có chắc chắn muốn xóa thông báo này? Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteNotification(notification.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Xóa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Swipe delete button for mobile */}
                {swipedNotificationId === notification.id && (
                  <div className="absolute right-[-80px] top-0 h-full flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                      className="h-full bg-red-500 hover:bg-red-600 text-white rounded-l-none px-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // Fix React ref warning by using forwardRef for the trigger button
  const TriggerButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>((props, ref) => (
    <Button 
      ref={ref}
      variant="ghost" 
      size="sm" 
      className="relative"
      onClick={handleTriggerClick}
      {...props}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Button>
  ));

  TriggerButton.displayName = 'TriggerButton';

  return isMobile ? (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <TriggerButton />
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg">Thông báo</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-hidden px-4 pb-6">
          <NotificationContent />
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <TriggerButton />
      </DialogTrigger>
      <DialogContent className="max-w-md h-[500px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Thông báo</DialogTitle>
          <DialogDescription className="sr-only">
            Danh sách thông báo của bạn
          </DialogDescription>
        </DialogHeader>
        <NotificationContent />
      </DialogContent>
    </Dialog>
  );
};

export default NotificationBell;