import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Terms = () => {
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
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mx-auto mb-4">
                <FileText className="h-7 w-7" />
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Terms of Service</h1>
              <p className="text-lg text-muted-foreground">
                Please read these terms carefully before using HomeMate.
              </p>
              <p className="text-sm text-muted-foreground mt-2">Last updated: March 2026</p>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-3xl space-y-6">
            <Card className="border-2">
              <CardContent className="p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-3">1. Acceptance of Terms</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    By creating an account or using HomeMate, you agree to be bound by these Terms of
                    Service. If you do not agree to these terms, please do not use the platform.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-3">2. Account Registration</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    You must provide accurate and complete information when creating an account. You are
                    responsible for maintaining the confidentiality of your login credentials and for all
                    activities that occur under your account. You must be at least 18 years old to use
                    HomeMate.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-3">3. User Roles & Responsibilities</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    HomeMate provides services for three types of users:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
                    <li><strong>Clients:</strong> May browse workers, create service requests, and leave ratings and reviews for completed jobs.</li>
                    <li><strong>Workers:</strong> May accept or reject job requests, update job statuses, create shop listings, and manage their professional profiles.</li>
                    <li><strong>Providers:</strong> May manage teams of workers, view bookings assigned to their workers, and monitor business analytics.</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-3">4. Bookings & Cancellations</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Clients can cancel pending or accepted bookings before work begins. Workers can cancel
                    accepted jobs if they are unable to fulfill them. Providers can cancel bookings on
                    behalf of their workers. Completed or already-cancelled jobs cannot be cancelled again.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-3">5. Ratings & Reviews</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Clients may rate workers on a scale of 1–5 stars and leave an optional written review
                    after a job is marked as completed. Ratings must be honest and based on the actual
                    service received. Fraudulent or abusive reviews may be removed at our discretion.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-3">6. Prohibited Conduct</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    You agree not to misuse the platform, including but not limited to: creating fake
                    accounts, submitting fraudulent reviews, harassing other users, attempting unauthorized
                    access to other accounts, or using the platform for any illegal purpose.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-3">7. Limitation of Liability</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    HomeMate acts as a platform connecting service providers with clients. We are not
                    responsible for the quality, safety, or legality of the services offered by workers
                    or providers. All transactions and interactions between users are at their own risk.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-3">8. Modifications</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We reserve the right to modify these terms at any time. Changes will be posted on
                    this page with an updated revision date. Continued use of HomeMate after changes
                    are posted constitutes acceptance of the revised terms.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-3">9. Contact</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    For questions or concerns about these Terms of Service, please contact us at{" "}
                    <a href="mailto:homemateservices7@gmail.com" className="text-primary hover:underline">
                      homemateservices7@gmail.com
                    </a>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Terms;
