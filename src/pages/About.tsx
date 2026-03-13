import { useNavigate } from "react-router-dom";
import { Wrench, Users, Building2, ArrowLeft, Shield, Clock, Star } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const About = () => {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem("homemate-authenticated");

  return (
    <Layout isAuthenticated={isAuthenticated}>
      <div className="min-h-[calc(100vh-8rem)]">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/5 to-transparent py-16">
          <div className="container mx-auto px-4">
            <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="max-w-3xl mx-auto text-center animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                About <span className="gradient-text">HomeMate</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Connecting homeowners with trusted service professionals — fast, reliable, and hassle-free.
              </p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <Card className="border-2">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed">
                  HomeMate was built to bridge the gap between skilled home-service professionals and the
                  people who need them. Whether you need a plumber for an emergency leak, a carpenter to build
                  custom furniture, or a full team of workers for a renovation — HomeMate makes the connection
                  seamless, transparent, and trustworthy.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How it works */}
        <section className="py-12 bg-card border-y border-border">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mx-auto">
                  <Users className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-lg">Clients</h3>
                <p className="text-sm text-muted-foreground">
                  Search for services, browse verified workers, book appointments, and pay securely —
                  all from one platform.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mx-auto">
                  <Wrench className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-lg">Workers</h3>
                <p className="text-sm text-muted-foreground">
                  Create a professional profile, receive job requests, build your reputation with reviews,
                  and grow your career.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mx-auto">
                  <Building2 className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-lg">Providers</h3>
                <p className="text-sm text-muted-foreground">
                  Register your business, manage a team of workers, handle bookings in bulk, and track
                  performance analytics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why HomeMate */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-10">Why Choose HomeMate?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="card-hover">
                <CardContent className="p-6 text-center space-y-3">
                  <Shield className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="font-semibold">Verified Professionals</h3>
                  <p className="text-sm text-muted-foreground">
                    Every worker is vetted and reviewed by real clients so you can hire with confidence.
                  </p>
                </CardContent>
              </Card>
              <Card className="card-hover">
                <CardContent className="p-6 text-center space-y-3">
                  <Clock className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="font-semibold">Real-Time Updates</h3>
                  <p className="text-sm text-muted-foreground">
                    Live job status tracking, instant notifications, and in-app chat keep everyone in sync.
                  </p>
                </CardContent>
              </Card>
              <Card className="card-hover">
                <CardContent className="p-6 text-center space-y-3">
                  <Star className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="font-semibold">Ratings & Reviews</h3>
                  <p className="text-sm text-muted-foreground">
                    A transparent review system helps the best professionals stand out and grow.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default About;
