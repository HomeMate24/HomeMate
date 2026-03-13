import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Wrench,
  Droplets,
  Hammer,
  Sparkles,
  Sofa,
  Paintbrush,
  Zap,
  Wind,
  MessageCircle,
  Store,
  Phone,
  Users,
  Briefcase,
  BarChart,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getShops, Shop } from "@/api/shop";
import { createConversation } from "@/api/chat";
import { useToast } from "@/hooks/use-toast";
import { ShopDetailsDialog } from "@/components/shop/ShopDetailsDialog";
import { getWorkerJobs, acceptJob, rejectJob } from "@/api/worker";
import { Job, getClientJobs } from "@/api/client";

const services = [
  { icon: Wrench, name: "Plumbing" },
  { icon: Hammer, name: "Carpentry" },
  { icon: Sparkles, name: "Cleaning" },
  { icon: Sofa, name: "Furniture" },
  { icon: Paintbrush, name: "Painting" },
  { icon: Zap, name: "Electrical" },
  { icon: Droplets, name: "Waterproofing" },
  { icon: Wind, name: "AC Service" },
];

const userTypeContent = {
  worker: {
    title: "Find Jobs Near You",
    subtitle: "Browse available jobs that match your skills",
    cta: "Browse Jobs",
  },
  client: {
    title: "What Service Do You Need?",
    subtitle: "Find trusted professionals for your home",
    cta: "Find Professionals",
  },
  provider: {
    title: "Manage Your Business",
    subtitle: "Oversee your team and incoming requests",
    cta: "View Dashboard",
  },
};

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userType, setUserType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [shopDetailsOpen, setShopDetailsOpen] = useState(false);
  const [chatRequestsSent, setChatRequestsSent] = useState<Set<string>>(new Set());

  // Worker job state
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Client job state
  const [clientJobs, setClientJobs] = useState<Job[]>([]);
  const [clientJobsLoading, setClientJobsLoading] = useState(false);

  // Live timer for both worker and client
  useEffect(() => {
    if (userType !== 'worker' && userType !== 'client') return;
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, [userType]);

  const loadWorkerJobs = useCallback(async () => {
    try {
      setJobsLoading(true);
      const response = await getWorkerJobs();
      if (response.success) {
        const all: Job[] = response.data.jobs;
        setPendingJobs(all.filter(j => j.status === 'PENDING'));
        setActiveJobs(all.filter(j => j.status === 'ACCEPTED' || j.status === 'IN_PROGRESS'));
      }
    } catch (error) {
      console.error('Error loading worker jobs:', error);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const loadClientJobs = useCallback(async () => {
    try {
      setClientJobsLoading(true);
      const response = await getClientJobs();
      if (response.success) {
        const all: Job[] = response.data.jobs;
        // Show only active requests on Home (not history)
        setClientJobs(all.filter(j => ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(j.status) && !j.expired));
      }
    } catch (error) {
      console.error('Error loading client jobs:', error);
    } finally {
      setClientJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    const authenticated = localStorage.getItem("homemate-authenticated");
    const type = localStorage.getItem("homemate-user-type") || "client";
    const email = localStorage.getItem("homemate-user-email") || "";

    if (!authenticated) {
      navigate("/");
      return;
    }

    setUserType(type);
    setUserEmail(email);
    loadShops();
    if (type === 'worker') loadWorkerJobs();
    if (type === 'client') loadClientJobs();
  }, [navigate, loadWorkerJobs, loadClientJobs]);

  const loadShops = async () => {
    if (!searchQuery.trim()) {
      setShops([]);
      return;
    }
    try {
      setLoadingShops(true);
      const data = await getShops(searchQuery);
      setShops(data.shops);
    } catch (error) {
      console.error('Error loading shops:', error);
    } finally {
      setLoadingShops(false);
    }
  };

  // Debounced shop search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadShops();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleChatWithShop = async (shop: Shop) => {
    try {
      const response = await createConversation(shop.ownerId._id);

      // Check the correct response structure: response.data.conversation
      if (response.data?.conversation) {
        // Add shop to the sent requests set immediately for UI feedback
        setChatRequestsSent(prev => new Set(prev).add(shop._id));

        // Show different messages for new vs existing conversations
        if (response.data.isNew) {
          toast({
            title: 'Success',
            description: `Chat request sent to ${shop.name}`,
          });
          // Don't navigate immediately, let user see the success state
          setTimeout(() => navigate('/chat'), 1500);
        } else {
          toast({
            title: 'Info',
            description: 'Conversation already exists. Redirecting...',
          });
          setTimeout(() => navigate('/chat'), 800);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start chat',
        variant: 'destructive',
      });
    }
  };

  const handleShopCardClick = (shop: Shop) => {
    setSelectedShop(shop);
    setShopDetailsOpen(true);
  };

  const content = userTypeContent[userType as keyof typeof userTypeContent] || userTypeContent.client;

  const handleLogout = () => {
    localStorage.removeItem("homemate-authenticated");
    localStorage.removeItem("homemate-user-type");
    localStorage.removeItem("homemate-user-email");
    navigate("/");
  };

  const handleAcceptJob = async (jobId: string) => {
    try {
      setProcessingJobId(jobId);
      await acceptJob(jobId);
      toast({ title: '✅ Request Accepted', description: 'You have accepted the service request.' });
      loadWorkerJobs();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to accept', variant: 'destructive' });
    } finally {
      setProcessingJobId(null);
    }
  };

  const handleRejectJob = async (jobId: string) => {
    try {
      setProcessingJobId(jobId);
      await rejectJob(jobId);
      toast({ title: 'Request Rejected', description: 'You have declined the service request.' });
      loadWorkerJobs();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to reject', variant: 'destructive' });
    } finally {
      setProcessingJobId(null);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m left`;
  };

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout isAuthenticated>
      <div className="min-h-[calc(100vh-8rem)]">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 to-transparent py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center animate-fade-in">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary mb-6">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Logged in as {userEmail} ({userType})
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                {content.title}
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                {content.subtitle}
              </p>

              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for services, workers, or providers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-14 pl-12 pr-4 text-lg rounded-2xl border-2"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Worker Job Dashboard */}
        {userType === 'worker' && (
          <section className="py-10">
            <div className="container mx-auto px-4 space-y-6">

              {/* Incoming Requests */}
              <Card className="border-orange-200 dark:border-orange-900">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-lg">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      Incoming Requests
                    </span>
                    <Badge variant="secondary">{pendingJobs.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {jobsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : pendingJobs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      No pending requests right now
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {pendingJobs.map((job) => (
                        <div
                          key={job._id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold">{job.serviceId?.name}</span>
                              <Badge variant="secondary" className="text-xs">Pending</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{job.description}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                              <span>📍 {job.areaId?.name}</span>
                              <span>💰 ₹{job.estimatedPrice}</span>
                              {job.clientId && <span>👤 {job.clientId.userId?.name}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white gap-1"
                              onClick={() => handleAcceptJob(job._id)}
                              disabled={processingJobId === job._id}
                            >
                              {processingJobId === job._id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <CheckCircle className="h-3 w-3" />}
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 gap-1"
                              onClick={() => handleRejectJob(job._id)}
                              disabled={processingJobId === job._id}
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Jobs */}
              {activeJobs.length > 0 && (
                <Card className="border-green-200 dark:border-green-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-lg">
                        <Briefcase className="h-5 w-5 text-green-600" />
                        Active Jobs
                      </span>
                      <Badge className="bg-green-600 text-white">{activeJobs.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activeJobs.map((job) => (
                        <div
                          key={job._id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold">{job.serviceId?.name}</span>
                              <Badge className="bg-green-600 text-white text-xs">
                                {job.status === 'IN_PROGRESS' ? 'In Progress' : 'Accepted'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{job.description}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                              <span>📍 {job.areaId?.name}</span>
                              <span>💰 ₹{job.estimatedPrice}</span>
                              {job.clientId && <span>👤 {job.clientId.userId?.name}</span>}
                            </div>
                            {job.expiresAt && (
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3 text-orange-500" />
                                <span className="text-xs font-medium text-orange-500">
                                  {getTimeRemaining(job.expiresAt)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Link to full dashboard */}
              <div className="text-center">
                <Button variant="outline" onClick={() => navigate('/worker-dashboard')} className="gap-2">
                  <Wrench className="h-4 w-4" />
                  Open Full Worker Dashboard
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Client Active Requests Dashboard */}
        {userType === 'client' && clientJobs.length > 0 && (
          <section className="py-10">
            <div className="container mx-auto px-4 space-y-4">
              <Card className="border-blue-200 dark:border-blue-900">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-lg">
                      <Briefcase className="h-5 w-5 text-blue-500" />
                      My Active Requests
                    </span>
                    <Badge variant="secondary">{clientJobs.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {clientJobsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {clientJobs.map((job) => (
                        <div
                          key={job._id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold">{job.serviceId?.name}</span>
                              {job.status === 'PENDING' && (
                                <Badge variant="secondary" className="text-xs">Waiting for Worker</Badge>
                              )}
                              {job.status === 'ACCEPTED' && (
                                <Badge className="bg-green-600 text-white text-xs">Accepted</Badge>
                              )}
                              {job.status === 'IN_PROGRESS' && (
                                <Badge className="bg-blue-600 text-white text-xs">In Progress</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                              <span>📍 {job.areaId?.name}</span>
                              <span>💰 ₹{job.estimatedPrice}</span>
                              {job.workerId && (
                                <span>🔧 Worker: {job.workerId.userId?.name}</span>
                              )}
                            </div>
                            {job.expiresAt && job.status === 'ACCEPTED' && (
                              <div className="flex items-center gap-1 mt-2">
                                <Clock className="h-3 w-3 text-orange-500" />
                                <span className="text-xs font-medium text-orange-500">
                                  {getTimeRemaining(job.expiresAt)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Link to full dashboard */}
              <div className="text-center">
                <Button variant="outline" onClick={() => navigate('/client-dashboard')} className="gap-2">
                  <Users className="h-4 w-4" />
                  View All Requests
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Services Grid — clients only */}
        {userType === 'client' && (
          <section className="py-12">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold mb-8">Popular Services</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredServices.map((service, index) => (
                  <button
                    key={service.name}
                    onClick={() => setSearchQuery(service.name)}
                    className="card-hover group rounded-2xl border-2 border-border bg-card p-6 text-left animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="card-icon mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all duration-300">
                      <service.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold mb-1">{service.name}</h3>
                  </button>
                ))}
              </div>

              {/* Shop Results */}
              {searchQuery && shops.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-2xl font-bold mb-6">Shops &amp; Services</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shops.map((shop) => {
                      const requestSent = chatRequestsSent.has(shop._id);
                      return (
                        <Card
                          key={shop._id}
                          className="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
                          onClick={() => handleShopCardClick(shop)}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Store className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">{shop.name}</CardTitle>
                              </div>
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full capitalize">
                                {shop.shopType}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {shop.serviceId?.name || shop.customService}
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm line-clamp-2">{shop.description}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{shop.contactNumber}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Owner: {shop.ownerId.name}
                            </div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChatWithShop(shop);
                              }}
                              className={`w-full gap-2 transition-colors ${requestSent ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                              size="sm"
                              disabled={requestSent}
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span className={requestSent ? 'text-white font-semibold' : ''}>
                                {requestSent ? '✓ Request Sent' : 'Chat with Owner'}
                              </span>
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {searchQuery && shops.length === 0 && !loadingShops && (
                <div className="mt-12 text-center py-12">
                  <div className="max-w-md mx-auto">
                    <Store className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Shops Found</h3>
                    <p className="text-muted-foreground">
                      Services not available for "{searchQuery}" at the moment.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Try searching for a different service or check back later.
                    </p>
                  </div>
                </div>
              )}

              {loadingShops && (
                <div className="mt-12 text-center py-12">
                  <div className="max-w-md mx-auto">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Searching for services...</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Provider Dashboard Panel */}
        {userType === 'provider' && (
          <section className="py-12">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6">Provider Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                  className="hover:shadow-lg transition-all cursor-pointer hover:border-primary/50 border-2"
                  onClick={() => navigate('/dashboard')}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5 text-primary" />
                      Manage Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      View and manage your workers, assign jobs, and track performance.
                    </p>
                    <Button className="mt-4 w-full" onClick={() => navigate('/dashboard')}>
                      Open Dashboard
                    </Button>
                  </CardContent>
                </Card>

                <Card
                  className="hover:shadow-lg transition-all cursor-pointer hover:border-primary/50 border-2"
                  onClick={() => navigate('/dashboard')}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Bookings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Review incoming bookings and service requests for your team.
                    </p>
                    <Button variant="outline" className="mt-4 w-full" onClick={() => navigate('/dashboard')}>
                      View Bookings
                    </Button>
                  </CardContent>
                </Card>

                <Card
                  className="hover:shadow-lg transition-all cursor-pointer hover:border-primary/50 border-2"
                  onClick={() => navigate('/dashboard')}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart className="h-5 w-5 text-primary" />
                      Stats &amp; Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Track your business growth, revenue, and team statistics.
                    </p>
                    <Button variant="outline" className="mt-4 w-full" onClick={() => navigate('/dashboard')}>
                      View Stats
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Shop Search Results for Providers */}
              {searchQuery && shops.length > 0 && (
                <div className="mt-10">
                  <h2 className="text-2xl font-bold mb-6">Worker Shops &amp; Services</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shops.map((shop) => {
                      const requestSent = chatRequestsSent.has(shop._id);
                      return (
                        <Card
                          key={shop._id}
                          className="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
                          onClick={() => handleShopCardClick(shop)}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Store className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">{shop.name}</CardTitle>
                              </div>
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full capitalize">
                                {shop.shopType}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {shop.serviceId?.name || shop.customService}
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm line-clamp-2">{shop.description}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{shop.contactNumber}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Owner: {shop.ownerId.name}
                            </div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChatWithShop(shop);
                              }}
                              className={`w-full gap-2 transition-colors ${requestSent ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                              size="sm"
                              disabled={requestSent}
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span className={requestSent ? 'text-white font-semibold' : ''}>
                                {requestSent ? '✓ Request Sent' : 'Chat with Owner'}
                              </span>
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {searchQuery && shops.length === 0 && !loadingShops && (
                <div className="mt-10 text-center py-8">
                  <Store className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-1">No Shops Found</h3>
                  <p className="text-sm text-muted-foreground">No worker shops found for "{searchQuery}"</p>
                </div>
              )}

              {loadingShops && (
                <div className="mt-10 text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-sm text-muted-foreground">Searching for worker shops...</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className="py-12 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Ready to Get Started?</h2>
                <p className="text-muted-foreground">
                  {userType === "worker"
                    ? "Find your next job opportunity today"
                    : userType === "provider"
                      ? "Manage your team and grow your business"
                      : "Book a service with trusted professionals"}
                </p>
              </div>
              <div className="flex gap-4">
                <Button
                  size="lg"
                  className="hover-invert"
                  onClick={() => {
                    if (userType === "provider") navigate("/dashboard");
                    else if (userType === "worker") navigate("/worker-dashboard");
                    else navigate("/browse-workers");
                  }}
                >
                  {content.cta}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleLogout}
                  className="hover-invert"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Shop Details Dialog */}
      <ShopDetailsDialog
        shop={selectedShop}
        open={shopDetailsOpen}
        onOpenChange={setShopDetailsOpen}
        onChatClick={handleChatWithShop}
        chatRequestSent={selectedShop ? chatRequestsSent.has(selectedShop._id) : false}
      />
    </Layout>
  );
};

export default Home;
