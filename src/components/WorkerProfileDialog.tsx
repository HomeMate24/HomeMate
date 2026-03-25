import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Phone, Mail, MapPin, Briefcase, Loader2 } from 'lucide-react';

// Uses role-agnostic endpoint so both clients AND providers can view worker profiles
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';
const fetchWorkerPublicProfile = async (workerId: string) => {
    const token = localStorage.getItem('jwt-token');
    const res = await fetch(`${API_BASE_URL}/workers/${workerId}/public-profile`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch profile');
    return data;
};

interface WorkerProfileDialogProps {
    worker: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface Review {
    _id: string;
    rating: number;
    review?: string;
    createdAt: string;
    clientId?: {
        userId?: { name: string };
    };
    jobId?: {
        serviceId?: { name: string };
    };
}

const StarRow = ({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) => {
    const cls = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <Star
                    key={s}
                    className={`${cls} ${s <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                />
            ))}
        </div>
    );
};

export function WorkerProfileDialog({ worker, open, onOpenChange }: WorkerProfileDialogProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    // Provider dashboard sends workers with 'id', client side uses '_id'
    const workerId = worker?._id || worker?.id;

    useEffect(() => {
        if (open && workerId) {
            setReviewsLoading(true);
            fetchWorkerPublicProfile(workerId)
                .then(res => {
                    if (res.success) setReviews(res.data.ratings || []);
                })
                .catch(() => setReviews([]))
                .finally(() => setReviewsLoading(false));
        } else {
            setReviews([]);
        }
    }, [open, workerId]);

    if (!worker) return null;

    const name: string = worker.userId?.name || worker.name || 'Unknown';
    const phone: string = worker.userId?.phone || worker.phone || '';
    const email: string = worker.userId?.email || worker.email || '';
    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const avgRating: number = worker.averageRating || worker.rating || 0;
    const totalJobs: number = worker.totalJobs || worker.jobs || 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Worker Profile</DialogTitle>
                    <DialogDescription>Full profile details and client reviews</DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shrink-0">
                            {initials}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-semibold">{name}</h3>
                            {worker.isAvailable !== undefined && (
                                <Badge className={worker.isAvailable
                                    ? 'bg-green-500/20 text-green-600 mt-1'
                                    : 'bg-gray-100 text-gray-500 mt-1'
                                }>
                                    {worker.isAvailable ? 'Available' : 'Unavailable'}
                                </Badge>
                            )}
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                <span className="text-xl font-bold">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-2">
                        {phone && (
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{phone}</span>
                            </div>
                        )}
                        {email && (
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{email}</span>
                            </div>
                        )}
                    </div>

                    {/* Areas + Services */}
                    {worker.areaIds?.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold flex items-center gap-2 mb-2">
                                <MapPin className="h-4 w-4" /> Working Areas
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {worker.areaIds.map((a: any) => (
                                    <Badge key={a._id || a} variant="secondary">{a.name || a}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                    {worker.serviceIds?.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold flex items-center gap-2 mb-2">
                                <Briefcase className="h-4 w-4" /> Services Offered
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {worker.serviceIds.map((s: any) => (
                                    <Badge key={s._id || s} variant="outline">{s.name || s}</Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border p-3">
                            <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="text-2xl font-bold">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Average Rating</p>
                        </div>
                        <div className="rounded-lg border p-3">
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-primary" />
                                <span className="text-2xl font-bold">{totalJobs}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Jobs Completed</p>
                        </div>
                    </div>

                    {/* Reviews */}
                    <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            Client Reviews
                        </h4>
                        {reviewsLoading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : reviews.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                                No reviews yet — be the first to leave one!
                            </p>
                        ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                {reviews.map(r => (
                                    <div key={r._id} className="rounded-lg border p-3 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <StarRow value={r.rating} />
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(r.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {r.review && (
                                            <p className="text-sm text-muted-foreground italic">"{r.review}"</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            — {r.clientId?.userId?.name || 'Anonymous Client'}
                                            {r.jobId?.serviceId?.name && ` · ${r.jobId.serviceId.name}`}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
