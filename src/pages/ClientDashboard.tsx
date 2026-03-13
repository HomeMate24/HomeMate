import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, CheckCircle, XCircle, AlertCircle, Plus, Star } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { getClientJobs, cancelJob, rateJob, Job } from '@/api/client';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';

const ClientDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [now, setNow] = useState(new Date());

    // Review state
    const [reviewJobId, setReviewJobId] = useState<string | null>(null);
    const [selectedStars, setSelectedStars] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    // Live timer — update every minute
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const loadJobs = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getClientJobs();
            if (response.success) {
                setJobs(response.data.jobs);
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // WebSocket message handler
    const handleWebSocketMessage = useCallback((message: any) => {
        if (message.type === 'SERVICE_REQUEST_ACCEPTED') {
            toast({
                title: '✅ Request Accepted!',
                description: message.message || 'A worker has accepted your service request.',
            });
            loadJobs();
        } else if (message.type === 'SERVICE_REQUEST_EXPIRED') {
            toast({
                title: '⏰ Request Expired',
                description: message.message || 'Your service request has expired.',
                variant: 'destructive',
            });
            loadJobs();
        } else if (message.type === 'JOB_REJECTED') {
            toast({
                title: 'Request Rejected',
                description: 'A worker has rejected your service request.',
                variant: 'destructive',
            });
            loadJobs();
        } else if (message.type === 'JOB_STATUS_UPDATED') {
            const statusLabel: Record<string, string> = {
                IN_REVIEW: 'In Review',
                IN_PROGRESS: 'In Progress',
                COMPLETED: 'Completed',
            };
            const newStatus = message.job?.status || '';
            toast({
                title: `Job ${statusLabel[newStatus] || 'Updated'}`,
                description: newStatus === 'COMPLETED'
                    ? '🎉 Your job is complete! You can now leave a review.'
                    : `Job status changed to ${statusLabel[newStatus] || newStatus}`,
            });
            loadJobs();
        } else if (message.type === 'JOB_CANCELLED_BY_WORKER') {
            toast({
                title: '❌ Job Cancelled by Worker',
                description: message.message || 'The worker has cancelled your service request.',
                variant: 'destructive',
            });
            loadJobs();
        }
    }, [loadJobs, toast]);

    useWebSocket(handleWebSocketMessage);

    useEffect(() => {
        loadJobs();
    }, [loadJobs]);

    const handleCancel = async (jobId: string) => {
        try {
            setCancellingId(jobId);
            await cancelJob(jobId);
            toast({
                title: 'Cancelled',
                description: 'Service request cancelled successfully.',
            });
            loadJobs();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to cancel request',
                variant: 'destructive',
            });
        } finally {
            setCancellingId(null);
        }
    };

    const handleStartReview = (jobId: string) => {
        setReviewJobId(jobId);
        setSelectedStars(0);
        setReviewComment('');
    };

    const handleSubmitReview = async (jobId: string) => {
        if (selectedStars === 0) {
            toast({ title: 'Please select a star rating', variant: 'destructive' });
            return;
        }
        try {
            setSubmittingReview(true);
            await rateJob(jobId, selectedStars, reviewComment.trim() || undefined);
            toast({ title: '⭐ Review Posted!', description: 'Thanks for your feedback. It has been added to the worker\'s profile.' });
            setReviewJobId(null);
            loadJobs();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to submit review', variant: 'destructive' });
        } finally {
            setSubmittingReview(false);
        }
    };

    const getTimeRemaining = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - now.getTime();
        if (diff <= 0) return 'Expired';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m remaining`;
    };

    const getStatusBadge = (status: string, expired: boolean) => {
        if (expired) return <Badge variant="destructive">Expired</Badge>;
        const config: Record<string, { label: string; className: string }> = {
            PENDING: { label: 'Pending', className: 'bg-orange-100 text-orange-700 border-orange-200' },
            ACCEPTED: { label: 'Accepted', className: 'bg-blue-100 text-blue-700 border-blue-200' },
            IN_REVIEW: { label: 'In Review', className: 'bg-purple-100 text-purple-700 border-purple-200' },
            IN_PROGRESS: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
            COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
            CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
            REJECTED: { label: 'Rejected', className: 'bg-gray-100 text-gray-600 border-gray-200' },
        };
        const c = config[status] || { label: status, className: '' };
        return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
    };

    const activeJobs = jobs.filter(j => ['PENDING', 'ACCEPTED', 'IN_REVIEW', 'IN_PROGRESS'].includes(j.status) && !j.expired);
    const completedJobs = jobs.filter(j => ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(j.status) || j.expired);

    // Star rating widget
    const StarSelector = ({ jobId }: { jobId: string }) => (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedStars(star)}
                    className="transition-transform hover:scale-110"
                >
                    <Star
                        className={`h-8 w-8 transition-colors ${star <= selectedStars
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-300'
                            }`}
                    />
                </button>
            ))}
        </div>
    );

    return (
        <Layout isAuthenticated>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold">My Service Requests</h1>
                            <p className="text-muted-foreground mt-1">Track and manage your service requests</p>
                        </div>
                        <Button onClick={() => navigate('/browse-workers')} className="gap-2">
                            <Plus className="h-4 w-4" />
                            New Request
                        </Button>
                    </div>

                    {/* Active Requests */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            <Clock className="h-6 w-6" />
                            Active Requests ({activeJobs.length})
                        </h2>
                        <div className="grid gap-4">
                            {loading ? (
                                <Card className="p-8 text-center">
                                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                                </Card>
                            ) : activeJobs.length === 0 ? (
                                <Card className="p-8 text-center">
                                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground mb-4">No active service requests</p>
                                    <Button onClick={() => navigate('/browse-workers')}>
                                        Browse Workers
                                    </Button>
                                </Card>
                            ) : (
                                activeJobs.map((job) => (
                                    <Card key={job._id} className="p-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    <h3 className="font-semibold text-lg">{job.serviceId.name}</h3>
                                                    {getStatusBadge(job.status, job.expired)}
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-3">{job.description}</p>
                                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Area:</span>
                                                        <span className="ml-2 font-medium">{job.areaId.name}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Budget:</span>
                                                        <span className="ml-2 font-medium">₹{job.estimatedPrice}</span>
                                                    </div>
                                                    {job.workerId && (
                                                        <div>
                                                            <span className="text-muted-foreground">Worker:</span>
                                                            <span className="ml-2 font-medium">{job.workerId.userId.name}</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-muted-foreground">Address:</span>
                                                        <span className="ml-2 font-medium">{job.address}</span>
                                                    </div>
                                                    {job.expiresAt && ['ACCEPTED', 'IN_REVIEW', 'IN_PROGRESS'].includes(job.status) && (
                                                        <div className="col-span-2 flex items-center gap-2 mt-1">
                                                            <Clock className="h-4 w-4 text-orange-500" />
                                                            <span className="font-medium text-orange-500">
                                                                {getTimeRemaining(job.expiresAt)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Cancel button for PENDING and ACCEPTED jobs */}
                                            {(job.status === 'PENDING' || job.status === 'ACCEPTED') && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 shrink-0"
                                                    onClick={() => handleCancel(job._id)}
                                                    disabled={cancellingId === job._id}
                                                >
                                                    <XCircle className="h-4 w-4 mr-1" />
                                                    {cancellingId === job._id ? 'Cancelling...' : 'Cancel'}
                                                </Button>
                                            )}
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* History / Completed */}
                    <div>
                        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            <Users className="h-6 w-6" />
                            History ({completedJobs.length})
                        </h2>
                        <div className="grid gap-4">
                            {completedJobs.length === 0 ? (
                                <Card className="p-8 text-center">
                                    <p className="text-muted-foreground">No completed requests yet</p>
                                </Card>
                            ) : (
                                completedJobs.map((job) => (
                                    <Card key={job._id} className="p-6">
                                        <div className="flex items-start justify-between flex-wrap gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    <h3 className="font-semibold">{job.serviceId.name}</h3>
                                                    {getStatusBadge(job.status, job.expired)}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{job.description}</p>
                                                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                                    <span>{job.areaId.name}</span>
                                                    <span>₹{job.estimatedPrice}</span>
                                                    {job.workerId && <span>{job.workerId.userId.name}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Review section — only for COMPLETED jobs */}
                                        {job.status === 'COMPLETED' && (
                                            <div className="mt-4 pt-4 border-t">
                                                {job.rating ? (
                                                    // Already reviewed
                                                    <div className="space-y-2">
                                                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                                            Your Review
                                                        </p>
                                                        <div className="flex gap-0.5">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <Star
                                                                    key={star}
                                                                    className={`h-5 w-5 ${star <= job.rating!.rating
                                                                        ? 'fill-yellow-400 text-yellow-400'
                                                                        : 'text-gray-200'
                                                                        }`}
                                                                />
                                                            ))}
                                                            <span className="ml-2 text-sm text-muted-foreground">{job.rating.rating}/5</span>
                                                        </div>
                                                        {job.rating.review && (
                                                            <p className="text-sm text-muted-foreground italic">"{job.rating.review}"</p>
                                                        )}
                                                    </div>
                                                ) : reviewJobId === job._id ? (
                                                    // Review form open
                                                    <div className="space-y-3">
                                                        <p className="text-sm font-semibold">Leave a Review</p>
                                                        <StarSelector jobId={job._id} />
                                                        {selectedStars > 0 && (
                                                            <p className="text-sm text-muted-foreground">
                                                                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][selectedStars]}
                                                            </p>
                                                        )}
                                                        <Textarea
                                                            placeholder="Write a comment (optional)..."
                                                            value={reviewComment}
                                                            onChange={(e) => setReviewComment(e.target.value)}
                                                            rows={3}
                                                            className="resize-none"
                                                        />
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleSubmitReview(job._id)}
                                                                disabled={submittingReview || selectedStars === 0}
                                                                className="gap-2"
                                                            >
                                                                <Star className="h-3.5 w-3.5" />
                                                                {submittingReview ? 'Posting...' : 'Post Review'}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setReviewJobId(null)}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Prompt to review
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleStartReview(job._id)}
                                                        className="gap-2 border-yellow-400 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                                                    >
                                                        <Star className="h-4 w-4" />
                                                        Leave a Review
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ClientDashboard;
