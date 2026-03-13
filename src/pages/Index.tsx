import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, Users, Building2 } from "lucide-react";
import Layout from "@/components/Layout";
import Logo from "@/components/Logo";
import UserTypeCard from "@/components/UserTypeCard";
import AuthForm from "@/components/AuthForm";
import { login, signupClient, signupWorker, signupProvider } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";

type UserType = "worker" | "client" | "provider" | null;

const userTypes = [
  {
    id: "worker" as const,
    icon: Wrench,
    title: "Worker",
    description:
      "Join as an individual skilled professional and find jobs that match your expertise.",
    features: [
      "Create your professional profile",
      "Get matched with nearby jobs",
      "Set your own rates and schedule",
      "Build your reputation with reviews",
    ],
    badge: "For Professionals",
  },
  {
    id: "client" as const,
    icon: Users,
    title: "Client",
    description:
      "Hire trusted professionals for your home service needs with ease and confidence.",
    features: [
      "Browse verified professionals",
      "Get instant quotes",
      "Secure payment protection",
      "Rate and review services",
    ],
    badge: "For Homeowners",
  },
  {
    id: "provider" as const,
    icon: Building2,
    title: "Provider",
    description:
      "Register your business and manage your team of workers all in one place.",
    features: [
      "Manage multiple workers",
      "Handle bulk bookings",
      "Business analytics dashboard",
      "Priority customer support",
    ],
    badge: "For Businesses",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<UserType>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (data: {
    email: string;
    password: string;
    name?: string;
    isSignUp: boolean;
    otpVerifiedToken?: string;
  }) => {
    setIsLoading(true);
    try {
      if (data.isSignUp) {
        // Generate a unique phone number for signup (since form doesn't collect it)
        const uniquePhone = `99${Math.floor(10000000 + Math.random() * 90000000)}`;

        // Sign up based on user type
        if (selectedType === "client") {
          await signupClient({
            email: data.email,
            password: data.password,
            name: data.name || "",
            phone: uniquePhone,
            otpVerifiedToken: data.otpVerifiedToken || "",
          });
        } else if (selectedType === "worker") {
          await signupWorker({
            email: data.email,
            password: data.password,
            name: data.name || "",
            phone: uniquePhone,
            areaIds: [],
            serviceIds: [],
            otpVerifiedToken: data.otpVerifiedToken || "",
          });
        } else if (selectedType === "provider") {
          await signupProvider({
            email: data.email,
            password: data.password,
            name: data.name || "",
            phone: uniquePhone,
            businessName: data.name || "My Business",
            otpVerifiedToken: data.otpVerifiedToken || "",
          });
        }

        toast({
          title: "Account created!",
          description: "Please log in with your credentials",
        });

        // Auto-login after signup
        const loginResponse = await login(data.email, data.password);

        // Store user data
        localStorage.setItem("homemate-user-type", selectedType || "");
        localStorage.setItem("homemate-user-email", data.email);
        localStorage.setItem("homemate-authenticated", "true");

        toast({
          title: "Welcome!",
          description: "You've been successfully logged in",
        });

        navigate("/home");
      } else {
        // Login
        const response = await login(data.email, data.password);

        // Determine user type from response
        const user = response.data.user;
        const userType = user.role.toLowerCase();

        // Store user data
        localStorage.setItem("homemate-user-type", userType);
        localStorage.setItem("homemate-user-email", data.email);
        localStorage.setItem("homemate-authenticated", "true");

        toast({
          title: "Welcome back!",
          description: "You've been successfully logged in",
        });

        navigate("/home");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = (response: any) => {
    const user = response.data.user;
    const userType = user.role.toLowerCase();

    localStorage.setItem("homemate-user-type", userType);
    localStorage.setItem("homemate-user-email", user.email);
    localStorage.setItem("homemate-authenticated", "true");

    toast({
      title: "Welcome!",
      description: "Signed in with Google successfully",
    });

    navigate("/home");
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-6xl">
          {!selectedType ? (
            <div className="animate-fade-in">
              {/* Hero Section */}
              <div className="text-center mb-12">
                <div className="flex justify-center mb-6">
                  <Logo size="lg" />
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                  Find the Right <span className="gradient-text">Service</span> for
                  Your Home
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Connect with skilled workers, trusted providers, and homeowners.
                  Choose how you want to use HomeMate.
                </p>
              </div>

              {/* User Type Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                {userTypes.map((type, index) => (
                  <div
                    key={type.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <UserTypeCard
                      icon={type.icon}
                      title={type.title}
                      description={type.description}
                      features={type.features}
                      badge={type.badge}
                      onClick={() => setSelectedType(type.id)}
                    />
                  </div>
                ))}
              </div>

              {/* Differences Section */}
              <div className="mt-16 rounded-2xl border-2 border-border bg-card p-8">
                <h2 className="text-2xl font-bold text-center mb-8">
                  What Makes Each Option Different?
                </h2>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                      <Wrench className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold mb-2">Workers</h3>
                    <p className="text-sm text-muted-foreground">
                      Individual professionals who work independently. Perfect for
                      freelancers looking to find jobs directly.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                      <Users className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold mb-2">Clients</h3>
                    <p className="text-sm text-muted-foreground">
                      Homeowners seeking services for their homes. Browse, book, and
                      pay for services with complete peace of mind.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold mb-2">Providers</h3>
                    <p className="text-sm text-muted-foreground">
                      Businesses managing teams of workers. Ideal for companies
                      offering professional home services at scale.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <AuthForm
              userType={selectedType}
              onBack={() => setSelectedType(null)}
              onSubmit={handleAuth}
              onGoogleSuccess={handleGoogleSuccess}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Index;
