import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Send, User, Plus, MessageCircle, Bell } from "lucide-react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import NewConnectionDialog from "@/components/chat/NewConnectionDialog";
import PendingRequestsDialog from "@/components/chat/PendingRequestsDialog";
import { getConversations, getMessages, markAsRead, createConversation } from "@/api/chat";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";

interface Message {
    _id: string;
    content: string;
    senderId: {
        _id: string;
        name: string;
        role: string;
    };
    createdAt: string;
}

interface Conversation {
    id: string;
    participants: Array<{
        userId: {
            _id: string;
            name: string;
            role: string;
        };
        userRole: string;
    }>;
    otherParticipants: Array<{
        userId: {
            _id: string;
            name: string;
            role: string;
        };
    }>;
    lastMessage?: {
        content: string;
        createdAt: string;
    };
    unreadCount: number;
    status: string;
    requestedBy?: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
}

const Chat = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [pendingRequests, setPendingRequests] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [showNewConnectionDialog, setShowNewConnectionDialog] = useState(false);
    const [showPendingRequestsDialog, setShowPendingRequestsDialog] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const currentUserId = localStorage.getItem("user-id");

    // WebSocket message handler
    const handleWebSocketMessage = (message: any) => {
        if (message.type === "NEW_MESSAGE") {
            // Add message to conversation if it's the active one
            if (message.conversationId === activeConversation?.id) {
                setMessages((prev) => [...prev, message.message]);
                // Mark as read
                markAsRead(message.conversationId);
            }
            // Always update conversation list to update last message
            loadConversations();
        } else if (message.type === "MESSAGE_SENT") {
            // Message sent by current user - already added optimistically
            // Just update conversation list to update last message time
            loadConversations();
        } else if (message.type === "NEW_CHAT_REQUEST") {
            // New chat request received
            toast({
                title: "New Chat Request",
                description: `${message.conversation.requestedBy.name} wants to chat with you`,
            });
            loadConversations();
        } else if (message.type === "CHAT_REQUEST_ACCEPTED") {
            // Chat request accepted
            toast({
                title: "Chat Request Accepted",
                description: "You can now start chatting",
            });
            loadConversations();
        } else if (message.type === "CHAT_REQUEST_REJECTED") {
            // Chat request rejected
            toast({
                title: "Chat Request Rejected",
                description: "Your chat request was declined",
                variant: "destructive",
            });
            loadConversations();
        }
    };

    const { sendMessage: sendWebSocketMessage } = useWebSocket(handleWebSocketMessage);

    // Load conversations on mount
    useEffect(() => {
        const authenticated = localStorage.getItem("homemate-authenticated");
        if (!authenticated) {
            navigate("/");
            return;
        }
        loadConversations();
    }, [navigate]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const loadConversations = async () => {
        try {
            const response = await getConversations();
            if (response.success) {
                setConversations(response.data.conversations);
                setPendingRequests(response.data.pendingRequests || []);
            }
        } catch (error: any) {
            console.error("Failed to load conversations:", error);
        }
    };

    const loadMessages = async (conversationId: string) => {
        try {
            const response = await getMessages(conversationId);
            if (response.success) {
                setMessages(response.data.messages);
                // Mark messages as read
                await markAsRead(conversationId);
                // Reload conversations to update unread count
                loadConversations();
            }
        } catch (error: any) {
            console.error("Failed to load messages:", error);
        }
    };

    const handleSelectConversation = (conversation: Conversation) => {
        setActiveConversation(conversation);
        loadMessages(conversation.id);
    };

    const handleNewConnection = async (user: any) => {
        try {
            const response = await createConversation(user._id);
            if (response.success) {
                const conversation = response.data.conversation;
                await loadConversations();

                // Find the conversation in the updated list
                const conv = conversations.find(c => c.id === conversation._id);
                if (conv) {
                    handleSelectConversation(conv);
                }

                if (!response.data.isNew) {
                    toast({
                        title: "Conversation exists",
                        description: `You already have a conversation with ${user.name}`,
                    });
                }
            }
        } catch (error: any) {
            toast({
                title: "Failed to create conversation",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleSendMessage = () => {
        if (!newMessage.trim() || !activeConversation) return;

        // Check if conversation is accepted
        if (activeConversation.status !== 'accepted') {
            toast({
                title: "Cannot send message",
                description: "Please wait for the chat request to be accepted",
                variant: "destructive",
            });
            return;
        }

        const messageContent = newMessage.trim();

        // Optimistic UI update - add message immediately
        const optimisticMessage = {
            _id: `temp-${Date.now()}`,
            content: messageContent,
            senderId: {
                _id: currentUserId || '',
                name: 'You',
                role: ''
            },
            createdAt: new Date().toISOString()
        };
        setMessages((prev) => [...prev, optimisticMessage]);
        setNewMessage("");

        // Send via WebSocket
        sendWebSocketMessage({
            type: "SEND_MESSAGE",
            data: {
                conversationId: activeConversation.id,
                content: messageContent,
                messageType: "TEXT",
            },
        });
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        // Today - just show time
        if (diffDays === 0) {
            return timeStr;
        }

        // Yesterday
        if (diffDays === 1) {
            return `Yesterday, ${timeStr}`;
        }

        // This week (within 7 days) - show day name
        if (diffDays < 7) {
            const dayName = date.toLocaleDateString([], { weekday: 'long' });
            return `${dayName}, ${timeStr}`;
        }

        // Older - show full date
        const dateStr = date.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            year: diffDays > 365 ? 'numeric' : undefined
        });
        return `${dateStr}, ${timeStr}`;
    };

    return (
        <Layout isAuthenticated>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
                        {/* Conversation List Sidebar */}
                        <div className="col-span-12 md:col-span-4 rounded-2xl border-2 border-border bg-card overflow-hidden flex flex-col">
                            {/* Header with New Connection Button */}
                            <div className="border-b border-border p-4 flex items-center justify-between">
                                <h2 className="font-semibold text-lg">Messages</h2>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setShowPendingRequestsDialog(true)}
                                        className="relative"
                                    >
                                        <Bell className="h-4 w-4" />
                                        {pendingRequests.length > 0 && (
                                            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                                                {pendingRequests.length}
                                            </span>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => setShowNewConnectionDialog(true)}
                                        className="hover-invert gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        New
                                    </Button>
                                </div>
                            </div>

                            {/* Conversations */}
                            <ScrollArea className="flex-1">
                                {conversations.length > 0 ? (
                                    <div className="p-2 space-y-1">
                                        {conversations.map((conversation) => {
                                            const otherUser = conversation.otherParticipants?.[0]?.userId;
                                            const isActive = activeConversation?.id === conversation.id;

                                            // Skip if no other user data
                                            if (!otherUser) {
                                                console.warn('Conversation missing otherParticipants:', conversation);
                                                return null;
                                            }

                                            return (
                                                <button
                                                    key={conversation.id}
                                                    onClick={() => handleSelectConversation(conversation)}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                                                        }`}
                                                >
                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? "bg-primary-foreground/20" : "bg-primary/10"
                                                        }`}>
                                                        <User className={`h-5 w-5 ${isActive ? "text-primary-foreground" : "text-primary"}`} />
                                                    </div>
                                                    <div className="flex-1 text-left min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-medium truncate">{otherUser.name}</p>
                                                            {conversation.unreadCount > 0 && (
                                                                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                                                                    {conversation.unreadCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={`text-sm truncate ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                                            {conversation.lastMessage?.content || "No messages yet"}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-center p-4">
                                        <div>
                                            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                            <p className="text-sm text-muted-foreground">No conversations yet</p>
                                            <p className="text-xs text-muted-foreground mt-1">Click "New" to start chatting</p>
                                        </div>
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        {/* Message View */}
                        <div className="col-span-12 md:col-span-8 rounded-2xl border-2 border-border bg-card overflow-hidden flex flex-col">
                            {activeConversation ? (
                                <>
                                    {/* Chat Header */}
                                    <div className="border-b border-border p-4 flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="font-semibold">
                                                {activeConversation.otherParticipants[0]?.userId.name || "Unknown"}
                                            </h2>
                                            <p className="text-sm text-muted-foreground">
                                                {activeConversation.otherParticipants[0]?.userId.role.charAt(0) +
                                                    activeConversation.otherParticipants[0]?.userId.role.slice(1).toLowerCase()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                                        <div className="space-y-4">
                                            {messages.map((message) => {
                                                const isOwnMessage = message.senderId._id === currentUserId;

                                                return (
                                                    <div
                                                        key={message._id}
                                                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                                                    >
                                                        <div
                                                            className={`max-w-[70%] rounded-2xl px-4 py-3 ${isOwnMessage
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-muted"
                                                                }`}
                                                        >
                                                            <p>{message.content}</p>
                                                            <p
                                                                className={`text-xs mt-1 ${isOwnMessage
                                                                    ? "text-primary-foreground/70"
                                                                    : "text-muted-foreground"
                                                                    }`}
                                                            >
                                                                {formatTime(message.createdAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>

                                    {/* Input */}
                                    <div className="border-t border-border p-4">
                                        {activeConversation.status === 'pending' ? (
                                            <div className="text-center py-4">
                                                <p className="text-sm text-muted-foreground">
                                                    {activeConversation.requestedBy?._id === currentUserId
                                                        ? "Waiting for the other person to accept your chat request..."
                                                        : "You have a pending chat request. Please accept or reject it from the pending requests."}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Type a message..."
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    onKeyPress={handleKeyPress}
                                                    className="flex-1"
                                                />
                                                <Button onClick={handleSendMessage} className="hover-invert">
                                                    <Send className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center text-center p-4">
                                    <div>
                                        <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="font-semibold text-lg mb-2">Select a conversation</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Choose a conversation from the list or start a new one
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* New Connection Dialog */}
            <NewConnectionDialog
                open={showNewConnectionDialog}
                onOpenChange={setShowNewConnectionDialog}
                onSelectUser={handleNewConnection}
            />

            {/* Pending Requests Dialog */}
            <PendingRequestsDialog
                open={showPendingRequestsDialog}
                onOpenChange={setShowPendingRequestsDialog}
                pendingRequests={pendingRequests as any}
                onRequestHandled={loadConversations}
            />
        </Layout>
    );
};

export default Chat;
