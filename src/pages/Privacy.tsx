import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Privacy = () => {
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
                <Shield className="h-7 w-7" />
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Privacy Policy</h1>
              <p className="text-lg text-muted-foreground">
                Your privacy matters to us. Here's how we handle your data.
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
                  <h2 className="text-xl font-bold mb-3">1. Information We Collect</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    When you create an account on HomeMate, we collect your name, email address, phone number,
                    and role type (Client, Worker, or Provider). Workers may additionally provide their service
                    areas, skills, bio, experience, and hourly rate. We also collect job booking details,
                    ratings, and reviews that you submit on the platform.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-3">2. How We Use Your Information</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We use your information to provide and improve our services, including matching clients
                    with workers, processing service bookings, enabling in-app chat, displaying worker profiles
                    and reviews, and sending notifications about job updates. We do not sell your personal
                    information to third parties.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-3">3. Data Storage & Security</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Your data is stored securely in our database with encrypted passwords using industry-standard
                    hashing (bcrypt). Authentication tokens (JWT) are used to secure API access. We implement
                    rate limiting and role-based access controls to protect your account.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-3">4. Cookies & Local Storage</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    HomeMate uses browser local storage to maintain your login session and user preferences
                    (such as theme settings). We do not use third-party tracking cookies or analytics tools
                    that monitor your browsing behavior.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-3">5. Your Rights</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    You have the right to access, update, or delete your personal data at any time through
                    your account settings. If you wish to delete your account entirely, please contact us at{" "}
                    <a href="mailto:homemateservices7@gmail.com" className="text-primary hover:underline">
                      homemateservices7@gmail.com
                    </a>.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-3">6. Changes to This Policy</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We may update this privacy policy from time to time. We will notify users of any
                    significant changes by posting a notice on our platform. Your continued use of
                    HomeMate after changes are posted constitutes acceptance of the updated policy.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-bold mb-3">7. Contact Us</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    If you have any questions about this Privacy Policy, please contact us at{" "}
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

export default Privacy;
