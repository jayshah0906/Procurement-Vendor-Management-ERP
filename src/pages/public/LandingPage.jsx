import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden relative font-sans">
      
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-32 -left-32 w-96 h-96 bg-[var(--color-pale-blue)] rounded-full mix-blend-multiply filter blur-3xl opacity-70"
        ></motion.div>
        <motion.div 
          animate={{ scale: [1, 1.3, 1], x: [0, 100, 0] }} 
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-32 right-10 w-80 h-80 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50"
        ></motion.div>
      </div>

      {/* Glassmorphic Header */}
      <header className="relative z-10 container mx-auto px-6 py-6">
        <nav className="flex items-center justify-between bg-white/70 backdrop-blur-lg px-8 py-4 rounded-2xl shadow-sm border border-white/20">
          <div className="flex items-center gap-2 font-bold text-2xl text-[var(--color-royal-blue)]">
            <span className="text-3xl">∞</span>
            VendorBridge
          </div>
          <div className="hidden md:flex gap-8 font-medium text-gray-600">
            <a href="#features" className="hover:text-[var(--color-royal-blue)] transition">Features</a>
            <a href="#solutions" className="hover:text-[var(--color-royal-blue)] transition">Solutions</a>
            <a href="#about" className="hover:text-[var(--color-royal-blue)] transition">About Us</a>
          </div>
          <div>
            <Button variant="outline" onClick={() => navigate('/login')} className="mr-4">Sign In</Button>
            <Button variant="primary" onClick={() => navigate('/login')}>Get Started</Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6 pt-20 pb-32 flex flex-col md:flex-row items-center justify-between gap-12">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1 max-w-2xl"
        >
          <h1 className="text-6xl font-extrabold text-gray-900 leading-tight mb-6 tracking-tight">
            Smart. Simple. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-royal-blue)] to-[var(--color-eggplant)]">Superior.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Your tech-driven, enterprise-grade partner for product sourcing, vendor management, and streamlined procurement workflows.
          </p>
          <div className="flex gap-4">
            <Button variant="primary" size="lg" onClick={() => navigate('/login')}>Request a Demo</Button>
            <Button variant="outline" size="lg">Learn More</Button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 w-full flex justify-end"
        >
          <img 
            src="/src/assets/hero_illustration.png" 
            alt="VendorBridge Logistics" 
            className="w-full max-w-lg rounded-2xl shadow-2xl transform rotate-1 hover:rotate-0 transition duration-500"
          />
        </motion.div>
      </main>

    </div>
  );
};
