import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Phone, ArrowRight, Mail, Rocket, Bot, CreditCard, Check, FileText, Printer, 
  Smartphone, Zap, LayoutDashboard, Settings, Users, BarChart, MessageSquare,Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";
import dashboard from '../assets/dashboard.png';
import invoice from '../assets/invoice.png';
import analytics from '../assets/analystics.png';
import samplePDF from '../assets/sample-brouchure.pdf';


// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const AnimatedCard = ({ children }: { children: React.ReactNode }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={item}
    >
      {children}
    </motion.div>
  );
};

const FeatureHighlight = ({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="flex flex-col items-center text-center p-6 bg-background rounded-xl border border-border shadow-sm hover:shadow-md transition-all"
    >
      <div
        className={`w-14 h-14 rounded-full ${color} flex items-center justify-center mb-4`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </motion.div>
  );
};

const DownloadPDFButton = () => {
  const handleDownload = () => {
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = samplePDF;
    link.download = 'PTS-Billing-Solution-Brochure.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="fixed top-4 right-4 z-50"
    >
      <Button
        onClick={handleDownload}
        className="shadow-lg hover:shadow-xl transition-all group"
        variant="outline"
        size="sm"
      >
        <Download className="h-4 w-4 mr-2 group-hover:animate-bounce" />
        <span className="hidden sm:inline">Download Brochure</span>
        <span className="sm:hidden">PDF</span>
      </Button>
    </motion.div>
  );
};
export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const controls = useAnimation();
  const [activeTab, setActiveTab] = React.useState("monthly");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle class
    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;

      constructor(width: number, height: number) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.color = `hsl(${Math.random() * 60 + 200}, 80%, 60%)`;
      }

      update(width: number, height: number) {
        this.x += this.speedX;
        this.y += this.speedY;

        // Bounce off edges
        if (this.x < 0 || this.x > width) this.speedX *= -1;
        if (this.y < 0 || this.y > height) this.speedY *= -1;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
      }
    }

    // Create particles
    const particles: Particle[] = [];
    const particleCount = window.innerWidth < 768 ? 30 : 80;

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(canvas.width, canvas.height));
    }

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.shadowBlur = 0;

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const opacity = 1 - distance / 150;
            ctx.strokeStyle = `rgba(100, 150, 255, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Update and draw particles
      particles.forEach(particle => {
        particle.update(canvas.width, canvas.height);
        particle.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  React.useEffect(() => {
    const sequence = async () => {
      await controls.start("visible");
    };
    sequence();
  }, [controls]);

   return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-background">
      {/* Download PDF Button - Fixed in top right corner */}
      <DownloadPDFButton />
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-background overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
        />

        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-80 h-80 rounded-full bg-primary/10 blur-[100px]"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px]"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] radial-gradient"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 gap-12 items-center">
            <div className="space-y-8 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium backdrop-blur-sm">
                <Rocket className="h-4 w-4 mr-2" />
                Modern Billing Solution
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-primary">Smart Billing Software</span>{" "}
                for Your Business
              </h1>

              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Create, manage, and send professional invoices instantly via WhatsApp.
                Streamline your billing process with our easy-to-use platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 px-8 py-6 text-lg font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all transform hover:scale-105"
                  onClick={() => navigate("/login")}
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Everything You Need for{" "}
              <span className="text-primary">Effortless Billing</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our platform combines powerful features with simple design to save you time
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureHighlight
              icon={<FileText className="h-6 w-6 text-white" />}
              title="Instant Invoices"
              description="Create professional invoices in seconds with customizable templates"
              color="bg-blue-500"
            />
            <FeatureHighlight
              icon={<Smartphone className="h-6 w-6 text-white" />}
              title="WhatsApp Delivery"
              description="Send invoices directly to customers via WhatsApp with one click"
              color="bg-green-500"
            />
            <FeatureHighlight
              icon={<Printer className="h-6 w-6 text-white" />}
              title="Print & PDF"
              description="Generate print-ready invoices or save as PDF for your records"
              color="bg-purple-500"
            />
            <FeatureHighlight
              icon={<Zap className="h-6 w-6 text-white" />}
              title="Auto Reminders"
              description="Automatically send payment reminders for overdue invoices"
              color="bg-orange-500"
            />
          </div>
        </div>
      </section>

      {/* Detailed Features Section */}
      <section className="py-20 bg-background relative overflow-hidden mt-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Powerful Billing{" "}
              <span className="text-primary">Features</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Comprehensive tools designed to simplify your billing process
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <h3 className="text-2xl md:text-3xl font-bold mb-6">
                Dashboard Overview
              </h3>
              <p className="text-muted-foreground mb-6">
                Get a complete view of your business finances at a glance. Track pending
                payments, recent transactions, and overall cash flow from one central dashboard.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-lg mr-4">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">
                      Real-time Financial Snapshot
                    </h4>
                    <p className="text-muted-foreground">
                      Monitor your business health with up-to-date metrics
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-lg mr-4">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Customizable Views</h4>
                    <p className="text-muted-foreground">
                      Tailor the dashboard to show the data that matters most to you
                    </p>
                  </div>
                </li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <div className="relative rounded-2xl overflow-hidden border border-border shadow-xl">
                <img
                  src={dashboard}
                  alt="Billing Dashboard"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="relative rounded-2xl overflow-hidden border border-border shadow-xl">
                <img
                  src={invoice}
                  alt="Invoice Creation"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl md:text-3xl font-bold mb-6">
                Professional Invoices
              </h3>
              <p className="text-muted-foreground mb-6">
                Create beautiful, branded invoices in seconds. Add your logo, customize colors,
                and include all necessary details with our intuitive invoice designer.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-lg mr-4">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">
                      Multiple Templates
                    </h4>
                    <p className="text-muted-foreground">
                      Choose from professional designs for every business type
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-lg mr-4">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Client Management</h4>
                    <p className="text-muted-foreground">
                      Store client details for faster invoice creation
                    </p>
                  </div>
                </li>
              </ul>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <h3 className="text-2xl md:text-3xl font-bold mb-6">
                Business Analytics
              </h3>
              <p className="text-muted-foreground mb-6">
                Gain valuable insights into your business performance. Track sales trends,
                identify your best customers, and analyze payment patterns to make better decisions.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-lg mr-4">
                    <BarChart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">
                      Sales Reports
                    </h4>
                    <p className="text-muted-foreground">
                      Generate detailed reports by period, product, or customer
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-lg mr-4">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Payment Tracking</h4>
                    <p className="text-muted-foreground">
                      Monitor which invoices are paid, pending, or overdue
                    </p>
                  </div>
                </li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <div className="relative rounded-2xl overflow-hidden border border-border shadow-xl">
                <img
                  src={analytics}
                  alt="Business Analytics"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary/90 text-black">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="show"
            variants={container}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { value: "3x", label: "Faster Billing" },
              { value: "10K+", label: "Invoices Generated" },
              { value: "95%", label: "Faster Payments" },
              { value: "24/7", label: "Support Available" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                variants={item}
                className="text-center p-6"
              >
                <motion.p
                  whileHover={{ scale: 1.1 }}
                  className="text-4xl md:text-5xl font-bold mb-4"
                >
                  {stat.value}
                </motion.p>
                <p className="text-lg opacity-90">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Simple Pricing
            </motion.div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Affordable Plans for{" "}
              <span className="text-primary">Every Business</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Choose the plan that fits your business needs
            </p>
          </motion.div>

          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-secondary rounded-full p-1">
              {["monthly", "yearly", "lifetime"].map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  className={`rounded-full ${activeTab === tab ? "shadow-md" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Basic Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-background border rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2">Starter</h3>
                <div className="flex items-end mb-4">
                  <span className="text-4xl font-bold">
                    {activeTab === "monthly" ? "₹499" : 
                     activeTab === "yearly" ? "₹4,999" : "₹14,999"}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {activeTab !== "lifetime" ? "/month" : " one-time"}
                  </span>
                </div>
                {activeTab === "yearly" && (
                  <p className="text-sm text-green-500 mb-4">Save 16%</p>
                )}
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <span>50 invoices/month</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <span>WhatsApp delivery</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <span>Basic templates</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Button onClick={() => navigate("/login")} className="w-full">Get Started</Button>
              </div>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-background border-2 border-primary rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-2xl font-bold">Professional</h3>
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    Popular
                  </span>
                </div>
                <div className="flex items-end mb-4">
                  <span className="text-4xl font-bold">
                    {activeTab === "monthly" ? "₹999" : 
                     activeTab === "yearly" ? "₹9,999" : "₹29,999"}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {activeTab !== "lifetime" ? "/month" : " one-time"}
                  </span>
                </div>
                {activeTab === "yearly" && (
                  <p className="text-sm text-green-500 mb-4">Save 17%</p>
                )}
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <span>200 invoices/month</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <span>Premium templates</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <span>Auto payment reminders</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <span>Basic analytics</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button onClick={() => navigate("/login")} className="w-full bg-primary hover:bg-primary/90">Get Started</Button>
              </div>
            </motion.div>

            {/* Team Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-background border rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2">Business</h3>
                <div className="flex items-end mb-4">
                  <span className="text-4xl font-bold">
                    {activeTab === "monthly" ? "₹1,999" : 
                     activeTab === "yearly" ? "₹19,999" : "₹59,999"}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {activeTab !== "lifetime" ? "/month" : " one-time"}
                  </span>
                </div>
                {activeTab === "yearly" && (
                  <p className="text-sm text-green-500 mb-4">Save 17%</p>
                )}
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <span>Unlimited invoices</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <span>Custom branding</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <span>Multi-user access</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <span>Dedicated account manager</span>
                  </li>
                </ul>
                <Button onClick={() => navigate("/login")} className="w-full">Get Started</Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-secondary/10 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.svg')] opacity-5"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              What Our Customers Say
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Don't just take our word for it. Here's what our customers say about us.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-background p-8 rounded-2xl border border-border shadow-sm">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl mr-1">★</span>
                ))}
              </div>
              <p className="text-lg italic mb-6">
                "This billing software has saved me hours every week. Sending invoices via WhatsApp gets me paid faster!"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                  <span className="text-lg font-bold text-primary">RS</span>
                </div>
                <div>
                  <h4 className="font-semibold">Rahul Sharma</h4>
                  <p className="text-muted-foreground text-sm">Freelance Designer</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-background p-8 rounded-2xl border border-border shadow-sm">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl mr-1">★</span>
                ))}
              </div>
              <p className="text-lg italic mb-6">
                "The WhatsApp integration is a game-changer. My customers love receiving invoices directly on WhatsApp."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                  <span className="text-lg font-bold text-primary">PG</span>
                </div>
                <div>
                  <h4 className="font-semibold">Priya Gupta</h4>
                  <p className="text-muted-foreground text-sm">Small Business Owner</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-background p-8 rounded-2xl border border-border shadow-sm">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl mr-1">★</span>
                ))}
              </div>
              <p className="text-lg italic mb-6">
                "Creating professional invoices used to take me 15 minutes each. Now it takes 15 seconds!"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                  <span className="text-lg font-bold text-primary">AM</span>
                </div>
                <div>
                  <h4 className="font-semibold">Amit Mishra</h4>
                  <p className="text-muted-foreground text-sm">Consultant</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-28 bg-gradient-to-r from-primary to-primary/80 text-white relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.svg')] opacity-10"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-white/5 blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-background/10 backdrop-blur-sm border border-white/20 rounded-3xl p-8 md:p-12 max-w-4xl mx-auto"
          >
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-6"
            >
              Ready to Simplify Your Billing?
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              viewport={{ once: true }}
              className="text-xl mb-8 max-w-2xl mx-auto"
            >
              Join thousands of businesses saving time with our billing software
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <Button
                onClick={() => navigate("/register")}
                className="bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg font-semibold hover:scale-105 transition-transform"
                size="lg"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/demo")}
                className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold hover:scale-105 transition-transform"
                size="lg"
              >
                Request Demo
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              viewport={{ once: true }}
              className="mt-6 text-sm text-white/80"
            >
              No credit card required • 14-day free trial • Cancel anytime
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to know about our billing software
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            variants={container}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            {[
              {
                question: "How does WhatsApp invoice delivery work?",
                answer:
                  "Our system automatically sends invoices to your customers' WhatsApp numbers. You just need to enter their WhatsApp-enabled phone number, and we handle the delivery instantly.",
              },
              {
                question: "Can I customize the invoice design?",
                answer:
                  "Yes, you can fully customize invoices with your logo, colors, and business information. We offer multiple professional templates to choose from.",
              },
              {
                question: "Is there a mobile app available?",
                answer:
                  "Yes, our mobile app is available for both iOS and Android, allowing you to create and send invoices from anywhere.",
              },
              {
                question: "How secure is my financial data?",
                answer:
                  "We use bank-grade encryption and follow strict security protocols to ensure your data is always protected. Regular backups prevent any data loss.",
              },
              {
                question: "What payment methods can I accept?",
                answer:
                  "You can accept all major payment methods including UPI, credit/debit cards, net banking, and more. Payment links can be included in your invoices.",
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                variants={item}
                className="mb-6 last:mb-0"
              >
                <Card className="hover:shadow-lg transition-all">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary py-16 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
            <div>
              <h3 className="font-bold text-lg mb-4">Product</h3>
              <ul className="space-y-3">
                {[
                  "Features",
                  "Pricing",
                  "Mobile App",
                  "WhatsApp Integration",
                  "Changelog",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Solutions</h3>
              <ul className="space-y-3">
                {[
                  "Freelancers",
                  "Small Business",
                  "Retail Stores",
                  "Service Providers",
                  "Startups",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Resources</h3>
              <ul className="space-y-3">
                {[
                  "Blog",
                  "Help Center",
                  "Video Tutorials",
                  "Invoice Templates",
                  "API Docs",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Company</h3>
              <ul className="space-y-3">
                {["About Us", "Careers", "Contact", "Press"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Connect</h3>
              <div className="flex space-x-4 mb-6">
                {["Twitter", "LinkedIn", "Facebook", "YouTube"].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {social}
                  </a>
                ))}
              </div>
              <div className="space-y-3">
                <div className="flex items-center text-muted-foreground">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>support@mybillingapp.com</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>+91 98765 43210</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span>WhatsApp Support</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} PTS Billing Software. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a
                href="#"
                className="text-muted-foreground hover:text-primary text-sm transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary text-sm transition-colors"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary text-sm transition-colors"
              >
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WelcomePage;