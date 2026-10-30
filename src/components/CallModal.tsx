import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Shield } from 'lucide-react';
import { CallSession } from '../types';
import { WebRTCService } from '../services/webrtcService';

interface CallModalProps {
  callSession: CallSession;
  isIncoming: boolean;
  onClose: () => void;
  webrtcService: WebRTCService;
}

export const CallModal: React.FC<CallModalProps> = ({
  callSession,
  isIncoming,
  onClose,
  webrtcService,
}) => {
  const [callStatus, setCallStatus] = useState<string>(callSession.status);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState<boolean>(false);
  const [remoteStreamReady, setRemoteStreamReady] = useState<boolean>(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setCallStatus(callSession.status);

    if (callSession.status === 'ongoing' && !timerRef.current) {
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }

    if (callSession.status === 'ended' || callSession.status === 'declined') {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(onClose, 800);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callSession.status]);

  // Connect media streams to video elements
  useEffect(() => {
    if (webrtcService.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = webrtcService.localStream;
    }
  }, [webrtcService.localStream]);

  const handleAccept = async () => {
    try {
      setCallStatus('ongoing');
      await webrtcService.answerCall(callSession, (remoteStream) => {
        setRemoteStreamReady(true);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });
      // Start duration timer
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to answer call:', err);
      handleEndCall();
    }
  };

  const handleDecline = async () => {
    await webrtcService.declineCall(callSession.id);
    onClose();
  };

  const handleEndCall = async () => {
    await webrtcService.endCurrentCall();
    onClose();
  };

  const toggleMute = () => {
    if (webrtcService.localStream) {
      const audioTracks = webrtcService.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!audioTracks[0]?.enabled);
    }
  };

  const toggleVideo = () => {
    if (webrtcService.localStream) {
      const videoTracks = webrtcService.localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoDisabled(!videoTracks[0]?.enabled);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const otherUserName = isIncoming ? callSession.callerName : callSession.receiverName;
  const otherUserPhoto = isIncoming ? callSession.callerPhotoURL : callSession.receiverPhotoURL;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center">
        {/* Top Header info */}
        <div className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-800/60 z-10">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
              Nexus Secure {callSession.type === 'video' ? 'Video' : 'Audio'} Call
            </span>
          </div>
          <span className="text-xs font-mono text-indigo-400 bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-800/40">
            {callStatus === 'ongoing' ? formatTimer(duration) : callStatus.toUpperCase()}
          </span>
        </div>

        {/* Video / Visualizer Body */}
        <div className="w-full relative h-80 sm:h-96 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 overflow-hidden">
          {callSession.type === 'video' ? (
            <>
              {/* Remote Video Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${callStatus === 'ongoing' ? 'block' : 'hidden'}`}
              />

              {/* Local PiP Video Stream */}
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute top-4 right-4 w-28 h-36 sm:w-32 sm:h-44 object-cover rounded-2xl border-2 border-indigo-500 shadow-xl z-20 bg-slate-800"
              />

              {callStatus !== 'ongoing' && (
                <div className="flex flex-col items-center gap-4 text-center p-6 z-10">
                  <div className="relative">
                    <img
                      src={otherUserPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUserName}`}
                      alt={otherUserName}
                      className="w-24 h-24 rounded-full border-4 border-indigo-500/40 object-cover shadow-2xl"
                    />
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-30" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{otherUserName}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {isIncoming ? 'Incoming video call...' : 'Calling peer...'}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Audio Call Screen */
            <div className="flex flex-col items-center gap-4 text-center p-6 z-10">
              <div className="relative">
                <img
                  src={otherUserPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUserName}`}
                  alt={otherUserName}
                  className="w-28 h-28 rounded-full border-4 border-indigo-500/40 object-cover shadow-2xl"
                />
                {callStatus === 'ongoing' ? (
                  <div className="absolute -inset-2 rounded-full border-2 border-emerald-400/60 animate-pulse" />
                ) : (
                  <div className="absolute -inset-2 rounded-full border-2 border-indigo-400 animate-ping opacity-30" />
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">{otherUserName}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {callStatus === 'ongoing'
                    ? 'Connected (Encrypted Audio)'
                    : isIncoming
                    ? 'Incoming voice call...'
                    : 'Calling peer...'}
                </p>
              </div>

              {/* Sound wave visualizer for audio calls */}
              {callStatus === 'ongoing' && (
                <div className="flex items-center gap-1.5 h-6 mt-2">
                  <span className="w-1 bg-indigo-500 rounded-full animate-wave-1" />
                  <span className="w-1 bg-indigo-400 rounded-full animate-wave-2" />
                  <span className="w-1 bg-emerald-400 rounded-full animate-wave-3" />
                  <span className="w-1 bg-indigo-400 rounded-full animate-wave-4" />
                  <span className="w-1 bg-indigo-500 rounded-full animate-wave-5" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="w-full p-6 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-5 z-20">
          {isIncoming && callStatus === 'calling' ? (
            /* Incoming Call Controls (Accept / Decline) */
            <div className="flex items-center gap-8">
              <button
                onClick={handleDecline}
                className="w-14 h-14 rounded-full flex flex-col items-center justify-center bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-transform active:scale-95"
                title="Decline"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              <button
                onClick={handleAccept}
                className="w-14 h-14 rounded-full flex flex-col items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-transform active:scale-95 animate-bounce"
                title="Accept"
              >
                <Phone className="w-6 h-6" />
              </button>
            </div>
          ) : (
            /* Ongoing / Outgoing Call Controls */
            <div className="flex items-center gap-4">
              {/* Mic Toggle */}
              <button
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isMuted ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Video Toggle (if video call) */}
              {callSession.type === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isVideoDisabled ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                  title={isVideoDisabled ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}

              {/* End Call Button */}
              <button
                onClick={handleEndCall}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-transform active:scale-95"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
