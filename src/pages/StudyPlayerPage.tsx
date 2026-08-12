import React, { useState, useEffect } from 'react';
import { StudyPlan, StudyDay, DayVideo, Note, PracticeQuestion } from '../types';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import {
  Play,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  Brain,
  Sparkles,
  Send,
  MessageSquare,
  HelpCircle,
  Lightbulb,
  Check,
  RotateCcw,
  Clock,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';

interface StudyPlayerPageProps {
  plan: StudyPlan;
  day: StudyDay;
  initialVideoIndex?: number;
  onBackToDashboard: () => void;
  onPlanUpdated: () => void;
}

export const StudyPlayerPage: React.FC<StudyPlayerPageProps> = ({
  plan,
  day,
  initialVideoIndex = 0,
  onBackToDashboard,
  onPlanUpdated,
}) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialVideoIndex);
  const [activeTab, setActiveTab] = useState<'notes' | 'practice' | 'ai_doubt' | 'ai_summary'>('notes');

  // Notes State
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedSuccess, setNoteSavedSuccess] = useState(false);

  // Practice Questions
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
  const [visibleSolutions, setVisibleSolutions] = useState<Record<string, boolean>>({});

  // AI Doubt State
  const [doubtQuestion, setDoubtQuestion] = useState('');
  const [doubtMessages, setDoubtMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    {
      role: 'ai',
      text: `Hello! I'm your StudyFlow AI Tutor. Ask me any doubt about today's topic (${day.videos[0]?.video.title || 'Lesson'}).`,
    },
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // AI Summary State
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const currentVideoItem: DayVideo | undefined = day.videos[currentVideoIndex];

  useEffect(() => {
    // Fetch practice questions
    api.getPracticeQuestions().then(setPracticeQuestions).catch(console.error);

    // Fetch existing note for this video if available
    api.getNotes().then((notes) => {
      const existing = notes.find((n) => n.videoId === currentVideoItem?.videoId || n.dayNumber === day.dayNumber);
      if (existing) {
        setNoteContent(existing.content);
      } else {
        setNoteContent(`### Notes for ${currentVideoItem?.video.title || `Day ${day.dayNumber}`}\n- Key takeaway 1:\n- Key takeaway 2:`);
      }
    });
  }, [currentVideoIndex, day]);

  const handleToggleVideoComplete = async (vItem: DayVideo) => {
    try {
      const isCompleteNow = !vItem.completed;
      vItem.completed = isCompleteNow;
      await api.markVideoComplete(vItem.video.id || vItem.videoId, plan.id, isCompleteNow);

      if (isCompleteNow) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      }
      onPlanUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleDayComplete = async () => {
    try {
      const isCompleteNow = day.status !== 'completed';
      await api.markDayComplete(day.id, isCompleteNow);

      if (isCompleteNow) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
      onPlanUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      await api.createNote({
        videoTitle: currentVideoItem?.video.title,
        dayNumber: day.dayNumber,
        content: noteContent,
        studyPlanId: plan.id,
        videoId: currentVideoItem?.videoId,
      });
      setNoteSavedSuccess(true);
      setTimeout(() => setNoteSavedSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doubtQuestion.trim() || isAiLoading) return;

    const userQ = doubtQuestion.trim();
    setDoubtQuestion('');
    setDoubtMessages((prev) => [...prev, { role: 'user', text: userQ }]);
    setIsAiLoading(true);

    try {
      const res = await api.askAIDoubt(userQ, currentVideoItem?.video.title || plan.title);
      setDoubtMessages((prev) => [...prev, { role: 'ai', text: res.answer }]);
    } catch (err: any) {
      setDoubtMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Sorry, I hit an error answering your doubt. Please try again.' },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const titles = day.videos.map((v) => v.video.title);
      const res = await api.getAISummary(titles, day.dayNumber);
      setAiSummaryText(res.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/80 via-amber-50/50 to-emerald-50/80 text-slate-900 flex flex-col font-sans">
      {/* Top Bar */}
      <div className="h-14 border-b border-pink-100 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-slate-700 transition-colors flex items-center gap-1 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4 text-pink-600" />
            <span>Back to Dashboard</span>
          </button>
          <div className="h-4 w-px bg-pink-200"></div>
          <div>
            <h1 className="text-xs font-extrabold text-slate-900 truncate max-w-xs">{plan.title}</h1>
            <p className="text-[10px] text-slate-500 font-medium">Day {day.dayNumber} Session ({day.totalDurationFormatted})</p>
          </div>
        </div>

        <button
          onClick={handleToggleDayComplete}
          className={`px-4 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all ${
            day.status === 'completed'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>{day.status === 'completed' ? '✓ Day Completed' : 'Mark Day Complete'}</span>
        </button>
      </div>

      {/* Main Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Left Column: Video Player & Helper Tabs (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* YouTube Video Embed */}
          <div className="bg-white/95 border border-pink-200/90 rounded-2xl overflow-hidden shadow-sm">
            <div className="aspect-video bg-black relative">
              {currentVideoItem ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${currentVideoItem.video.youtubeVideoId}?autoplay=1&rel=0&enablejsapi=1`}
                  title={currentVideoItem.video.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                  No video selected
                </div>
              )}
            </div>

            {/* Video Controls Bar */}
            <div className="p-4 bg-white flex flex-wrap items-center justify-between gap-3 border-t border-pink-100">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-pink-100 text-pink-700 px-2 py-0.5 rounded border border-pink-200">
                    Playing in StudyNest
                  </span>
                  {currentVideoItem?.video.youtubeVideoId && (
                    <a
                      href={`https://www.youtube.com/watch?v=${currentVideoItem.video.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-pink-600 hover:text-pink-800 inline-flex items-center gap-1 transition-colors ml-auto sm:ml-0"
                      title="Open video on YouTube.com"
                    >
                      <span>Watch on YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <h2 className="text-sm font-extrabold text-slate-900 line-clamp-1 mt-1">
                  {currentVideoItem?.video.title || 'Select a video'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Video {currentVideoIndex + 1} of {day.videos.length} • {currentVideoItem?.video.durationFormatted}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentVideoIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentVideoIndex === 0}
                  className="p-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 disabled:opacity-40 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-pink-600" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {currentVideoItem && (
                  <button
                    onClick={() => handleToggleVideoComplete(currentVideoItem)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                      currentVideoItem.completed
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-pink-500 hover:bg-pink-600 text-white shadow-xs'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{currentVideoItem.completed ? 'Completed' : 'Mark Watched'}</span>
                  </button>
                )}

                <button
                  onClick={() => setCurrentVideoIndex((prev) => Math.min(day.videos.length - 1, prev + 1))}
                  disabled={currentVideoIndex === day.videos.length - 1}
                  className="p-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 disabled:opacity-40 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4 text-pink-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Helper Tabs Section */}
          <div className="bg-white/95 border border-pink-200/90 rounded-2xl p-5 shadow-sm">
            {/* Tab Nav Buttons */}
            <div className="flex border-b border-pink-100 pb-3 gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                  activeTab === 'notes'
                    ? 'bg-pink-100 text-pink-800 border border-pink-300 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-pink-50'
                }`}
              >
                <FileText className="w-4 h-4 text-pink-600" />
                <span>My Notes</span>
              </button>

              <button
                onClick={() => setActiveTab('practice')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                  activeTab === 'practice'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-emerald-50'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <span>Practice Questions</span>
              </button>

              <button
                onClick={() => setActiveTab('ai_doubt')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                  activeTab === 'ai_doubt'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-amber-50'
                }`}
              >
                <Brain className="w-4 h-4 text-amber-600" />
                <span>AI Doubt Assistant</span>
              </button>

              <button
                onClick={() => setActiveTab('ai_summary')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                  activeTab === 'ai_summary'
                    ? 'bg-pink-100 text-pink-800 border border-pink-300 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-pink-50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-pink-600" />
                <span>AI Session Recap</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="pt-4">
              {/* TAB 1: Notes */}
              {activeTab === 'notes' && (
                <div className="space-y-3">
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={6}
                    placeholder="Write key code snippets, formulas, or notes here..."
                    className="w-full p-3.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-colors"
                  ></textarea>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">Markdown syntax supported</span>
                    <button
                      onClick={handleSaveNote}
                      disabled={isSavingNote}
                      className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                    >
                      {noteSavedSuccess ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <span>Save Note</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Practice Questions */}
              {activeTab === 'practice' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-900">Daily Practice Question Bank</h3>
                    <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                      CS / Python Practice
                    </span>
                  </div>

                  {practiceQuestions.map((q) => (
                    <div key={q.id} className="p-4 rounded-xl bg-pink-50/30 border border-pink-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{q.topic}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            q.difficulty === 'easy'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : q.difficulty === 'medium'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-pink-100 text-pink-800 border border-pink-200'
                          }`}
                        >
                          {q.difficulty}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-800">{q.question}</p>

                      {q.codeSnippet && (
                        <pre className="p-2.5 rounded-lg bg-slate-900 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                          {q.codeSnippet}
                        </pre>
                      )}

                      <div className="pt-2 flex items-center justify-between">
                        <p className="text-[11px] text-amber-800 font-medium italic">💡 Hint: {q.hint}</p>
                        <button
                          onClick={() =>
                            setVisibleSolutions((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                          }
                          className="text-xs font-extrabold text-pink-600 hover:text-pink-700 underline"
                        >
                          {visibleSolutions[q.id] ? 'Hide Solution' : 'Show Solution'}
                        </button>
                      </div>

                      {visibleSolutions[q.id] && (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs font-mono text-slate-800 mt-2 whitespace-pre-wrap">
                          {q.solution}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: AI Doubt Assistant */}
              {activeTab === 'ai_doubt' && (
                <div className="space-y-3">
                  <div className="h-48 overflow-y-auto p-3 rounded-xl bg-pink-50/40 border border-pink-200 space-y-3">
                    {doubtMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-2.5 text-xs ${
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] p-3 rounded-2xl leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-pink-500 text-white rounded-br-none shadow-2xs font-medium'
                              : 'bg-white border border-pink-200 text-slate-800 rounded-bl-none shadow-2xs font-medium'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isAiLoading && (
                      <div className="text-xs text-amber-700 animate-pulse font-bold italic">
                        AI Tutor is thinking...
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAskAi} className="flex gap-2">
                    <input
                      type="text"
                      value={doubtQuestion}
                      onChange={(e) => setDoubtQuestion(e.target.value)}
                      placeholder="Ask any doubt (e.g., What is the difference between list and tuple?)"
                      className="flex-1 px-3.5 py-2.5 bg-white border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={isAiLoading}
                      className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-amber-500/30"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Ask AI</span>
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 4: AI Session Recap */}
              {activeTab === 'ai_summary' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900">AI Instant Revision Summary</h3>
                      <p className="text-[11px] text-slate-500">Summarizes today's video lessons into key revision points.</p>
                    </div>

                    <button
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span>{isGeneratingSummary ? 'Generating...' : 'Generate Summary'}</span>
                    </button>
                  </div>

                  {aiSummaryText ? (
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-slate-800 space-y-2 whitespace-pre-wrap leading-relaxed font-sans">
                      {aiSummaryText}
                    </div>
                  ) : (
                    <div className="p-8 text-center rounded-xl bg-pink-50/30 border border-dashed border-pink-200">
                      <Sparkles className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-medium">Click "Generate Summary" to get an AI summary of today's videos.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Today's Playlist Checklist (1 col) */}
        <div className="space-y-4">
          <div className="bg-white/95 border border-pink-200/90 rounded-2xl p-5 shadow-sm sticky top-20">
            <div className="flex items-center justify-between pb-4 border-b border-pink-100 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Today's Session</h3>
                <p className="text-xs text-slate-500">Day {day.dayNumber} Roadmap</p>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-pink-700 bg-pink-100 px-3 py-1 rounded-full border border-pink-200">
                <Clock className="w-3.5 h-3.5 text-pink-600" />
                <span>{day.totalDurationFormatted}</span>
              </div>
            </div>

            {/* Video Checklist Items */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {day.videos.map((vItem, idx) => {
                const isSelected = idx === currentVideoIndex;
                return (
                  <div
                    key={vItem.id || idx}
                    onClick={() => setCurrentVideoIndex(idx)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-pink-100/90 border-pink-300 text-slate-900 shadow-2xs font-bold'
                        : 'bg-pink-50/30 border-pink-100 hover:bg-pink-50 text-slate-700'
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVideoComplete(vItem);
                      }}
                      className="mt-0.5"
                    >
                      {vItem.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100 shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-pink-300 hover:border-pink-500 shrink-0"></div>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-snug line-clamp-2 ${vItem.completed ? 'line-through text-slate-400' : ''}`}>
                        {vItem.video.title}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                        <span>{vItem.video.durationFormatted}</span>
                        {isSelected && <span className="text-pink-600 font-extrabold">Now Playing ▶</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
