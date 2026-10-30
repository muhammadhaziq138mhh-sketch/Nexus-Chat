import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, Send, Pause, Play } from 'lucide-react';
import { VoiceRecorderService, RecordingResult } from '../services/voiceService';

interface VoiceRecorderProps {
  onSendVoice: (result: RecordingResult) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoice, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [previewResult, setPreviewResult] = useState<RecordingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<VoiceRecorderService | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    recorderRef.current = new VoiceRecorderService();
    startRecording();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.cancel();
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      await recorderRef.current?.start();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      timerRef.current = window.setInterval(() => {
        setDuration((prev) => {
          if (prev >= 60) {
            handleStopAndPreview();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Microphone access denied or unsupported.');
    }
  };

  const togglePause = () => {
    if (!recorderRef.current) return;
    if (isPaused) {
      recorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      recorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleStopAndPreview = async () => {
    if (!recorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const result = await recorderRef.current.stop();
      setIsRecording(false);
      setPreviewResult(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to finish recording.');
    }
  };

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.cancel();
    onCancel();
  };

  const handleSend = () => {
    if (previewResult) {
      onSendVoice(previewResult);
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl w-full">
        <span className="text-xs text-rose-600 dark:text-rose-400 font-medium truncate">{error}</span>
        <button
          onClick={handleCancel}
          className="text-xs text-rose-700 dark:text-rose-300 font-semibold hover:underline"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-2.5 bg-slate-900 text-white rounded-2xl shadow-lg w-full animate-in fade-in zoom-in-95 duration-200">
      {/* Trash / Cancel */}
      <button
        onClick={handleCancel}
        className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
        title="Discard recording"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Recording indicator & timer */}
      {!previewResult ? (
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-rose-500 animate-pulse'}`} />
            <span className="text-sm font-semibold tracking-wider font-mono">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Sound waves animation */}
          {!isPaused && (
            <div className="flex items-center gap-1 h-5 overflow-hidden">
              <span className="w-0.5 bg-rose-500 rounded-full animate-wave-1" />
              <span className="w-0.5 bg-rose-500 rounded-full animate-wave-2" />
              <span className="w-0.5 bg-rose-500 rounded-full animate-wave-3" />
              <span className="w-0.5 bg-rose-500 rounded-full animate-wave-4" />
              <span className="w-0.5 bg-rose-500 rounded-full animate-wave-5" />
            </div>
          )}
          {isPaused && (
            <span className="text-xs text-amber-400 font-medium">Paused</span>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xs text-emerald-400 font-medium">Voice note ready ({previewResult.duration}s)</span>
          <audio src={previewResult.dataUrl} controls className="h-7 w-48" />
        </div>
      )}

      {/* Controls */}
      {!previewResult ? (
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Pause / Resume */}
          <button
            onClick={togglePause}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 ml-0.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Stop / Preview */}
          <button
            onClick={handleStopAndPreview}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            title="Done recording"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleSend}
          className="px-3.5 py-1.5 rounded-full flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs shadow-md transition-all active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          Send
        </button>
      )}
    </div>
  );
};
