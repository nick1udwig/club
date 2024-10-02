import React, { useEffect, useState } from 'react';
import useClickerStore from '../store/store';
import { useServiceStore } from '@dartfrog/puddle';

const ClickerPluginBox: React.FC = () => {
  const { clickMap, sendClick } = useClickerStore();
  const { api, serviceId } = useServiceStore();
  const [sortedClicks, setSortedClicks] = useState<Array<{ id: string, count: number }>>([]);

  useEffect(() => {
    const sorted = Object.entries(clickMap)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count);
    setSortedClicks(sorted);
  }, [clickMap]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        padding: '1rem',
      }}
    >
      <button
        onClick={() => sendClick(api)}
        style={{
          marginBottom: '1rem',
          padding: '0.5rem 1rem',
          fontSize: '1rem',
          cursor: 'pointer'
        }}
      >
        Click Me!
      </button>
      <div style={{ overflowY: 'auto' }}>
        {sortedClicks.map(({ id, count }) => (
          <div key={id} style={{ marginBottom: '0.5rem' }}>
            <strong>{id || 'Anonymous'}:</strong> {count} {count === 1 ? 'click' : 'clicks'}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClickerPluginBox;




import React, { useState, useEffect } from 'react';
import useClubStore from '../store/store';
import { useServiceStore } from '@dartfrog/puddle';

const AudioStreamer = () => {
  const {
    clubState,
    setClubParticipants,
    setIsStreaming,
    setIsMuted,
    setMediaRecorder,
    setAudioContext,
    setSourceNode,
    sendParticipant,
    sendAudio,
  } = useClubStore();
  //const [isStreaming, setIsStreaming] = useState(false);
  //const [isMuted, setIsMuted] = useState(true);
  ////const [webSocket, setWebSocket] = useState(null);
  //const [mediaRecorder, setMediaRecorder] = useState(null);
  //const [audioContext] = useState(new AudioContext());
  //const [sourceNode, setSourceNode] = useState(null);

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      //if (webSocket) {
      //  webSocket.close();
      //}
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    };
  }, [mediaRecorder]);

  const startStreaming = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm' };
      const newMediaRecorder = new MediaRecorder(stream, options);
      setMediaRecorder(newMediaRecorder);

      const newWebSocket = new WebSocket('ws://yourserver.com/path');
      newWebSocket.binaryType = 'arraybuffer'; // Set to receive binary data
      newWebSocket.onopen = () => console.log("WebSocket connection established");

      //newWebSocket.onmessage = async (event) => {
      //  const audioData = new Uint8Array(event.data);
      //  const audioBuffer = await audioContext.decodeAudioData(audioData.buffer);
      //  if (sourceNode) sourceNode.disconnect();
      //  const newSourceNode = audioContext.createBufferSource();
      //  newSourceNode.buffer = audioBuffer;
      //  newSourceNode.connect(audioContext.destination);
      //  newSourceNode.start();
      //  setSourceNode(newSourceNode);
      //};

      newMediaRecorder.ondataavailable = async (event) => {
        const audioBlob = await event.data.arrayBuffer();
        const isEmpty = new Uint8Array(audioBlob).every(element => element === 0);
        if !isEmpty {
          sendAudio(audioBlob);
        }
      };

      newMediaRecorder.start(100); // Start recording, generate data every 100ms
      console.log("Recording started");
      setIsStreaming(true);
      //setWebSocket(newWebSocket);
    } catch (error) {
      console.error('Error accessing the microphone', error);
    }
  };

  const stopStreaming = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (webSocket) {
      webSocket.close();
    }
    console.log("Streaming stopped");
    setIsStreaming(false);
  };

  const toggleMute = () => {
    if (mediaRecorder) {
      if (isMuted) {
        mediaRecorder.resume();
        console.log("Microphone unmuted");
      } else {
        mediaRecorder.pause();
        console.log("Microphone muted");
      }
      setIsMuted(!isMuted);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        padding: '1rem',
      }}
    >
      {!isStreaming ? (
        <button onClick={startStreaming} style={{ marginBottom: '1rem' }}>
          Start Streaming
        </button>
      ) : (
        <button onClick={stopStreaming} style={{ marginBottom: '1rem' }}>
          Stop Streaming
        </button>
      )}
      <button onClick={toggleMute} style={{ marginBottom: '1rem' }}>
        {isMuted ? 'Unmute' : 'Mute'}
      </button>
      <div style={{ overflowY: 'auto' }}>
        {[..clubState.clubParticipants].map(id => (
          <div key={id} style={{ marginBottom: '0.5rem' }}>
            <strong>{id || 'Anonymous'}:</strong> {count} {count === 1 ? 'click' : 'clicks'}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AudioStreamer;

