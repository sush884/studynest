import { StudyDay, DayVideo, Video } from '../types';

export interface GroupingOptions {
  targetMinutes: number; // e.g. 60
  flexibility: 'strict' | 'flexible'; // flexible allows target ± 10 min (e.g. 50-70m for 60m)
  allowVideoSplitting: boolean; // default false
}

export interface GroupingResult {
  days: StudyDay[];
  totalPlaylistDurationSeconds: number;
  totalPlaylistDurationFormatted: string;
  totalVideosCount: number;
  totalPlannedDays: number;
  averageDailyMinutes: number;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSecs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSecs > 0 ? `${remainingSecs}s` : ''}`.trim();
  }
  return `${remainingSecs}s`;
}

/**
 * Intelligent 1-Hour Grouping Algorithm
 * Groups playlist videos into daily sessions of ~60 minutes while strictly respecting order.
 */
export function groupVideosIntoDays(
  rawVideos: Array<Omit<Video, 'studyPlanId' | 'id'> & { id?: string }>,
  studyPlanId: string,
  options: GroupingOptions
): GroupingResult {
  const targetSeconds = options.targetMinutes * 60;
  
  // Define target bounds based on flexibility
  const marginSeconds = options.flexibility === 'flexible' ? 600 : 300; // 10 min vs 5 min
  const minTargetSeconds = Math.max(900, targetSeconds - marginSeconds); // min 15m
  const maxTargetSeconds = targetSeconds + marginSeconds;

  const days: StudyDay[] = [];
  let dayNumber = 1;

  let currentDayVideos: DayVideo[] = [];
  let currentDayDuration = 0;

  const totalPlaylistDurationSeconds = rawVideos.reduce(
    (sum, v) => sum + v.durationSeconds,
    0
  );

  for (let i = 0; i < rawVideos.length; i++) {
    const rawVideo = rawVideos[i];
    const videoDuration = rawVideo.durationSeconds;
    const computedId = rawVideo.id || rawVideo.youtubeVideoId || `video_${i + 1}`;

    const fullVideo: Video = {
      ...rawVideo,
      id: computedId,
      studyPlanId,
    };

    // Rule 6: If a single video is longer than the target, place it alone in its own day
    if (videoDuration >= targetSeconds + marginSeconds) {
      // If we already had accumulated videos for the current day, finalize that day first!
      if (currentDayVideos.length > 0) {
        const dayId = `day_${studyPlanId}_${dayNumber}`;
        days.push({
          id: dayId,
          studyPlanId,
          dayNumber,
          totalDurationSeconds: currentDayDuration,
          totalDurationFormatted: formatDuration(currentDayDuration),
          status: 'not_started',
          videos: currentDayVideos.map(v => ({ ...v, studyDayId: dayId })),
          isLongSession: false,
        });
        dayNumber++;
        currentDayVideos = [];
        currentDayDuration = 0;
      }

      // Now create a dedicated "Long Session" day for this video
      const longDayId = `day_${studyPlanId}_${dayNumber}`;
      const dayVideoItem: DayVideo = {
        id: `dv_${studyPlanId}_${dayNumber}_${fullVideo.id}`,
        studyDayId: longDayId,
        videoId: fullVideo.id,
        video: fullVideo,
        completed: false,
      };

      days.push({
        id: longDayId,
        studyPlanId,
        dayNumber,
        totalDurationSeconds: videoDuration,
        totalDurationFormatted: formatDuration(videoDuration),
        status: 'not_started',
        videos: [dayVideoItem],
        isLongSession: true,
      });
      dayNumber++;
      continue;
    }

    // Check if adding this video exceeds the max threshold
    const projectDuration = currentDayDuration + videoDuration;

    if (projectDuration <= maxTargetSeconds) {
      // It fits nicely into current day!
      const dayVideoItem: DayVideo = {
        id: `dv_${studyPlanId}_${dayNumber}_${fullVideo.id}`,
        studyDayId: '', // set upon day completion
        videoId: fullVideo.id,
        video: fullVideo,
        completed: false,
      };
      currentDayVideos.push(dayVideoItem);
      currentDayDuration += videoDuration;

      // If we hit close to target or optimal range, or if currentDayDuration >= minTargetSeconds and the NEXT video would push it way over:
      const nextVideo = rawVideos[i + 1];
      if (
        nextVideo &&
        currentDayDuration >= minTargetSeconds &&
        currentDayDuration + nextVideo.durationSeconds > maxTargetSeconds
      ) {
        // Finalize this day
        const dayId = `day_${studyPlanId}_${dayNumber}`;
        days.push({
          id: dayId,
          studyPlanId,
          dayNumber,
          totalDurationSeconds: currentDayDuration,
          totalDurationFormatted: formatDuration(currentDayDuration),
          status: 'not_started',
          videos: currentDayVideos.map(v => ({ ...v, studyDayId: dayId })),
          isLongSession: false,
        });
        dayNumber++;
        currentDayVideos = [];
        currentDayDuration = 0;
      }
    } else {
      // Adding video would exceed max target
      if (currentDayVideos.length > 0) {
        // Finalize current day
        const dayId = `day_${studyPlanId}_${dayNumber}`;
        days.push({
          id: dayId,
          studyPlanId,
          dayNumber,
          totalDurationSeconds: currentDayDuration,
          totalDurationFormatted: formatDuration(currentDayDuration),
          status: 'not_started',
          videos: currentDayVideos.map(v => ({ ...v, studyDayId: dayId })),
          isLongSession: false,
        });
        dayNumber++;
      }

      // Start new day with this video
      const dayVideoItem: DayVideo = {
        id: `dv_${studyPlanId}_${dayNumber}_${fullVideo.id}`,
        studyDayId: '',
        videoId: fullVideo.id,
        video: fullVideo,
        completed: false,
      };
      currentDayVideos = [dayVideoItem];
      currentDayDuration = videoDuration;
    }
  }

  // Finalize remaining day if any
  if (currentDayVideos.length > 0) {
    const dayId = `day_${studyPlanId}_${dayNumber}`;
    days.push({
      id: dayId,
      studyPlanId,
      dayNumber,
      totalDurationSeconds: currentDayDuration,
      totalDurationFormatted: formatDuration(currentDayDuration),
      status: 'not_started',
      videos: currentDayVideos.map(v => ({ ...v, studyDayId: dayId })),
      isLongSession: false,
    });
  }

  const totalPlannedDays = days.length;
  const averageDailyMinutes = totalPlannedDays > 0
    ? Math.round((totalPlaylistDurationSeconds / 60) / totalPlannedDays)
    : 0;

  return {
    days,
    totalPlaylistDurationSeconds,
    totalPlaylistDurationFormatted: formatDuration(totalPlaylistDurationSeconds),
    totalVideosCount: rawVideos.length,
    totalPlannedDays,
    averageDailyMinutes,
  };
}
