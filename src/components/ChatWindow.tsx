import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string | null;
  is_read: boolean | null;
}

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  receiverId: string;
  receiverName: string;
  sosRequestId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  isOpen,
  onClose,
  receiverId,
  receiverName,
  sosRequestId
}) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isOpen && profile) {
      fetchMessages();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('chat-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `sos_request_id=eq.${sosRequestId}`
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, profile, sosRequestId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('sos_request_id', sosRequestId)
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      
      // Mark messages as read
      await markMessagesAsRead();
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!profile) return;

    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('sos_request_id', sosRequestId)
        .eq('receiver_id', profile.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          content: newMessage.trim(),
          sender_id: profile.id,
          receiver_id: receiverId,
          sos_request_id: sosRequestId
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderChatContent = () => (
    <>
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === profile?.id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.sender_id === profile?.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender_id === profile?.id
                        ? 'text-blue-100'
                        : 'text-gray-500'
                    }`}
                  >
                    {message.created_at ? formatDistanceToNow(new Date(message.created_at), { addSuffix: true }) : 'Unknown'}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhập tin nhắn..."
            className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            rows={2}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            size="sm"
            className="self-end bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-w-md h-[600px] flex flex-col p-0">
            <DrawerHeader className="p-4 border-b bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <DrawerTitle className="text-left text-lg font-semibold text-blue-800">
                    {receiverName}
                  </DrawerTitle>
                  <p className="text-sm text-blue-600 mt-1">Người giúp đỡ</p>
                </div>
              </div>
            </DrawerHeader>
            {renderChatContent()}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-md h-[600px] flex flex-col p-0">
            <DialogHeader className="p-4 border-b bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-left text-lg font-semibold text-blue-800">
                    {receiverName}
                  </DialogTitle>
                  <p className="text-sm text-blue-600 mt-1">Người giúp đỡ</p>
                </div>
              </div>
            </DialogHeader>
            {renderChatContent()}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ChatWindow;
