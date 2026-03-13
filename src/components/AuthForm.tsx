import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, ArrowLeft, CheckCircle, Loader2, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { sendOtp, verifyOtp, googleAuth } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";

interface AuthFormProps {
  userType: "worker" | "client" | "provider";
  onBack: () => void;
  onSubmit: (data: {
    email: string;
    password: string;
    name?: string;
    isSignUp: boolean;
    otpVerifiedToken?: string;
  }) => void;
  onGoogleSuccess?: (response: any) => void;
  isLoading?: boolean;
}

const userTypeLabels = {
  worker: "Worker",
  client: "Client",
  provider: "Provider",
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const AuthForm = ({
  userType,
  onBack,
  onSubmit,
  onGoogleSuccess,
  isLoading = false,
}: AuthFormProps) => {
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  // OTP state
  const [otpStep, setOtpStep] = useState<"idle" | "sending" | "sent" | "verifying" | "verified">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpVerifiedToken, setOtpVerifiedToken] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setInterval(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [otpCooldown]);

  // Reset OTP state when email changes
  useEffect(() => {
    if (otpStep === "verified") {
      setOtpStep("idle");
      setOtpVerifiedToken("");
      setOtpCode("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.email]);

  const handleSendOtp = async () => {
    if (!formData.email) {
      toast({ title: "Error", description: "Enter your email first", variant: "destructive" });
      return;
    }
    try {
      setOtpStep("sending");
      await sendOtp(formData.email);
      setOtpStep("sent");
      setOtpCooldown(60);
      toast({ title: "OTP Sent", description: "Check your email inbox for the 6-digit code." });
    } catch (err: any) {
      setOtpStep("idle");
      toast({ title: "Error", description: err.message || "Failed to send OTP", variant: "destructive" });
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({ title: "Error", description: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    try {
      setOtpStep("verifying");
      const res = await verifyOtp(formData.email, otpCode);
      setOtpVerifiedToken(res.data.otpVerifiedToken);
      setOtpStep("verified");
      toast({ title: "✅ Email Verified", description: "Your email has been verified!" });
    } catch (err: any) {
      setOtpStep("sent");
      toast({ title: "Error", description: err.message || "Invalid OTP", variant: "destructive" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && otpStep !== "verified") {
      toast({ title: "Verify Email", description: "Please verify your email before signing up.", variant: "destructive" });
      return;
    }
    onSubmit({ ...formData, isSignUp, otpVerifiedToken });
  };

  // Google Sign-In initialization
  const initGoogleSignIn = useCallback(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: any) => {
        try {
          const res = await googleAuth(response.credential, userType);
          if (onGoogleSuccess) onGoogleSuccess(res);
        } catch (err: any) {
          toast({ title: "Google Sign-In Failed", description: err.message, variant: "destructive" });
        }
      },
    });

    const btnContainer = document.getElementById("google-signin-btn");
    if (btnContainer) {
      btnContainer.innerHTML = "";
      window.google.accounts.id.renderButton(btnContainer, {
        theme: "filled_black",
        size: "large",
        width: "100%",
        text: isSignUp ? "signup_with" : "signin_with",
        shape: "pill",
      });
    }
  }, [userType, isSignUp, onGoogleSuccess, toast]);

  useEffect(() => {
    // Wait for the Google script to load
    const check = () => {
      if (window.google?.accounts?.id) {
        initGoogleSignIn();
      } else {
        setTimeout(check, 200);
      }
    };
    check();
  }, [initGoogleSignIn]);

  return (
    <div className="w-full max-w-md mx-auto animate-scale-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to selection
      </button>

      <div className="rounded-2xl border-2 border-border bg-card p-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold mb-2">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-muted-foreground">
            {isSignUp ? "Sign up" : "Sign in"} as a{" "}
            <span className="text-primary font-semibold">
              {userTypeLabels[userType]}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="h-12"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className={`h-12 ${isSignUp ? "pr-28" : ""}`}
                required
              />
              {isSignUp && otpStep !== "verified" && (
                <Button
                  type="button"
                  size="sm"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 text-xs px-3"
                  onClick={handleSendOtp}
                  disabled={otpStep === "sending" || otpCooldown > 0 || !formData.email}
                >
                  {otpStep === "sending" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Mail className="h-3 w-3 mr-1" />
                  )}
                  {otpCooldown > 0 ? `${otpCooldown}s` : "Verify"}
                </Button>
              )}
              {isSignUp && otpStep === "verified" && (
                <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
              )}
            </div>
          </div>

          {/* OTP input — visible after OTP is sent, hidden once verified */}
          {isSignUp && (otpStep === "sent" || otpStep === "verifying") && (
            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="otp">Verification Code</Label>
              <div className="flex gap-2">
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-12 text-center text-lg tracking-[0.5em] font-mono"
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpCode.length !== 6 || otpStep === "verifying"}
                  className="h-12 px-6"
                >
                  {otpStep === "verifying" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Didn't receive it?{" "}
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpCooldown > 0}
                  className="text-primary hover:underline disabled:text-muted-foreground"
                >
                  {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend OTP"}
                </button>
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                className="h-12 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base hover-invert"
            disabled={isLoading || (isSignUp && otpStep !== "verified")}
          >
            {isLoading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        {/* Divider */}
        {GOOGLE_CLIENT_ID && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <div id="google-signin-btn" className="flex justify-center" />
          </>
        )}

        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setOtpStep("idle");
                setOtpCode("");
                setOtpVerifiedToken("");
              }}
              className="text-primary font-semibold hover:underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
