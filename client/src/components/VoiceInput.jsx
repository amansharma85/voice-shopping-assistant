import React, { useState, useEffect, useRef } from 'react';

const LANGS = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'hi-IN', label: 'Hindi (India)' },
  { code: 'es-ES', label: 'Spanish' },
];

const VoiceInput = ({ onCommandRecognized }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lang, setLang] = useState('en-US');
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in this browser.');
      return;
    }

    // We recreate recognition when lang changes so recognition.lang uses latest lang
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) finalTranscript += res[0].transcript;
        else interimTranscript += res[0].transcript;
      }
      if (finalTranscript) {
        setTranscript(finalTranscript.trim());
        setInterim('');
        // pass both speech and the selected language to parent
        onCommandRecognized && onCommandRecognized(finalTranscript.trim(), lang);
      } else {
        setInterim(interimTranscript.trim());
      }
    };

    recognition.onerror = (e) => {
      console.error('Speech recognition error', e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch (e) {}
      recognitionRef.current = null;
    };
  }, [onCommandRecognized, lang]);

  const handleStart = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not available in this browser.');
      return;
    }
    setTranscript('');
    setInterim('');
    setIsListening(true);
    try {
      recognitionRef.current.lang = lang;
      recognitionRef.current.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const handleStop = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className="voice-input" aria-live="polite">
      <div className="voice-controls">
        <label className="lang-label" htmlFor="lang-select">Language</label>
        <select
          id="lang-select"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="lang-select"
          aria-label="Select language"
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>

        <button
          className={`btn ${isListening ? 'btn-stop' : 'btn-start'}`}
          onClick={isListening ? handleStop : handleStart}
          aria-pressed={isListening}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
      </div>

      <div className="transcripts">
        <p><strong>Recognized:</strong> {transcript || (interim ? interim : '—')}</p>
      </div>
    </div>
  );
};

export default VoiceInput;
