import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createJob, getServices, getAreas, Service, Area } from '@/api/client';
import { Loader2 } from 'lucide-react';

interface Worker {
    _id: string;
    userId: { name: string };
    serviceIds: { _id: string; name: string }[];
    areaIds: { _id: string; name: string }[];
}

interface ServiceRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    worker: Worker | null;
    onRequestSent?: () => void;
}

export const ServiceRequestDialog = ({
    open,
    onOpenChange,
    worker,
    onRequestSent,
}: ServiceRequestDialogProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [services, setServices] = useState<Service[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);

    const [formData, setFormData] = useState({
        serviceId: '',
        areaId: '',
        description: '',
        address: '',
        estimatedPrice: '',
    });

    useEffect(() => {
        if (open) {
            loadServicesAndAreas();
            // Pre-fill service and area from worker if they only have one
            if (worker?.serviceIds?.length === 1) {
                setFormData(prev => ({ ...prev, serviceId: worker.serviceIds[0]._id }));
            }
            if (worker?.areaIds?.length === 1) {
                setFormData(prev => ({ ...prev, areaId: worker.areaIds[0]._id }));
            }
        }
    }, [open, worker]);

    const loadServicesAndAreas = async () => {
        try {
            const [servicesRes, areasRes] = await Promise.all([getServices(), getAreas()]);
            if (servicesRes.success) setServices(servicesRes.data.services);
            if (areasRes.success) setAreas(areasRes.data.areas);
        } catch (error) {
            console.error('Error loading services/areas:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.serviceId || !formData.areaId || !formData.description || !formData.address) {
            toast({
                title: 'Missing Fields',
                description: 'Please fill in all required fields',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);
            await createJob({
                serviceId: formData.serviceId,
                areaId: formData.areaId,
                description: formData.description,
                address: formData.address,
                estimatedPrice: formData.estimatedPrice ? parseFloat(formData.estimatedPrice) : 0,
                workerId: worker?._id,
            });

            toast({
                title: 'Request Sent!',
                description: `Your service request has been sent to ${worker?.userId?.name || 'the worker'}.`,
            });

            // Reset form
            setFormData({ serviceId: '', areaId: '', description: '', address: '', estimatedPrice: '' });
            onOpenChange(false);
            onRequestSent?.();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to send service request',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    // Filter services to those the worker offers (if worker has services)
    const availableServices = worker?.serviceIds?.length
        ? services.filter(s => worker.serviceIds.some(ws => ws._id === s._id))
        : services;

    // Filter areas to those the worker covers (if worker has areas)
    const availableAreas = worker?.areaIds?.length
        ? areas.filter(a => worker.areaIds.some(wa => wa._id === a._id))
        : areas;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Request Service</DialogTitle>
                    <DialogDescription>
                        Send a service request to{' '}
                        <span className="font-semibold">{worker?.userId?.name || 'this worker'}</span>.
                        They will have 24 hours to accept before the request expires.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Service */}
                    <div className="space-y-2">
                        <Label htmlFor="service">Service *</Label>
                        <Select
                            value={formData.serviceId}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, serviceId: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a service" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableServices.map(service => (
                                    <SelectItem key={service._id} value={service._id}>
                                        {service.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Area */}
                    <div className="space-y-2">
                        <Label htmlFor="area">Area *</Label>
                        <Select
                            value={formData.areaId}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, areaId: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select your area" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableAreas.map(area => (
                                    <SelectItem key={area._id} value={area._id}>
                                        {area.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe the work you need done..."
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                        />
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                        <Label htmlFor="address">Address *</Label>
                        <Input
                            id="address"
                            placeholder="Your full address"
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        />
                    </div>

                    {/* Estimated Price */}
                    <div className="space-y-2">
                        <Label htmlFor="price">Estimated Budget (₹)</Label>
                        <Input
                            id="price"
                            type="number"
                            placeholder="e.g. 500"
                            min="0"
                            value={formData.estimatedPrice}
                            onChange={(e) => setFormData(prev => ({ ...prev, estimatedPrice: e.target.value }))}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Request
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
