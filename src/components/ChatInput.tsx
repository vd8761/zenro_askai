'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Mic, Square, Sparkles, Loader2, X } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  isStreaming: boolean;
  onStopStreaming: () => void;
  language?: string;
  orgTitle?: string;
}

export default function ChatInput({
  onSendMessage,
  isLoading,
  isStreaming,
  onStopStreaming,
  language = 'auto',
  orgTitle,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [audioLevels, setAudioLevels] = useState<number[]>([10, 14, 20, 16, 24, 18, 22, 14, 10]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Format seconds to mm:ss
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Stop recording timer when recording stops
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  const cleanupAudio = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Microphone access is not supported by your browser.');
        return;
      }

      setLiveTranscript('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 1. Web Audio API Analyser for real-time waveform bars
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.5;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateWave = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            const bands = [2, 4, 6, 8, 10, 12, 14, 16, 18];
            const levels = bands.map(b => {
              const val = dataArray[b] || 0;
              return Math.max(6, Math.min(28, Math.round((val / 255) * 28)));
            });
            setAudioLevels(levels);
            animFrameRef.current = requestAnimationFrame(updateWave);
          };
          updateWave();
        }
      } catch (audioErr) {
        console.warn('Web Audio API wave analysis unavailable:', audioErr);
      }

      // 2. Real-time interim speech recognition for live visual feedback
      try {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          if (language === 'ta') rec.lang = 'ta-IN';
          else if (language === 'hi') rec.lang = 'hi-IN';
          else rec.lang = 'en-US';

          rec.onresult = (event: any) => {
            let currentText = '';
            for (let i = 0; i < event.results.length; i++) {
              currentText += event.results[i][0].transcript;
            }
            if (currentText.trim()) {
              setLiveTranscript(currentText.trim());
            }
          };
          rec.onerror = () => {};
          rec.start();
          recognitionRef.current = rec;
        }
      } catch {}

      // 3. MediaRecorder for high-accuracy Whisper audio capture
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });

        cleanupAudio();

        if (audioBlob.size > 500) {
          await transcribeAudioWithAi(audioBlob);
        }
      };

      recorder.start(100);
      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      alert('Could not access microphone. Please allow microphone permissions in your browser.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const cancelVoiceRecording = () => {
    cleanupAudio();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null; // Suppress transcription trigger
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setLiveTranscript('');
  };

  const transcribeAudioWithAi = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice_query.webm');
      formData.append('language', language);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.text) {
        const text = data.text.trim();
        setInput(prev => (prev ? `${prev} ${text}` : text));
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      } else {
        console.warn('Transcription returned error:', data.error);
        alert(data.error || 'Audio transcription could not be completed.');
      }
    } catch (err: any) {
      console.error('Transcription network error:', err);
      alert('Could not reach transcription service. Please check connectivity.');
    } finally {
      setIsTranscribing(false);
      setLiveTranscript('');
    }
  };

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollH, 140)}px`;
      textareaRef.current.style.overflowY = scrollH > 140 ? 'auto' : 'hidden';
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isRecording) {
      stopVoiceRecording();
      return;
    }
    const text = input.trim();
    if (!text || isLoading) return;

    onSendMessage(text);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const displayOrg = orgTitle || 'Zenro Payroll';

  return (
    <div className="chat-input-wrapper">
      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className={`input-box-container ${isRecording ? 'recording-active' : ''}`}>
          {isRecording ? (
            <div className="voice-recording-panel">
              <div className="recording-status-chip">
                <span className="rec-pulse-dot" />
                <span className="rec-timer">{formatTimer(recordingSeconds)}</span>
              </div>

              {/* Real-time Dynamic Waveform Equalizer */}
              <div className="audio-wave-visualizer" title="Listening to your microphone...">
                {audioLevels.map((h, i) => (
                  <span
                    key={i}
                    className="wave-bar"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>

              {/* Real-time Live Transcript Preview */}
              <div className="live-transcript-box">
                {liveTranscript ? (
                  <span className="interim-text">“{liveTranscript}”</span>
                ) : (
                  <span className="listening-hint">
                    {language === 'ta'
                      ? 'பேசுங்கள்... கேட்கிறது'
                      : language === 'hi'
                      ? 'बोलिए... सुन रहे हैं'
                      : 'Listening... speak your query'}
                  </span>
                )}
              </div>
            </div>
          ) : isTranscribing ? (
            <div className="voice-transcribing-panel">
              <Loader2 size={16} className="spin text-blue" />
              <span className="transcribing-shimmer">Transcribing voice with AI...</span>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                language === 'ta'
                  ? 'ஊழியர் சம்பளம், விடுப்பு, லோன் பற்றி எதையும் கேட்கலாம்...'
                  : language === 'hi'
                  ? 'वेतन, छुट्टी, लोन या उपस्थिति के बारे में कुछ भी पूछें...'
                  : 'Ask anything about payroll, salaries, attendance, loans, or leaves in any language...'
              }
              rows={1}
              disabled={isLoading || isStreaming}
              className="chat-textarea"
            />
          )}

          <div className="input-toolbar">
            {isRecording && (
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="voice-cancel-btn"
                title="Cancel recording"
              >
                <X size={15} />
              </button>
            )}

            {/* AI Speech-to-Text Microphone / Stop Button */}
            <button
              type="button"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              disabled={isTranscribing || isLoading}
              className={`mic-btn ${isRecording ? 'recording-active' : ''} ${isTranscribing ? 'transcribing' : ''}`}
              title={
                isRecording
                  ? 'Click to STOP recording and process'
                  : isTranscribing
                  ? 'Transcribing audio...'
                  : 'Speak your query (AI voice input)'
              }
            >
              {isTranscribing ? (
                <Loader2 size={16} className="spin-loader" />
              ) : isRecording ? (
                <Square size={13} fill="currentColor" strokeWidth={0} />
              ) : (
                <Mic size={16} />
              )}
            </button>

            {!isRecording && (
              isStreaming ? (
                <button
                  type="button"
                  onClick={onStopStreaming}
                  className="stop-stream-btn"
                  title="Stop response generation"
                >
                  <Square size={14} className="stop-icon" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="send-btn"
                  title="Send message"
                >
                  <ArrowUp size={16} />
                </button>
              )
            )}
          </div>
        </div>
      </form>

      <div className="chat-input-footer">
        <Sparkles size={11} className="footer-sparkle" />
        <span>Zenro Ask AI · Multilingual Payroll & HR Intelligence for {displayOrg}</span>
      </div>
    </div>
  );
}
