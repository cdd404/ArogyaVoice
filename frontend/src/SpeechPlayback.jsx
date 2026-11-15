import React, { useEffect, useRef, useState } from 'react';
import './speech-playback.css';

const LABELS = {
  en: { controls: 'Speech playback controls', play: 'Play', pause: 'Pause', resume: 'Resume', restart: 'Restart', stop: 'Stop', again: 'Play again', generating: 'Generating audio...', playing: 'Playing', paused: 'Paused', stopped: 'Stopped', completed: 'Playback completed', error: 'Audio could not be prepared. Please try again.', autoplayBlocked: 'Audio is ready. Select Play to begin.', playTip: 'Play this response', pauseTip: 'Pause speech', resumeTip: 'Continue from the paused point', restartTip: 'Restart from the beginning', stopTip: 'Stop and clear playback' },
  kn: { controls: 'ಧ್ವನಿ ಪ್ಲೇಬ್ಯಾಕ್ ನಿಯಂತ್ರಣಗಳು', play: 'ಪ್ಲೇ', pause: 'ವಿರಾಮ', resume: 'ಮುಂದುವರಿಸಿ', restart: 'ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಿ', stop: 'ನಿಲ್ಲಿಸಿ', again: 'ಮತ್ತೆ ಪ್ಲೇ ಮಾಡಿ', generating: 'ಧ್ವನಿ ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ...', playing: 'ಪ್ಲೇ ಆಗುತ್ತಿದೆ', paused: 'ವಿರಾಮಗೊಳಿಸಲಾಗಿದೆ', stopped: 'ನಿಲ್ಲಿಸಲಾಗಿದೆ', completed: 'ಪ್ಲೇಬ್ಯಾಕ್ ಪೂರ್ಣಗೊಂಡಿದೆ', error: 'ಧ್ವನಿ ಸಿದ್ಧಪಡಿಸಲಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.', autoplayBlocked: 'ಧ್ವನಿ ಸಿದ್ಧವಾಗಿದೆ. ಪ್ರಾರಂಭಿಸಲು ಪ್ಲೇ ಒತ್ತಿ.', playTip: 'ಈ ಉತ್ತರವನ್ನು ಧ್ವನಿಯಾಗಿ ಕೇಳಿ', pauseTip: 'ಧ್ವನಿಯನ್ನು ವಿರಾಮಗೊಳಿಸಿ', resumeTip: 'ವಿರಾಮಗೊಂಡ ಸ್ಥಳದಿಂದ ಮುಂದುವರಿಸಿ', restartTip: 'ಆರಂಭದಿಂದ ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಿ', stopTip: 'ಧ್ವನಿಯನ್ನು ನಿಲ್ಲಿಸಿ' },
  hi: { controls: 'ऑडियो चलाने के नियंत्रण', play: 'चलाएँ', pause: 'रोकें', resume: 'फिर से शुरू करें', restart: 'शुरुआत से चलाएँ', stop: 'बंद करें', again: 'फिर से चलाएँ', generating: 'ऑडियो तैयार किया जा रहा है...', playing: 'चल रहा है', paused: 'रुका हुआ है', stopped: 'बंद किया गया', completed: 'प्लेबैक पूरा हुआ', error: 'ऑडियो तैयार नहीं हो सका। कृपया फिर कोशिश करें।', autoplayBlocked: 'ऑडियो तैयार है। शुरू करने के लिए चलाएँ चुनें।', playTip: 'इस जवाब को सुनें', pauseTip: 'ऑडियो रोकें', resumeTip: 'जहाँ रुका था वहाँ से जारी रखें', restartTip: 'शुरुआत से चलाएँ', stopTip: 'ऑडियो बंद करें' },
  te: { controls: 'ఆడియో ప్లేబ్యాక్ నియంత్రణలు', play: 'ప్లే చేయండి', pause: 'పాజ్ చేయండి', resume: 'కొనసాగించండి', restart: 'మళ్లీ ప్రారంభించండి', stop: 'ఆపివేయండి', again: 'మళ్లీ ప్లే చేయండి', generating: 'ఆడియో సిద్ధమవుతోంది...', playing: 'ప్లే అవుతోంది', paused: 'పాజ్ చేయబడింది', stopped: 'ఆపివేయబడింది', completed: 'ప్లేబ్యాక్ పూర్తయింది', error: 'ఆడియో సిద్ధం కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.', autoplayBlocked: 'ఆడియో సిద్ధంగా ఉంది. ప్రారంభించడానికి ప్లే ఎంచుకోండి.', playTip: 'ఈ సమాధానాన్ని వినండి', pauseTip: 'ఆడియోను పాజ్ చేయండి', resumeTip: 'ఆగిన చోటు నుంచి కొనసాగించండి', restartTip: 'మొదటి నుంచి ప్రారంభించండి', stopTip: 'ఆడియోను ఆపి స్థానాన్ని క్లియర్ చేయండి' },
};

export function splitSentences(text, language) {
  if (typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter(language, { granularity: 'sentence' }).segment(text)]
      .map(({ segment }) => segment).filter((segment) => segment.trim());
  }
  return text.match(/[^.!?।॥]+[.!?।॥]*/gu)?.map((part) => part).filter((part) => part.trim()) || [text];
}

export default function SpeechPlayback({ text, language = 'en', apiBase, audioBlob = null, autoPlay = false }) {
  const labels = LABELS[language] || LABELS.en;
  const sentences = splitSentences(text, language);
  const audioRef = useRef(null);
  const urlsRef = useRef([]);
  const abortRef = useRef(null);
  const generationRef = useRef(0);
  const statusRef = useRef('idle');
  const activeRef = useRef(null);
  const sentenceRefs = useRef([]);
  const [status, setStatus] = useState('idle');
  const [activeSentence, setActiveSentence] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const previousPropsRef = useRef({ text, language });

  function setPlayerStatus(next) { statusRef.current = next; setStatus(next); }

  function clearUrls() {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
  }

  function silenceElement() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }

  function stopPlayback(clearResources = false) {
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    silenceElement();
    if (clearResources) clearUrls();
    activeRef.current = null;
    setActiveSentence(null);
    setErrorMessage('');
    setPlayerStatus('stopped');
  }

  async function playSentence(index) {
    const audio = audioRef.current;
    const url = urlsRef.current[index];
    if (!audio || !url) return;
    activeRef.current = index;
    setActiveSentence(index);
    audio.src = url;
    audio.currentTime = 0;
    setPlayerStatus('playing');
    try { await audio.play(); }
    catch {
      setErrorMessage(labels.autoplayBlocked);
      setPlayerStatus('error');
    }
  }

  useEffect(() => {
    if (!audioBlob) return undefined;
    clearUrls();
    urlsRef.current = [URL.createObjectURL(audioBlob)];
    if (autoPlay) {
      window.dispatchEvent(new Event('arogya:cancel-speech'));
      void playSentence(0);
    }
    return () => {
      silenceElement();
      clearUrls();
    };
  }, [audioBlob]);

  async function generateAndPlay() {
    const generation = ++generationRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setErrorMessage('');
    setActiveSentence(null);
    setPlayerStatus('generating');
    const generatedUrls = [];
    try {
      for (const sentence of sentences) {
        const response = await fetch(`${apiBase}/voice/tts`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language, text: sentence.trim() }), signal: controller.signal,
        });
        if (!response.ok) throw new Error('speech-generation-failed');
        generatedUrls.push(URL.createObjectURL(await response.blob()));
        if (generation !== generationRef.current) {
          generatedUrls.forEach((url) => URL.revokeObjectURL(url));
          return;
        }
      }
      if (generation !== generationRef.current) {
        generatedUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      clearUrls();
      urlsRef.current = generatedUrls;
      abortRef.current = null;
      await playSentence(0);
    } catch (error) {
      generatedUrls.forEach((url) => URL.revokeObjectURL(url));
      if (generation !== generationRef.current || error.name === 'AbortError') return;
      abortRef.current = null;
      setErrorMessage(labels.error);
      setPlayerStatus('error');
    }
  }

  function play() {
    if (statusRef.current === 'playing' || statusRef.current === 'generating') return;
    if (statusRef.current === 'paused') {
      const audio = audioRef.current;
      if (!audio) return;
      audio.play().then(() => setPlayerStatus('playing')).catch(() => {
        setErrorMessage(labels.error); setPlayerStatus('error');
      });
      return;
    }
    window.dispatchEvent(new Event('arogya:cancel-speech'));
    if (audioBlob && urlsRef.current.length) void playSentence(0);
    else if (urlsRef.current.length === sentences.length && urlsRef.current.length) void playSentence(0);
    else void generateAndPlay();
  }

  function pause() {
    if (statusRef.current !== 'playing') return;
    audioRef.current?.pause();
    setPlayerStatus('paused');
  }

  function restart() {
    if ((audioBlob && urlsRef.current.length) || (urlsRef.current.length === sentences.length && urlsRef.current.length)) void playSentence(0);
    else {
      if (statusRef.current === 'generating') abortRef.current?.abort();
      void generateAndPlay();
    }
  }

  function handleEnded() {
    const next = (activeRef.current ?? -1) + 1;
    if (next < urlsRef.current.length) void playSentence(next);
    else {
      activeRef.current = null;
      setActiveSentence(null);
      setPlayerStatus('completed');
    }
  }

  function handleTimeUpdate(event) {
    if (!audioBlob || !Number.isFinite(event.currentTarget.duration) || event.currentTarget.duration <= 0) return;
    const sentenceWeights = sentences.map((sentence) => Math.max(1, sentence.trim().length));
    const totalWeight = sentenceWeights.reduce((sum, weight) => sum + weight, 0);
    const progress = event.currentTarget.currentTime / event.currentTarget.duration;
    let accumulated = 0;
    const sentenceIndex = sentenceWeights.findIndex((weight) => {
      accumulated += weight;
      return progress <= accumulated / totalWeight;
    });
    setActiveSentence(Math.max(0, sentenceIndex));
  }

  function handleAudioError() {
    setErrorMessage(labels.error);
    setPlayerStatus('error');
    setActiveSentence(null);
  }

  useEffect(() => {
    const onCancel = () => {
      if (['generating', 'playing', 'paused'].includes(statusRef.current)) stopPlayback(true);
    };
    window.addEventListener('arogya:cancel-speech', onCancel);
    return () => window.removeEventListener('arogya:cancel-speech', onCancel);
  });

  useEffect(() => {
    if (activeSentence !== null) sentenceRefs.current[activeSentence]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeSentence]);

  useEffect(() => {
    if (previousPropsRef.current.text !== text || previousPropsRef.current.language !== language) {
      previousPropsRef.current = { text, language };
      stopPlayback(true);
    }
  }, [text, language]);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      abortRef.current?.abort();
      silenceElement();
      clearUrls();
    };
  }, [text, language]);

  let statusText = '';
  if (status === 'generating') statusText = labels.generating;
  if (status === 'playing') statusText = labels.playing;
  if (status === 'paused') statusText = labels.paused;
  if (status === 'stopped') statusText = labels.stopped;
  if (status === 'completed') statusText = labels.completed;
  if (status === 'error') statusText = errorMessage || labels.error;

  return <div className="speech-playback" lang={language}>
    <div className="speech-text" aria-label={text}>
      {sentences.map((sentence, index) => <span
        className={'speech-sentence' + (activeSentence === index ? ' speech-sentence-active' : '')}
        aria-current={activeSentence === index ? 'true' : undefined}
        key={`${index}-${sentence}`}
        ref={(element) => { sentenceRefs.current[index] = element; }}
      >{sentence}</span>)}
    </div>
    <div className="speech-toolbar" role="group" aria-label={labels.controls}>
      {status === 'playing' ? <button type="button" onClick={pause} title={labels.pauseTip} aria-label={labels.pause}><span aria-hidden="true">Ⅱ</span><b>{labels.pause}</b></button> :
        status === 'paused' ? <button type="button" onClick={play} title={labels.resumeTip} aria-label={labels.resume}><span aria-hidden="true">▶</span><b>{labels.resume}</b></button> :
          <button type="button" onClick={play} disabled={status === 'generating' || !text.trim()} title={labels.playTip} aria-label={status === 'completed' ? labels.again : labels.play}><span aria-hidden="true">▶</span><b>{status === 'completed' ? labels.again : labels.play}</b></button>}
      {(status === 'playing' || status === 'paused' || status === 'completed' || status === 'generating') && <>
        <button type="button" onClick={restart} disabled={status === 'generating'} title={labels.restartTip} aria-label={labels.restart}><span aria-hidden="true">↻</span><b>{labels.restart}</b></button>
        <button type="button" onClick={() => stopPlayback()} title={labels.stopTip} aria-label={labels.stop}><span aria-hidden="true">■</span><b>{labels.stop}</b></button>
      </>}
      {status === 'generating' && <span className="speech-spinner" aria-hidden="true"/>}
      <span className={'speech-status speech-status-' + status} role="status" aria-live="polite">{statusText}</span>
    </div>
    <audio ref={audioRef} onEnded={handleEnded} onError={handleAudioError} onTimeUpdate={handleTimeUpdate} preload="none" aria-hidden="true" tabIndex={-1} />
  </div>;
}
