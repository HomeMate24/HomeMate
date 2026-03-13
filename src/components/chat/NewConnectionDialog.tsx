import { useState } from "react";
import { Search, User, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { searchUsers } from "@/api/chat";
import { useToast } from "@/hooks/use-toast";

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
}

interface NewConnectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectUser: (user: User) => void;
}

const NewConnectionDialog = ({ open, onOpenChange, onSelectUser }: NewConnectionDialogProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const { toast } = useToast();

    const handleSearch = async () => {
        if (searchQuery.trim().length < 2) {
            toast({
                title: "Search too short",
                description: "Please enter at least 2 characters to search",
                variant: "destructive",
            });
            return;
        }

        setIsSearching(true);
        try {
            const response = await searchUsers(searchQuery);
            if (response.success) {
                setSearchResults(response.data.users);
            }
        } catch (error: any) {
            toast({
                title: "Search failed",
                description: error.message || "Failed to search users",
                variant: "destructive",
            });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectUser = (user: User) => {
        onSelectUser(user);
        onOpenChange(false);
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>New Connection</DialogTitle>
                    <DialogDescription>
                        Search for providers, workers, or clients to start a conversation
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Search Input */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="pl-10"
                            />
                        </div>
                        <Button onClick={handleSearch} disabled={isSearching} className="hover-invert">
                            {isSearching ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Search className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    {/* Search Results */}
                    <ScrollArea className="h-[300px] rounded-md border">
                        {searchResults.length > 0 ? (
                            <div className="p-2 space-y-1">
                                {searchResults.map((user) => (
                                    <button
                                        key={user._id}
                                        onClick={() => handleSelectUser(user)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <User className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-medium">{user.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-center p-4">
                                <div>
                                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        {searchQuery.trim().length > 0 && !isSearching
                                            ? "No users found"
                                            : "Search for users to start a conversation"}
                                    </p>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default NewConnectionDialog;
