import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createShop } from '@/api/shop';
import { getAreas, getServices, Area, Service } from '@/api/client';
import { Loader2 } from 'lucide-react';

interface AddShopDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onShopCreated: () => void;
}

export const AddShopDialog = ({ open, onOpenChange, onShopCreated }: AddShopDialogProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [areas, setAreas] = useState<Area[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [filtersLoading, setFiltersLoading] = useState(true);

    const [formData, setFormData] = useState({
        shopType: 'individual' as 'individual' | 'company',
        name: '',
        serviceId: '',
        customService: '',
        areaId: '',
        contactNumber: '',
        description: '',
    });

    // Load areas and services from API when dialog opens
    useEffect(() => {
        if (!open) return;
        const loadFilters = async () => {
            try {
                setFiltersLoading(true);
                const [areasRes, servicesRes] = await Promise.all([getAreas(), getServices()]);
                if (areasRes.success) setAreas(areasRes.data.areas);
                if (servicesRes.success) setServices(servicesRes.data.services);
            } catch (err) {
                console.error('Error loading filters:', err);
            } finally {
                setFiltersLoading(false);
            }
        };
        loadFilters();
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast({ title: 'Validation Error', description: 'Shop name is required', variant: 'destructive' });
            return;
        }
        if (!formData.serviceId) {
            toast({ title: 'Validation Error', description: 'Please select a service', variant: 'destructive' });
            return;
        }
        if (formData.serviceId === 'other' && !formData.customService.trim()) {
            toast({ title: 'Validation Error', description: 'Please specify your custom service', variant: 'destructive' });
            return;
        }
        if (!formData.areaId) {
            toast({ title: 'Validation Error', description: 'Please select a location area', variant: 'destructive' });
            return;
        }
        if (!formData.contactNumber.trim()) {
            toast({ title: 'Validation Error', description: 'Contact number is required', variant: 'destructive' });
            return;
        }
        if (!formData.description.trim()) {
            toast({ title: 'Validation Error', description: 'Description is required', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            const submitData = {
                shopType: formData.shopType,
                name: formData.name,
                // If serviceId is a real DB id send it; if 'other' send null + customService
                serviceId: formData.serviceId === 'other' ? null : formData.serviceId,
                customService: formData.serviceId === 'other' ? formData.customService : null,
                areaId: formData.areaId,
                contactNumber: formData.contactNumber,
                description: formData.description,
            };

            await createShop(submitData);
            toast({ title: 'Success', description: 'Shop created successfully!' });
            setFormData({
                shopType: 'individual',
                name: '',
                serviceId: '',
                customService: '',
                areaId: '',
                contactNumber: '',
                description: '',
            });
            onShopCreated();
            onOpenChange(false);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to create shop', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Your Shop</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Business Type */}
                    <div className="space-y-3">
                        <Label>Business Type</Label>
                        <RadioGroup
                            value={formData.shopType}
                            onValueChange={(value) =>
                                setFormData({ ...formData, shopType: value as 'individual' | 'company' })
                            }
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="individual" id="individual" />
                                <Label htmlFor="individual" className="font-normal cursor-pointer">Individual</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="company" id="company" />
                                <Label htmlFor="company" className="font-normal cursor-pointer">Company</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Shop Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Shop/Business Name *</Label>
                        <Input
                            id="name"
                            placeholder="e.g., ABC Plumbing Services"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    {/* Service Selection — loaded from DB */}
                    <div className="space-y-2">
                        <Label htmlFor="service">Service *</Label>
                        <Select
                            value={formData.serviceId}
                            onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
                            disabled={filtersLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={filtersLoading ? 'Loading services...' : 'Select a service'} />
                            </SelectTrigger>
                            <SelectContent>
                                {services.map((service) => (
                                    <SelectItem key={service._id} value={service._id}>
                                        {service.name}
                                    </SelectItem>
                                ))}
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Custom Service (shown when "Other" is selected) */}
                    {formData.serviceId === 'other' && (
                        <div className="space-y-2">
                            <Label htmlFor="customService">Specify Your Service *</Label>
                            <Input
                                id="customService"
                                placeholder="e.g., Garden Maintenance"
                                value={formData.customService}
                                onChange={(e) => setFormData({ ...formData, customService: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    {/* Area / Location — loaded from DB */}
                    <div className="space-y-2">
                        <Label htmlFor="area">Location Area *</Label>
                        <Select
                            value={formData.areaId}
                            onValueChange={(value) => setFormData({ ...formData, areaId: value })}
                            disabled={filtersLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={filtersLoading ? 'Loading areas...' : 'Select your area'} />
                            </SelectTrigger>
                            <SelectContent>
                                {areas.map((area) => (
                                    <SelectItem key={area._id} value={area._id}>
                                        {area.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Contact Number */}
                    <div className="space-y-2">
                        <Label htmlFor="contact">Contact Number *</Label>
                        <Input
                            id="contact"
                            type="tel"
                            placeholder="e.g., +91 98765 43210"
                            value={formData.contactNumber}
                            onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe your services, experience, and what makes your business unique..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || filtersLoading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Shop'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
