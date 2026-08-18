import React, { useRef, useEffect, useState } from 'react';
import { ArrowRight, Star, Sparkles, Users, Globe, Target, FileUp } from 'lucide-react';
import { motion, useInView } from 'motion/react';

function StatCounter({ value, label, prefix = "", suffix = "", icon: Icon }: { value: string, label: string, prefix?: string, suffix?: string, icon?: React.ElementType }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  const target = parseInt(value.replace(/[^0-9]/g, ''));

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const duration = 1800;
      const increment = target / (duration / 16);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [isInView, target]);

  return (
    <div ref={ref} className="text-center md:text-left space-y-1.5">
      <div className="font-display text-4xl md:text-5xl font-bold tracking-[-0.03em] [font-variant-numeric:tabular-nums] text-white">
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <p className="text-[12px] font-medium tracking-wide text-white/70 uppercase flex items-center justify-center md:justify-start gap-1.5">
        {Icon && <Icon className="w-4 h-4 text-[#00d4ff] shrink-0" />}
        {label}
      </p>
    </div>
  );
}

interface HeroSectionProps {
  onSignUp?: () => void;
  onSignIn?: () => void;
}

const HeroSection = ({ onSignUp }: HeroSectionProps) => {
  return (
    <section className="relative pt-24 pb-12 md:pt-28 md:pb-16 overflow-hidden bg-[#f8f2fa]">
      <div className="section-container relative z-10 space-y-12 md:space-y-16">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-center">
          {/* Left Column: Content */}
          <div className="space-y-7 text-center md:text-left">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#090979]/8 shadow-xs"
            >
              <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
              <span className="text-[12px] font-semibold tracking-wide text-[#090979] uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00d4ff]" /> Neural Engine Active • BD-Global Bridge
              </span>
            </motion.div>

            <div className="space-y-4">
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
                className="font-display text-[clamp(2.75rem,5.5vw,4.5rem)] font-bold tracking-[-0.03em] leading-[0.98] text-[#090979]"
              >
                Bridge the <span className="text-[#00d4ff]">Gap</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="text-[17px] leading-[1.65] text-[#090979]/70 max-w-[58ch] mx-auto md:mx-0 font-normal"
              >
                Connecting Bangladesh&#39;s brightest talent to the world&#39;s most ambitious technology ecosystems using <span className="text-[#090979] font-semibold">AI-Driven Path-Finding</span>.
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
              className="flex flex-col sm:flex-row items-center md:items-start gap-4"
            >
              <button 
                onClick={onSignUp}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-white text-[15px] flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.98] shadow-sm cursor-pointer"
                style={{ background: 'linear-gradient(90deg, #090979 0%, #00d4ff 100%)' }}
              >
                Launch skill audit <ArrowRight className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2.5 py-2">
                <div className="flex text-[#00d4ff] gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#00d4ff] text-[#00d4ff]" />
                  ))}
                </div>
                <p className="text-[13px] font-medium text-[#090979]/75">
                  <span className="font-bold text-[#090979]">4.9</span> from 2,000+ engineers
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Visual Image Panel */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            <div className="relative w-full rounded-2xl bg-[#090979]/4 p-2.5 border border-[#090979]/8">
              <img 
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80" 
                alt="Global Tech Engineers Collaborating"
                className="w-full h-auto max-h-[380px] rounded-xl object-cover shadow-xs border border-[#090979]/8"
              />
            </div>
          </motion.div>
        </div>

        {/* Hero Stats Band */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2 }}
          className="px-8 md:px-12 py-10 md:py-12 rounded-2xl text-white shadow-md relative overflow-hidden"
          style={{ background: 'linear-gradient(100deg, #090979 0%, #1b2fb8 45%, #00d4ff 100%)' }}
        >
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-white/15">
            <div className="pt-4 md:pt-0 md:px-6">
              <StatCounter value="12K" label="Audits completed" suffix="+" icon={FileUp} />
            </div>
            
            <div className="pt-4 md:pt-0 md:px-6">
              <StatCounter value="500" label="Global mentors" suffix="+" icon={Users} />
            </div>
            
            <div className="pt-4 md:pt-0 md:px-6">
              <StatCounter value="96" label="Match accuracy" suffix="%" icon={Target} />
            </div>

            <div className="pt-4 md:pt-0 md:px-6">
              <StatCounter value="25" label="Tech hubs reached" suffix="+" icon={Globe} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
