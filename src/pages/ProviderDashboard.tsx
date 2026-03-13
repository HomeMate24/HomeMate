import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  MoreVertical,
  Star,
  Phone,
  Mail,
  Store,
  MessageCircle,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddWorkerDialog } from "@/components/AddWorkerDialog";
import { WorkerProfileDialog } from "@/components/WorkerProfileDialog";
import { EditWorkerDialog } from "@/components/EditWorkerDialog";
import { AssignJobDialog } from "@/components/AssignJobDialog";
import { RemoveWorkerDialog } from "@/components/RemoveWorkerDialog";
import { getDashboardStats, getWorkers, getBookings, cancelBooking } from "@/api/provider";
import { getShops, Shop } from "@/api/shop";
import { createConversation } from "@/api/chat";
import { getSentRequests, TeamRequest } from "@/api/teamRequest";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";

// Team members will be fetched from database
const teamMembers: any[] = [];

// Bookings will be fetched from database
const bookings: any[] = [];

// Analytics data will be calculated from database
const analyticsData = {
  totalRevenue: "$0",
  totalBookings: 0,
  completedJobs: 0,
  activeWorkers: 0,
  revenueChange: "+0%",
  bookingsChange: "+0%",
  jobsChange: "+0%",
  workersChange: "+0",
};

// Weekly stats will be calculated from database
const weeklyStats = [
  { day: "Mon", bookings: 0, revenue: 0 },
  { day: "Tue", bookings: 0, revenue: 0 },
  { day: "Wed", bookings: 0, revenue: 0 },
  { day: "Thu", bookings: 0, revenue: 0 },
  { day: "Fri", bookings: 0, revenue: 0 },
  { day: "Sat", bookings: 0, revenue: 0 },
  { day: "Sun", bookings: 0, revenue: 0 },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30">Active</Badge>;
    case "on-leave":
      return <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/30">On Leave</Badge>;
    case "inactive":
      return <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30">Inactive</Badge>;
    case "confirmed":
      return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30">Confirmed</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/30">Pending</Badge>;
    case "cancelled":
      return <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30">Cancelled</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
  const [isEditWorkerOpen, setIsEditWorkerOpen] = useState(false);
  const [isAssignJobOpen, setIsAssignJobOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [teamRequests, setTeamRequests] = useState<TeamRequest[]>([]);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  // State for data
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: "₹0",
    totalBookings: 0,
    completedJobs: 0,
    activeWorkers: 0,
    revenueChange: "+0%",
    bookingsChange: "+0%",
    jobsChange: "+0%",
    workersChange: "+0",
  });
  const [weeklyStats] = useState([
    { day: "Mon", bookings: 0, revenue: 0 },
    { day: "Tue", bookings: 0, revenue: 0 },
    { day: "Wed", bookings: 0, revenue: 0 },
    { day: "Thu", bookings: 0, revenue: 0 },
    { day: "Fri", bookings: 0, revenue: 0 },
    { day: "Sat", bookings: 0, revenue: 0 },
    { day: "Sun", bookings: 0, revenue: 0 },
  ]);

  // WebSocket message handler
  const handleWebSocketMessage = (message: any) => {
    if (message.type === 'TEAM_REQUEST_ACCEPTED' || message.type === 'TEAM_REQUEST_REJECTED') {
      // Reload data when a worker responds to the request
      fetchData();
      toast({
        title: message.type === 'TEAM_REQUEST_ACCEPTED' ? 'Request Accepted' : 'Request Rejected',
        description: message.type === 'TEAM_REQUEST_ACCEPTED'
          ? 'A worker has accepted your team invitation!'
          : 'A worker has rejected your team invitation',
      });
    }
  };

  useWebSocket(handleWebSocketMessage);

  // Fetch data from backend
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch dashboard stats
      const statsResponse = await getDashboardStats();
      if (statsResponse.success) {
        setAnalyticsData(statsResponse.data);
      }

      // Fetch workers
      const workersResponse = await getWorkers();
      if (workersResponse.success) {
        setTeamMembers(workersResponse.data.workers);
      }

      // Fetch bookings
      const bookingsResponse = await getBookings();
      if (bookingsResponse.success) {
        setBookings(bookingsResponse.data.bookings);
      }

      // Fetch team requests
      const requestsResponse = await getSentRequests();
      if (requestsResponse.success) {
        setTeamRequests(requestsResponse.data.requests);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const authenticated = localStorage.getItem("homemate-authenticated");
    const userType = localStorage.getItem("homemate-user-type");

    if (!authenticated) {
      navigate("/");
      return;
    }

    if (userType !== "provider") {
      navigate("/home");
      return;
    }

    // Fetch data on mount
    fetchData();
  }, [navigate]);

  const filteredTeam = teamMembers.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadShops = async () => {
    if (!searchQuery.trim()) {
      setShops([]);
      return;
    }
    try {
      setShopsLoading(true);
      const data = await getShops(searchQuery);
      setShops(data.shops);
    } catch (error) {
      console.error('Error loading shops:', error);
    } finally {
      setShopsLoading(false);
    }
  };

  const handleChatWithShop = async (shop: Shop) => {
    try {
      const response = await createConversation(shop.ownerId._id);
      if (response.conversation) {
        navigate('/chat');
        toast({
          title: 'Success',
          description: `Chat request sent to ${shop.name}`,
        });
      } else if (response.exists) {
        navigate('/chat');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start chat',
        variant: 'destructive',
      });
    }
  };

  const maxRevenue = Math.max(...weeklyStats.map((s) => s.revenue));

  const handleViewBookingDetails = (booking: any) => {
    toast({
      title: `📋 ${booking.service}`,
      description: `Client: ${booking.client} · Worker: ${booking.worker}\nDate: ${booking.date} · Time: ${booking.time}\nAmount: ${booking.amount} · Status: ${booking.status}`,
    });
  };

  const handleCancelBooking = async (booking: any) => {
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      toast({ title: 'Cannot Cancel', description: `This booking is already ${booking.status}.`, variant: 'destructive' });
      return;
    }
    try {
      setCancellingBookingId(booking.id);
      await cancelBooking(booking.id);
      toast({ title: 'Booking Cancelled', description: 'The booking has been cancelled successfully.' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to cancel booking', variant: 'destructive' });
    } finally {
      setCancellingBookingId(null);
    }
  };

  return (
    <Layout isAuthenticated>
      <div className="min-h-[calc(100vh-8rem)]">
        {/* Header Section */}
        <section className="bg-gradient-to-b from-primary/5 to-transparent py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Provider Dashboard</h1>
                <p className="text-muted-foreground">Manage your team, track bookings, and view analytics</p>
              </div>
              <Button className="hover-invert" onClick={() => setAddWorkerOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Worker
              </Button>
              <AddWorkerDialog
                open={addWorkerOpen}
                onOpenChange={setAddWorkerOpen}
                onWorkerAdded={fetchData}
              />
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsList className="grid w-full max-w-2xl grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="shops">Shops</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-8 animate-fade-in">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="card-hover">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                      <TrendingUp className="h-4 w-4 text-primary card-icon" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.totalRevenue}</div>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">{analyticsData.revenueChange} from last month</p>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
                      <Calendar className="h-4 w-4 text-primary card-icon" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.totalBookings}</div>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">{analyticsData.bookingsChange} from last month</p>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Completed Jobs</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-primary card-icon" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.completedJobs}</div>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">{analyticsData.jobsChange} from last month</p>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Active Workers</CardTitle>
                      <Users className="h-4 w-4 text-primary card-icon" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.activeWorkers}</div>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">{analyticsData.workersChange} new this month</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Weekly Analytics Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Weekly Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between gap-2 h-48">
                      {weeklyStats.map((stat) => (
                        <div key={stat.day} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full flex flex-col items-center">
                            <span className="text-xs font-medium text-muted-foreground mb-1">${stat.revenue}</span>
                            <div
                              className="w-full bg-primary rounded-t-md transition-all duration-500 hover:bg-primary/80"
                              style={{ height: `${(stat.revenue / maxRevenue) * 150}px` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{stat.day}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Bookings Preview */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Recent Bookings
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("bookings")}>
                      View All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {bookings.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">No bookings yet</p>
                        <p className="text-sm text-muted-foreground/70">Bookings will appear here when clients make reservations</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {bookings.slice(0, 3).map((booking) => (
                          <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex-1">
                              <p className="font-medium">{booking.client}</p>
                              <p className="text-sm text-muted-foreground">{booking.service} • {booking.worker}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{booking.amount}</p>
                              <p className="text-sm text-muted-foreground">{booking.date}</p>
                            </div>
                            {getStatusBadge(booking.status)}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Team Tab */}
              <TabsContent value="team" className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search team members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">All ({teamMembers.length})</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">Active ({teamMembers.filter(m => m.status === "active").length})</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">On Leave ({teamMembers.filter(m => m.status === "on-leave").length})</Badge>
                  </div>
                </div>

                {/* Pending Team Requests */}
                {teamRequests.filter(r => r.status === 'PENDING').length > 0 && (
                  <Card className="border-yellow-200 dark:border-yellow-900">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        Pending Invitations ({teamRequests.filter(r => r.status === 'PENDING').length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {teamRequests.filter(r => r.status === 'PENDING').map((request) => (
                        <div key={request._id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                          <div>
                            <p className="font-medium">{request.userId.name}</p>
                            <p className="text-sm text-muted-foreground">{request.userId.email}</p>
                            {request.message && (
                              <p className="text-sm text-muted-foreground mt-1 italic">"{request.message}"</p>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
                            Awaiting Response
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4">
                  {filteredTeam.length === 0 ? (
                    <Card>
                      <CardContent className="p-12">
                        <div className="text-center">
                          <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Workers Added Yet</h3>
                          <p className="text-muted-foreground mb-6">Start building your team by adding workers</p>
                          <Button className="hover-invert">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Worker
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredTeam.map((member, index) => (
                      <Card key={member.id} className="card-hover animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold card-icon">
                                {member.name.split(" ").map(n => n[0]).join("")}
                              </div>
                              <div>
                                <h3 className="font-semibold">{member.name}</h3>
                                <p className="text-sm text-muted-foreground">{member.role}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-6">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-medium">{Number(member.rating).toFixed(1)}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Jobs:</span>{" "}
                                <span className="font-medium">{member.jobs}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{member.phone}</span>
                              </div>
                              {getStatusBadge(member.status)}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedWorker(member);
                                    setIsViewProfileOpen(true);
                                  }}>
                                    View Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedWorker(member);
                                    setIsEditWorkerOpen(true);
                                  }}>
                                    Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedWorker(member);
                                    setIsAssignJobOpen(true);
                                  }}>
                                    Assign Job
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => {
                                      setSelectedWorker(member);
                                      setIsRemoveDialogOpen(true);
                                    }}
                                  >
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Bookings Tab */}
              <TabsContent value="bookings" className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">All ({bookings.length})</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">Confirmed ({bookings.filter(b => b.status === "confirmed").length})</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">Pending ({bookings.filter(b => b.status === "pending").length})</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-muted">Cancelled ({bookings.filter(b => b.status === "cancelled").length})</Badge>
                  </div>
                </div>

                <div className="grid gap-4">
                  {bookings.length === 0 ? (
                    <Card>
                      <CardContent className="p-12">
                        <div className="text-center">
                          <Calendar className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
                          <p className="text-muted-foreground">Bookings from clients will appear here</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    bookings.map((booking, index) => (
                      <Card key={booking.id} className="card-hover animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <Calendar className="h-6 w-6" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{booking.client}</h3>
                                <p className="text-sm text-muted-foreground">{booking.service}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-6">
                              <div className="text-sm">
                                <span className="text-muted-foreground">Worker:</span>{" "}
                                <span className="font-medium">{booking.worker}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Date:</span>{" "}
                                <span className="font-medium">{booking.date}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Time:</span>{" "}
                                <span className="font-medium">{booking.time}</span>
                              </div>
                              <div className="font-bold text-lg">{booking.amount}</div>
                              {getStatusBadge(booking.status)}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewBookingDetails(booking)}>View Details</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toast({ title: 'Coming Soon', description: 'Reschedule feature is not yet available.' })}>Reschedule</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    // Find the worker member to pre-load in the assign dialog
                                    const workerMember = teamMembers.find(m => m.name === booking.worker);
                                    if (workerMember) {
                                      setSelectedWorker(workerMember);
                                      setIsAssignJobOpen(true);
                                    } else {
                                      toast({ title: 'Info', description: 'Worker not found in your team.' });
                                    }
                                  }}>Assign Worker</DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    disabled={cancellingBookingId === booking.id || booking.status === 'cancelled' || booking.status === 'completed'}
                                    onClick={() => handleCancelBooking(booking)}
                                  >Cancel Booking</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Shops Tab */}
              <TabsContent value="shops" className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search shops and services..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); loadShops(); }}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shopsLoading ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">Loading...</div>
                  ) : shops.length === 0 ? (
                    <Card className="col-span-full">
                      <CardContent className="p-12">
                        <div className="text-center">
                          <Store className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Search for Shops</h3>
                          <p className="text-muted-foreground">
                            {searchQuery
                              ? 'No shops found for your search'
                              : 'Use the search bar to find available shops and services'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    shops.map((shop) => (
                      <Card key={shop._id} className="hover:shadow-lg transition-shadow">
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
                            onClick={() => handleChatWithShop(shop)}
                            className="w-full gap-2"
                            size="sm"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Chat with Owner
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>

      {/* Worker Action Dialogs */}
      <WorkerProfileDialog
        worker={selectedWorker}
        open={isViewProfileOpen}
        onOpenChange={setIsViewProfileOpen}
      />
      <EditWorkerDialog
        worker={selectedWorker}
        open={isEditWorkerOpen}
        onOpenChange={setIsEditWorkerOpen}
        onWorkerUpdated={fetchData}
      />
      <AssignJobDialog
        worker={selectedWorker}
        open={isAssignJobOpen}
        onOpenChange={setIsAssignJobOpen}
        onJobAssigned={fetchData}
      />
      <RemoveWorkerDialog
        worker={selectedWorker}
        open={isRemoveDialogOpen}
        onOpenChange={setIsRemoveDialogOpen}
        onWorkerRemoved={fetchData}
      />
    </Layout>
  );
};

export default ProviderDashboard;
