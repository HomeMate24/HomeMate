import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shop } from '@/api/shop';
import { Phone, Store, MessageCircle, User } from 'lucide-react';

interface ShopDetailsDialogProps {
    shop: Shop | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChatClick: (shop: Shop) => void;
    chatRequestSent: boolean;
}

export const ShopDetailsDialog = ({
    shop,
    open,
    onOpenChange,
    onChatClick,
    chatRequestSent
}: ShopDetailsDialogProps) => {
    if (!shop) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Store className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl">{shop.name}</DialogTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {shop.serviceId?.name || shop.customService}
                                </p>
                            </div>
                        </div>
                        <Badge className="capitalize" variant="secondary">
                            {shop.shopType}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Description */}
                    <div>
                        <h3 className="font-semibold mb-2">About</h3>
                        <p className="text-muted-foreground">{shop.description}</p>
                    </div>

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                            <Phone className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-xs text-muted-foreground">Contact Number</p>
                                <p className="font-medium">{shop.contactNumber}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                            <User className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-xs text-muted-foreground">Owner</p>
                                <p className="font-medium">{shop.ownerId.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            onClick={() => onChatClick(shop)}
                            className={`flex-1 gap-2 ${chatRequestSent ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                            disabled={chatRequestSent}
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span className={chatRequestSent ? 'text-white font-semibold' : ''}>
                                {chatRequestSent ? '✓ Request Sent' : 'Chat with Owner'}
                            </span>
                        </Button>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
