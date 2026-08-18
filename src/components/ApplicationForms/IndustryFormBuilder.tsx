import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Check, 
  Copy, 
  Plus, 
  Trash2, 
  GripVertical, 
  Type, 
  AlignLeft, 
  List, 
  CheckSquare, 
  ChevronDown, 
  Hash, 
  Calendar as CalendarIcon, 
  Mail, 
  Phone, 
  Upload, 
  Minus, 
  Eye, 
  Send, 
  QrCode, 
  Settings as SettingsIcon,
  X,
  FileText, 
  CopyCheck,
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';
import { FieldType, FormField, JobForm, FormSettings } from '../../types/applicationForms';
import { getJobForm, saveJobForm } from '../../services/applicationFormService';
import { StudentApplyForm } from './StudentApplyForm';

interface IndustryFormBuilderProps {
  jobId: string;
  jobInfo?: any;
  onBack: () => void;
  onFormSaved?: (form: JobForm) => void;
}

const FIELD_PALETTE: { type: FieldType; label: string; icon: any; description: string }[] = [
  { type: 'short_answer', label: 'Short answer', icon: Type, description: 'Single line text input' },
  { type: 'paragraph', label: 'Paragraph', icon: AlignLeft, description: 'Long text answer' },
  { type: 'multiple_choice', label: 'Multiple choice', icon: List, description: 'Select one option' },
  { type: 'checkboxes', label: 'Checkboxes', icon: CheckSquare, description: 'Select multiple options' },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown, description: 'Dropdown list' },
  { type: 'number', label: 'Number', icon: Hash, description: 'Numeric values' },
  { type: 'date', label: 'Date', icon: CalendarIcon, description: 'Date selector' },
  { type: 'file_upload', label: 'File upload', icon: Upload, description: 'CV or document attachment' },
  { type: 'email', label: 'Email', icon: Mail, description: 'Email address field' },
  { type: 'phone', label: 'Phone', icon: Phone, description: 'Phone number field' },
  { type: 'section_break', label: 'Section break', icon: Minus, description: 'Visual divider or subtitle' },
];

export function IndustryFormBuilder({ jobId, jobInfo, onBack, onFormSaved }: IndustryFormBuilderProps) {
  const [form, setForm] = useState<JobForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [copiedLink, setCopiedLink] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getJobForm(jobId, jobInfo);
      setForm(data);
      if (data.fields.length > 0) {
        setSelectedFieldId(data.fields[0].id);
      }
      setLoading(false);
    }
    load();
  }, [jobId, jobInfo]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsAddQuestionOpen(false);
      }
    }
    if (isAddQuestionOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAddQuestionOpen]);

  // Autosave handler
  const updateFormState = (updater: (prev: JobForm) => JobForm) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      setSaveStatus('saving');
      saveJobForm(next).then(() => {
        setTimeout(() => setSaveStatus('saved'), 300);
      });
      return next;
    });
  };

  const handleAddField = (type: FieldType) => {
    if (!form) return;
    const newFieldId = `field-${Date.now()}`;
    const newField: FormField = {
      id: newFieldId,
      type,
      label: type === 'section_break' ? 'Section Header / Directions' : `New ${type.replace('_', ' ')} Question`,
      required: type !== 'section_break',
      options: ['multiple_choice', 'checkboxes', 'dropdown'].includes(type) ? ['Option 1', 'Option 2'] : undefined,
      placeholder: ['short_answer', 'email', 'phone', 'number'].includes(type) ? 'Enter response...' : undefined,
    };

    updateFormState((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedFieldId(newFieldId);
    setIsAddQuestionOpen(false);
  };

  const handleUpdateField = (fieldId: string, updates: Partial<FormField>) => {
    updateFormState((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
    }));
  };

  const handleDeleteField = (fieldId: string) => {
    updateFormState((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== fieldId),
    }));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleDuplicateField = (fieldId: string) => {
    if (!form) return;
    const index = form.fields.findIndex((f) => f.id === fieldId);
    if (index === -1) return;
    const target = form.fields[index];
    const dup: FormField = {
      ...target,
      id: `field-${Date.now()}`,
      label: `${target.label} (Copy)`,
    };
    const nextFields = [...form.fields];
    nextFields.splice(index + 1, 0, dup);
    updateFormState((prev) => ({ ...prev, fields: nextFields }));
    setSelectedFieldId(dup.id);
  };

  const handleAddOption = (fieldId: string) => {
    if (!form) return;
    const field = form.fields.find((f) => f.id === fieldId);
    if (!field) return;
    const options = field.options || [];
    const nextOptions = [...options, `Option ${options.length + 1}`];
    handleUpdateField(fieldId, { options: nextOptions });
  };

  const handleUpdateOption = (fieldId: string, index: number, val: string) => {
    if (!form) return;
    const field = form.fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;
    const nextOptions = [...field.options];
    nextOptions[index] = val;
    handleUpdateField(fieldId, { options: nextOptions });
  };

  const handleDeleteOption = (fieldId: string, index: number) => {
    if (!form) return;
    const field = form.fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;
    const nextOptions = field.options.filter((_, i) => i !== index);
    handleUpdateField(fieldId, { options: nextOptions });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/apply/${jobId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading || !form) {
    return (
      <div className="min-h-screen bg-[#F5F8FF] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1D4ED8] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-[#64748B]">Loading Form Canvas...</p>
        </div>
      </div>
    );
  }

  const applyUrl = `${window.location.origin}/apply/${jobId}`;

  return (
    <div className="min-h-screen bg-[#F5F8FF] text-[#0F172A] font-sans pb-32">
      {/* Sticky Slim Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 md:px-8 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-[#F5F8FF] text-[#64748B] hover:text-[#0F172A] rounded-lg transition-colors cursor-pointer"
            title="Back to Positions Manager"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateFormState((prev) => ({ ...prev, title: e.target.value }))}
                className="text-sm font-bold text-[#0F172A] bg-transparent outline-none hover:bg-[#F5F8FF] focus:bg-[#F5F8FF] focus:px-1.5 rounded transition-all truncate max-w-xs md:max-w-md py-0.5"
                placeholder="Form Title"
              />
              <span className="text-[11px] font-normal text-[#64748B] shrink-0">
                {saveStatus === 'saved' ? 'Autosaved ✓' : 'Saving...'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
              <span className="font-semibold text-[#1D4ED8] uppercase tracking-wider">Form Builder</span>
              <span>•</span>
              <span>Role: {form.jobRoleChip || 'Software Role'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings Drawer Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1.5 bg-white hover:bg-[#F5F8FF] border border-[#E2E8F0] text-[#0F172A] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Preview Button (Ghost) */}
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="px-3 py-1.5 bg-transparent hover:bg-[#F5F8FF] text-[#64748B] hover:text-[#0F172A] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          {/* Publish Button (Solid #1D4ED8) */}
          <button
            onClick={() => {
              updateFormState((prev) => ({ ...prev, status: 'published' }));
              if (onFormSaved) onFormSaved(form);
              alert('Form published successfully! Applicants can now fill out this application form.');
            }}
            className="px-4 py-1.5 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            Publish
          </button>
        </div>
      </div>

      {/* Hero Single Canvas (max-w-3xl = 760px) */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {/* Form Details Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-2xs space-y-4 relative">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#1D4ED8] uppercase tracking-wider block">
              Application Form Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateFormState((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full text-xl font-bold text-[#1D4ED8] bg-transparent border-b border-transparent hover:border-[#E2E8F0] focus:border-[#1D4ED8] outline-none py-1 transition-colors"
              placeholder="e.g. Senior Frontend Engineer Application"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
              Description & Candidate Instructions
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateFormState((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full text-xs text-[#0F172A] bg-transparent border border-[#E2E8F0] focus:border-[#1D4ED8] rounded-lg p-3 outline-none transition-colors resize-none placeholder:text-[#94A3B8]"
              placeholder="Describe instructions, interview process expectations, or role details..."
            />
          </div>
        </div>

        {/* Question Cards Stack */}
        <div className="space-y-4">
          {form.fields.map((field, idx) => {
            const isSelected = selectedFieldId === field.id;

            return (
              <div key={field.id ? `${field.id}-${idx}` : `field-${idx}`} className="relative group">
                {/* Outer Left Gutter Question Number */}
                <div className="absolute -left-8 top-6 text-xs font-medium text-[#94A3B8] hidden sm:block w-6 text-right select-none">
                  {idx + 1}.
                </div>

                <div
                  onClick={() => setSelectedFieldId(field.id)}
                  className={`bg-white border rounded-xl p-6 relative transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-[#E2E8F0] shadow-lg border-l-4 border-l-[#1D4ED8]'
                      : 'border-[#E2E8F0] hover:border-[#CBD5E1] shadow-none'
                  }`}
                >
                  {/* Left Grip Handle (Absolute outside padding) */}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-[#94A3B8] hover:text-[#0F172A]">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Top Bar: Question Label & Type Dropdown */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                        placeholder="Question title..."
                        className="w-full text-sm font-semibold text-[#0F172A] bg-transparent border-b border-transparent hover:border-[#E2E8F0] focus:border-[#1D4ED8] outline-none py-1 transition-colors"
                      />
                    </div>

                    {/* Field Type Selector (visible on focus or hover) */}
                    <div className="shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateField(field.id, { type: e.target.value as FieldType })}
                        className="text-xs font-medium text-[#0F172A] bg-[#F5F8FF] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#1D4ED8] cursor-pointer"
                      >
                        {FIELD_PALETTE.map((p) => (
                          <option key={p.type} value={p.type}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Helper Text */}
                  {field.type !== 'section_break' && (
                    <div className="mb-4">
                      <input
                        type="text"
                        value={field.helperText || ''}
                        onChange={(e) => handleUpdateField(field.id, { helperText: e.target.value })}
                        placeholder="Add helper or hint text (optional)..."
                        className="w-full text-xs text-[#64748B] bg-transparent outline-none py-0.5 placeholder:text-[#CBD5E1]"
                      />
                    </div>
                  )}

                  {/* Field Body Preview / Edit Options */}
                  {['multiple_choice', 'checkboxes', 'dropdown'].includes(field.type) && (
                    <div className="space-y-2 my-4 pl-1">
                      {(field.options || []).map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full border border-[#CBD5E1] bg-[#F8FAFC] shrink-0" />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateOption(field.id, oIdx, e.target.value)}
                            className="flex-1 bg-transparent hover:bg-[#F8FAFC] focus:bg-white border-b border-transparent focus:border-[#1D4ED8] text-xs text-[#0F172A] px-2 py-1 outline-none transition-all"
                            placeholder={`Option ${oIdx + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(field.id, oIdx)}
                            className="p-1 text-[#94A3B8] hover:text-[#DC2626] transition-colors"
                            title="Remove option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddOption(field.id)}
                        className="text-xs font-semibold text-[#1D4ED8] hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add option
                      </button>
                    </div>
                  )}

                  {field.type === 'file_upload' && (
                    <div className="p-4 bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-lg text-center my-3">
                      <Upload className="w-4 h-4 text-[#64748B] mx-auto mb-1" />
                      <p className="text-xs text-[#64748B]">
                        CV attachment slot (PDF, DOCX up to{' '}
                        {Math.round(form.settings.maxCvSizeBytes / (1024 * 1024))}MB)
                      </p>
                    </div>
                  )}

                  {/* Card Bottom Toolbar */}
                  <div className="border-t border-[#E2E8F0] pt-3 mt-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-[#94A3B8] opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateField(field.id);
                        }}
                        className="p-1.5 hover:text-[#0F172A] hover:bg-[#F5F8FF] rounded-md transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteField(field.id);
                        }}
                        className="p-1.5 hover:text-[#DC2626] hover:bg-[#DC2626]/10 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#64748B]">Required</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateField(field.id, { required: !field.required })}
                        className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                          field.required ? 'bg-[#1D4ED8]' : 'bg-[#E2E8F0]'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full bg-white transition-transform ${
                            field.required ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {form.fields.length === 0 && (
            <div className="bg-white border border-dashed border-[#E2E8F0] rounded-xl p-12 text-center space-y-3">
              <FileText className="w-8 h-8 text-[#94A3B8] mx-auto" />
              <h3 className="text-sm font-bold text-[#0F172A]">Start building your form</h3>
              <p className="text-xs text-[#64748B]">Add your first question using the button below.</p>
            </div>
          )}
        </div>

        {/* Dashed "+ Add Question" Button & Popover Container */}
        <div className="relative pt-2" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setIsAddQuestionOpen(!isAddQuestionOpen)}
            className="w-full py-3 px-4 bg-white hover:bg-[#F5F8FF] border border-dashed border-[#CBD5E1] hover:border-[#1D4ED8] rounded-xl text-xs font-semibold text-[#1D4ED8] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            Add question
          </button>

          {/* Icon Grid Popover Menu */}
          <AnimatePresence>
            {isAddQuestionOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-2 z-30 bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-4 space-y-3"
              >
                <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  Select Question Type
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FIELD_PALETTE.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleAddField(item.type)}
                        className="p-2.5 bg-[#F8FAFC] hover:bg-[#F5F8FF] hover:border-[#1D4ED8]/30 border border-[#E2E8F0] rounded-lg text-left flex items-center gap-2.5 transition-all cursor-pointer group"
                      >
                        <div className="p-1.5 bg-white group-hover:bg-[#1D4ED8] text-[#1D4ED8] group-hover:text-white rounded border border-[#E2E8F0] group-hover:border-[#1D4ED8] transition-colors shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-xs font-medium text-[#0F172A] group-hover:text-[#1D4ED8] truncate">
                            {item.label}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Settings Right Drawer */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white border-l border-[#E2E8F0] shadow-2xl flex flex-col z-10"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SettingsIcon className="w-4 h-4 text-[#1D4ED8]" />
                  <h3 className="text-sm font-bold text-[#0F172A]">Form Settings</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F5F8FF] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                {/* Deadline */}
                <div>
                  <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    value={form.settings.deadline}
                    onChange={(e) =>
                      updateFormState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, deadline: e.target.value },
                      }))
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#1D4ED8] rounded-lg p-2 outline-none font-medium text-[#0F172A]"
                  />
                </div>

                {/* Accept Applications Toggle */}
                <div className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                  <div>
                    <div className="font-semibold text-[#0F172A]">Accept Applications</div>
                    <div className="text-[10px] text-[#64748B]">Pause or resume responses</div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateFormState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, acceptResponses: !prev.settings.acceptResponses },
                      }))
                    }
                    className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                      form.settings.acceptResponses ? 'bg-[#1D4ED8]' : 'bg-[#E2E8F0]'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full bg-white transition-transform ${
                        form.settings.acceptResponses ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* CV Max Size */}
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2">
                  <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                    CV Attachment Limit
                  </label>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#64748B]">Maximum File Size</span>
                    <select
                      value={form.settings.maxCvSizeBytes}
                      onChange={(e) =>
                        updateFormState((prev) => ({
                          ...prev,
                          settings: { ...prev.settings, maxCvSizeBytes: Number(e.target.value) },
                        }))
                      }
                      className="bg-white border border-[#E2E8F0] rounded px-2 py-1 text-xs font-semibold text-[#0F172A]"
                    >
                      <option value={5242880}>5 MB</option>
                      <option value={10485760}>10 MB</option>
                      <option value={20971520}>20 MB</option>
                    </select>
                  </div>
                </div>

                {/* One Response Per Student */}
                <div className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                  <div>
                    <div className="font-semibold text-[#0F172A]">Limit to 1 Response</div>
                    <div className="text-[10px] text-[#64748B]">One application per student account</div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateFormState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, oneResponsePerStudent: !prev.settings.oneResponsePerStudent },
                      }))
                    }
                    className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                      form.settings.oneResponsePerStudent ? 'bg-[#1D4ED8]' : 'bg-[#E2E8F0]'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full bg-white transition-transform ${
                        form.settings.oneResponsePerStudent ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Post-Submit Message */}
                <div>
                  <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                    Post-Submit Message
                  </label>
                  <textarea
                    value={form.settings.confirmationMessage}
                    onChange={(e) =>
                      updateFormState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, confirmationMessage: e.target.value },
                      }))
                    }
                    rows={3}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#1D4ED8] rounded-lg p-2.5 outline-none text-xs text-[#0F172A] resize-none"
                  />
                </div>

                {/* Share Link & QR Code */}
                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#1D4ED8] uppercase tracking-wider">
                      Student Form Link
                    </span>
                    <QrCode className="w-4 h-4 text-[#1D4ED8]" />
                  </div>

                  <div className="p-2 bg-white border border-[#E2E8F0] rounded text-[11px] font-mono text-[#0F172A] truncate">
                    {applyUrl}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full py-2 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <CopyCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Link Copied!' : 'Copy Form Link'}
                  </button>

                  <div className="pt-2 border-t border-[#E2E8F0] text-center">
                    <div className="w-20 h-20 mx-auto p-1.5 bg-white border border-[#E2E8F0] rounded-lg flex items-center justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(applyUrl)}`}
                        alt="Form QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Student View Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-xs overflow-y-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto bg-[#F5F8FF] rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden relative">
            <div className="sticky top-0 z-20 bg-white border-b border-[#E2E8F0] px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-[#1D4ED8]/10 text-[#1D4ED8] px-2 py-0.5 rounded">
                  Preview Mode
                </span>
                <span className="text-xs text-[#64748B]">Student Application View</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-3 py-1 bg-[#0F172A] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Exit Preview
              </button>
            </div>

            <div className="p-4 md:p-8">
              <StudentApplyForm jobId={jobId} isPreview={true} onBack={() => setIsPreviewOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

