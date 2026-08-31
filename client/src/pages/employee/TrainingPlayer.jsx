import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProgressByAssignment,
  completeSubSection,
  getQuizById,
  startQuiz,
  submitQuiz,
  getQuizAttempts,
  getAssignmentById,
  submitAssignment,
  uploadPdf
} from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useNotification } from '../../context/NotificationContext';
import { formatDate } from '../../utils/formatters';
import {
  ArrowLeft,
  CheckCircle2,
  PlayCircle,
  FileText,
  HelpCircle,
  FileCheck2,
  ChevronRight,
  ChevronLeft,
  Lock,
  Download,
  Award,
  Clock,
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Code2,
  Upload,
  AlertTriangle,
  RotateCcw,
  Check,
  X
} from 'lucide-react';

export const TrainingPlayer = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Active Item in Syllabus
  // type: 'lesson' | 'quiz' | 'assignment' | 'completed'
  const [activeItem, setActiveItem] = useState(null);

  // Custom Video Player state
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const [hasVideoReachedEnd, setHasVideoReachedEnd] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [videoError, setVideoError] = useState(false);

  // Quiz state & refs
  const [quizData, setQuizData] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [quizTimeRemaining, setQuizTimeRemaining] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  const quizTimerRef = useRef(null);
  const isSubmittingQuizRef = useRef(false);
  const quizStartTimeRef = useRef(null);
  const activeQuizAttemptIdRef = useRef(null);

  // Assignment state
  const [assignmentDetails, setAssignmentDetails] = useState(null);
  const [submissionType, setSubmissionType] = useState('github'); // 'github' | 'file'
  const [githubUrl, setGithubUrl] = useState('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);

  const [submittingComplete, setSubmittingComplete] = useState(false);

  const fetchWorkspace = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await getProgressByAssignment(assignmentId);
      const payload = res.data.data;
      setData(payload);

      const items = extractSyllabusItems(payload);

      // Auto-resume: Find first incomplete item
      if (!isRefresh || !activeItem) {
        const completedIds = new Set(payload.progress?.completedSubSectionIds?.map(id => id.toString()) || []);
        const passedQuizIds = new Set(payload.quizAttempts?.filter(a => a.passed).map(a => (a.quizId?._id || a.quizId)?.toString()) || []);
        const submittedAssignmentIds = new Set(payload.assignmentSubmissions?.map(s => (s.assignmentId?._id || s.assignmentId)?.toString()) || []);

        let nextActive = items.find(item => {
          if (item.type === 'lesson') return !completedIds.has(item.id.toString());
          if (item.type === 'quiz') return !passedQuizIds.has(item.id.toString());
          if (item.type === 'assignment') return !submittedAssignmentIds.has(item.id.toString());
          return false;
        });

        if (!nextActive && items.length > 0) {
          nextActive = { type: 'completed' };
        }

        setActiveItem(nextActive || items[0]);
      }
    } catch (err) {
      addToast('error', 'Failed to load training workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [assignmentId]);

  useEffect(() => {
    setVideoError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setMaxWatchedTime(0);
    setHasVideoReachedEnd(false);
  }, [activeItem]);

  const formatMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
    if (url.startsWith('/')) return `${window.location.origin}${url}`;
    return url;
  };

  // Extract flat list of syllabus items (Lessons, Quizzes, Assignments placed at very end)
  const extractSyllabusItems = (payload) => {
    if (!payload?.assignment?.trainingId?.sections) return [];
    const sections = payload.assignment.trainingId.sections;
    const items = [];
    let foundAssignment = null;

    sections.forEach((sec) => {
      if (sec.subSections) {
        sec.subSections.forEach((sub) => {
          items.push({
            type: 'lesson',
            id: sub._id,
            sectionId: sec._id,
            sectionTitle: sec.title,
            title: sub.title,
            description: sub.description,
            videoUrl: sub.videoUrl,
            videoDuration: sub.videoDuration,
            pdfResources: sub.pdfResources || [],
            hasQuiz: sub.hasQuiz,
            quizId: sub.quizId?._id || sub.quizId
          });

          if (sub.hasQuiz && sub.quizId) {
            items.push({
              type: 'quiz',
              id: sub.quizId?._id || sub.quizId,
              subSectionId: sub._id,
              sectionId: sec._id,
              sectionTitle: sec.title,
              title: `${sub.title} Quiz`
            });
          }

          if (sub.hasAssignment && sub.assignmentId) {
            foundAssignment = {
              type: 'assignment',
              id: sub.assignmentId?._id || sub.assignmentId,
              subSectionId: sub._id,
              sectionTitle: 'ASSIGNMENT',
              title: `${sub.title} Assignment`
            };
          }
        });
      }
    });

    if (!foundAssignment && payload?.assignment?.trainingId?.assignmentId) {
      const aObj = payload.assignment.trainingId.assignmentId;
      foundAssignment = {
        type: 'assignment',
        id: aObj._id || aObj,
        sectionTitle: 'ASSIGNMENT',
        title: aObj.title || 'Course Project Assignment'
      };
    }

    if (foundAssignment) {
      items.push(foundAssignment);
    }

    return items;
  };

  // Collect all PDF resources across the course for the sidebar (deduplicated by URL)
  const extractAllCourseResources = (payload) => {
    if (!payload?.assignment?.trainingId?.sections) return [];
    const resources = [];
    const seenUrls = new Set();

    payload.assignment.trainingId.sections.forEach(sec => {
      sec.subSections?.forEach(sub => {
        if (sub.pdfResources && sub.pdfResources.length > 0) {
          sub.pdfResources.forEach(res => {
            const url = res.fileUrl || res.pdfUrl || res.url;
            if (url && !seenUrls.has(url)) {
              seenUrls.add(url);
              resources.push({
                ...res,
                fileUrl: url,
                lessonTitle: sub.title
              });
            }
          });
        }
      });
    });
    return resources;
  };

  // Determine completion and locked status for each item
  const getItemStatus = (item) => {
    if (!data || !data.progress) return { isCompleted: false, isLocked: true };
    const completedSubSectionIds = new Set(data.progress.completedSubSectionIds?.map(id => id.toString()) || []);
    const passedQuizIds = new Set(data.quizAttempts?.filter(a => a.passed).map(a => (a.quizId?._id || a.quizId)?.toString()) || []);
    const submittedAssignmentIds = new Set(data.assignmentSubmissions?.map(s => (s.assignmentId?._id || s.assignmentId)?.toString()) || []);

    const allItems = extractSyllabusItems(data);
    const itemIndex = allItems.findIndex(i => i.id === item.id && i.type === item.type);

    let isCompleted = false;
    if (item.type === 'lesson') isCompleted = completedSubSectionIds.has(item.id.toString());
    if (item.type === 'quiz') isCompleted = passedQuizIds.has(item.id.toString());
    if (item.type === 'assignment') isCompleted = submittedAssignmentIds.has(item.id.toString());

    // Item is locked if any preceding item in the syllabus is incomplete
    let isLocked = false;
    for (let k = 0; k < itemIndex; k++) {
      const prev = allItems[k];
      let prevDone = false;
      if (prev.type === 'lesson') prevDone = completedSubSectionIds.has(prev.id.toString());
      if (prev.type === 'quiz') prevDone = passedQuizIds.has(prev.id.toString());
      if (prev.type === 'assignment') prevDone = submittedAssignmentIds.has(prev.id.toString());

      if (!prevDone) {
        isLocked = true;
        break;
      }
    }

    return { isCompleted, isLocked };
  };

  // Load Active Quiz details & persistent start time
  useEffect(() => {
    if (activeItem && activeItem.type === 'quiz') {
      getQuizById(activeItem.id)
        .then(async res => {
          const q = res.data.data.quiz;
          setQuizData(q);
          setSelectedAnswers({});
          setCurrentQuestionIdx(0);
          isSubmittingQuizRef.current = false;

          // Check if employee has existing attempts for this quiz
          const existingAttempts = (data?.quizAttempts || []).filter(att => {
            const attQuizId = att.quizId?._id ? att.quizId._id.toString() : att.quizId?.toString();
            return attQuizId === q._id.toString();
          });

          const completedAttempts = existingAttempts.filter(att => att.status === 'completed' || (att.passed !== undefined && att.status !== 'in_progress'));
          const inProgressAttempt = existingAttempts.find(att => att.status === 'in_progress');

          if (completedAttempts.length > 0) {
            const latestAtt = completedAttempts[0];
            setQuizResult({
              passed: latestAtt.passed,
              percentage: latestAtt.percentage,
              passingScorePercent: q.passingScorePercent,
              evaluatedAnswers: latestAtt.answers
            });
            setQuizSubmitted(true);
            setQuizStarted(true);
          } else if (inProgressAttempt) {
            // Active attempt found (e.g. employee refreshed mid-quiz) -> Auto-resume!
            setQuizSubmitted(false);
            setQuizResult(null);
            setQuizStarted(true);

            activeQuizAttemptIdRef.current = inProgressAttempt._id;
            const startTime = new Date(inProgressAttempt.startTime);
            quizStartTimeRef.current = startTime;

            const limitMs = (q.timeLimitMinutes || 15) * 60 * 1000;
            const remaining = Math.max(0, Math.floor((startTime.getTime() + limitMs - Date.now()) / 1000));

            if (remaining <= 0) {
              setQuizTimeRemaining(0);
              handleAutoSubmitQuiz();
            } else {
              setQuizTimeRemaining(remaining);
            }
          } else {
            // Fallback check against server API directly for completed/in-progress attempts
            try {
              const attemptsRes = await getQuizAttempts(q._id);
              const serverAttempts = attemptsRes.data.data.attempts || [];
              const serverCompleted = serverAttempts.filter(att => att.status === 'completed' || (att.passed !== undefined && att.status !== 'in_progress'));
              const serverInProgress = serverAttempts.find(att => att.status === 'in_progress');

              if (serverCompleted.length > 0) {
                const latest = serverCompleted[0];
                setQuizResult({
                  passed: latest.passed,
                  percentage: latest.percentage,
                  passingScorePercent: q.passingScorePercent,
                  evaluatedAnswers: latest.answers
                });
                setQuizSubmitted(true);
                setQuizStarted(true);
                return;
              } else if (serverInProgress) {
                setQuizSubmitted(false);
                setQuizResult(null);
                setQuizStarted(true);

                activeQuizAttemptIdRef.current = serverInProgress._id;
                const startTime = new Date(serverInProgress.startTime);
                quizStartTimeRef.current = startTime;

                const limitMs = (q.timeLimitMinutes || 15) * 60 * 1000;
                const remaining = Math.max(0, Math.floor((startTime.getTime() + limitMs - Date.now()) / 1000));

                if (remaining <= 0) {
                  setQuizTimeRemaining(0);
                  handleAutoSubmitQuiz();
                } else {
                  setQuizTimeRemaining(remaining);
                }
                return;
              }
            } catch (err) {
              console.warn('Failed to fetch quiz attempts fallback:', err);
            }

            // Fresh quiz start -> Show Quiz Details Screen (Timer NOT started yet!)
            setQuizSubmitted(false);
            setQuizResult(null);
            setQuizStarted(false);
            setQuizTimeRemaining(null);
          }
        })
        .catch(err => {
          addToast('error', err.response?.data?.message || 'Failed to load quiz');
        });
    }
    return () => {
      if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    };
  }, [activeItem, data]);

  // Handle explicit Start Quiz button click
  const handleStartQuiz = async () => {
    if (!quizData) return;
    setStartingQuiz(true);
    try {
      const startRes = await startQuiz(quizData._id, { trainingAssignmentId: assignmentId });
      const { attempt, startTime, remainingSeconds } = startRes.data.data;

      activeQuizAttemptIdRef.current = attempt._id;
      quizStartTimeRef.current = new Date(startTime);
      isSubmittingQuizRef.current = false;

      setSelectedAnswers({});
      setCurrentQuestionIdx(0);
      setQuizStarted(true);

      if (remainingSeconds <= 0) {
        setQuizTimeRemaining(0);
        handleAutoSubmitQuiz();
      } else {
        setQuizTimeRemaining(remainingSeconds);
      }
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to start quiz');
    } finally {
      setStartingQuiz(false);
    }
  };

  // Quiz Timer Countdown (Driven by quizStartTimeRef to survive re-renders & refreshes)
  useEffect(() => {
    if (activeItem?.type === 'quiz' && quizData && quizStarted && !quizSubmitted && quizTimeRemaining !== null && quizTimeRemaining > 0) {
      if (quizTimerRef.current) clearInterval(quizTimerRef.current);

      quizTimerRef.current = setInterval(() => {
        if (!quizStartTimeRef.current || !quizData) return;
        const now = Date.now();
        const startMs = quizStartTimeRef.current.getTime();
        const limitMs = (quizData.timeLimitMinutes || 15) * 60 * 1000;
        const remaining = Math.max(0, Math.floor((startMs + limitMs - now) / 1000));

        setQuizTimeRemaining(remaining);

        if (remaining <= 0) {
          clearInterval(quizTimerRef.current);
          handleAutoSubmitQuiz();
        }
      }, 1000);

      return () => {
        if (quizTimerRef.current) clearInterval(quizTimerRef.current);
      };
    }
  }, [activeItem, quizData, quizStarted, quizSubmitted]);

  const handleAutoSubmitQuiz = () => {
    if (isSubmittingQuizRef.current) return;
    addToast('warning', 'Time is up. Your quiz has been submitted automatically.');
    submitQuizAnswers(true);
  };

  const submitQuizAnswers = async (isAutoSubmit = false) => {
    if (!quizData) return;
    if (isSubmittingQuizRef.current && !isAutoSubmit) return;

    // Validate required questions for manual submit
    const unansweredCount = quizData.questions.length - Object.keys(selectedAnswers).length;
    if (!isAutoSubmit && unansweredCount > 0 && quizTimeRemaining > 0) {
      addToast('warning', `Please answer all questions before submitting. (${unansweredCount} unanswered)`);
      return;
    }

    isSubmittingQuizRef.current = true;
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    setSubmittingQuiz(true);

    try {
      const userAnswersPayload = Object.keys(selectedAnswers).map(qIdx => ({
        questionIndex: Number(qIdx),
        selectedOptionIndex: selectedAnswers[qIdx]
      }));

      const res = await submitQuiz(quizData._id, {
        userAnswers: userAnswersPayload,
        trainingAssignmentId: assignmentId,
        attemptId: activeQuizAttemptIdRef.current
      });

      const resData = res.data.data;
      setQuizResult(resData);
      setQuizSubmitted(true);
      setQuizStarted(true);

      if (!isAutoSubmit) {
        if (resData.passed) {
          addToast('success', 'Congratulations! You passed the quiz.');
        } else {
          addToast('error', `Quiz failed (${resData.percentage}%). Required passing score: ${resData.passingScorePercent}%. Please retake.`);
        }
      }
      fetchWorkspace(true);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setSubmittingQuiz(false);
      isSubmittingQuizRef.current = false;
    }
  };

  // Load Active Assignment details
  useEffect(() => {
    if (activeItem && activeItem.type === 'assignment') {
      getAssignmentById(activeItem.id)
        .then(res => {
          setAssignmentDetails(res.data.data.assignment);
          if (res.data.data.userSubmission) {
            setExistingSubmission(res.data.data.userSubmission);
            setSubmissionType(res.data.data.userSubmission.submissionType);
            if (res.data.data.userSubmission.githubUrl) setGithubUrl(res.data.data.userSubmission.githubUrl);
            if (res.data.data.userSubmission.fileUrl) setUploadedFileUrl(res.data.data.userSubmission.fileUrl);
          }
        })
        .catch(err => {
          addToast('error', err.response?.data?.message || 'Failed to load assignment');
        });
    }
  }, [activeItem]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingFile(true);
    try {
      const res = await uploadPdf(formData);
      setUploadedFileUrl(res.data.data.url);
      addToast('success', 'Assignment file uploaded successfully!');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    if (!assignmentDetails) return;

    if (submissionType === 'github' && (!githubUrl || !githubUrl.includes('github.com'))) {
      addToast('error', 'Please enter a valid GitHub Repository URL (e.g., https://github.com/user/repo)');
      return;
    }

    if (submissionType === 'file' && !uploadedFileUrl) {
      addToast('error', 'Please choose and upload a project file first');
      return;
    }

    setSubmittingAssignment(true);
    try {
      const res = await submitAssignment(assignmentDetails._id, {
        submissionType,
        githubUrl: submissionType === 'github' ? githubUrl : undefined,
        fileUrl: submissionType === 'file' ? uploadedFileUrl : undefined,
        trainingAssignmentId: assignmentId
      });
      setExistingSubmission(res.data.data.submission);
      addToast('success', 'Assignment submitted to instructor successfully!');
      fetchWorkspace(true);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setSubmittingAssignment(false);
    }
  };

  // Mark Video/Content Lesson Complete
  const handleMarkComplete = async () => {
    if (!activeItem || activeItem.type !== 'lesson') return;

    const isVideoLesson = Boolean(activeItem.videoUrl && activeItem.videoUrl.trim() !== '');
    if (isVideoLesson && !activeStatus.isCompleted && !hasVideoReachedEnd) {
      addToast('warning', 'You must watch 100% of the video before marking the lesson as complete.');
      return;
    }

    setSubmittingComplete(true);
    try {
      const res = await completeSubSection({
        trainingAssignmentId: assignmentId,
        subSectionId: activeItem.id,
        videoProgress: isVideoLesson ? 100 : undefined
      });
      addToast('success', 'Lesson completed!');
      await fetchWorkspace(true);

      const allItems = extractSyllabusItems(data);
      const currIdx = allItems.findIndex(i => i.id === activeItem.id && i.type === activeItem.type);
      if (currIdx >= 0 && currIdx < allItems.length - 1) {
        setActiveItem(allItems[currIdx + 1]);
      } else if (res.data.data.percentage === 100) {
        setActiveItem({ type: 'completed' });
      }
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to mark lesson complete');
    } finally {
      setSubmittingComplete(false);
    }
  };

  // Custom Video Player Controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 0;
      setDuration(dur);

      if (dur > 0 && (videoRef.current.ended || cur >= dur - 0.5)) {
        setCurrentTime(dur);
        setMaxWatchedTime(dur);
        setHasVideoReachedEnd(true);
      } else {
        setCurrentTime(cur);
        setMaxWatchedTime(prevMax => Math.max(prevMax, cur));
      }
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (videoRef.current && videoRef.current.duration) {
      const dur = videoRef.current.duration;
      setCurrentTime(dur);
      setMaxWatchedTime(dur);
      setHasVideoReachedEnd(true);
    }
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      const dur = videoRef.current.duration || duration || 0;

      // Allow unrestricted seeking for already completed video lessons
      if (activeStatus.isCompleted) {
        if (dur > 0 && time >= dur - 0.25) {
          videoRef.current.currentTime = dur;
          setCurrentTime(dur);
        } else {
          videoRef.current.currentTime = time;
          setCurrentTime(time);
        }
        return;
      }

      // For uncompleted video lesson: restrict forward seeking past unwatched portion
      if (time > maxWatchedTime + 0.5) {
        const allowed = Math.min(time, maxWatchedTime);
        videoRef.current.currentTime = allowed;
        setCurrentTime(allowed);
        addToast('warning', 'Forward seeking is disabled until you watch the full video.');
        return;
      }

      if (dur > 0 && time >= dur - 0.25) {
        videoRef.current.currentTime = dur;
        setCurrentTime(dur);
      } else {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
      }
    }
  };

  const handleSeeking = () => {
    if (!videoRef.current) return;
    if (activeStatus.isCompleted) return;

    const targetTime = videoRef.current.currentTime;
    if (targetTime > maxWatchedTime + 0.5) {
      const allowed = maxWatchedTime;
      videoRef.current.currentTime = allowed;
      setCurrentTime(allowed);
      addToast('warning', 'Forward seeking is disabled until you watch the full video.');
    }
  };

  const handleVolumeChange = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      setIsMuted(v === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
  };

  const toggleFullscreen = () => {
    if (videoRef.current && videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const formatVideoTime = (seconds) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <LoadingSpinner text="Loading interactive learning player..." />;

  if (!data || !data.assignment) {
    return <p className="text-center text-slate-400 py-12">Training assignment not found.</p>;
  }

  const { assignment, progress } = data;
  const training = assignment.trainingId;
  const allItems = extractSyllabusItems(data);
  const allCourseResources = extractAllCourseResources(data);

  const currentIdx = allItems.findIndex(i => activeItem && i.id === activeItem.id && i.type === activeItem.type);
  const activeStatus = activeItem ? getItemStatus(activeItem) : { isCompleted: false, isLocked: false };

  const canGoPrev = currentIdx > 0;
  const canGoNext = currentIdx >= 0 && currentIdx < allItems.length - 1 && activeStatus.isCompleted;

  const completedCount = allItems.filter(item => getItemStatus(item).isCompleted).length;
  const totalItemsCount = allItems.length;
  const calculatedPercentage = totalItemsCount > 0
    ? (completedCount === totalItemsCount ? 100 : Math.round((completedCount / totalItemsCount) * 100))
    : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/employee/my-trainings')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
              {training.categoryId?.name || 'Course Training'}
            </span>
            <h1 className="text-lg font-black text-slate-900 dark:text-white line-clamp-1">{training.title}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {calculatedPercentage}% Completed
            </p>
            <p className="text-[11px] text-slate-500 flex items-center justify-end">
              <Clock className="w-3 h-3 mr-1" /> Due: {formatDate(assignment.deadline)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Layout (Left Content Player, Right Syllabus & Resources Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT / MAIN LEARNING AREA */}
        <div className="lg:col-span-2 space-y-4">

          {/* LOCKED ASSIGNMENT SCREEN */}
          {assignment.lockStatus?.isLocked || assignment.status === 'Locked' ? (
            <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-rose-500/30 text-center space-y-6 animate-scale-up">
              <div className="w-20 h-20 rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto shadow-xl shadow-rose-500/10">
                <Lock className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-extrabold border border-rose-500/20">
                  🔒 Training Temporarily Locked
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Access Suspended
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  This training module has been temporarily locked by your instructor. Please contact your instructor or administrator to request access.
                </p>
                {assignment.lockStatus?.lockedReason && (
                  <p className="text-xs text-rose-500 italic pt-1">
                    Reason: "{assignment.lockStatus.lockedReason}"
                  </p>
                )}
              </div>
              <div className="pt-4">
                <button
                  onClick={() => navigate('/employee/my-trainings')}
                  className="px-6 py-3 rounded-2xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Back to Assigned Trainings
                </button>
              </div>
            </div>
          ) : activeItem?.type === 'completed' ? (
            <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800/80 text-center space-y-6 animate-scale-up">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                <Award className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold border border-emerald-500/20">
                  🎉 Course 100% Completed
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Congratulations!
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  You have successfully finished all required lessons, quizzes, and assignments for <strong>"{training.title}"</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-xs pt-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400">Progress</p>
                  <p className="text-lg font-black text-emerald-500">100%</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400">Quiz Status</p>
                  <p className="text-lg font-black text-blue-500">Passed ✓</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400">Assignment</p>
                  <p className="text-lg font-black text-purple-500">{data.assignmentSubmissions?.length ? 'Submitted ✓' : 'Completed'}</p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => navigate('/employee/my-trainings')}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer"
                >
                  Back to Assigned Trainings
                </button>
              </div>
            </div>
          ) : activeItem?.type === 'lesson' ? (
            /* LESSON VIEW (VIDEO / CONTENT) */
            <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-400">{activeItem.sectionTitle}</span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                    {activeItem.videoUrl ? <PlayCircle className="w-5 h-5 text-blue-500 mr-2" /> : <FileText className="w-5 h-5 text-emerald-500 mr-2" />}
                    {activeItem.title}
                  </h2>
                </div>
                {activeStatus.isCompleted && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Completed
                  </span>
                )}
              </div>

              {/* VIDEO PLAYER */}
              {activeItem.videoUrl ? (
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video border border-slate-800 group">
                  {videoError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950 text-slate-300">
                      <AlertTriangle className="w-10 h-10 text-amber-500" />
                      <h4 className="font-bold text-sm text-white">Unable to Load Training Video</h4>
                      <p className="text-xs text-slate-400 max-w-sm">The media server was unable to stream this video file. Please check your network connection or ask your instructor to update the video.</p>
                      <button
                        onClick={() => {
                          setVideoError(false);
                          if (videoRef.current) {
                            videoRef.current.load();
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        Retry Playback
                      </button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        src={formatMediaUrl(activeItem.videoUrl)}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleVideoEnded}
                        onSeeking={handleSeeking}
                        onError={() => setVideoError(true)}
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={togglePlay}
                      />

                      {/* Video Overlay Controls Bar */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent space-y-2 opacity-90 transition-opacity">
                        <div className="relative w-full flex items-center group/timeline">
                          <div className="w-full bg-slate-800/80 h-1.5 rounded-lg overflow-hidden relative">
                            <div
                              className="bg-blue-500 h-full rounded-lg transition-all duration-75"
                              style={{
                                width: `${
                                  duration > 0
                                    ? (currentTime >= duration || (videoRef.current && videoRef.current.ended)
                                      ? 100
                                      : Math.min(100, Math.round((currentTime / duration) * 100)))
                                    : 0
                                }%`
                              }}
                            />
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            step={0.1}
                            value={currentTime}
                            onChange={handleSeek}
                            className="absolute inset-0 w-full opacity-0 cursor-pointer h-4"
                          />
                        </div>

                        <div className="flex items-center justify-between text-white text-xs">
                          <div className="flex items-center space-x-3">
                            <button onClick={togglePlay} className="p-1 hover:text-blue-400 transition-colors cursor-pointer">
                              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </button>

                            <span className="font-mono text-[11px]">
                              {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
                            </span>

                            <div className="flex items-center space-x-1">
                              <button onClick={toggleMute} className="p-1 hover:text-blue-400 cursor-pointer">
                                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                              </button>
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.1}
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-16 accent-blue-500 h-1 cursor-pointer"
                              />
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1 font-mono text-[10px]">
                              {[0.5, 1, 1.25, 1.5, 2].map(speed => (
                                <button
                                  key={speed}
                                  onClick={() => handleSpeedChange(speed)}
                                  className={`px-1.5 py-0.5 rounded cursor-pointer ${
                                    playbackSpeed === speed ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {speed}x
                                </button>
                              ))}
                            </div>

                            <button onClick={toggleFullscreen} className="p-1 hover:text-blue-400 cursor-pointer">
                              <Maximize className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {/* LESSON NOTES / TEXT CONTENT */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 space-y-2">
                <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">Lesson Description</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {activeItem.description || 'Watch the video lesson and complete the interactive materials.'}
                </p>
              </div>
            </div>
          ) : activeItem?.type === 'quiz' ? (
            /* INTEGRATED QUIZ VIEW */
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-6">
              {!quizData ? (
                <LoadingSpinner text="Loading section quiz..." />
              ) : quizSubmitted && quizResult ? (
                /* QUIZ RESULT SCREEN */
                <div className="space-y-6">
                  <div className={`p-6 rounded-3xl border text-center space-y-2 ${
                    quizResult.passed
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                  }`}>
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      quizResult.passed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                    }`}>
                      {quizResult.passed ? '✓ PASSED' : '✕ FAILED'}
                    </span>
                    <h3 className="text-2xl font-black">{quizResult.percentage}% Score</h3>
                    <p className="text-xs opacity-90">
                      Passing Score Required: <strong>{quizResult.passingScorePercent}%</strong>
                    </p>
                    {!quizResult.passed && (
                      <p className="text-xs pt-2 font-bold text-rose-600 dark:text-rose-400">
                        ✕ You did not pass this quiz. Please retake to unlock subsequent content.
                      </p>
                    )}
                  </div>

                  {/* QUESTION-LEVEL REVIEW */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Question Performance Breakdown</h4>
                    {quizResult.evaluatedAnswers?.map((ans, idx) => {
                      const userAnsText = ans.selectedAnswerText || (ans.options && ans.selectedOptionIndex !== null && ans.selectedOptionIndex !== undefined ? ans.options[ans.selectedOptionIndex] : (ans.status === 'data_unavailable' ? 'Answer data unavailable' : 'Not Answered'));
                      const corrAnsText = ans.correctAnswerText || (ans.options && ans.correctAnswerIndex !== undefined ? ans.options[ans.correctAnswerIndex] : 'N/A');

                      return (
                        <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">Question {idx + 1}: {ans.questionText}</span>
                            <span className={`px-2.5 py-0.5 rounded font-extrabold text-[10px] ${
                              ans.isCorrect
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : ans.selectedOptionIndex === null || ans.selectedOptionIndex === undefined
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}>
                              {ans.isCorrect ? '✓ Correct' : (ans.selectedOptionIndex === null || ans.selectedOptionIndex === undefined) ? '○ Not Answered' : '✕ Incorrect'}
                            </span>
                          </div>
                          <p className="text-slate-500">Your Answer: <strong className={ans.isCorrect ? 'text-emerald-500' : 'text-rose-500'}>{userAnsText}</strong></p>
                          {!ans.isCorrect && (
                            <p className="text-slate-500">Correct Answer: <strong className="text-emerald-500">{corrAnsText}</strong></p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 text-center">
                    {!quizResult.passed ? (
                      <button
                        onClick={() => {
                          setQuizSubmitted(false);
                          setQuizResult(null);
                          setQuizStarted(false);
                          setQuizTimeRemaining(null);
                          setSelectedAnswers({});
                          setCurrentQuestionIdx(0);
                        }}
                        className="px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                      >
                        Retake Quiz
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (canGoNext) setActiveItem(allItems[currentIdx + 1]);
                        }}
                        className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
                      >
                        Continue Learning →
                      </button>
                    )}
                  </div>
                </div>
              ) : !quizStarted && !quizSubmitted ? (
                /* QUIZ INTRODUCTION / DETAILS SCREEN */
                <div className="space-y-6">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-extrabold uppercase tracking-wider">
                      Quiz Assessment
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2.5">
                      {quizData.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Test your knowledge on key concepts from this section. Complete all questions before submitting or before the timer runs out.
                    </p>
                  </div>

                  {/* STATS & METRICS GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                      <HelpCircle className="w-5 h-5 mx-auto text-amber-500" />
                      <span className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider">Questions</span>
                      <strong className="block text-base font-extrabold text-slate-900 dark:text-white">
                        {quizData.questions?.length || 0}
                      </strong>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                      <Clock className="w-5 h-5 mx-auto text-blue-500" />
                      <span className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider">Duration</span>
                      <strong className="block text-base font-extrabold text-slate-900 dark:text-white">
                        {quizData.timeLimitMinutes || 15} Min{quizData.timeLimitMinutes === 1 ? '' : 's'}
                      </strong>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                      <Award className="w-5 h-5 mx-auto text-emerald-500" />
                      <span className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider">Passing Score</span>
                      <strong className="block text-base font-extrabold text-slate-900 dark:text-white">
                        {quizData.passingScorePercent || 50}%
                      </strong>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                      <RotateCcw className="w-5 h-5 mx-auto text-purple-500" />
                      <span className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider">Attempts</span>
                      <strong className="block text-base font-extrabold text-slate-900 dark:text-white">
                        Unlimited
                      </strong>
                    </div>
                  </div>

                  {/* INSTRUCTIONS BOX */}
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-2">
                    <h4 className="font-extrabold text-amber-700 dark:text-amber-400 flex items-center">
                      <Sparkles className="w-4 h-4 mr-1.5" /> Important Instructions:
                    </h4>
                    <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                      <li>The timer will start immediately when you click <strong>Start Quiz</strong>.</li>
                      <li>You can navigate between questions freely using Previous / Next buttons.</li>
                      <li>If the timer reaches 00:00, your selected answers will be automatically submitted.</li>
                      <li>You must achieve at least {quizData.passingScorePercent}% to pass the quiz.</li>
                    </ul>
                  </div>

                  {/* START QUIZ BUTTON */}
                  <div className="pt-2 text-center">
                    <button
                      onClick={handleStartQuiz}
                      disabled={startingQuiz}
                      className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-sm shadow-xl shadow-amber-500/25 cursor-pointer transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
                    >
                      {startingQuiz ? 'Initializing Quiz...' : 'Start Quiz →'}
                    </button>
                  </div>
                </div>
              ) : (
                /* ACTIVE QUIZ QUESTIONNAIRE */
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-[11px] font-bold text-amber-500">Quiz Assessment</span>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{quizData.title}</h2>
                      <p className="text-xs text-slate-500">{quizData.questions?.length} Questions • Passing Threshold: {quizData.passingScorePercent}%</p>
                    </div>
                    {quizTimeRemaining !== null && (
                      <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold">
                        ⏱ Timer: {formatVideoTime(quizTimeRemaining)}
                      </div>
                    )}
                  </div>

                  {/* Single Question View with Stepper */}
                  {quizData.questions && quizData.questions.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs font-extrabold text-slate-700 dark:text-slate-300">
                        <span>Question {currentQuestionIdx + 1} of {quizData.questions.length}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[11px]">
                          {Math.round(((currentQuestionIdx + 1) / quizData.questions.length) * 100)}% Completed
                        </span>
                      </div>

                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          {quizData.questions[currentQuestionIdx].questionText}
                        </p>
                        <div className="space-y-2">
                          {quizData.questions[currentQuestionIdx].options?.map((opt, optIdx) => (
                            <label
                              key={optIdx}
                              className={`flex items-center space-x-3 p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                selectedAnswers[currentQuestionIdx] === optIdx
                                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-700 dark:text-amber-300 font-bold'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${currentQuestionIdx}`}
                                checked={selectedAnswers[currentQuestionIdx] === optIdx}
                                onChange={() => setSelectedAnswers({ ...selectedAnswers, [currentQuestionIdx]: optIdx })}
                                className="text-amber-500 cursor-pointer"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between pt-2">
                        <button
                          onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                          disabled={currentQuestionIdx === 0}
                          className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold disabled:opacity-30 cursor-pointer"
                        >
                          Previous Question
                        </button>

                        {currentQuestionIdx < quizData.questions.length - 1 ? (
                          <button
                            onClick={() => setCurrentQuestionIdx(prev => Math.min(quizData.questions.length - 1, prev + 1))}
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                          >
                            Next Question →
                          </button>
                        ) : (
                          <button
                            onClick={submitQuizAnswers}
                            disabled={submittingQuiz}
                            className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 cursor-pointer"
                          >
                            {submittingQuiz ? 'Evaluating...' : 'Submit Quiz'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeItem?.type === 'assignment' ? (
            /* INTEGRATED ASSIGNMENT VIEW */
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-6">
              {!assignmentDetails ? (
                <LoadingSpinner text="Loading assignment requirements..." />
              ) : (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                    <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">Course Project Assignment</span>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{assignmentDetails.title}</h2>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <h4 className="font-bold text-slate-900 dark:text-white">Project Instructions & Requirements:</h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{assignmentDetails.instructions}</p>
                  </div>

                  {/* Submission Form */}
                  <form onSubmit={handleAssignmentSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Select Submission Format (Choose EITHER GitHub OR File Upload)</label>
                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={() => setSubmissionType('github')}
                          className={`flex-1 p-3 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                            submissionType === 'github'
                              ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                          }`}
                        >
                          <Code2 className="w-4 h-4" />
                          <span>Option 1: GitHub Repository Link</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubmissionType('file')}
                          className={`flex-1 p-3 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                            submissionType === 'file'
                              ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                          }`}
                        >
                          <Upload className="w-4 h-4" />
                          <span>Option 2: File Upload</span>
                        </button>
                      </div>
                    </div>

                    {submissionType === 'github' ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          GitHub Repository URL <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="url"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          required
                          placeholder="https://github.com/username/repository"
                          className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-mono"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Upload Assignment File / PDF <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex items-center space-x-3">
                          <label className="cursor-pointer inline-flex items-center px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500">
                            <Upload className="w-4 h-4 mr-1.5" />
                            {uploadingFile ? 'Uploading...' : 'Choose File'}
                            <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploadingFile} />
                          </label>
                          {uploadedFileUrl && <span className="text-xs text-emerald-500 font-mono truncate max-w-xs">{uploadedFileUrl}</span>}
                        </div>
                      </div>
                    )}

                    {existingSubmission && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center text-slate-900 dark:text-white">
                            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" />
                            Assignment Submitted
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            existingSubmission.status === 'reviewed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}>
                            {existingSubmission.status === 'reviewed' ? '✓ Reviewed' : 'Pending Review'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500">
                          Submitted on: {formatDate(existingSubmission.submittedAt)}
                        </p>

                        {existingSubmission.status === 'reviewed' ? (
                          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1.5 mt-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-white">Instructor Grade:</span>
                              <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[11px] bg-purple-600 text-white shadow-sm">
                                {existingSubmission.grade || 'Good'}
                              </span>
                            </div>
                            {existingSubmission.feedback && (
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Instructor Feedback:</span>
                                <p className="text-slate-600 dark:text-slate-300 italic pt-0.5">{existingSubmission.feedback}</p>
                              </div>
                            )}
                            {existingSubmission.reviewedAt && (
                              <p className="text-[10px] text-slate-400 font-mono pt-1">
                                Reviewed on: {formatDate(existingSubmission.reviewedAt)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
                            Grade & Feedback: <strong>Pending instructor review</strong>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-3 flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingAssignment || uploadingFile}
                        className="px-6 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 cursor-pointer"
                      >
                        {submittingAssignment ? 'Submitting...' : existingSubmission ? 'Update Submission' : 'Submit Assignment'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : null}

          {/* FIXED BOTTOM NAVIGATION BAR */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => {
                if (canGoPrev) setActiveItem(allItems[currentIdx - 1]);
              }}
              disabled={!canGoPrev}
              className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </button>

            {/* Mark as Complete (Show ONLY for Video/Content Lessons) */}
            {activeItem?.type === 'lesson' && (() => {
              const isVideoLesson = Boolean(activeItem.videoUrl && activeItem.videoUrl.trim() !== '');
              const isVideoIncomplete = isVideoLesson && !activeStatus.isCompleted && !hasVideoReachedEnd;
              const isBtnDisabled = activeStatus.isCompleted || submittingComplete || isVideoIncomplete;

              return (
                <button
                  onClick={handleMarkComplete}
                  disabled={isBtnDisabled}
                  className={`px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center ${
                    activeStatus.isCompleted
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-default'
                      : isVideoIncomplete
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 cursor-pointer'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {activeStatus.isCompleted
                    ? '✓ Completed'
                    : submittingComplete
                    ? 'Updating...'
                    : isVideoIncomplete
                    ? 'Watch Video to Complete'
                    : 'Mark as Complete'}
                </button>
              );
            })()}

            <button
              onClick={() => {
                if (canGoNext) {
                  setActiveItem(allItems[currentIdx + 1]);
                } else if (currentIdx === allItems.length - 1 && activeStatus.isCompleted) {
                  setActiveItem({ type: 'completed' });
                }
              }}
              disabled={!canGoNext && !(currentIdx === allItems.length - 1 && activeStatus.isCompleted)}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-40 disabled:bg-slate-300 dark:disabled:bg-slate-800 cursor-pointer"
            >
              {currentIdx === allItems.length - 1 && activeStatus.isCompleted ? (
                <>
                  Finish Training <Sparkles className="w-4 h-4 ml-1.5 text-amber-300" />
                </>
              ) : (
                <>
                  Continue Learning <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT SIDEBAR: COURSE CONTENTS / SYLLABUS & RESOURCES */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 flex flex-col justify-between max-h-[85vh] overflow-y-auto space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Course Contents</h3>

              {/* Progress Summary */}
              <div className="space-y-1.5 pt-3">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Progress: {completedCount} / {totalItemsCount} completed</span>
                  <span className="text-blue-600 dark:text-blue-400">{calculatedPercentage}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${calculatedPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Modules & Content Items Tree */}
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              {training.sections?.map((sec, sIdx) => (
                <div key={sec._id || sIdx} className="space-y-2">
                  <h4 className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    MODULE {sIdx + 1}: {sec.title}
                  </h4>

                  <div className="space-y-1">
                    {allItems
                      .filter(item => item.sectionTitle === sec.title && item.type !== 'assignment')
                      .map((item) => {
                        const status = getItemStatus(item);
                        const isCurrent = activeItem && activeItem.id === item.id && activeItem.type === item.type;

                        return (
                          <button
                            key={`${item.type}_${item.id}`}
                            onClick={() => {
                              if (!status.isLocked) setActiveItem(item);
                            }}
                            disabled={status.isLocked}
                            className={`w-full text-left p-3 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                                : status.isCompleted
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                : status.isLocked
                                ? 'bg-slate-100 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 truncate">
                              {status.isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              ) : isCurrent ? (
                                <PlayCircle className="w-4 h-4 text-white flex-shrink-0" />
                              ) : status.isLocked ? (
                                <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              ) : item.type === 'quiz' ? (
                                <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              ) : (
                                <PlayCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              )}
                              <span className="truncate">{item.title}</span>
                            </div>

                            <span className="text-[10px] opacity-75 font-semibold">
                              {status.isCompleted ? '✓' : status.isLocked ? '🔒' : isCurrent ? '▶' : '○'}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}

              {/* DEDICATED ASSIGNMENT AT VERY END OF ALL MODULES */}
              {allItems.find(item => item.type === 'assignment') && (() => {
                const assignmentItem = allItems.find(item => item.type === 'assignment');
                const status = getItemStatus(assignmentItem);
                const isCurrent = activeItem && activeItem.id === assignmentItem.id && activeItem.type === 'assignment';

                return (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                      COURSE ASSIGNMENT
                    </h4>
                    <button
                      key={`${assignmentItem.type}_${assignmentItem.id}`}
                      onClick={() => {
                        if (!status.isLocked) setActiveItem(assignmentItem);
                      }}
                      disabled={status.isLocked}
                      className={`w-full text-left p-3 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-500/20'
                          : status.isCompleted
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : status.isLocked
                          ? 'bg-slate-100 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        {status.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : isCurrent ? (
                          <FileCheck2 className="w-4 h-4 text-white flex-shrink-0" />
                        ) : status.isLocked ? (
                          <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        ) : (
                          <FileCheck2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{assignmentItem.title}</span>
                      </div>

                      <span className="text-[10px] opacity-75 font-semibold">
                        {status.isCompleted ? '✓' : status.isLocked ? '🔒' : isCurrent ? '▶' : '○'}
                      </span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* RESOURCES AT BOTTOM OF SIDEBAR */}
          {allCourseResources.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> RESOURCES
              </h4>
              <div className="space-y-2">
                {allCourseResources.map((res, rIdx) => (
                  <div key={rIdx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{res.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{res.lessonTitle}</p>
                    </div>
                    <a
                      href={formatMediaUrl(res.fileUrl || res.pdfUrl || res.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/20 cursor-pointer inline-flex items-center text-[11px] flex-shrink-0"
                    >
                      <Download className="w-3 h-3 mr-1" /> Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
