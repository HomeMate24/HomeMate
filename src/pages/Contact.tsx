import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Github, Linkedin, Send } from "lucide-react";
import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAuthenticated = !!localStorage.getItem("homemate-authenticated");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Open mailto link with pre-filled info
    const subject = encodeURIComponent(`HomeMate Contact: Message from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.open(`mailto:homemateservices7@gmail.com?subject=${subject}&body=${body}`, "_blank");
    toast({
      title: "Opening email client",
      description: "Your default email client will open with the message.",
    });
    setName("");
    setEmail("");
    setMessage("");
  };

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
                Get in <span className="gradient-text">Touch</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Have questions, feedback, or want to collaborate? We'd love to hear from you.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Contact Info */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Contact Information</h2>
                <p className="text-muted-foreground">
                  Reach out to us through any of the channels below. We typically respond within 24 hours.
                </p>

                <div className="space-y-4">
                  <a
                    href="mailto:homemateservices7@gmail.com"
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-colors group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Email</p>
                      <p className="text-sm text-muted-foreground">homemateservices7@gmail.com</p>
                    </div>
                  </a>

                  <a
                    href="https://github.com/HomeMate24"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-colors group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Github className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">GitHub</p>
                      <p className="text-sm text-muted-foreground">github.com/HomeMate24</p>
                    </div>
                  </a>

                  <a
                    href="https://linkedin.com/in/atharva-nijampurkar-1b9b152bb/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-colors group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Linkedin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">LinkedIn</p>
                      <p className="text-sm text-muted-foreground">Atharva Nijampurkar</p>
                    </div>
                  </a>
                </div>
              </div>

              {/* Contact Form */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    Send a Message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Name</label>
                      <Input
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Email</label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Message</label>
                      <textarea
                        className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="How can we help you?"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full hover-invert gap-2">
                      <Send className="h-4 w-4" />
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Contact;
