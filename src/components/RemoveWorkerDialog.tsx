import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { removeWorker } from "@/api/provider";

interface RemoveWorkerDialogProps {
    worker: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onWorkerRemoved: () => void;
}

export function RemoveWorkerDialog({
    worker,
    open,
    onOpenChange,
    onWorkerRemoved,
}: RemoveWorkerDialogProps) {
    const { toast } = useToast();
    const [isRemoving, setIsRemoving] = useState(false);

    const handleRemove = async () => {
        setIsRemoving(true);
        try {
            await removeWorker(worker.id);

            toast({
                title: "Worker Removed",
                description: `${worker.name} has been removed from your team`,
            });

            onOpenChange(false);
            onWorkerRemoved();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to remove worker",
                variant: "destructive",
            });
        } finally {
            setIsRemoving(false);
        }
    };

    if (!worker) return null;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remove Worker</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to remove <strong>{worker.name}</strong> from your team?
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleRemove}
                        disabled={isRemoving}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isRemoving ? "Removing..." : "Remove Worker"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
