import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  addDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { CallSession } from '../types';

export const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class WebRTCService {
  public peerConnection: RTCPeerConnection | null = null;
  public localStream: MediaStream | null = null;
  public remoteStream: MediaStream | null = null;
  private callId: string | null = null;
  private unsubscribeCall: (() => void) | null = null;
  private unsubscribeCandidates: (() => void) | null = null;

  async startCall(
    caller: { uid: string; displayName: string; photoURL?: string },
    receiver: { uid: string; displayName: string; photoURL?: string },
    type: 'audio' | 'video',
    onRemoteStream: (stream: MediaStream) => void
  ): Promise<string> {
    try {
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
      this.remoteStream = new MediaStream();
      onRemoteStream(this.remoteStream);

      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });

      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      this.peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          if (this.remoteStream) {
            this.remoteStream.addTrack(track);
          }
        });
      };

      const callDocRef = doc(collection(db, 'calls'));
      this.callId = callDocRef.id;

      // ICE candidates
      const candidatesCollection = collection(db, 'calls', this.callId, 'candidates');
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(candidatesCollection, {
            ...event.candidate.toJSON(),
            senderId: caller.uid,
          }).catch(() => {});
        }
      };

      // Create Offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      const callData: CallSession = {
        id: this.callId,
        callerId: caller.uid,
        callerName: caller.displayName,
        callerPhotoURL: caller.photoURL || '',
        receiverId: receiver.uid,
        receiverName: receiver.displayName,
        receiverPhotoURL: receiver.photoURL || '',
        type,
        status: 'calling',
        offer: JSON.stringify(offer),
        createdAt: new Date().toISOString(),
      };

      await setDoc(callDocRef, callData);

      // Listen for Answer
      this.unsubscribeCall = onSnapshot(callDocRef, (snapshot) => {
        const data = snapshot.data() as CallSession | undefined;
        if (!data) return;

        if (data.status === 'ongoing' && data.answer && this.peerConnection?.signalingState !== 'stable') {
          const answerDesc = new RTCSessionDescription(JSON.parse(data.answer));
          this.peerConnection?.setRemoteDescription(answerDesc).catch(console.error);
        } else if (data.status === 'ended' || data.status === 'declined') {
          this.hangUp();
        }
      });

      // Listen for remote ICE candidates
      this.unsubscribeCandidates = onSnapshot(candidatesCollection, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.senderId !== caller.uid && this.peerConnection) {
              const candidate = new RTCIceCandidate(data);
              this.peerConnection.addIceCandidate(candidate).catch(() => {});
            }
          }
        });
      });

      return this.callId;
    } catch (err) {
      this.hangUp();
      throw err;
    }
  }

  async answerCall(
    callSession: CallSession,
    onRemoteStream: (stream: MediaStream) => void
  ): Promise<void> {
    try {
      this.callId = callSession.id;
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
      this.remoteStream = new MediaStream();
      onRemoteStream(this.remoteStream);

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callSession.type === 'video',
      });

      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      this.peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          if (this.remoteStream) {
            this.remoteStream.addTrack(track);
          }
        });
      };

      const candidatesCollection = collection(db, 'calls', this.callId, 'candidates');
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(candidatesCollection, {
            ...event.candidate.toJSON(),
            senderId: callSession.receiverId,
          }).catch(() => {});
        }
      };

      if (!callSession.offer) {
        throw new Error('Call offer is missing');
      }

      const offerDesc = new RTCSessionDescription(JSON.parse(callSession.offer));
      await this.peerConnection.setRemoteDescription(offerDesc);

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      await updateDoc(doc(db, 'calls', this.callId), {
        answer: JSON.stringify(answer),
        status: 'ongoing',
      });

      // Listen for remote candidates
      this.unsubscribeCandidates = onSnapshot(candidatesCollection, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.senderId !== callSession.receiverId && this.peerConnection) {
              const candidate = new RTCIceCandidate(data);
              this.peerConnection.addIceCandidate(candidate).catch(() => {});
            }
          }
        });
      });

      // Listen to status changes
      this.unsubscribeCall = onSnapshot(doc(db, 'calls', this.callId), (snapshot) => {
        const data = snapshot.data() as CallSession | undefined;
        if (data && (data.status === 'ended' || data.status === 'declined')) {
          this.hangUp();
        }
      });
    } catch (err) {
      this.hangUp();
      throw err;
    }
  }

  async declineCall(callId: string) {
    try {
      await updateDoc(doc(db, 'calls', callId), {
        status: 'declined',
        endedAt: new Date().toISOString(),
      });
    } catch {}
    this.hangUp();
  }

  async endCurrentCall() {
    if (this.callId) {
      try {
        await updateDoc(doc(db, 'calls', this.callId), {
          status: 'ended',
          endedAt: new Date().toISOString(),
        });
      } catch {}
    }
    this.hangUp();
  }

  hangUp() {
    if (this.unsubscribeCall) {
      this.unsubscribeCall();
      this.unsubscribeCall = null;
    }
    if (this.unsubscribeCandidates) {
      this.unsubscribeCandidates();
      this.unsubscribeCandidates = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.callId = null;
  }
}

export const subscribeToIncomingCalls = (
  userId: string,
  onIncomingCall: (call: CallSession | null) => void
) => {
  try {
    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', userId)
    );

    return onSnapshot(q, (snapshot) => {
      let activeCallingSession: CallSession | null = null;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CallSession;
        if (data.status === 'calling') {
          activeCallingSession = data;
        }
      });
      onIncomingCall(activeCallingSession);
    });
  } catch {
    return () => {};
  }
};
