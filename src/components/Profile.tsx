import React, { useState } from 'react';
import { useAuth } from '../App';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Mail, Briefcase, GraduationCap, Target, Save, Edit2, X, Plus, Trash2, Loader2, CheckCircle, ExternalLink, Clock, MapPin, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Profile() {
  const { profile, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(profile);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const profileRef = doc(db, 'users', user.uid);
      const cleanData = Object.fromEntries(
        Object.entries(editedProfile || {}).filter(([_, v]) => v !== undefined)
      );
      await updateDoc(profileRef, cleanData);

      if (profile.role === 'mentor') {
        const mentorRef = doc(db, 'mentors', user.uid);
        await setDoc(mentorRef, {
          uid: user.uid,
          name: editedProfile.displayName || profile.displayName || 'Mentor User',
          displayName: editedProfile.displayName || profile.displayName || 'Mentor User',
          company: editedProfile.company || profile.company || '',
          role: editedProfile.jobTitle || editedProfile.role || profile.jobTitle || profile.role || 'Industry Advisor',
          jobTitle: editedProfile.jobTitle || editedProfile.role || profile.jobTitle || profile.role || 'Industry Advisor',
          industry: editedProfile.industry || profile.industry || 'Software Engineering',
          expertise: editedProfile.skills || profile.skills || [],
          bio: editedProfile.summary || editedProfile.bio || profile.summary || profile.bio || '',
          linkedin: editedProfile.linkedin || profile.linkedin || '',
          hourlyRate: editedProfile.hourlyRate || profile.hourlyRate || '50',
          location: editedProfile.location || profile.location || 'Remote',
          verified: profile.verified !== false
        }, { merge: true });
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    const skill = prompt('Enter a new skill:');
    if (skill) {
      setEditedProfile({
        ...editedProfile,
        skills: [...(editedProfile.skills || []), skill]
      });
    }
  };

  const removeSkill = (index: number) => {
    const newSkills = [...(editedProfile.skills || [])];
    newSkills.splice(index, 1);
    setEditedProfile({ ...editedProfile, skills: newSkills });
  };

  if (!profile) return null;

  const isGraduate = profile.role === 'graduate' || profile.role === 'admin';

  if (!isGraduate) {
    return (
      <div className="w-full mx-auto px-6 py-8 space-y-12 bg-bg-primary min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-border/80">
          <div className="space-y-3">
            <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-primary">PORTAL_PROFILE_VERIFICATION</p>
            <h1 className="text-5xl font-extrabold text-text-primary tracking-tight uppercase leading-none">
              {profile.role === 'mentor' && 'Mentor Profile'}
              {profile.role === 'industry' && 'Enterprise Node'}
              {profile.role === 'university' && 'Academic Affiliate'}
            </h1>
            <p className="text-text-secondary text-base max-w-lg font-light leading-relaxed">
              Verify and manage institutional records, core credentials, and networking views.
            </p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => {
                setEditedProfile(profile);
                setIsEditing(true);
              }}
              className="btn-primary-outline px-8 py-3 w-full sm:w-auto flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest rounded-2xl group cursor-pointer"
            >
              <Edit2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              Modify Profile Info
            </button>
          ) : (
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                onClick={() => setIsEditing(false)}
                className="text-[10px] font-bold tracking-widest text-[#EC4899] hover:text-[#EC4899]/70 transition-colors px-4 py-2 cursor-pointer uppercase"
              >
                CANCEL
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary px-8 py-3 flex items-center gap-2 font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-primary/20 disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Commit Updates
              </button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-12">
          {/* Left Column: Role Details */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-bg-secondary border border-border rounded-3xl p-8 space-y-6 text-center lg:text-left relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
              
              <div className="w-28 h-28 rounded-2xl bg-bg-tertiary text-text-muted text-4xl font-extrabold flex items-center justify-center border border-border shadow-inner uppercase mx-auto lg:mx-0">
                {profile.displayName?.[0] || 'U'}
              </div>

              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary tracking-tight leading-snug">{profile.displayName}</h2>
                  <p className="text-xs text-text-muted uppercase font-mono tracking-widest mt-1">Authorized Representative</p>
                </div>

                <div className="inline-flex items-center gap-2 text-[10px] font-extrabold text-white bg-gradient-brand rounded-full px-5 py-1.5 uppercase tracking-widest shadow-xs">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  Role: {profile.role}
                </div>

                {/* Verification Badge */}
                <div className="pt-2">
                  {profile.verified ? (
                    <div className="inline-flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-4 py-1.5 uppercase tracking-widest">
                      <CheckCircle className="w-3.5 h-3.5" />
                      SYSTEM VERIFIED
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/25 rounded-full px-4 py-1.5 uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      VETTING PENDING
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-border/85 space-y-4 text-left">
                <div className="flex items-center gap-3 text-text-secondary text-sm">
                  <Mail className="w-4 h-4 text-text-muted" />
                  <span className="truncate font-light">{profile.email.toLowerCase()}</span>
                </div>
                {profile.website && (
                  <div className="flex items-center gap-3 text-text-secondary text-sm">
                    <ExternalLink className="w-4 h-4 text-text-muted" />
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="truncate font-light text-primary hover:underline flex items-center gap-1">
                      {profile.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Form Fields / Institutional Info */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-bg-secondary border border-border rounded-3xl p-8 md:p-10 space-y-8 shadow-sm">
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest border-l-4 border-primary pl-4 font-mono">
                INSTITUTIONAL_DETAILS_AND_METRICS
              </h3>

              {isEditing ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">REPRESENTATIVE NAME</label>
                    <input
                      type="text"
                      value={editedProfile.displayName || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile, displayName: e.target.value })}
                      className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    />
                  </div>

                  {profile.role === 'mentor' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">PRIMARY INDUSTRY / SECTOR</label>
                        <select
                          value={editedProfile.industry || 'Software Engineering'}
                          onChange={(e) => setEditedProfile({ ...editedProfile, industry: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        >
                          <option value="Software Engineering">Software Engineering & Tech</option>
                          <option value="Product & Strategy">Product & Project Strategy</option>
                          <option value="Design & Creative">Design, UI/UX & Creative</option>
                          <option value="Finance & FinTech">Finance & FinTech</option>
                          <option value="Marketing & Media">Marketing, Growth & Media</option>
                          <option value="Human Resources">Human Resources & Talent</option>
                          <option value="Healthcare & Medicine">Healthcare & Biotech</option>
                          <option value="Data Science & AI">Data Science & AI</option>
                          <option value="Cloud & DevOps">Cloud & DevOps Infrastructure</option>
                          <option value="Cybersecurity">Cybersecurity & SecOps</option>
                          <option value="Education & Academia">Education & Academia</option>
                          <option value="Legal & Compliance">Legal & Compliance</option>
                          <option value="Logistics & Operations">Logistics & Operations</option>
                          <option value="Other">Other Industry</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">JOB TITLE / PROFESSIONAL ROLE</label>
                        <input
                          type="text"
                          value={editedProfile.jobTitle || editedProfile.role || ''}
                          placeholder="e.g. Lead Product Manager, Senior Data Scientist"
                          onChange={(e) => setEditedProfile({ ...editedProfile, jobTitle: e.target.value, role: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">COMPANY / GUILD / INSTITUTION</label>
                        <input
                          type="text"
                          value={editedProfile.company || ''}
                          placeholder="e.g. Google, bKash, BRAC Bank"
                          onChange={(e) => setEditedProfile({ ...editedProfile, company: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">LOCATION / REGION</label>
                        <input
                          type="text"
                          value={editedProfile.location || ''}
                          placeholder="e.g. Dhaka, Bangladesh / Remote"
                          onChange={(e) => setEditedProfile({ ...editedProfile, location: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">HOURLY CONSULTING RATE ($ USD)</label>
                        <input
                          type="text"
                          value={editedProfile.hourlyRate || ''}
                          placeholder="50"
                          onChange={(e) => setEditedProfile({ ...editedProfile, hourlyRate: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">LINKEDIN URL</label>
                        <input
                          type="text"
                          value={editedProfile.linkedin || ''}
                          placeholder="https://linkedin.com/in/..."
                          onChange={(e) => setEditedProfile({ ...editedProfile, linkedin: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">SPECIALTIES & DOMAIN EXPERTISE (COMMA SEPARATED)</label>
                        <input
                          type="text"
                          value={Array.isArray(editedProfile.skills) ? editedProfile.skills.join(', ') : (editedProfile.skills || '')}
                          placeholder="e.g. Product Strategy, Market Expansion, User Research"
                          onChange={(e) => setEditedProfile({ 
                            ...editedProfile, 
                            skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                          })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">MENTOR RESUME BIO & PHILOSOPHY</label>
                        <textarea
                          rows={4}
                          value={editedProfile.summary || editedProfile.bio || ''}
                          placeholder="Tell mentees about your career background, mentorship approach, and focus areas..."
                          onChange={(e) => setEditedProfile({ ...editedProfile, summary: e.target.value, bio: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all resize-none"
                        />
                      </div>
                    </>
                  )}

                  {profile.role === 'industry' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">OFFICIAL COMPANY NAME</label>
                        <input
                          type="text"
                          value={editedProfile.company || ''}
                          onChange={(e) => setEditedProfile({ ...editedProfile, company: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">WEBSITE DOMAIN</label>
                        <input
                          type="text"
                          value={editedProfile.website || ''}
                          onChange={(e) => setEditedProfile({ ...editedProfile, website: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">ENTERPRISE SIZE</label>
                        <input
                          type="text"
                          value={editedProfile.size || ''}
                          onChange={(e) => setEditedProfile({ ...editedProfile, size: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">CORE TECHNICAL STACK</label>
                        <input
                          type="text"
                          value={editedProfile.techStack || ''}
                          placeholder="React, PyTorch, Node"
                          onChange={(e) => setEditedProfile({ ...editedProfile, techStack: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                        />
                      </div>
                    </>
                  )}

                  {profile.role === 'university' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">UNIVERSITY AFFILIATE NAME</label>
                        <input
                          type="text"
                          value={editedProfile.university || ''}
                          onChange={(e) => setEditedProfile({ ...editedProfile, university: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">WEBSITE</label>
                        <input
                          type="text"
                          value={editedProfile.website || ''}
                          onChange={(e) => setEditedProfile({ ...editedProfile, website: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">ACADEMIC DEPARTMENT</label>
                        <input
                          type="text"
                          value={editedProfile.department || ''}
                          onChange={(e) => setEditedProfile({ ...editedProfile, department: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted">AVERAGE STUDENT BATCH SIZE</label>
                        <input
                          type="text"
                          value={editedProfile.batchSize || ''}
                          onChange={(e) => setEditedProfile({ ...editedProfile, batchSize: e.target.value })}
                          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm font-medium text-text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-8">
                  {profile.role === 'mentor' && (
                    <>
                      <div className="bg-bg-primary border border-border/80 rounded-2xl p-6 space-y-1">
                        <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Industry / Sector</p>
                        <p className="text-lg font-bold text-primary">{profile.industry || 'Software Engineering'}</p>
                      </div>
                      <div className="bg-bg-primary border border-border/80 rounded-2xl p-6 space-y-1">
                        <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Role & Company</p>
                        <p className="text-lg font-bold text-text-primary">
                          {profile.jobTitle || profile.role || 'Industry Mentor'} {profile.company ? `at ${profile.company}` : ''}
                        </p>
                      </div>
                      <div className="bg-bg-primary border border-border/80 rounded-2xl p-6 space-y-1">
                        <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Location / Region</p>
                        <p className="text-base font-semibold text-text-primary flex items-center gap-1.5 mt-1">
                          <MapPin className="w-4 h-4 text-primary" /> {profile.location || 'Remote / Global'}
                        </p>
                      </div>
                      <div className="bg-bg-primary border border-border/80 rounded-2xl p-6 space-y-1">
                        <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Consulting Rate</p>
                        <p className="text-base font-semibold text-text-primary flex items-center gap-1.5 mt-1">
                          <DollarSign className="w-4 h-4 text-success" /> ${profile.hourlyRate || '50'} / hour
                        </p>
                      </div>
                      <div className="md:col-span-2 bg-bg-primary border border-border/80 rounded-2xl p-6 space-y-2">
                        <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Specialties & Fields</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {(Array.isArray(profile.skills) ? profile.skills : (profile.skills ? [profile.skills] : ['Career Development', 'Industry Best Practices'])).map((skill: string) => (
                            <span key={skill} className="px-3 py-1 bg-bg-secondary border border-border rounded-lg text-xs font-semibold text-text-secondary">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="md:col-span-2 bg-bg-primary border border-border/80 rounded-2xl p-6 space-y-1">
                        <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Experience Bio & Philosophy</p>
                        <p className="text-base text-text-secondary leading-relaxed font-light italic mt-1">
                          "{profile.summary || profile.bio || 'No bio set. Click Modify Profile to add yours.'}"
                        </p>
                      </div>
                    </>
                  )}

                  {profile.role === 'industry' && (
                    <>
                      <div className="bg-bg-primary border border-border/80 rounded-2xl p-6 space-y-1">
                        <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Official Company Name</p>
                        <p className="text-lg font-bold text-text-primary">{profile.company || 'Not Declared'}</p>
                      </div>
                      <div className="bg-bg-primary border border-border/80 rounded-2xl p-6 space-y-1">
                        <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Employee Scale Size</p>
                        <p className="text-lg font-bold text-text-primary">{profile.size || 'Not Declared'}</p>
                      </div>
                      <div className="md:col-span-2 bg-bg-primary border border-border/80 rounded-2xl p-6 space-y-1">
                        <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Core Tech Stack</p>
                        <p className="text-base font-bold text-primary tracking-wide">{profile.techStack || 'Not Declared'}</p>
                      </div>
                    </>
                  )}

                  {profile.role === 'university' && (
                    <>
                      <div className="bg-bg-primary border border-border/80 rounded-2xl p-6 space-y-1">
                        <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Institution Affiliation</p>
                        <p className="text-lg font-bold text-text-primary">{profile.university || 'Not Declared'}</p>
                      </div>
                      <div className="bg-bg-primary border border-border/80 rounded-2xl p-6 space-y-1">
                        <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Focused Department</p>
                        <p className="text-lg font-bold text-text-primary">{profile.department || 'Not Declared'}</p>
                      </div>
                      <div className="bg-bg-primary border border-border/80 rounded-2xl p-6 space-y-1">
                        <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Annual Batch Size</p>
                        <p className="text-lg font-bold text-text-primary">{profile.batchSize || 'Not Declared'}</p>
                      </div>
                      <div className="bg-bg-primary border border-border/80 rounded-2xl p-6 space-y-1">
                        <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Verified Institutional Email Domain</p>
                        <p className="text-lg font-bold text-text-primary font-mono lowercase">{profile.email}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-6 py-8 space-y-16 bg-bg-primary min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-12 border-b border-border">
        <div className="space-y-4">
          <p className="text-[10px] uppercase font-bold tracking-widest text-primary">Profile Management</p>
          <h1 className="text-6xl font-bold text-text-primary tracking-tight">Your Professional <span className="text-primary italic">Profile</span></h1>
          <p className="text-text-secondary text-lg max-w-lg font-light leading-relaxed">
            Manage your professional experience, skills, and career goals.
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => {
              setEditedProfile(profile);
              setIsEditing(true);
            }}
            className="btn-primary-outline px-10 flex items-center gap-2 group"
          >
            <Edit2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            EDIT PROFILE
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsEditing(false)}
              className="text-[10px] font-bold tracking-widest text-text-muted hover:text-text-primary transition-colors px-4 py-2"
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary px-10 flex items-center gap-2 shadow-lg hover:shadow-primary/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              SAVE CHANGES
            </button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-12 gap-16">
        {/* Left Column: Avatar & Skills */}
        <div className="lg:col-span-4 space-y-12">
          <div className="space-y-10">
            <div className="relative group w-48 mx-auto lg:mx-0">
              <div className="w-32 h-32 lg:w-48 lg:h-48 rounded-2xl bg-bg-secondary text-text-muted text-6xl font-bold flex items-center justify-center border-2 border-border shadow-lg uppercase transition-all group-hover:border-primary group-hover:text-primary overflow-hidden">
                {profile.displayName?.[0] || 'U'}
              </div>
            </div>

            <div className="space-y-6 text-center lg:text-left">
              {isEditing ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted ml-1">FULL NAME</label>
                    <input
                      type="text"
                      value={editedProfile.displayName}
                      onChange={(e) => setEditedProfile({ ...editedProfile, displayName: e.target.value })}
                      className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-xl font-bold focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted ml-1">Target Role</label>
                    <input
                      type="text"
                      value={editedProfile.targetRole || ''}
                      placeholder="e.g. Frontend Developer"
                      onChange={(e) => setEditedProfile({ ...editedProfile, targetRole: e.target.value })}
                      className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-lg font-bold focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted ml-1">Preferred Industry</label>
                    <input
                      type="text"
                      value={editedProfile.targetIndustry || ''}
                      placeholder="e.g. FinTech"
                      onChange={(e) => setEditedProfile({ ...editedProfile, targetIndustry: e.target.value })}
                      className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-lg font-bold focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h2 className="text-4xl font-bold text-text-primary tracking-tight uppercase leading-tight">{profile.displayName}</h2>
                  <div className="text-[11px] font-extrabold text-white bg-gradient-brand flex items-center justify-center lg:justify-start gap-2.5 uppercase tracking-widest w-fit px-5 py-1.5 rounded-full shadow-xs mx-auto lg:mx-0">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    {profile.role}
                  </div>
                  
                  {/* Verification Badge */}
                  <div className="mt-6 flex justify-center lg:justify-start">
                    {profile.verified ? (
                      <div className="badge badge-success flex items-center gap-2 shadow-sm font-bold tracking-widest text-[10px] uppercase px-4 py-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        ACCOUNT VERIFIED
                      </div>
                    ) : (
                      <div className="badge bg-bg-tertiary text-text-muted flex items-center gap-2 border border-border shadow-sm font-bold tracking-widest text-[10px] uppercase px-4 py-1.5">
                        <div className="w-1.5 h-1.5 bg-text-muted rounded-full opacity-40 shrink-0" />
                        PDR VERIFICATION PENDING
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-4 pt-10 border-t border-border mt-8">
                <div className="flex items-center gap-4 text-text-secondary text-sm font-medium">
                  <div className="w-8 h-8 bg-primary-light flex items-center justify-center rounded-lg">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <span className="truncate tracking-wide">{profile.email.toLowerCase()}</span>
                </div>
                <div className="flex items-center gap-4 text-text-secondary text-sm font-medium">
                  <div className="w-8 h-8 bg-bg-tertiary flex items-center justify-center rounded-lg border border-border">
                    <Briefcase className="w-4 h-4 text-text-muted" />
                  </div>
                  <span className="tracking-wide uppercase text-[10px] font-bold tracking-widest">{profile.role === 'mentor' ? 'INDUSTRY MENTOR' : 'GRADUATE CANDIDATE'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest border-l-4 border-primary pl-4">
                PROFESSIONAL_SKILLS
              </h3>
              {isEditing && (
                <button onClick={addSkill} className="w-8 h-8 flex items-center justify-center text-primary border-2 border-primary/20 hover:border-primary hover:bg-primary-light transition-all rounded-lg">
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(isEditing ? editedProfile.skills : profile.skills)?.map((skill: any, i: number) => (
                <span key={i} className="badge bg-bg-tertiary text-text-primary border border-border px-4 py-5 rounded-lg flex items-center gap-3 font-bold text-[10px] tracking-widest uppercase hover:border-primary/30 transition-all group">
                  {typeof skill === 'string' ? skill : skill.name}
                  {isEditing && (
                    <button onClick={() => removeSkill(i)} className="text-text-muted hover:text-error transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              ))}
              {(!isEditing && (!profile.skills || profile.skills.length === 0)) && (
                <p className="text-[10px] font-bold text-text-muted italic tracking-widest px-4 py-8 border-2 border-dashed border-border rounded-xl w-full text-center bg-bg-tertiary/50">NO_SKILLS_ADDED</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info */}
        <div className="lg:col-span-8 space-y-16">
          <section className="space-y-8 bg-bg-secondary border border-border rounded-2xl p-8 shadow-sm">
            <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest border-l-4 border-secondary pl-4">
              CAREER_GOALS
            </h3>
            {isEditing ? (
              <textarea
                value={editedProfile.goals?.join('\n')}
                onChange={(e) => setEditedProfile({ ...editedProfile, goals: e.target.value.split('\n') })}
                placeholder="ENTER YOUR GOALS (ONE PER LINE)..."
                className="w-full h-64 px-6 py-6 bg-bg-tertiary border border-border rounded-xl text-base font-medium text-text-primary outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none leading-relaxed placeholder:text-text-muted/40"
              />
            ) : (
              <div className="grid gap-4">
                {profile.goals?.map((goal: string, i: number) => (
                  <div key={i} className="group bg-bg-primary border border-border hover:border-secondary/30 rounded-xl p-8 flex items-start gap-8 transition-all hover:shadow-md">
                    <div className="w-10 h-10 rounded-full bg-bg-tertiary border border-border flex items-center justify-center text-xs font-bold text-text-muted group-hover:bg-secondary group-hover:text-white group-hover:border-secondary transition-all shrink-0 shadow-inner">
                      0{i+1}
                    </div>
                    <p className="text-lg font-medium text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">{goal}</p>
                  </div>
                ))}
                {(!profile.goals || profile.goals.length === 0) && (
                  <div className="py-16 text-center bg-bg-primary border border-dashed border-border rounded-xl space-y-2">
                    <Target className="w-8 h-8 text-text-muted/20 mx-auto" />
                    <p className="text-[10px] font-bold text-text-muted/40 uppercase tracking-widest">No goals defined yet. Please update your profile.</p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-8 bg-bg-secondary border border-border rounded-2xl p-8 shadow-sm">
            <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest border-l-4 border-primary pl-4">
              PROFESSIONAL_SUMMARY
            </h3>
            {isEditing ? (
              <textarea
                value={editedProfile.summary || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, summary: e.target.value })}
                placeholder="DESCRIBE YOUR BACKGROUND AND PROFESSIONAL EXPERIENCE..."
                className="w-full h-80 px-6 py-6 bg-bg-tertiary border border-border rounded-xl text-base font-medium text-text-primary outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none leading-relaxed placeholder:text-text-muted/40"
              />
            ) : (
              <div className="bg-bg-primary border border-border p-10 rounded-xl relative overflow-hidden group hover:border-primary transition-all duration-500 shadow-sm">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Briefcase className="w-32 h-32 text-primary" />
                </div>
                <p className="text-xl font-medium text-text-secondary leading-[1.8] relative z-10 italic">
                  "{profile.summary || 'No summary provided. Please describe your professional background.'}"
                </p>
              </div>
            )}
          </section>

          {isEditing && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary/5 border-2 border-primary/10 p-10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-8 shadow-sm"
            >
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20 shrink-0">
                <Target className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-bold text-text-primary tracking-tight">Profile Strength</h4>
                <p className="text-base font-medium text-text-secondary leading-relaxed">
                  Complete and accurate profiles are significantly more likely to attract high-quality mentorship nodes and professional job matching opportunities.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
