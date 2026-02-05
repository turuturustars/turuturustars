import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePrivateMessages, PrivateConversation } from '@/hooks/usePrivateMessages';
import { usePrivateMessageNotifications } from '@/hooks/usePrivateMessageNotifications';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AccessibleButton, AccessibleStatus, useStatus } from '@/components/accessible';
import { OptimizedAvatarImage } from '@/components/ui/OptimizedAvatarImage';
import { MessageCircle, Search, Plus, ArrowLeft, Send, Loader2, Users, Bell, BellOff, Edit2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MemberProfile {
  id: string;
  full_name: string;
  photo_url: string | null;
}

export default function PrivateMessagesPage() {
  const { user } = useAuth();
  const { status, showSuccess } = useStatus();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const { preferences: notificationPreferences } = useNotificationPreferences(user?.id);

  const { 
    conversations, 
    messages, 
    isLoading, 
    startConversation, 
    sendPrivateMessage,
    refreshMessages 
  } = usePrivateMessages(selectedConversationId || undefined);

  // Setup notification hook for incoming messages
  const {
    isNotificationsEnabled: checkNotificationsEnabled,
    enableNotifications,
    disableNotifications,
    requestPermission,
    isNotificationsSupported,
  } = usePrivateMessageNotifications(
    messages,
    user?.id,
    selectedConversationId || undefined,
    {
      enabled: (notificationPreferences?.enable_messages ?? true) && (notificationPreferences?.push ?? true),
      onNotificationClick: (conversationId) => {
        setSelectedConversationId(conversationId);
      },
    }
  );

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  // Initialize notification state
  useEffect(() => {
    if (isNotificationsSupported()) {
      setNotificationsEnabled(checkNotificationsEnabled());
    }
  }, [isNotificationsSupported, checkNotificationsEnabled]);

  // Fetch members for new conversation
  const fetchMembers = async () => {
    if (!user) return;
    setLoadingMembers(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url')
        .neq('id', user.id)
        .order('full_name');
      
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (showNewConversation) {
      fetchMembers();
    }
  }, [showNewConversation]);

  const handleStartConversation = async (memberId: string) => {
    try {
      const convId = await startConversation(memberId);
      setSelectedConversationId(convId);
      setShowNewConversation(false);
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessageText.trim() || sending) return;
    
    setSending(true);
    const messageToSend = newMessageText.trim();
    setNewMessageText('');

    try {
      await sendPrivateMessage(messageToSend);
      refreshMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessageText(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      disableNotifications();
      setNotificationsEnabled(false);
    } else {
      try {
        const granted = await requestPermission();
        if (granted) {
          enableNotifications();
          setNotificationsEnabled(true);
        }
      } catch (err) {
        console.error('Error enabling notifications:', err);
      }
    }
  };

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editingContent.trim()) return;
    
    try {
      const { error } = await supabase
        .from('private_messages')
        .update({ content: editingContent.trim() })
        .eq('id', messageId);

      if (error) throw error;
      
      setEditingMessageId(null);
      setEditingContent('');
      refreshMessages();
    } catch (err) {
      console.error('Error updating message:', err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!globalThis.confirm('Delete this message?')) return;
    
    setDeletingMessageId(messageId);
    try {
      const { error } = await supabase
        .from('private_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      
      refreshMessages();
    } catch (err) {
      console.error('Error deleting message:', err);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_participant?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mobile: Show either list or conversation
  const showConversationView = selectedConversationId !== null;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-purple-50/40 to-transparent p-5 shadow-sm">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-24 w-24 rounded-full bg-purple-200/30 blur-2xl" />
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Messages</h1>
              <p className="text-sm text-muted-foreground">Private conversations with members</p>
            </div>
          </div>
          {isNotificationsSupported() && (
            <AccessibleButton
              size="sm"
              variant={notificationsEnabled ? 'default' : 'outline'}
              onClick={() => {
                handleToggleNotifications();
                showSuccess(notificationsEnabled ? 'Notifications disabled' : 'Notifications enabled', 2000);
              }}
              className="h-9 gap-2"
              ariaLabel={notificationsEnabled ? 'Disable message notifications' : 'Enable message notifications'}
            >
              {notificationsEnabled ? (
                <>
                  <Bell className="h-4 w-4" />
                  Notifications On
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4" />
                  Notifications Off
                </>
              )}
            </AccessibleButton>
          )}
        </div>
      </div>

      <div className="h-[calc(100vh-12rem)] flex flex-col md:flex-row gap-4">
      <AccessibleStatus 
        message={status.message} 
        type={status.type} 
        isVisible={status.isVisible} 
      />
      {/* Conversations List */}
      <Card className={`md:w-80 lg:w-96 flex flex-col border-2 shadow-sm ${showConversationView ? 'hidden md:flex' : 'flex'}`}>
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages
            </CardTitle>
            <div className="flex items-center gap-1">
              <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
                <DialogTrigger asChild>
                  <AccessibleButton size="sm" variant="outline" ariaLabel="Start a new conversation">
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </AccessibleButton>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Start New Conversation
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <ScrollArea className="h-64">
                    {loadingMembers ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {filteredMembers.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => handleStartConversation(member.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                          >
                            <OptimizedAvatarImage
                              photoUrl={member.photo_url}
                              fallback={member.full_name.charAt(0).toUpperCase()}
                              size={40}
                              className="h-10 w-10"
                            />
                            <span className="font-medium">{member.full_name}</span>
                          </button>
                        ))}
                        {filteredMembers.length === 0 && !loadingMembers && (
                          <p className="text-center text-muted-foreground py-8">
                            No members found
                          </p>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No conversations yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Start a new conversation with a member
                </p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isSelected={conv.id === selectedConversationId}
                    onClick={() => setSelectedConversationId(conv.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Conversation View */}
      <Card className={`flex-1 flex flex-col border-2 shadow-sm ${showConversationView ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            {/* Header */}
            <CardHeader className="pb-3 flex-shrink-0 border-b">
              <div className="flex items-center gap-3">
                <AccessibleButton
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedConversationId(null)}
                  ariaLabel="Back to conversations list"
                >
                  <ArrowLeft className="h-5 w-5" />
                </AccessibleButton>
                <OptimizedAvatarImage
                  photoUrl={selectedConversation.other_participant?.photo_url}
                  fallback={selectedConversation.other_participant?.full_name.charAt(0).toUpperCase() || 'M'}
                  size={40}
                  className="h-10 w-10"
                />
                <div>
                  <h3 className="font-semibold">
                    {selectedConversation.other_participant?.full_name}
                  </h3>
                  <p className="text-xs text-muted-foreground">Private conversation</p>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    const isEditing = editingMessageId === msg.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                      >
                        <div className={`max-w-[80%] ${isOwn ? 'order-2' : ''}`}>
                          {isEditing ? (
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg border border-primary bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveEdit(msg.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingMessageId(null);
                                    setEditingContent('');
                                  }
                                }}
                                autoFocus
                              />
                              <AccessibleButton
                                size="sm"
                                onClick={() => {
                                  handleSaveEdit(msg.id);
                                  showSuccess('Message updated', 2000);
                                }}
                                className="h-9"
                                ariaLabel="Save message changes"
                              >
                                Save
                              </AccessibleButton>
                              <AccessibleButton
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditingContent('');
                                }}
                                className="h-9"
                                ariaLabel="Cancel editing"
                              >
                                Cancel
                              </AccessibleButton>
                            </div>
                          ) : (
                            <>
                              <div
                                className={`px-4 py-2.5 rounded-2xl ${
                                  isOwn
                                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                                    : 'bg-muted rounded-bl-sm'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              </div>
                              {isOwn && (
                                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <AccessibleButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditMessage(msg.id, msg.content)}
                                    className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    ariaLabel="Edit this message"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </AccessibleButton>
                                  <AccessibleButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      handleDeleteMessage(msg.id);
                                      showSuccess('Message deleted', 2000);
                                    }}
                                    disabled={deletingMessageId === msg.id}
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    ariaLabel="Delete this message"
                                  >
                                    {deletingMessageId === msg.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                  </AccessibleButton>
                                </div>
                              )}
                            </>
                          )}
                          <p className={`text-[10px] text-muted-foreground mt-1 ${isOwn ? 'text-right' : ''}`}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        No messages yet. Start the conversation!
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>

            {/* Input */}
            <div className="p-4 border-t flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sending}
                />
                <AccessibleButton
                  onClick={() => {
                    handleSendMessage();
                    showSuccess('Message sent', 1500);
                  }}
                  disabled={!newMessageText.trim() || sending}
                  size="icon"
                  ariaLabel="Send message"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </AccessibleButton>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg">Select a conversation</h3>
              <p className="text-muted-foreground mt-1">
                Choose a conversation from the list or start a new one
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// Conversation List Item
function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  readonly conversation: PrivateConversation;
  readonly isSelected: boolean;
  readonly onClick: () => void;
}) {
  const { other_participant, last_message, unread_count } = conversation;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
        isSelected
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-muted'
      }`}
    >
      <OptimizedAvatarImage
        photoUrl={other_participant?.photo_url}
        fallback={other_participant?.full_name.charAt(0).toUpperCase() || 'M'}
        size={48}
        className="h-12 w-12 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium truncate">
            {other_participant?.full_name}
          </span>
          {last_message && (
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(last_message.created_at), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm text-muted-foreground truncate">
            {last_message?.content || 'No messages yet'}
          </p>
          {(unread_count ?? 0) > 0 && (
            <Badge variant="default" className="ml-2 h-5 min-w-5 flex items-center justify-center">
              {unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
