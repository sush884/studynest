import React, { useState } from 'react';
import {
  X,
  Play,
  Sparkles,
  Clock,
  Sliders,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { api } from '../../services/api';
import { StudyPlan, YouTubePlaylistMeta } from '../../types';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanCreated: (plan: StudyPlan) => void;
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  isOpen,
  onClose,
  onPlanCreated,
}) => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState(60);
  const [customMinutes, setCustomMinutes] = useState('60');
  const [flexibility, setFlexibility] = useState<'strict' | 'flexible'>('flexible');
  const [allowVideoSplitting, setAllowVideoSplitting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzedMeta, setAnalyzedMeta] = useState<YouTubePlaylistMeta | null>(null);

  if (!isOpen) return null;

  const handleSelectDemo = async (demoKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const meta = await api.analyzePlaylist('', demoKey);
      setAnalyzedMeta(meta);
      setPlaylistUrl(`https://www.youtube.com/playlist?list=${meta.playlistId}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to load demo playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistUrl.trim() && !analyzedMeta) {
      setError('Please enter a YouTube playlist URL or choose a demo.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const meta = await api.analyzePlaylist(playlistUrl);
      setAnalyzedMeta(meta);
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!analyzedMeta) return;

    setLoading(true);
    setError(null);
    try {
      const target = dailyTargetMinutes === 0 ? Number(customMinutes) || 60 : dailyTargetMinutes;
      const plan = await api.createStudyPlan({
        title: analyzedMeta.title,
        description: analyzedMeta.description,
        playlistUrl: playlistUrl || `https://www.youtube.com/playlist?list=${analyzedMeta.playlistId}`,
        playlistId: analyzedMeta.playlistId,
        channelTitle: analyzedMeta.channelTitle,
        thumbnailUrl: analyzedMeta.thumbnailUrl,
        dailyTargetMinutes: target,
        flexibility,
        allowVideoSplitting,
        videos: analyzedMeta.videos,
      });

      onPlanCreated(plan);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to generate study plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white border border-pink-200 rounded-3xl shadow-xl overflow-hidden relative text-slate-800 my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-pink-100 flex items-center justify-between bg-white/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-amber-400 flex items-center justify-center text-white shadow-xs">
              <Play className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Create 1-Hour Study Plan</h2>
              <p className="text-xs text-slate-500 font-medium">Paste playlist URL or choose a demo to start</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-4 rounded-2xl bg-pink-100 border border-pink-300 text-pink-800 text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-pink-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Pickers */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
              Try Preset Demo Playlists
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectDemo('python_warriors')}
                className="p-3 rounded-2xl bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200 text-left transition-all flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center text-lg shrink-0">
                  🐍
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 group-hover:text-pink-600 transition-colors">Python Masterclass</p>
                  <p className="text-[11px] text-slate-600 font-medium">12 videos • ~14h total</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemo('react_mastery')}
                className="p-3 rounded-2xl bg-pink-50/80 hover:bg-pink-100/80 border border-pink-200 text-left transition-all flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-pink-200/80 text-pink-800 flex items-center justify-center text-lg shrink-0">
                  ⚛️
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 group-hover:text-pink-600 transition-colors">React 19 Bootcamp</p>
                  <p className="text-[11px] text-slate-600 font-medium">10 videos • ~12h total</p>
                </div>
              </button>
            </div>
          </div>

          {/* URL Input Form */}
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                YouTube Playlist URL or ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=PL-osiE80TeTskrap..."
                  className="flex-1 px-4 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 font-medium"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-pink-50 hover:bg-pink-100 text-slate-800 text-xs font-extrabold rounded-xl border border-pink-200 transition-colors shrink-0 flex items-center gap-2 shadow-2xs"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin text-pink-600" /> : 'Analyze'}
                </button>
              </div>
            </div>
          </form>

          {/* Settings Section */}
          <div className="p-4 rounded-2xl bg-pink-50/30 border border-pink-200 space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-2 flex items-center justify-between">
                <span>Daily Study Target</span>
                <span className="text-pink-700 font-black">{dailyTargetMinutes === 0 ? `${customMinutes}m` : `${dailyTargetMinutes} minutes`}</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[30, 45, 60, 90, 0].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDailyTargetMinutes(m)}
                    className={`py-2 rounded-xl text-xs font-black transition-all ${
                      dailyTargetMinutes === m
                        ? 'bg-pink-500 text-white shadow-2xs'
                        : 'bg-white border border-pink-200 hover:bg-pink-50 text-slate-700'
                    }`}
                  >
                    {m === 0 ? 'Custom' : `${m}m`}
                  </button>
                ))}
              </div>

              {dailyTargetMinutes === 0 && (
                <div className="mt-3">
                  <input
                    type="number"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    placeholder="Enter minutes per day (e.g. 50)"
                    className="w-full px-4 py-2 bg-white border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500 font-bold"
                  />
                </div>
              )}
            </div>

            {/* Daily Flexibility */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-2">
                Daily Schedule Flexibility
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFlexibility('flexible')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    flexibility === 'flexible'
                      ? 'bg-pink-100/80 border-pink-300 text-pink-900 shadow-2xs font-bold'
                      : 'bg-white border-pink-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <p className="text-xs font-black text-slate-900">Flexible (Recommended)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Target ±10m range (50m - 70m for 60m target)</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFlexibility('strict')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    flexibility === 'strict'
                      ? 'bg-pink-100/80 border-pink-300 text-pink-900 shadow-2xs font-bold'
                      : 'bg-white border-pink-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <p className="text-xs font-black text-slate-900">Strict</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Strict cutoffs (Target ±5m range)</p>
                </button>
              </div>
            </div>

            {/* Video Splitting Rule */}
            <div className="pt-2 border-t border-pink-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-800">Allow video splitting</p>
                <p className="text-[11px] text-slate-500 font-medium">Keep disabled to watch videos in full (Rule 4)</p>
              </div>
              <input
                type="checkbox"
                checked={allowVideoSplitting}
                onChange={(e) => setAllowVideoSplitting(e.target.checked)}
                className="w-4 h-4 rounded text-pink-500 focus:ring-pink-500 accent-pink-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Analyzed Result Summary & Video List Preview */}
          {analyzedMeta && (
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-300 space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={analyzedMeta.thumbnailUrl}
                  alt={analyzedMeta.title}
                  className="w-16 h-12 object-cover rounded-xl border border-emerald-200 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-slate-900 truncate">{analyzedMeta.title}</h4>
                  <p className="text-xs text-slate-600 font-medium">{analyzedMeta.channelTitle}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200 text-center">
                <div className="p-2 rounded-xl bg-white border border-emerald-100">
                  <p className="text-[10px] text-slate-500 font-extrabold">Videos Found</p>
                  <p className="text-xs font-black text-slate-900">{analyzedMeta.totalVideos} videos</p>
                </div>
                <div className="p-2 rounded-xl bg-white border border-emerald-100">
                  <p className="text-[10px] text-amber-800 font-extrabold">Total Duration</p>
                  <p className="text-xs font-black text-amber-900">
                    {Math.floor(analyzedMeta.videos.reduce((s, v) => s + v.durationSeconds, 0) / 3600)}h{' '}
                    {Math.round((analyzedMeta.videos.reduce((s, v) => s + v.durationSeconds, 0) % 3600) / 60)}m
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-white border border-emerald-100">
                  <p className="text-[10px] text-emerald-800 font-extrabold">Estimated Days</p>
                  <p className="text-xs font-black text-emerald-800">
                    ~{Math.ceil((analyzedMeta.videos.reduce((s, v) => s + v.durationSeconds, 0) / 60) / (dailyTargetMinutes || 60))} days
                  </p>
                </div>
              </div>

              {/* Scrollable Playlist Preview */}
              <div className="space-y-1.5 pt-2 border-t border-emerald-200">
                <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Playlist Videos Preview ({analyzedMeta.videos.length})
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {analyzedMeta.videos.map((vid, idx) => (
                    <div
                      key={vid.youtubeVideoId || idx}
                      className="p-2 rounded-xl bg-white border border-emerald-100 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800 truncate">{vid.title}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 shrink-0">{vid.durationFormatted}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-pink-100 bg-white flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-slate-700 text-xs font-extrabold transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleGeneratePlan}
            disabled={!analyzedMeta || loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 text-white text-xs font-black shadow-xs flex items-center gap-2 transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Generate 1-Hour Plan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
