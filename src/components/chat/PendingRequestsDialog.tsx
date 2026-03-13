import { useState } from "react";
import { Check, X, User, Inbox } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { updateConversationStatus } from "@/api/chat";
import { useToast } from "@/hooks/use-toast";

interface PendingRequest {
    id: string;
    requestedBy: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
    participants: Array<{
        userId: {
            _id: string;
            name: string;
            role: string;
        };
        userRole: string;
    }>;
    status: string;
}

interface PendingRequestsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pendingRequests: PendingRequest[];
    onRequestHandled: () => void;
}

const PendingRequestsDialog = ({
    open,
    onOpenChange,
    pendingRequests,
    onRequestHandled
}: PendingRequestsDialogProps) => {
    const { toast } = useToast();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const currentUserId = localStorage.getItem("user-id");

    const handleAccept = async (conversationId: string, senderName: string) => {
        setProcessingId(conversationId);
        try {
            const response = await updateConversationStatus(conversationId, 'accepted');
            if (response.success) {
                toast({
                    title: "Request Accepted",
                    description: `You can now chat with ${senderName}`,
                });
                onRequestHandled();
            }
        } catch (error: any) {
            toast({
                title: "Failed to accept request",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (conversationId: string, senderName: string) => {
        setProcessingId(conversationId);
        try {
            const response = await updateConversationStatus(conversationId, 'rejected');
            if (response.success) {
                toast({
                    title: "Request Rejected",
                    description: `You rejected the chat request from ${senderName}`,
                });
                onRequestHandled();
            }
        } catch (error: any) {
            toast({
                title: "Failed to reject request",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    // Filter to show only requests sent TO the current user (not BY the current user)
    const incomingRequests = pendingRequests.filter(
        req => req.requestedBy._id !== currentUserId
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Pending Chat Requests</DialogTitle>
                    <DialogDescription>
                        Accept or reject incoming chat requests
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[400px] pr-4">
                    {incomingRequests.length > 0 ? (
                        <div className="space-y-3">
                            {incomingRequests.map((request) => {
                                const sender = request.requestedBy;
                                const isProcessing = processingId === request.id;

                                return (
                                    <div
                                        key={request.id}
                                        className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <User className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{sender.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {sender.role.charAt(0) + sender.role.slice(1).toLowerCase()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleAccept(request.id, sender.name)}
                                                disabled={isProcessing}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleReject(request.id, sender.name)}
                                                disabled={isProcessing}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Inbox className="h-16 w-16 text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground">
                                No pending chat requests
                            </p>
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default PendingRequestsDialog;
