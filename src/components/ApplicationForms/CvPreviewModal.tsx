import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Download, ExternalLink, ShieldCheck } from 'lucide-react';

interface CvPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvUrl?: string;
  fileName?: string;
  studentName?: string;
}

export function CvPreviewModal({ isOpen, onClose, cvUrl, fileName, studentName }: CvPreviewModalProps) {
  if (!isOpen) return null;

  const actualFileName = fileName || `${studentName || 'Candidate'}_CV.pdf`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="w-full max-w-4xl h-[85vh] bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_20px_rgba(29,78,216,0.1)] flex flex-col overflow-hidden z-10 text-left"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-[#F5F8FF] border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A] tracking-tight">{actualFileName}</h3>
                <p className="text-xs text-[#64748B]">CV Preview • Candidate: <span className="font-semibold text-[#0F172A]">{studentName || 'Applicant'}</span></p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cvUrl && (
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={actualFileName}
                  className="px-3.5 py-1.5 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </a>
              )}
              <button
                onClick={onClose}
                className="p-1.5 px-2.5 bg-white hover:bg-red-600 border border-[#E2E8F0] hover:border-red-600 text-[#64748B] hover:text-white rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-2xs group"
                title="Close CV Preview (Esc)"
                aria-label="Close CV Preview"
              >
                <X className="w-4 h-4 text-[#64748B] group-hover:text-white transition-colors" />
                <span className="text-xs font-semibold hidden sm:inline">Close</span>
              </button>
            </div>
          </div>

          {/* Document Content View */}
          <div className="flex-1 bg-[#F5F8FF] p-6 overflow-y-auto flex items-center justify-center">
            {cvUrl ? (
              <iframe
                src={cvUrl}
                title="CV Document Preview"
                className="w-full h-full bg-white rounded-xl border border-[#E2E8F0] shadow-sm"
              />
            ) : (
              <div className="max-w-md w-full bg-white p-8 border border-[#E2E8F0] rounded-2xl shadow-sm text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#3B82F6]/10 text-[#1D4ED8] flex items-center justify-center">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[#0F172A]">Sample CV Preview</h4>
                  <p className="text-xs text-[#64748B]">
                    {actualFileName} uploaded by {studentName || 'the applicant'}. Verified format (PDF, 1.4 MB).
                  </p>
                </div>
                <div className="p-4 bg-[#F5F8FF] border border-[#E2E8F0] rounded-xl text-left space-y-2 text-xs text-[#0F172A]">
                  <div className="flex items-center gap-2 text-[#1D4ED8] font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    Verified CareerBridge Student CV
                  </div>
                  <p className="text-[#64748B] text-[11px] leading-relaxed">
                    This document includes extracted skill verification scores, education history, and past project links verified through the CareerBridge platform.
                  </p>
                </div>
                <button
                  onClick={() => alert(`Simulated downloading ${actualFileName}`)}
                  className="w-full py-2.5 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Candidate Resume
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
