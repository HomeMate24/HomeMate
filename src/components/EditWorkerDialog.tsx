import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateWorker } from "@/api/provider";

interface EditWorkerDialogProps {
    worker: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onWorkerUpdated: () => void;
}

export function EditWorkerDialog({
    worker,
    open,
    onOpenChange,
    onWorkerUpdated,
}: EditWorkerDialogProps) {
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);
    const [formData, setFormData] = useState({
        bio: worker?.bio || "",
        experience: worker?.experience || 0,
        hourlyRate: worker?.hourlyRate || 0,
    });

    // Update form data when worker changes
    useEffect(() => {
        if (worker) {
            setFormData({
                bio: worker.bio || "",
                experience: worker.experience || 0,
                hourlyRate: worker.hourlyRate || 0,
            });
        }
    }, [worker]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);

        try {
            await updateWorker(worker.id, {
                bio: formData.bio,
                experience: Number(formData.experience),
                hourlyRate: Number(formData.hourlyRate),
            });

            toast({
                title: "Worker Updated",
                description: `${worker.name}'s details have been updated`,
            });

            onOpenChange(false);
            onWorkerUpdated();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to update worker",
                variant: "destructive",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    if (!worker) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Worker Details</DialogTitle>
                    <DialogDescription>
                        Update worker information
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                            id="bio"
                            value={formData.bio}
                            onChange={(e) =>
                                setFormData({ ...formData, bio: e.target.value })
                            }
                            rows={3}
                            placeholder="Worker bio..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="experience">Experience (years)</Label>
                        <Input
                            id="experience"
                            type="number"
                            min="0"
                            value={formData.experience}
                            onChange={(e) =>
                                setFormData({ ...formData, experience: Number(e.target.value) })
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                        <Input
                            id="hourlyRate"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.hourlyRate}
                            onChange={(e) =>
                                setFormData({ ...formData, hourlyRate: Number(e.target.value) })
                            }
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isUpdating}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isUpdating}>
                            {isUpdating ? "Updating..." : "Update Worker"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
