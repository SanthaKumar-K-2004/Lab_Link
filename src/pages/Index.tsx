import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, useScroll, useTransform, useInView, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  QrCode,
  Package,
  Users,
  BarChart3,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Sparkles,
  FlaskConical,
  LayoutGrid,
  User,
} from "lucide-react";
import { ScientificAnimatedBackground } from "@/components/landing/ScientificAnimatedBackground";

const features = [
  {
    icon: QrCode,
    title: "QR-Based Tracking",
    description:
      "Instant item identification with secure QR codes. Scan to issue, return, or view item details in seconds.",
  },
  {
    icon: Package,
    title: "Smart Inventory",
    description:
      "Real-time stock levels, automated low-stock alerts, and comprehensive item lifecycle management.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description:
      "Granular permissions for Admin, Staff, Students, and Technicians. Secure and audit-compliant.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description:
      "Data-driven insights with beautiful dashboards. Track usage patterns, generate reports, predict needs.",
  },
  {
    icon: Shield,
    title: "Chemical Safety",
    description:
      "Track expiry dates, hazard levels, and safety requirements. Automated compliance alerts.",
  },
  {
    icon: Zap,
    title: "Instant Workflows",
    description:
      "Streamlined borrow/return processes. Approve requests, track maintenance, all in real-time.",
  },
];

const stats = [
  { value: 99.9, suffix: "%", label: "Uptime Guarantee", isDecimal: true },
  { value: 2450, suffix: "+", label: "Items Managed", isDecimal: false },
  { value: 500, suffix: "+", label: "Active Users", isDecimal: false },
  { value: 60, suffix: "%", label: "Time Saved", isDecimal: false },
];

const AnimatedCounter = ({
  value,
  suffix,
  isDecimal,
}: {
  value: number;
  suffix: string;
  isDecimal: boolean;
}) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(nodeRef, { once: true, margin: "-50px" });

  useEffect(() => {
    if (isInView && nodeRef.current) {
      const controls = animate(0, value, {
        duration: 2,
        ease: "easeOut",
        onUpdate(current) {
          if (nodeRef.current) {
            nodeRef.current.textContent = isDecimal
              ? current.toFixed(1)
              : Math.floor(current).toLocaleString();
          }
        },
      });
      return () => controls.stop();
    }
  }, [isInView, value, isDecimal]);

  return (
    <div className="flex items-center justify-center font-display text-4xl font-bold text-primary md:text-5xl">
      <span ref={nodeRef}>0</span>
      <span>{suffix}</span>
    </div>
  );
};

// Animation Variants
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fadeUpVariant = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 50 },
  },
};

export default function Index() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      {/* Navigation matching Reference Image */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 z-50 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-blue-50/80 dark:border-slate-800/80 transition-all"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/lablink-logo.png"
              alt="LabLink - Lab Smart"
              className="h-10 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/catalog"
              className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Browse Catalog
            </Link>
            <Link
              to="/auth"
              className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Sign In
            </Link>
            <Link to="/auth">
              <Button
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-5 py-2 h-auto shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all flex items-center gap-1.5"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section matching Reference Image */}
      <section className="relative min-h-[92vh] isolate flex flex-col justify-center pt-24 pb-16 overflow-hidden">
        {/* Animated Interactive Scientific LineWaves Background with Watermarks & Silk Wave */}
        <ScientificAnimatedBackground
          color1="#0284c7"
          color2="#38bdf8"
          color3="#0ea5e9"
          speed={0.25}
          lineCount={64}
          lineWidth={1.6}
          glow={0.7}
          brightness={1.35}
          highlight={0.45}
          highlightWidth={1.5}
          warpIntensity={0.85}
          warpScale={1.3}
          rotation={-22}
          enableMouseInteraction={true}
          clickRipple={true}
          className="absolute inset-0 z-0"
        />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="container mx-auto px-4 text-center z-10 flex flex-col items-center justify-center max-w-4xl"
        >
          {/* Clean, Non-AI headline matching Reference Image */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]"
          >
            Laboratory Inventory
            <br />
            <span className="text-[#2563eb]">and Assets Management</span>
            <br />
            <span className="text-[#2563eb]">System</span>
          </motion.h1>

          {/* Centered Flask Divider matching Reference Image: — ⚗️ — */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-3 my-5"
          >
            <div className="h-[1.5px] w-12 bg-blue-300/80 rounded-full" />
            <FlaskConical className="h-5 w-5 text-blue-500" strokeWidth={1.8} />
            <div className="h-[1.5px] w-12 bg-blue-300/80 rounded-full" />
          </motion.div>

          {/* Subtitle matching Reference Image */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal leading-relaxed text-center"
          >
            Modernize your lab operations with real-time inventory tracking, QR-based
            management, and comprehensive analytics. Built for forward-thinking
            educational institutions and research facilities.
          </motion.p>

          {/* CTA Action Buttons matching Reference Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Link to="/catalog" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-medium shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_10px_24px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Browse Catalog</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link to="/auth" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-7 rounded-2xl bg-white/95 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200/90 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] font-medium transition-all flex items-center justify-center gap-2"
              >
                <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                <span>Sign In</span>
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="relative z-20 -mt-10 pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 gap-6 rounded-3xl bg-background/80 backdrop-blur-2xl border border-border/50 p-8 shadow-2xl md:grid-cols-4 lg:p-12 relative overflow-hidden"
          >
            {/* Subtle inner gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center relative z-10"
              >
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  isDecimal={stat.isDecimal}
                />
                <p className="mt-2 text-sm font-medium text-muted-foreground md:text-base">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 bg-muted/30 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute right-0 top-0 h-[500px] w-[500px] translate-x-1/3 -translate-y-1/4 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute left-0 bottom-0 h-[500px] w-[500px] -translate-x-1/3 translate-y-1/4 rounded-full bg-blue-500/10 blur-[100px]" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariant}
            className="text-center"
          >
            <Badge variant="outline" className="mb-4 bg-background border-primary/20 text-primary">
              Powerful Features
            </Badge>
            <h2 className="font-display text-3xl font-bold md:text-5xl tracking-tight mb-6">
              Everything You Need to Manage Your Lab
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              A complete suite of tools designed specifically for laboratory
              inventory management, built with modern technology and intuitive
              design.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeUpVariant}>
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="h-full"
                >
                  <Card className="h-full overflow-hidden border border-border/50 bg-background/50 backdrop-blur-lg hover:border-primary/50 hover:shadow-[0_8px_30px_rgba(59,130,246,0.12)] transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-cyan-500/10 border border-primary/10 shadow-inner group-hover:from-primary/20 group-hover:to-cyan-500/20 transition-colors">
                        <feature.icon className="h-7 w-7 text-primary" />
                      </div>
                      <h3 className="mb-3 font-display text-xl font-semibold">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="container mx-auto px-4 z-10 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <Card className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 shadow-2xl">
              {/* Decorative shapes inside CTA */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-10 w-64 h-64 bg-cyan-400 rounded-full mix-blend-screen filter blur-[80px] animate-pulse" />
                <div className="absolute bottom-0 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-[100px]" />
              </div>
              
              <CardContent className="relative z-10 p-12 text-center md:p-20">
                <h2 className="font-display text-4xl font-bold text-white md:text-5xl mb-6">
                  Ready to Modernize Your Lab?
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-blue-100/80 mb-10">
                  Join hundreds of forward-thinking institutions already using LabLink to
                  streamline their laboratory operations and asset management.
                </p>
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <Link to="/auth">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button size="xl" className="bg-white text-indigo-900 hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.3)] h-14 px-8 text-lg font-semibold">
                        Get Started Free
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </motion.div>
                  </Link>
                  <Link to="/catalog">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button size="xl" variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm h-14 px-8 text-lg">
                        View Demo Catalog
                      </Button>
                    </motion.div>
                  </Link>
                </div>
                
                <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-blue-200/70 font-medium">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-cyan-400" /> Free 14-day trial
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-cyan-400" /> No credit card required
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-cyan-400" /> Enterprise-grade security
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/40 bg-background pt-16 pb-8">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-12">
            <div className="flex flex-col gap-4">
              <Link to="/" className="flex items-center gap-3 group w-fit">
                <img
                  src="/lablink-logo.png"
                  alt="LabLink - Lab Smart"
                  className="h-9 w-auto object-contain"
                />
              </Link>
              <p className="text-sm text-muted-foreground max-w-xs mt-2">
                Modernizing laboratory operations with real-time inventory tracking, QR-based management, and comprehensive analytics.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/catalog" className="hover:text-primary transition-colors">Equipment Catalog</Link></li>
                <li><Link to="/auth" className="hover:text-primary transition-colors">QR Tracking</Link></li>
                <li><Link to="/auth" className="hover:text-primary transition-colors">Asset Management</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact Support</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © 2026 LabLink. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground text-center md:text-right flex items-center gap-1">
              A <span className="font-semibold text-blue-500 mx-1">LabLink Solution</span> by 
              <span className="font-semibold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent ml-1">
                Alphax Heros
              </span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
