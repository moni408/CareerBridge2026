import React from 'react';
import { Share2, Plus, Users, ArrowUpRight, Globe, Sparkles, Zap, ShieldCheck, Rocket, MessageSquare, Briefcase, Search } from 'lucide-react';
import { motion } from 'motion/react';

export function CollaborationHub({ searchQuery }: { searchQuery: string }) {
  const projects: any[] = [];

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.researcher.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-20 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Collaboration Network</p>
          <h1 className="text-5xl md:text-6xl font-bold text-text-primary tracking-tight leading-tight">Industry-Academia Hub</h1>
          <p className="text-text-secondary text-xl max-w-2xl leading-relaxed italic font-light">
            Bridging the gap between academic innovation and industry needs. Collaborate on real-world projects with professional partners.
          </p>
        </div>
        <button className="w-full md:w-auto btn-primary px-10 py-4 flex items-center justify-center gap-3 shadow-xl shadow-primary/20">
          <Plus className="w-5 h-5" />
          POST PROJECT
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {filteredProjects.length > 0 ? filteredProjects.map((project, i) => (
          <motion.div 
            key={project.title} 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group bg-bg-secondary border border-border p-10 rounded-[2rem] hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden shadow-sm hover:shadow-xl"
          >
            <div className="relative z-10 space-y-8">
              <div className="flex justify-between items-start gap-6">
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 bg-bg-primary rounded-2xl flex items-center justify-center border border-border group-hover:border-primary transition-all duration-700 shadow-sm`}>
                    <Rocket className={`w-7 h-7 ${project.color}`} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-text-primary tracking-tight group-hover:text-primary transition-colors">{project.title}</h3>
                    <p className="text-[9px] font-bold text-text-muted mt-2 uppercase tracking-widest flex items-center gap-2">
                       Project_Lead: <span className="text-text-secondary">{project.researcher}</span>
                    </p>
                  </div>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                  project.status === 'Active' 
                  ? 'bg-success-light text-success border-success/20' 
                  : 'bg-primary-light text-primary border-primary/20'
                }`}>
                  {project.status.toUpperCase()}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-bg-primary text-text-secondary rounded-full text-[10px] font-bold border border-border hover:border-primary/20 transition-colors uppercase tracking-widest">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-8 border-t border-border">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="w-8 h-8 rounded-full border-2 border-bg-secondary bg-bg-tertiary flex items-center justify-center text-[10px] font-bold text-text-muted transition-all group-hover:translate-x-1">
                        U{n}
                      </div>
                    ))}
                  </div>
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{project.partners} Collaborators</span>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary-dark transition-all">
                  View Project
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )) : (
          <div className="col-span-full bg-bg-secondary/50 border-2 border-dashed border-border p-20 rounded-[2rem] text-center space-y-8">
            <div className="w-20 h-20 bg-bg-primary rounded-2xl border border-border flex items-center justify-center mx-auto text-text-muted/30">
              <Search className="w-10 h-10" />
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl font-bold text-text-primary tracking-tight">No Projects Found</h3>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest max-w-md mx-auto">WE COULD NOT LOCATE ANY PROJECTS MATCHING <span className="text-primary">"{searchQuery.toUpperCase()}"</span>.</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-bg-secondary border border-primary/20 p-16 rounded-[3rem] text-center space-y-12 relative overflow-hidden group shadow-xl">
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:opacity-10 transition-all duration-1000">
           <Globe className="w-48 h-48 text-primary" />
        </div>
        <div className="max-w-2xl mx-auto space-y-10">
          <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto group-hover:rotate-12 transition-all duration-700 shadow-sm">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-text-primary tracking-tight leading-tight">Researcher or Industry Professional?</h2>
            <p className="text-text-secondary text-lg italic font-light leading-relaxed">
              Join our professional network to turn your innovative ideas into real-world industry solutions.
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <button className="btn-primary w-full md:w-auto px-12 py-5 font-bold uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/20">
              JOIN NOW
            </button>
            <button className="w-full md:w-auto bg-transparent text-text-muted border border-border px-12 py-5 rounded-xl font-bold uppercase tracking-widest text-[11px] hover:bg-bg-tertiary transition-all">
              EXPLORE PROJECTS
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-8">
        {[
          { label: 'Active Projects', value: '120+', icon: Zap },
          { label: 'Industry Partners', value: '45', icon: Briefcase },
          { label: 'Professional Experts', value: '300+', icon: ShieldCheck },
        ].map((stat, i) => (
          <div key={i} className="bg-bg-secondary border border-border p-8 rounded-2xl flex items-center gap-8 group hover:border-primary/20 transition-all shadow-sm">
            <div className="w-14 h-14 bg-bg-primary rounded-xl border border-border flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 shadow-inner">
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-3xl font-bold text-text-primary tracking-tight leading-none">{stat.value}</p>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-3">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
