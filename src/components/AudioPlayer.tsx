import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, FastForward } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, duration = 0 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const cycleSpeed = () => {
    if (!audioRef.current) return;
    const speeds = [1, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
    audioRef.current.playbackRate = nextSpeed;
    setPlaybackRate(nextSpeed);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 w-full max-w-sm">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all active:scale-95 shrink-0"
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Waveform / Seeker */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="flex items-center gap-1 h-5 overflow-hidden">
          {/* Decorative Telegram/WhatsApp-style waveform bars */}
          {[12, 18, 24, 14, 28, 20, 16, 26, 12, 22, 18, 28, 14, 20, 12].map((height, i) => {
            const barProgress = (i / 15) * (totalDuration || 1);
            const isPassed = currentTime >= barProgress;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-colors ${
                  isPassed ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300 dark:bg-slate-600'
                }`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        {/* Range Seeker */}
        <input
          type="range"
          min="0"
          max={totalDuration || 1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />

        <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration || duration)}</span>
        </div>
      </div>

      {/* Speed Button */}
      <button
        onClick={cycleSpeed}
        className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-300 dark:hover:bg-slate-600 px-2 py-1 rounded-md transition-colors shrink-0"
        title="Playback speed"
      >
        {playbackRate}x
      </button>
    </div>
  );
};
