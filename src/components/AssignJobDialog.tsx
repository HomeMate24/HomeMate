import { useState } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AssignJobDialogProps {
    worker: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onJobAssigned: () => void;
}

export function AssignJobDialog({
    worker,
    open,
    onOpenChange,
    onJobAssigned,
}: AssignJobDialogProps) {
    const { toast } = useToast();
    const [isAssigning, setIsAssigning] = useState(false);
    const [date, setDate] = useState<Date>();
    const [formData, setFormData] = useState({
        clientName: "",
        service: "",
        address: "",
        notes: "",
    });

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAssigning(true);

        try {
            // TODO: Call backend API to assign job
            // await assignJob({ workerId: worker.id, ...formData, date });

            toast({
                title: "Job Assigned",
                description: `Job assigned to ${worker.name} successfully`,
            });

            onOpenChange(false);
            onJobAssigned();

            // Reset form
            setFormData({
                clientName: "",
                service: "",
                address: "",
                notes: "",
            });
            setDate(undefined);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to assign job",
                variant: "destructive",
            });
        } finally {
            setIsAssigning(false);
        }
    };

    if (!worker) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Assign Job</DialogTitle>
                    <DialogDescription>
                        Assign a new job to {worker.name}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleAssign} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="clientName">Client Name</Label>
                        <Input
                            id="clientName"
                            value={formData.clientName}
                            onChange={(e) =>
                                setFormData({ ...formData, clientName: e.target.value })
                            }
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="service">Service Type</Label>
                        <Input
                            id="service"
                            value={formData.service}
                            onChange={(e) =>
                                setFormData({ ...formData, service: e.target.value })
                            }
                            placeholder="Plumbing, Electrical, etc."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Service Address</Label>
                        <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) =>
                                setFormData({ ...formData, address: e.target.value })
                            }
                            placeholder="123 Main St, City"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Scheduled Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Additional Notes</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData({ ...formData, notes: e.target.value })
                            }
                            placeholder="Any special instructions..."
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isAssigning}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isAssigning}>
                            {isAssigning ? "Assigning..." : "Assign Job"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
