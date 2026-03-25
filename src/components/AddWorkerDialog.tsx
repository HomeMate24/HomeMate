import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { sendTeamRequest } from "@/api/teamRequest";
import { Search, Loader2 } from "lucide-react";

const formSchema = z.object({
    email: z.string().email("Invalid email address"),
    message: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddWorkerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onWorkerAdded: () => void;
}

export function AddWorkerDialog({ open, onOpenChange, onWorkerAdded }: AddWorkerDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            message: "",
        },
    });

    const searchWorker = async (email: string) => {
        if (!email || email.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // Search in chat API (reusing existing search functionality)
            const response = await fetch(
                `${import.meta.env.DEV ? 'http://localhost:5000/api' : '/api'}/chat/search?q=${encodeURIComponent(email)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt-token')}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                // Filter to show only workers
                const workers = data.data.users.filter((u: any) => u.role === 'WORKER');
                setSearchResults(workers);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSendRequest = async (userId: string) => {
        setIsLoading(true);
        try {
            const message = form.getValues('message');
            await sendTeamRequest(userId, 'WORKER', message);

            toast({
                title: "Request Sent",
                description: "Team invitation has been sent to the worker. They will need to accept it to join your team.",
            });

            form.reset();
            setSearchResults([]);
            onOpenChange(false);
            onWorkerAdded();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to send team request",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailChange = (email: string) => {
        form.setValue('email', email);
        searchWorker(email);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Invite Worker to Team</DialogTitle>
                    <DialogDescription>
                        Search for a worker by email and send them a team invitation. They must accept the request to join your team.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Worker Email *</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                type="email" 
                                                placeholder="Search by email..." 
                                                className="pl-10"
                                                {...field}
                                                onChange={(e) => handleEmailChange(e.target.value)}
                                            />
                                            {isSearching && (
                                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                            )}
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        Type an email to search for workers
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                                {searchResults.map((user) => (
                                    <div 
                                        key={user._id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                    >
                                        <div>
                                            <p className="font-medium">{user.name}</p>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => handleSendRequest(user._id)}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? "Sending..." : "Send Request"}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {searchResults.length === 0 && form.watch('email').length >= 3 && !isSearching && (
                            <div className="text-center py-6 text-muted-foreground">
                                <p className="text-sm">No workers found with this email</p>
                                <p className="text-xs mt-1">Make sure the worker has registered as a Worker in the system</p>
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Message (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Add a personal message to your invitation..."
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    form.reset();
                                    setSearchResults([]);
                                    onOpenChange(false);
                                }}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
