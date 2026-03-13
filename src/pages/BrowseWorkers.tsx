import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ServiceRequestDialog } from '@/components/ServiceRequestDialog';
import { WorkerProfileDialog } from '@/components/WorkerProfileDialog';
import { browseWorkers, getAreas, getServices, Worker, Area, Service } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Star, MapPin, Wrench, Clock, Send, ArrowLeft, Loader2, User } from 'lucide-react';

const BrowseWorkers = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [workers, setWorkers] = useState<Worker[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedArea, setSelectedArea] = useState('');
    const [selectedService, setSelectedService] = useState('');
    const [nameQuery, setNameQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingFilters, setLoadingFilters] = useState(true);

    const [requestDialogOpen, setRequestDialogOpen] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [profileDialogOpen, setProfileDialogOpen] = useState(false);
    const [profileWorker, setProfileWorker] = useState<Worker | null>(null);

    useEffect(() => {
        const authenticated = localStorage.getItem('homemate-authenticated');
        if (!authenticated) {
            navigate('/');
            return;
        }
        loadFilters();
    }, [navigate]);

    const loadFilters = async () => {
        try {
            setLoadingFilters(true);
            const [areasRes, servicesRes] = await Promise.all([getAreas(), getServices()]);
            if (areasRes.success) setAreas(areasRes.data.areas);
            if (servicesRes.success) setServices(servicesRes.data.services);
        } catch (error) {
            console.error('Error loading filters:', error);
        } finally {
            setLoadingFilters(false);
        }
    };

    const handleSearch = async () => {
        const trimmedName = nameQuery.trim();

        // Name search doesn't require an area
        if (!trimmedName && !selectedArea) {
            toast({
                title: 'Filter Required',
                description: 'Please enter a worker name or select an area to search',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);
            let foundWorkers: any[] = [];

            if (trimmedName.length >= 2) {
                // Name-based search (area is optional)
                const { searchWorkersByName } = await import('@/api/client');
                const response = await searchWorkersByName(trimmedName);
                if (response.success) foundWorkers = response.data.workers;

                // If an area is also selected, layer-filter by the area results
                if (selectedArea && foundWorkers.length > 0) {
                    foundWorkers = foundWorkers.filter((w: any) =>
                        (w.areaIds || []).some((a: any) => (a._id || a) === selectedArea)
                    );
                }
            } else {
                // Area-based search
                const response = await browseWorkers(selectedArea, selectedService || undefined);
                if (response.success) foundWorkers = response.data.workers;
            }

            setWorkers(foundWorkers);
            if (foundWorkers.length === 0) {
                toast({
                    title: 'No Workers Found',
                    description: 'No available workers found for the selected filters',
                });
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to browse workers',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRequestService = (worker: Worker) => {
        setSelectedWorker(worker);
        setRequestDialogOpen(true);
    };

    const handleViewProfile = (worker: Worker) => {
        setProfileWorker(worker);
        setProfileDialogOpen(true);
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{rating.toFixed(1)}</span>
            </div>
        );
    };

    return (
        <Layout isAuthenticated>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">Browse Workers</h1>
                            <p className="text-muted-foreground mt-1">
                                Find skilled professionals in your area
                            </p>
                        </div>
                        <div className="ml-auto">
                            <Button variant="outline" onClick={() => navigate('/client-dashboard')}>
                                My Requests
                            </Button>
                        </div>
                    </div>

                    {/* Filters */}
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="text-lg">Filter Workers</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Name search */}
                            <div className="mb-3">
                                <Input
                                    placeholder="Search worker by name..."
                                    value={nameQuery}
                                    onChange={(e) => setNameQuery(e.target.value)}
                                    className="w-full"
                                />
                                {nameQuery.length >= 2 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Name search is active. Area filter is not required when searching by name.
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <Select
                                        value={selectedArea}
                                        onValueChange={setSelectedArea}
                                        disabled={loadingFilters}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={loadingFilters ? 'Loading areas...' : 'Select Area *'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {areas.map(area => (
                                                <SelectItem key={area._id} value={area._id}>
                                                    {area.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1">
                                    <Select
                                        value={selectedService}
                                        onValueChange={setSelectedService}
                                        disabled={loadingFilters}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={loadingFilters ? 'Loading services...' : 'Filter by Service (optional)'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Services</SelectItem>
                                            {services.map(service => (
                                                <SelectItem key={service._id} value={service._id}>
                                                    {service.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={handleSearch}
                                    disabled={loading || loadingFilters}
                                    className="sm:w-auto w-full"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : null}
                                    Search Workers
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Worker Results */}
                    {workers.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">
                                {workers.length} Worker{workers.length !== 1 ? 's' : ''} Found
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {workers.map(worker => (
                                    <Card
                                        key={worker._id}
                                        className="hover:shadow-lg transition-shadow border-2 hover:border-primary/30"
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-lg">
                                                        {worker.userId?.name || 'Worker'}
                                                    </CardTitle>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {renderStars(worker.areaSpecificRating ?? worker.averageRating)}
                                                        <span className="text-xs text-muted-foreground">
                                                            ({worker.areaReviewCount ?? 0} reviews)
                                                        </span>
                                                    </div>
                                                </div>
                                                <Badge
                                                    variant={worker.isAvailable ? 'default' : 'secondary'}
                                                    className="text-xs"
                                                >
                                                    {worker.isAvailable ? 'Available' : 'Busy'}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {/* Services */}
                                            {worker.serviceIds?.length > 0 && (
                                                <div className="flex items-start gap-2">
                                                    <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                                    <div className="flex flex-wrap gap-1">
                                                        {worker.serviceIds.map(s => (
                                                            <Badge key={s._id} variant="outline" className="text-xs">
                                                                {s.name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Areas */}
                                            {worker.areaIds?.length > 0 && (
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                                    <p className="text-sm text-muted-foreground">
                                                        {worker.areaIds.map(a => a.name).join(', ')}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Hourly Rate */}
                                            {worker.hourlyRate && (
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">
                                                        ₹{worker.hourlyRate}/hr
                                                    </span>
                                                </div>
                                            )}

                                            {/* Stats */}
                                            <div className="text-xs text-muted-foreground">
                                                {worker.totalJobs} jobs completed
                                            </div>

                                            {/* Request + Profile Buttons */}
                                            <div className="flex gap-2 mt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1"
                                                    onClick={() => handleViewProfile(worker)}
                                                >
                                                    <User className="h-3.5 w-3.5" />
                                                    Profile
                                                </Button>
                                                <Button
                                                    className="flex-1 gap-2"
                                                    onClick={() => handleRequestService(worker)}
                                                    disabled={!worker.isAvailable}
                                                >
                                                    <Send className="h-4 w-4" />
                                                    {worker.isAvailable ? 'Request Service' : 'Not Available'}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty state before search */}
                    {workers.length === 0 && !loading && (
                        <div className="text-center py-16">
                            <Wrench className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Find Your Worker</h3>
                            <p className="text-muted-foreground">
                                Select an area and click "Search Workers" to browse available professionals
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Service Request Dialog */}
            <ServiceRequestDialog
                open={requestDialogOpen}
                onOpenChange={setRequestDialogOpen}
                worker={selectedWorker}
                onRequestSent={() => {
                    toast({
                        title: 'Request Sent',
                        description: 'View your requests in the Client Dashboard',
                    });
                }}
            />

            {/* Worker Profile Dialog */}
            <WorkerProfileDialog
                open={profileDialogOpen}
                onOpenChange={setProfileDialogOpen}
                worker={profileWorker}
            />
        </Layout>
    );
};

export default BrowseWorkers;
