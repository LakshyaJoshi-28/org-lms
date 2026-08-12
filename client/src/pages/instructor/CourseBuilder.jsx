import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTrainingById,
  saveFullCourse,
  getCategories,
  uploadImage,
  uploadVideo,
  uploadPdf
} from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../context/NotificationContext';
import {
  ArrowLeft,
  BookOpen,
  Layers,
  HelpCircle,
  FileCheck2,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Video,
  FileText,
  Save,
  Send,
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export const CourseBuilder = () => {
  const { id: routeTrainingId } = useParams();
  const isEditMode = routeTrainingId && routeTrainingId !== 'new';
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [loading, setLoading] = useState(isEditMode);
  const [categories, setCategories] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // STEP 1 — BASIC INFORMATION
  const [trainingId, setTrainingId] = useState(isEditMode ? routeTrainingId : null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailPublicId, setThumbnailPublicId] = useState('');
  const [benefits, setBenefits] = useState([]);
  const [benefitInput, setBenefitInput] = useState('');
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // STEP 2 — COURSE BUILDER (SECTIONS & LECTURES)
  const [sections, setSections] = useState([]);
  // Section Modal state
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSectionIdx, setEditingSectionIdx] = useState(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDesc, setSectionDesc] = useState('');

  // Lecture Modal state
  const [showLectureModal, setShowLectureModal] = useState(false);
  const [targetSectionIdx, setTargetSectionIdx] = useState(null);
  const [editingLectureIdx, setEditingLectureIdx] = useState(null);
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureDesc, setLectureDesc] = useState('');
  const [lectureVideoUrl, setLectureVideoUrl] = useState('');
  const [lectureVideoPublicId, setLectureVideoPublicId] = useState('');
  const [lectureVideoDuration, setLectureVideoDuration] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // STEP 3 — QUIZ / ASSESSMENT (OPTIONAL)
  const [quizSectionIdx, setQuizSectionIdx] = useState(0);
  const [addQuizEnabled, setAddQuizEnabled] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDurationMinutes, setQuizDurationMinutes] = useState(15);
  const [quizPassingScorePercent, setQuizPassingScorePercent] = useState(70);
  const [quizQuestions, setQuizQuestions] = useState([
    {
      questionText: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0
    }
  ]);

  // STEP 4 — ASSIGNMENT & RESOURCES (OPTIONAL)
  const [addAssignmentEnabled, setAddAssignmentEnabled] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentInstructions, setAssignmentInstructions] = useState('');

  const [addResourcesEnabled, setAddResourcesEnabled] = useState(false);
  const [resources, setResources] = useState([]); // [{ title, fileUrl, filePublicId }]
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Load Categories & Existing Training (if edit)
  useEffect(() => {
    const init = async () => {
      try {
        const catRes = await getCategories();
        setCategories(catRes.data.data.categories || []);

        if (isEditMode) {
          const tRes = await getTrainingById(routeTrainingId);
          const t = tRes.data.data.training;
          if (t) {
            setTrainingId(t._id);
            setTitle(t.title || '');
            setDescription(t.description || '');
            setCategoryId(t.categoryId?._id || t.categoryId || '');
            setThumbnailUrl(t.thumbnailUrl || '');
            setThumbnailPublicId(t.thumbnailPublicId || '');
            setBenefits(t.benefits || []);

            // Populate Sections & Lectures
            if (t.sections && t.sections.length > 0) {
              const loadedSections = t.sections.map((sec, sIdx) => {
                const secQuiz = sec.subSections?.find(sub => sub.quizId)?.quizId;
                if (secQuiz && !addQuizEnabled) {
                  setAddQuizEnabled(true);
                  setQuizSectionIdx(sIdx);
                  setQuizTitle(secQuiz.title || '');
                  setQuizDurationMinutes(secQuiz.timeLimitMinutes || 15);
                  setQuizPassingScorePercent(secQuiz.passingScorePercent || 70);
                  if (secQuiz.questions && secQuiz.questions.length > 0) {
                    setQuizQuestions(secQuiz.questions.map(q => ({
                      questionText: q.questionText || '',
                      options: q.options || ['', '', '', ''],
                      correctAnswerIndex: q.correctAnswerIndex || 0
                    })));
                  }
                }

                return {
                  title: sec.title || '',
                  description: sec.description || '',
                  lectures: sec.subSections ? sec.subSections.map(sub => ({
                    title: sub.title || '',
                    description: sub.description || '',
                    videoUrl: sub.videoUrl || '',
                    videoPublicId: sub.videoPublicId || '',
                    videoDuration: sub.videoDuration || 0
                  })) : []
                };
              });
              setSections(loadedSections);
            }

            // Populate Assignment
            const firstAss = t.sections?.flatMap(s => s.subSections || []).find(sub => sub.assignmentId)?.assignmentId;
            if (firstAss) {
              setAddAssignmentEnabled(true);
              setAssignmentTitle(firstAss.title || '');
              setAssignmentInstructions(firstAss.instructions || '');
            }

            // Populate Resources
            const pdfs = t.sections?.flatMap(s => s.subSections || []).flatMap(sub => sub.pdfResources || []);
            if (pdfs && pdfs.length > 0) {
              setAddResourcesEnabled(true);
              setResources(pdfs.map(p => ({ title: p.title, fileUrl: p.fileUrl, filePublicId: p.filePublicId })));
            }
          }
        }
      } catch (err) {
        addToast('error', 'Failed to load course details');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [routeTrainingId, isEditMode]);

  // BENEFIT HANDLERS
  const handleAddBenefit = () => {
    if (!benefitInput.trim()) return;
    setBenefits([...benefits, benefitInput.trim()]);
    setBenefitInput('');
  };

  const handleDeleteBenefit = (idx) => {
    setBenefits(benefits.filter((_, i) => i !== idx));
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingThumb(true);
    try {
      const res = await uploadImage(formData);
      setThumbnailUrl(res.data.data.url);
      setThumbnailPublicId(res.data.data.public_id);
      addToast('success', 'Thumbnail uploaded successfully!');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to upload thumbnail');
    } finally {
      setUploadingThumb(false);
    }
  };

  // SECTION HANDLERS
  const openAddSectionModal = () => {
    setEditingSectionIdx(null);
    setSectionTitle('');
    setSectionDesc('');
    setShowSectionModal(true);
  };

  const openEditSectionModal = (idx) => {
    setEditingSectionIdx(idx);
    setSectionTitle(sections[idx].title);
    setSectionDesc(sections[idx].description || '');
    setShowSectionModal(true);
  };

  const handleSaveSection = (e) => {
    e.preventDefault();
    if (!sectionTitle.trim()) {
      addToast('error', 'Section title is required');
      return;
    }

    if (editingSectionIdx !== null) {
      const updated = [...sections];
      updated[editingSectionIdx].title = sectionTitle.trim();
      updated[editingSectionIdx].description = sectionDesc.trim();
      setSections(updated);
      addToast('success', 'Section updated');
    } else {
      setSections([...sections, { title: sectionTitle.trim(), description: sectionDesc.trim(), lectures: [] }]);
      addToast('success', 'Section added');
    }
    setShowSectionModal(false);
  };

  const handleDeleteSection = (idx) => {
    if (!window.confirm('Are you sure you want to delete this section and its lectures?')) return;
    setSections(sections.filter((_, i) => i !== idx));
    addToast('success', 'Section deleted');
  };

  // LECTURE HANDLERS
  const openAddLectureModal = (sIdx) => {
    setTargetSectionIdx(sIdx);
    setEditingLectureIdx(null);
    setLectureTitle('');
    setLectureDesc('');
    setLectureVideoUrl('');
    setLectureVideoPublicId('');
    setLectureVideoDuration(0);
    setShowLectureModal(true);
  };

  const openEditLectureModal = (sIdx, lIdx) => {
    setTargetSectionIdx(sIdx);
    setEditingLectureIdx(lIdx);
    const lec = sections[sIdx].lectures[lIdx];
    setLectureTitle(lec.title);
    setLectureDesc(lec.description || '');
    setLectureVideoUrl(lec.videoUrl || '');
    setLectureVideoPublicId(lec.videoPublicId || '');
    setLectureVideoDuration(lec.videoDuration || 0);
    setShowLectureModal(true);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingVideo(true);
    try {
      const res = await uploadVideo(formData);
      setLectureVideoUrl(res.data.data.url);
      setLectureVideoPublicId(res.data.data.public_id);
      addToast('success', 'Lecture video uploaded to Cloudinary!');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSaveLecture = (e) => {
    e.preventDefault();
    if (!lectureTitle.trim()) {
      addToast('error', 'Lecture title is required');
      return;
    }

    const updated = [...sections];
    const lecObj = {
      title: lectureTitle.trim(),
      description: lectureDesc.trim(),
      videoUrl: lectureVideoUrl,
      videoPublicId: lectureVideoPublicId,
      videoDuration: Number(lectureVideoDuration) || 0
    };

    if (editingLectureIdx !== null) {
      updated[targetSectionIdx].lectures[editingLectureIdx] = lecObj;
      addToast('success', 'Lecture updated');
    } else {
      updated[targetSectionIdx].lectures.push(lecObj);
      addToast('success', 'Lecture added to section');
    }

    setSections(updated);
    setShowLectureModal(false);
  };

  const handleDeleteLecture = (sIdx, lIdx) => {
    if (!window.confirm('Are you sure you want to delete this lecture?')) return;
    const updated = [...sections];
    updated[sIdx].lectures = updated[sIdx].lectures.filter((_, i) => i !== lIdx);
    setSections(updated);
    addToast('success', 'Lecture deleted');
  };

  // QUIZ QUESTION HANDLERS
  const handleAddQuestion = () => {
    setQuizQuestions([
      ...quizQuestions,
      { questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }
    ]);
  };

  const handleDeleteQuestion = (idx) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
  };

  // RESOURCE UPLOAD HANDLERS
  const handlePdfUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPdf(true);
    try {
      const uploadedList = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await uploadPdf(formData);
        uploadedList.push({
          title: file.name,
          fileUrl: res.data.data.url,
          filePublicId: res.data.data.public_id
        });
      }
      setResources([...resources, ...uploadedList]);
      addToast('success', `${uploadedList.length} PDF resource(s) uploaded successfully!`);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to upload PDF resources');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleDeleteResource = (idx) => {
    setResources(resources.filter((_, i) => i !== idx));
  };

  // STEP NAVIGATION VALIDATION
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!title.trim()) {
        addToast('error', 'Training Title is required');
        return;
      }
      if (!categoryId) {
        addToast('error', 'Please select a Category');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (sections.length === 0) {
        addToast('error', 'Please add at least one Section to your course structure');
        return;
      }
      const hasAnyLectures = sections.some(s => s.lectures && s.lectures.length > 0);
      if (!hasAnyLectures) {
        addToast('error', 'Please add at least one Lecture inside your section');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setCurrentStep(5);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // SUBMIT COURSE (SAVE AS DRAFT / PUBLISH)
  const handleFinalSubmit = async (targetStatus) => {
    if (!title.trim() || !categoryId) {
      addToast('error', 'Basic details missing. Please complete Step 1.');
      setCurrentStep(1);
      return;
    }

    if (sections.length === 0) {
      addToast('error', 'Please add at least one Section in Step 2.');
      setCurrentStep(2);
      return;
    }

    setSubmitting(true);

    try {
      // Prepare Quiz payload if enabled
      let preparedSections = sections.map((sec, idx) => {
        let secQuiz = null;
        if (addQuizEnabled && idx === quizSectionIdx && quizQuestions.length > 0) {
          secQuiz = {
            title: quizTitle || `${sec.title} Quiz`,
            timeLimitMinutes: Number(quizDurationMinutes) || 15,
            passingScorePercent: Number(quizPassingScorePercent) || 70,
            questions: quizQuestions.filter(q => q.questionText.trim())
          };
        }
        return {
          title: sec.title,
          description: sec.description,
          lectures: sec.lectures,
          quiz: secQuiz
        };
      });

      const payload = {
        trainingId,
        title: title.trim(),
        description: description.trim() || title.trim(),
        categoryId,
        thumbnailUrl,
        thumbnailPublicId,
        benefits,
        durationDays: 30,
        status: targetStatus, // 'draft' | 'published'
        sections: preparedSections,
        assignment: addAssignmentEnabled && assignmentInstructions.trim() ? {
          title: assignmentTitle.trim() || `${title} Project Assignment`,
          instructions: assignmentInstructions.trim()
        } : null,
        resources: addResourcesEnabled ? resources : []
      };

      await saveFullCourse(payload);
      addToast('success', `Training successfully ${targetStatus === 'published' ? 'published' : 'saved as draft'}!`);
      navigate('/instructor/trainings');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to save training course');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading course builder details..." />;

  const stepsList = [
    { step: 1, label: 'Basic Info' },
    { step: 2, label: 'Course Builder' },
    { step: 3, label: 'Quiz' },
    { step: 4, label: 'Assignment & Resources' },
    { step: 5, label: 'Review & Publish' }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/instructor/trainings')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="inline-flex items-center text-[11px] font-bold text-blue-600 dark:text-blue-400">
              <Sparkles className="w-3 h-3 mr-1" /> {isEditMode ? 'Edit Training Course' : 'Create New Training Course'}
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {title || 'Untitled Training Course'}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleFinalSubmit('draft')}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
          >
            Save Draft
          </button>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between relative overflow-x-auto">
          {stepsList.map((st, idx) => {
            const isActive = currentStep === st.step;
            const isDone = currentStep > st.step;
            return (
              <div key={st.step} className="flex items-center space-x-2 flex-shrink-0 px-2">
                <button
                  onClick={() => {
                    if (st.step < currentStep || isDone) setCurrentStep(st.step);
                  }}
                  disabled={st.step > currentStep}
                  className={`flex items-center space-x-2 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : isDone
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 opacity-60'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center ${
                    isActive ? 'bg-white text-blue-600' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.step}
                  </span>
                  <span className="whitespace-nowrap">{st.label}</span>
                </button>
                {idx < stepsList.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-700 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1 — BASIC INFORMATION */}
      {currentStep === 1 && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-blue-500" />
              Step 1: Basic Information
            </h2>
            <p className="text-xs text-slate-500">Provide the title, category, description, and thumbnail for this training.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Training Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Master React 19 & Next.js Architecture"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Short Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="A concise overview of what learners will gain from this course..."
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-semibold"
              >
                <option value="">-- Choose Category --</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id} className="bg-slate-900 text-white">{c.name}</option>
                ))}
              </select>
            </div>

            {/* Thumbnail Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Training Thumbnail Image
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="Thumbnail preview" className="w-28 h-20 rounded-xl object-cover border border-slate-700" />
                ) : (
                  <div className="w-28 h-20 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold">
                    No Preview
                  </div>
                )}
                <div className="space-y-2">
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                    <Upload className="w-4 h-4 mr-1.5" />
                    {uploadingThumb ? 'Uploading...' : 'Upload Thumbnail Image'}
                    <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" disabled={uploadingThumb} />
                  </label>
                  <p className="text-[11px] text-slate-500">Supports PNG, JPG, WEBP. Max file size 5MB.</p>
                </div>
              </div>
            </div>

            {/* Benefits Multi-Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Benefits of the Training
              </label>
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="text"
                  value={benefitInput}
                  onChange={(e) => setBenefitInput(e.target.value)}
                  placeholder="e.g. Learn modern React state management"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBenefit(); } }}
                  className="flex-1 px-4 py-2 rounded-xl glass-input text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddBenefit}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 cursor-pointer"
                >
                  + Add Benefit
                </button>
              </div>

              {benefits.length > 0 && (
                <div className="space-y-1.5">
                  {benefits.map((b, bIdx) => (
                    <div key={bIdx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">• {b}</span>
                      <button
                        onClick={() => handleDeleteBenefit(bIdx)}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 — COURSE BUILDER */}
      {currentStep === 2 && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <Layers className="w-5 h-5 mr-2 text-indigo-500" />
                Step 2: Course Builder
              </h2>
              <p className="text-xs text-slate-500">Structure your training into Sections and Add Video Lectures inside each section.</p>
            </div>
            <button
              onClick={openAddSectionModal}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Section
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 space-y-3">
              <Layers className="w-10 h-10 text-indigo-500 mx-auto" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">No Sections Added Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "+ Add Section" above to create module sections for your course.
              </p>
              <button
                onClick={openAddSectionModal}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
              >
                Add Section
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((sec, sIdx) => (
                <div key={sIdx} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center">
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs flex items-center justify-center mr-2">
                          {sIdx + 1}
                        </span>
                        {sec.title}
                      </h3>
                      {sec.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-8">{sec.description}</p>}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openAddLectureModal(sIdx)}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-bold hover:bg-purple-500/20 transition-colors cursor-pointer inline-flex items-center"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Lecture
                      </button>
                      <button onClick={() => openEditSectionModal(sIdx)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 cursor-pointer">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteSection(sIdx)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Lectures List */}
                  <div className="space-y-2 pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                    {(!sec.lectures || sec.lectures.length === 0) ? (
                      <p className="text-xs text-slate-400 italic py-1">No lectures added to this section yet.</p>
                    ) : (
                      sec.lectures.map((lec, lIdx) => (
                        <div key={lIdx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-3">
                            <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100">{lec.title}</p>
                              {lec.description && <p className="text-[11px] text-slate-500 line-clamp-1">{lec.description}</p>}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {lec.videoUrl && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Video Attached
                              </span>
                            )}
                            <button onClick={() => openEditLectureModal(sIdx, lIdx)} className="p-1 text-slate-400 hover:text-blue-500 cursor-pointer">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteLecture(sIdx, lIdx)} className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3 — QUIZ / ASSESSMENT (OPTIONAL) */}
      {currentStep === 3 && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <HelpCircle className="w-5 h-5 mr-2 text-amber-500" />
                Step 3: Quiz / Assessment (Optional)
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Optional Step
              </span>
            </div>
            <p className="text-xs text-slate-500">Add an MCQ assessment quiz for one of your course sections.</p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center space-x-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={addQuizEnabled}
                onChange={(e) => setAddQuizEnabled(e.target.checked)}
                className="w-5 h-5 text-amber-500 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-sm">Add Quiz to this Training</span>
                <p className="text-xs text-slate-500">Enable multiple choice questions to evaluate learner knowledge.</p>
              </div>
            </label>

            {addQuizEnabled && (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Section for Quiz</label>
                    <select
                      value={quizSectionIdx}
                      onChange={(e) => setQuizSectionIdx(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-xl glass-input text-xs font-bold"
                    >
                      {sections.map((sec, idx) => (
                        <option key={idx} value={idx} className="bg-slate-900 text-white">
                          Section {idx + 1}: {sec.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Quiz Title</label>
                    <input
                      type="text"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder="e.g. Fundamentals MCQ Quiz"
                      className="w-full px-4 py-2 rounded-xl glass-input text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Quiz Duration (Minutes)</label>
                    <input
                      type="number"
                      value={quizDurationMinutes}
                      onChange={(e) => setQuizDurationMinutes(e.target.value)}
                      min={1}
                      className="w-full px-4 py-2 rounded-xl glass-input text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Passing Score (%)</label>
                    <input
                      type="number"
                      value={quizPassingScorePercent}
                      onChange={(e) => setQuizPassingScorePercent(e.target.value)}
                      min={1}
                      max={100}
                      className="w-full px-4 py-2 rounded-xl glass-input text-xs"
                    />
                  </div>
                </div>

                {/* Questions Builder */}
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                      Quiz Questions ({quizQuestions.length})
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs hover:bg-amber-500/20 cursor-pointer"
                    >
                      + Add Question
                    </button>
                  </div>

                  {quizQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-600 dark:text-amber-400">Question #{qIdx + 1}</span>
                        {quizQuestions.length > 1 && (
                          <button onClick={() => handleDeleteQuestion(qIdx)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={q.questionText}
                        onChange={(e) => {
                          const updated = [...quizQuestions];
                          updated[qIdx].questionText = e.target.value;
                          setQuizQuestions(updated);
                        }}
                        placeholder="Enter question text..."
                        className="w-full px-3 py-2 rounded-lg glass-input text-xs font-semibold"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center space-x-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={q.correctAnswerIndex === optIdx}
                              onChange={() => {
                                const updated = [...quizQuestions];
                                updated[qIdx].correctAnswerIndex = optIdx;
                                setQuizQuestions(updated);
                              }}
                              className="text-amber-500 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const updated = [...quizQuestions];
                                updated[qIdx].options[optIdx] = e.target.value;
                                setQuizQuestions(updated);
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 bg-transparent border-none text-xs focus:ring-0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4 — ASSIGNMENT & RESOURCES (OPTIONAL) */}
      {currentStep === 4 && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <FileCheck2 className="w-5 h-5 mr-2 text-emerald-500" />
                Step 4: Assignment & Resources (Optional)
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Optional Step
              </span>
            </div>
            <p className="text-xs text-slate-500">Optionally add a project assignment or upload downloadable PDF resources.</p>
          </div>

          <div className="space-y-6">
            {/* Section A: Assignment */}
            <div className="space-y-4">
              <label className="flex items-center space-x-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addAssignmentEnabled}
                  onChange={(e) => setAddAssignmentEnabled(e.target.checked)}
                  className="w-5 h-5 text-emerald-500 rounded"
                />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Add Project Assignment</span>
                  <p className="text-xs text-slate-500">Require students to submit practical project work for review.</p>
                </div>
              </label>

              {addAssignmentEnabled && (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Assignment Title</label>
                    <input
                      type="text"
                      value={assignmentTitle}
                      onChange={(e) => setAssignmentTitle(e.target.value)}
                      placeholder="e.g. Build a Full Stack React & Node Application"
                      className="w-full px-4 py-2 rounded-xl glass-input text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Assignment Question / Instructions</label>
                    <textarea
                      value={assignmentInstructions}
                      onChange={(e) => setAssignmentInstructions(e.target.value)}
                      rows={4}
                      placeholder="Detailed project guidelines and requirements..."
                      className="w-full px-4 py-2 rounded-xl glass-input text-xs resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section B: Resources */}
            <div className="space-y-4">
              <label className="flex items-center space-x-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addResourcesEnabled}
                  onChange={(e) => setAddResourcesEnabled(e.target.checked)}
                  className="w-5 h-5 text-blue-500 rounded"
                />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Add Downloadable PDF Resources</span>
                  <p className="text-xs text-slate-500">Attach course guides, cheat sheets, or reference documentation.</p>
                </div>
              </label>

              {addResourcesEnabled && (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div>
                    <label className="cursor-pointer inline-flex items-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow">
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingPdf ? 'Uploading PDFs...' : 'Upload PDF Files'}
                      <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        onChange={handlePdfUpload}
                        className="hidden"
                        disabled={uploadingPdf}
                      />
                    </label>
                  </div>

                  {resources.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">Selected PDF Resources:</h4>
                      {resources.map((res, rIdx) => (
                        <div key={rIdx} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-slate-100">{res.title}</span>
                          </div>
                          <button onClick={() => handleDeleteResource(rIdx)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 5 — FINAL STEP — REVIEW & PUBLISH */}
      {currentStep === 5 && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-500" />
              Step 5: Final Review & Publish
            </h2>
            <p className="text-xs text-slate-500">Review your course summary before saving as draft or publishing.</p>
          </div>

          <div className="space-y-6 text-xs">
            {/* Overview Summary */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {categories.find(c => String(c._id) === String(categoryId))?.name || 'Category'}
                </span>
                <span className="font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  Step 1 Verified
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{title}</h3>
              <p className="text-slate-600 dark:text-slate-400">{description || 'No description provided.'}</p>
              {benefits.length > 0 && (
                <div className="pt-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Course Benefits:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-500">
                    {benefits.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Sections & Lectures Summary */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center">
                <Layers className="w-4 h-4 mr-1.5 text-indigo-500" /> Course Structure ({sections.length} Sections)
              </h4>
              <div className="space-y-2">
                {sections.map((sec, sIdx) => (
                  <div key={sIdx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-slate-100">Section {sIdx + 1}: {sec.title}</p>
                    <p className="text-[11px] text-slate-500">{sec.lectures?.length || 0} Lectures attached</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quiz Summary */}
            {addQuizEnabled && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 space-y-1">
                <h4 className="font-bold text-xs flex items-center">
                  <HelpCircle className="w-4 h-4 mr-1.5" /> MCQ Quiz Included: {quizTitle || 'Assessment Quiz'}
                </h4>
                <p className="text-[11px]">Duration: {quizDurationMinutes}m • Passing: {quizPassingScorePercent}% • Questions: {quizQuestions.length}</p>
              </div>
            )}

            {/* Assignment Summary */}
            {addAssignmentEnabled && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 space-y-1">
                <h4 className="font-bold text-xs flex items-center">
                  <FileCheck2 className="w-4 h-4 mr-1.5" /> Project Assignment Included
                </h4>
                <p className="text-[11px]">{assignmentInstructions}</p>
              </div>
            )}

            {/* Resources Summary */}
            {addResourcesEnabled && resources.length > 0 && (
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 space-y-1">
                <h4 className="font-bold text-xs flex items-center">
                  <FileText className="w-4 h-4 mr-1.5" /> {resources.length} Downloadable PDF Resources Attached
                </h4>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Controls (Prev, Next, Save Draft, Publish) */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handlePrevStep}
          disabled={currentStep === 1 || submitting}
          className="inline-flex items-center px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous Step
        </button>

        <div className="flex items-center space-x-3">
          {currentStep < 5 ? (
            <button
              onClick={handleNextStep}
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              Next Step <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          ) : (
            <>
              <button
                onClick={() => handleFinalSubmit('draft')}
                disabled={submitting}
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {submitting ? 'Saving...' : 'Save as Draft'}
              </button>

              <button
                onClick={() => handleFinalSubmit('published')}
                disabled={submitting}
                className="inline-flex items-center px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                <Send className="w-4 h-4 mr-1.5" />
                {submitting ? 'Publishing...' : 'Publish Training'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* SECTION MODAL */}
      <Modal isOpen={showSectionModal} onClose={() => setShowSectionModal(false)} title={editingSectionIdx !== null ? 'Edit Section' : 'Add Section Module'}>
        <form onSubmit={handleSaveSection} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Section Title *</label>
            <input
              type="text"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              required
              placeholder="e.g. Module 1: Introduction & Environment Setup"
              className="w-full px-4 py-2 rounded-xl glass-input text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Optional Section Description</label>
            <textarea
              value={sectionDesc}
              onChange={(e) => setSectionDesc(e.target.value)}
              rows={2}
              placeholder="Section goals and objectives..."
              className="w-full px-4 py-2 rounded-xl glass-input text-xs resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
            <button type="button" onClick={() => setShowSectionModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white">
              Save Section
            </button>
          </div>
        </form>
      </Modal>

      {/* LECTURE MODAL */}
      <Modal isOpen={showLectureModal} onClose={() => setShowLectureModal(false)} title={editingLectureIdx !== null ? 'Edit Lecture' : 'Add Lecture Video'}>
        <form onSubmit={handleSaveLecture} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Lecture Title *</label>
            <input
              type="text"
              value={lectureTitle}
              onChange={(e) => setLectureTitle(e.target.value)}
              required
              placeholder="e.g. Lecture 1.1: What is React?"
              className="w-full px-4 py-2 rounded-xl glass-input text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Lecture Description</label>
            <textarea
              value={lectureDesc}
              onChange={(e) => setLectureDesc(e.target.value)}
              rows={2}
              placeholder="Lecture notes and summary..."
              className="w-full px-4 py-2 rounded-xl glass-input text-xs resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Lecture Video *</label>
            <div className="flex items-center space-x-3 mb-2">
              <label className="cursor-pointer inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700">
                <Upload className="w-4 h-4 mr-1.5 text-blue-400" />
                {uploadingVideo ? 'Uploading Video...' : 'Upload Video File'}
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" disabled={uploadingVideo} />
              </label>
              {lectureVideoUrl && (
                <span className="text-xs text-emerald-500 font-mono truncate max-w-xs">Video Attached</span>
              )}
            </div>

            <input
              type="text"
              value={lectureVideoUrl}
              onChange={(e) => setLectureVideoUrl(e.target.value)}
              placeholder="Or paste video URL directly (e.g. Cloudinary, MP4 URL)..."
              className="w-full px-4 py-2 rounded-xl glass-input text-xs font-mono"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
            <button type="button" onClick={() => setShowLectureModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white">
              Save Lecture
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
