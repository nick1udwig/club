import { create } from 'zustand'
import { ServiceApi } from '@dartfrog/puddle';

type ClubState = {
  clubParticipants: ClubParticipants;
  isStreaming: bool,
  isMuted: bool,
  mediaRecorder: MediaRecorder,
  audioContext: AudioContext,
  sourceNode: AudioBufferSourceNode,
};
type ClubParticipants = Record<string, bool>;

export interface ClubStore {
  clubState: ClubState;
  setClubParticipants: (newClubParticipants: ClubParticipants) => void;
  sendParticipant: (isJoin: bool, api: ServiceApi) => void;
  sendAudio: (audio: UInt8Array, api: ServiceApi) => void;
  handleUpdate: (update: any) => void;
  get: () => ClubParticipants;
  set: (partial: ClubParticipants | Partial<ClubParticipants>) => void;
}

const useClubStore = create<ClubStore>((set, get) => ({
  clubState: {
    clubParticipants: new Set(),
    isStreaming: false,
    isMuted: true,
    mediaRecorder: null,
    audioContext: new AudioContext(),
    sourceNode: null,
  },
  setClubParticipants: (newClubParticipants) => set(state => ({
    clubState: { ...state.clubParticipants: ...newClubParticipants }
  })),
  setIsStreaming: (newIsStreaming) => set(state => ({
    clubState: { ...state.isStreaming: ...newIsStreaming }
  })),
  setIsMuted: (newIsMuted) => set(state => ({
    clubState: { ...state.isMuted: ...newIsMuted }
  })),
  setMediaRecorder: (newMediaRecorder) => set(state => ({
    clubState: { ...state.mediaRecorder: ...newMediaRecorder }
  })),
  setAudioContext: (newAudioContext) => set(state => ({
    clubState: { ...state.audioContext: ...newAudioContext }
  })),
  setSourceNode: (newSourceNode) => set(state => ({
    clubState: { ...state.sourceNode: ...newSourceNode }
  })),
  sendParticipant: (isJoin: bool, api: ServiceApi) => {
    let req = {
      "Club": {"Participant": isJoin}
    };
    api.sendToService(req);
  },
  sendAudio: (audio: UInt8Array, api: ServiceApi) => {
    let req = {
      "Club": {"Audio": audio}
    };
    api.sendToService(req);
  },
  handleUpdate: (update) => {
    if (update && typeof update === 'object') {
      if ('Participants' in update) {
        set({ clubParticipants: update.Participants as ClubParticipants });
      } else if ('Participant' in update) {
        clubParticipants.add(update.Participant);
      } else if ('Audio' in update) {
        const audioData = new Uint8Array(update.Audio);
        const audioBuffer = await audioContext.decodeAudioData(audioData.buffer);
        if (sourceNode) sourceNode.disconnect();
        const newSourceNode = audioContext.createBufferSource();
        newSourceNode.buffer = audioBuffer;
        newSourceNode.connect(audioContext.destination);
        newSourceNode.start();
        setSourceNode(newSourceNode);
      }
    }
  },
  get,
  set,
}));

export default useClubStore;
