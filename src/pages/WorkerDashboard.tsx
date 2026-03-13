import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AddShopDialog } from '@/components/shop/AddShopDialog';
import { getMyShops, deleteShop, Shop } from '@/api/shop';
import { getPendingRequests, acceptTeamRequest, rejectTeamRequest, TeamRequest } from '@/api/teamRequest';
import { getWorkerJobs, acceptJob, rejectJob, updateJobStatus, cancelWorkerJob, getWorkerProfile, updateWorkerAreas, updateWorkerServices } from '@/api/worker';
import { Job, getAreas, getServices, Area, Service } from '@/api/client';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';
import {
    Search, Plus, Store, Phone, Trash2, Bell, CheckCircle, XCircle,
    Clock, Briefcase, AlertCircle, Loader2, MapPin, Wrench, Settings,
    PlayCircle, Eye, CheckSquare
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const WorkerDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    // Shops
    const [shops, setShops] = useState<Shop[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [loading, setLoading] = useState(true);

    // Team requests
    const [teamRequests, setTeamRequests] = useState<TeamRequest[]>([]);
    const [showAcceptDialog, setShowAcceptDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<TeamRequest | null>(null);

    // Service requests (jobs)
    const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
    const [inReviewJobs, setInReviewJobs] = useState<Job[]>([]);
    const [inProgressJobs, setInProgressJobs] = useState<Job[]>([]);
    const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
    const [jobsLoading, setJobsLoading] = useState(true);
    const [processingJobId, setProcessingJobId] = useState<string | null>(null);
    const [now, setNow] = useState(new Date());

    // Cancel job confirmation dialog
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [cancelJobId, setCancelJobId] = useState<string | null>(null);

    // Service settings (area + service selection)
    const [allAreas, setAllAreas] = useState<Area[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    // Live timer — update every minute
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const loadJobs = useCallback(async () => {
        try {
            setJobsLoading(true);
            const response = await getWorkerJobs();
            if (response.success) {
                const allJobs: Job[] = response.data.jobs;
                setPendingJobs(allJobs.filter(j => j.status === 'PENDING'));
                setInReviewJobs(allJobs.filter(j => j.status === 'ACCEPTED' || j.status === 'IN_REVIEW'));
                setInProgressJobs(allJobs.filter(j => j.status === 'IN_PROGRESS'));
                setCompletedJobs(allJobs.filter(j => j.status === 'COMPLETED'));
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
        } finally {
            setJobsLoading(false);
        }
    }, []);

    const loadServiceSettings = useCallback(async () => {
        try {
            setSettingsLoading(true);
            const [areasRes, servicesRes, profileRes] = await Promise.all([
                getAreas(),
                getServices(),
                getWorkerProfile()
            ]);
            if (areasRes.success) setAllAreas(areasRes.data.areas);
            if (servicesRes.success) setAllServices(servicesRes.data.services);
            if (profileRes.success) {
                const w = profileRes.data.worker;
                setSelectedAreaIds((w.areaIds || []).map((a: any) => a._id));
                setSelectedServiceIds((w.serviceIds || []).map((s: any) => s._id));
            }
        } catch (error) {
            console.error('Error loading service settings:', error);
        } finally {
            setSettingsLoading(false);
        }
    }, []);

    const loadMyShops = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getMyShops();
            setShops(data.shops);
        } catch (error) {
            console.error('Error loading shops:', error);
            toast({ title: 'Error', description: 'Failed to load your shops', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const loadPendingRequests = useCallback(async () => {
        try {
            const response = await getPendingRequests();
            if (response.success) {
                setTeamRequests(response.data.requests);
            }
        } catch (error) {
            console.error('Error loading team requests:', error);
        }
    }, []);

    // WebSocket message handler
    const handleWebSocketMessage = useCallback((message: any) => {
        if (message.type === 'TEAM_REQUEST') {
            loadPendingRequests();
            toast({ title: 'New Team Invitation', description: `${message.providerName} has invited you to join their team!` });
        } else if (message.type === 'NEW_JOB_REQUEST') {
            loadJobs();
            toast({ title: '🔔 New Service Request', description: 'A client has sent you a service request!' });
        } else if (message.type === 'JOB_CANCELLED') {
            loadJobs();
            toast({ title: 'Request Cancelled', description: 'A client has cancelled their service request.', variant: 'destructive' });
        } else if (message.type === 'SERVICE_REQUEST_EXPIRED') {
            loadJobs();
            toast({ title: 'Request Expired', description: 'A service request has expired.', variant: 'destructive' });
        }
    }, [loadJobs, loadPendingRequests, toast]);

    useWebSocket(handleWebSocketMessage);

    useEffect(() => {
        loadMyShops();
        loadPendingRequests();
        loadJobs();
        loadServiceSettings();
    }, [loadMyShops, loadPendingRequests, loadJobs, loadServiceSettings]);

    const toggleArea = (id: string) => {
        setSelectedAreaIds(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const toggleService = (id: string) => {
        setSelectedServiceIds(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleSaveSettings = async () => {
        if (selectedAreaIds.length === 0) {
            toast({ title: 'Select at least one area', variant: 'destructive' });
            return;
        }
        if (selectedServiceIds.length === 0) {
            toast({ title: 'Select at least one service', variant: 'destructive' });
            return;
        }
        try {
            setSavingSettings(true);
            await Promise.all([
                updateWorkerAreas(selectedAreaIds),
                updateWorkerServices(selectedServiceIds)
            ]);
            toast({ title: '✅ Settings Saved', description: 'Clients can now find you in the selected areas.' });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to save settings', variant: 'destructive' });
        } finally {
            setSavingSettings(false);
        }
    };

    const handleAcceptJob = async (jobId: string) => {
        try {
            setProcessingJobId(jobId);
            await acceptJob(jobId);
            toast({ title: '✅ Request Accepted', description: 'You have accepted the service request. A 24-hour timer has started.' });
            loadJobs();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to accept request', variant: 'destructive' });
        } finally {
            setProcessingJobId(null);
        }
    };

    const handleRejectJob = async (jobId: string) => {
        try {
            setProcessingJobId(jobId);
            await rejectJob(jobId);
            toast({ title: 'Request Rejected', description: 'You have declined the service request.' });
            loadJobs();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to reject request', variant: 'destructive' });
        } finally {
            setProcessingJobId(null);
        }
    };

    const handleUpdateStatus = async (jobId: string, status: 'IN_REVIEW' | 'IN_PROGRESS' | 'COMPLETED') => {
        try {
            setProcessingJobId(jobId);
            await updateJobStatus(jobId, status);
            const messages: Record<string, string> = {
                IN_REVIEW: 'Job marked as In Review.',
                IN_PROGRESS: 'Job marked as In Progress. Client has been notified.',
                COMPLETED: '🎉 Job marked as Completed! Client can now leave a review.'
            };
            toast({ title: 'Status Updated', description: messages[status] });
            loadJobs();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to update status', variant: 'destructive' });
        } finally {
            setProcessingJobId(null);
        }
    };

    const handleCancelJobConfirm = async () => {
        if (!cancelJobId) return;
        try {
            setProcessingJobId(cancelJobId);
            await cancelWorkerJob(cancelJobId);
            toast({ title: 'Job Cancelled', description: 'The job has been cancelled. The client has been notified.', variant: 'destructive' });
            loadJobs();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to cancel job', variant: 'destructive' });
        } finally {
            setProcessingJobId(null);
            setCancelJobId(null);
            setShowCancelDialog(false);
        }
    };

    const handleAcceptTeamRequest = async () => {
        if (!selectedRequest) return;
        try {
            await acceptTeamRequest(selectedRequest._id);
            toast({ title: 'Request Accepted', description: 'You have joined the team successfully!' });
            setShowAcceptDialog(false);
            setSelectedRequest(null);
            loadPendingRequests();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to accept request', variant: 'destructive' });
        }
    };

    const handleRejectTeamRequest = async () => {
        if (!selectedRequest) return;
        try {
            await rejectTeamRequest(selectedRequest._id);
            toast({ title: 'Request Rejected', description: 'You have declined the team invitation.' });
            setShowRejectDialog(false);
            setSelectedRequest(null);
            loadPendingRequests();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to reject request', variant: 'destructive' });
        }
    };

    const handleDeleteShop = async (shopId: string) => {
        if (!confirm('Are you sure you want to delete this shop?')) return;
        try {
            await deleteShop(shopId);
            toast({ title: 'Success', description: 'Shop deleted successfully' });
            loadMyShops();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete shop', variant: 'destructive' });
        }
    };

    const getTimeRemaining = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - now.getTime();
        if (diff <= 0) return 'Expired';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m left`;
    };

    const filteredShops = shops.filter(shop =>
        shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Reusable job card actions section
    const JobCancelButton = ({ jobId }: { jobId: string }) => (
        <Button
            size="sm"
            variant="outline"
            className="gap-1 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 shrink-0"
            onClick={() => { setCancelJobId(jobId); setShowCancelDialog(true); }}
            disabled={processingJobId === jobId}
        >
            <XCircle className="h-3.5 w-3.5" /> Cancel Job
        </Button>
    );

    return (
        <Layout isAuthenticated>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold mb-2">Worker Dashboard</h1>
                        <p className="text-muted-foreground">Manage your service requests and shops</p>
                    </div>

                    {/* ── TEAM INVITATIONS ── */}
                    {teamRequests.length > 0 && (
                        <Card className="mb-6 border-blue-200 dark:border-blue-900">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Bell className="h-5 w-5 text-blue-600" />
                                    Team Invitations ({teamRequests.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {teamRequests.map((request) => (
                                    <div
                                        key={request._id}
                                        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900"
                                    >
                                        <div className="flex-1">
                                            <p className="font-semibold text-lg">
                                                {request.providerId.userId?.name || 'Unknown Provider'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">{request.providerId.businessName}</p>
                                            {request.message && (
                                                <p className="text-sm mt-2 italic">"{request.message}"</p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Invited {new Date(request.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline"
                                                className="gap-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                                onClick={() => { setSelectedRequest(request); setShowAcceptDialog(true); }}>
                                                <CheckCircle className="h-4 w-4" /> Accept
                                            </Button>
                                            <Button size="sm" variant="outline"
                                                className="gap-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                                onClick={() => { setSelectedRequest(request); setShowRejectDialog(true); }}>
                                                <XCircle className="h-4 w-4" /> Reject
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* ── INCOMING SERVICE REQUESTS (PENDING) ── */}
                    <Card className="mb-6 border-orange-200 dark:border-orange-900">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-orange-500" />
                                Incoming Service Requests ({pendingJobs.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {jobsLoading ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : pendingJobs.length === 0 ? (
                                <p className="text-center text-muted-foreground py-6">
                                    No pending service requests
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {pendingJobs.map((job) => (
                                        <div
                                            key={job._id}
                                            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold text-lg">{job.serviceId?.name}</p>
                                                    <Badge variant="secondary">Pending</Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-1">{job.description}</p>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                    <span>📍 {job.areaId?.name}</span>
                                                    <span>💰 ₹{job.estimatedPrice}</span>
                                                    <span>🏠 {job.address}</span>
                                                    {job.clientId && (
                                                        <span>👤 {job.clientId.userId?.name}</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Received {new Date(job.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <Button
                                                    size="sm"
                                                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handleAcceptJob(job._id)}
                                                    disabled={processingJobId === job._id}
                                                >
                                                    {processingJobId === job._id
                                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                                        : <CheckCircle className="h-4 w-4" />}
                                                    Accept
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                                    onClick={() => handleRejectJob(job._id)}
                                                    disabled={processingJobId === job._id}
                                                >
                                                    <XCircle className="h-4 w-4" /> Reject
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── IN REVIEW (ACCEPTED) ── */}
                    <Card className="mb-6 border-blue-200 dark:border-blue-900">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Eye className="h-5 w-5 text-blue-600" />
                                In Review ({inReviewJobs.length})
                                <span className="text-sm font-normal text-muted-foreground ml-1">— Accepted, review job before starting</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {jobsLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : inReviewJobs.length === 0 ? (
                                <p className="text-center text-muted-foreground py-4">No jobs in review</p>
                            ) : (
                                <div className="space-y-4">
                                    {inReviewJobs.map((job) => (
                                        <div
                                            key={job._id}
                                            className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900"
                                        >
                                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-semibold text-lg">{job.serviceId?.name}</p>
                                                        <Badge className="bg-blue-600 text-white">In Review</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-1">{job.description}</p>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                        <span>📍 {job.areaId?.name}</span>
                                                        <span>💰 ₹{job.estimatedPrice}</span>
                                                        <span>🏠 {job.address}</span>
                                                        {job.clientId && <span>👤 {job.clientId.userId?.name}</span>}
                                                    </div>
                                                    {job.expiresAt && (
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Clock className="h-4 w-4 text-orange-500" />
                                                            <span className="text-sm font-medium text-orange-500">
                                                                {getTimeRemaining(job.expiresAt)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 shrink-0">
                                                    <Button
                                                        size="sm"
                                                        className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                                                        onClick={() => handleUpdateStatus(job._id, 'IN_PROGRESS')}
                                                        disabled={processingJobId === job._id}
                                                    >
                                                        {processingJobId === job._id
                                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            : <PlayCircle className="h-3.5 w-3.5" />}
                                                        Begin Work
                                                    </Button>
                                                    <JobCancelButton jobId={job._id} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── IN PROGRESS ── */}
                    <Card className="mb-6 border-yellow-200 dark:border-yellow-900">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-yellow-600" />
                                In Progress ({inProgressJobs.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {jobsLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : inProgressJobs.length === 0 ? (
                                <p className="text-center text-muted-foreground py-4">No jobs in progress</p>
                            ) : (
                                <div className="space-y-4">
                                    {inProgressJobs.map((job) => (
                                        <div
                                            key={job._id}
                                            className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900"
                                        >
                                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-semibold text-lg">{job.serviceId?.name}</p>
                                                        <Badge className="bg-yellow-600 text-white">In Progress</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-1">{job.description}</p>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                        <span>📍 {job.areaId?.name}</span>
                                                        <span>💰 ₹{job.estimatedPrice}</span>
                                                        <span>🏠 {job.address}</span>
                                                        {job.clientId && <span>👤 {job.clientId.userId?.name}</span>}
                                                    </div>
                                                    {job.expiresAt && (
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Clock className="h-4 w-4 text-orange-500" />
                                                            <span className="text-sm font-medium text-orange-500">
                                                                {getTimeRemaining(job.expiresAt)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 shrink-0">
                                                    <Button
                                                        size="sm"
                                                        className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => handleUpdateStatus(job._id, 'COMPLETED')}
                                                        disabled={processingJobId === job._id}
                                                    >
                                                        {processingJobId === job._id
                                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            : <CheckSquare className="h-3.5 w-3.5" />}
                                                        Mark Complete
                                                    </Button>
                                                    <JobCancelButton jobId={job._id} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── COMPLETED ── */}
                    {completedJobs.length > 0 && (
                        <Card className="mb-6 border-green-200 dark:border-green-900">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    Completed ({completedJobs.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {completedJobs.slice(0, 5).map((job) => (
                                    <div
                                        key={job._id}
                                        className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 opacity-90"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold">{job.serviceId?.name}</p>
                                            <Badge className="bg-green-600 text-white text-xs">Completed</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-1">{job.description}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                            <span>📍 {job.areaId?.name}</span>
                                            <span>💰 ₹{job.estimatedPrice}</span>
                                            {job.clientId && <span>👤 {job.clientId.userId?.name}</span>}
                                            {job.completedAt && (
                                                <span>✅ Completed {new Date(job.completedAt).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {completedJobs.length > 5 && (
                                    <p className="text-sm text-muted-foreground text-center">
                                        +{completedJobs.length - 5} more completed jobs
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ── SERVICE SETTINGS ── */}
                    <Card className="mb-6 border-primary/30">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Settings className="h-5 w-5 text-primary" />
                                Service Settings
                                <span className="text-sm font-normal text-muted-foreground ml-1">
                                    — Set your areas & services so clients can find you
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {settingsLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* Areas */}
                                    <div>
                                        <p className="text-sm font-semibold flex items-center gap-2 mb-2">
                                            <MapPin className="h-4 w-4" /> Working Areas
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {allAreas.map(area => (
                                                <button
                                                    key={area._id}
                                                    type="button"
                                                    onClick={() => toggleArea(area._id)}
                                                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedAreaIds.includes(area._id)
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'border-border hover:border-primary/50'
                                                        }`}
                                                >
                                                    {area.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Services */}
                                    <div>
                                        <p className="text-sm font-semibold flex items-center gap-2 mb-2">
                                            <Wrench className="h-4 w-4" /> Services Offered
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {allServices.map(service => (
                                                <button
                                                    key={service._id}
                                                    type="button"
                                                    onClick={() => toggleService(service._id)}
                                                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedServiceIds.includes(service._id)
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'border-border hover:border-primary/50'
                                                        }`}
                                                >
                                                    {service.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleSaveSettings}
                                        disabled={savingSettings}
                                        className="gap-2"
                                    >
                                        {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Save Settings
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── SHOPS ── */}
                    <div className="relative mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            className="pl-12 h-14 text-lg"
                            placeholder="Search your shops..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="mb-8">
                        <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto gap-2" size="lg">
                            <Plus className="h-5 w-5" />
                            Add Your Shop
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <Card>
                            <CardHeader><CardTitle className="text-sm font-medium">Total Shops</CardTitle></CardHeader>
                            <CardContent><div className="text-3xl font-bold">{shops.length}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-sm font-medium">Active Shops</CardTitle></CardHeader>
                            <CardContent><div className="text-3xl font-bold">{shops.filter(s => s.isActive).length}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-sm font-medium">Completed Jobs</CardTitle></CardHeader>
                            <CardContent><div className="text-3xl font-bold">{completedJobs.length}</div></CardContent>
                        </Card>
                    </div>

                    {/* Shop List */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Your Shops</h2>
                        {loading ? (
                            <div className="text-center py-12 text-muted-foreground">Loading...</div>
                        ) : filteredShops.length === 0 ? (
                            <Card className="text-center py-12">
                                <CardContent>
                                    <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                                    <p className="text-xl font-semibold mb-2">No shops yet</p>
                                    <p className="text-muted-foreground mb-4">
                                        {searchQuery ? 'No shops match your search' : 'Start by adding your first shop'}
                                    </p>
                                    {!searchQuery && (
                                        <Button onClick={() => setShowAddDialog(true)}>
                                            <Plus className="h-4 w-4 mr-2" /> Add Your Shop
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredShops.map((shop) => (
                                    <Card key={shop._id} className="hover:shadow-lg transition-shadow">
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-xl mb-1">{shop.name}</CardTitle>
                                                    <p className="text-sm text-muted-foreground capitalize">
                                                        {shop.shopType} • {shop.serviceId?.name || shop.customService}
                                                    </p>
                                                </div>
                                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${shop.isActive
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
                                                    {shop.isActive ? 'Active' : 'Inactive'}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <p className="text-sm text-muted-foreground line-clamp-2">{shop.description}</p>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                <span>{shop.contactNumber}</span>
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <Button variant="outline" size="sm" onClick={() => handleDeleteShop(shop._id)} className="flex-1">
                                                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Shop Dialog */}
            <AddShopDialog open={showAddDialog} onOpenChange={setShowAddDialog} onShopCreated={loadMyShops} />

            {/* Cancel Job Confirmation */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel This Job?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will cancel the job and notify the client immediately. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setCancelJobId(null); }}>Keep Job</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelJobConfirm} className="bg-red-600 hover:bg-red-700">
                            Yes, Cancel Job
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Accept Team Request Dialog */}
            <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Accept Team Invitation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to join {selectedRequest?.providerId.userId?.name}'s team at {selectedRequest?.providerId.businessName}?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAcceptTeamRequest}>Accept Invitation</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reject Team Request Dialog */}
            <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reject Team Invitation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to decline {selectedRequest?.providerId.userId?.name}'s invitation?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRejectTeamRequest} className="bg-red-600 hover:bg-red-700">
                            Reject Invitation
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Layout>
    );
};

export default WorkerDashboard;
