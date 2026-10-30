export interface RecordingResult {
  blob: Blob;
  dataUrl: string;
  duration: number;
}

export class VoiceRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private totalPausedDuration: number = 0;

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 
      typeof navigator?.mediaDevices?.getUserMedia === 'function' && 
      typeof window.MediaRecorder === 'function';
  }

  static getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac',
      ''
    ];
    for (const type of types) {
      if (type === '' || MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  async start(): Promise<void> {
    if (!VoiceRecorderService.isSupported()) {
      throw new Error('Voice recording is not supported in this browser.');
    }

    this.audioChunks = [];
    this.totalPausedDuration = 0;
    this.pauseTime = 0;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const mimeType = VoiceRecorderService.getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.startTime = Date.now();
      this.mediaRecorder.start(100); // 100ms slice for smooth recording
    } catch (err) {
      this.cleanup();
      throw err;
    }
  }

  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.pauseTime = Date.now();
    }
  }

  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      if (this.pauseTime > 0) {
        this.totalPausedDuration += Date.now() - this.pauseTime;
      }
      this.mediaRecorder.resume();
    }
  }

  async stop(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        this.cleanup();
        reject(new Error('Recorder is not active.'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const finalBlob = new Blob(this.audioChunks, { type: mimeType });
        const finalDuration = Math.max(1, Math.round((Date.now() - this.startTime - this.totalPausedDuration) / 1000));

        this.cleanup();

        if (finalBlob.size === 0) {
          reject(new Error('Empty audio recording.'));
          return;
        }

        // Convert blob to DataURL so it persists directly and is playable anywhere
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            blob: finalBlob,
            dataUrl: reader.result as string,
            duration: finalDuration,
          });
        };
        reader.onerror = () => {
          reject(new Error('Failed to encode audio.'));
        };
        reader.readAsDataURL(finalBlob);
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    });
  }

  cancel(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}
