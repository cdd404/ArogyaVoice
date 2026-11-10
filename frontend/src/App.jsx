import { useEffect, useRef, useState } from 'react';
import { createSession, touchSession } from './firebase.js';
import './style.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const languageOptions = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
];

const words = {
  en: {
    welcome: 'Care starts with a conversation', welcomeSub: 'Arogya Voice can help you understand a sensible next step.',
    name: 'Patient name', phone: 'Phone number', card: 'Ayushman card number', continue: 'Continue',
    demoWarning: 'Prototype fields only. Use demo details; do not enter your real phone or Ayushman number.',
    languageTitle: 'Choose your preferred language', languageSub: 'We’ll use this language for your conversation and voice replies.',
    hello: 'Hello', assistant: 'Arogya assistant', role: 'AI health guide', newChat: 'New conversation', today: 'YOUR CARE SPACE',
    greeting: 'I’m here to listen. Tell me what’s bothering you, and I’ll help you think through a safe next step.',
    inputHint: 'Write what you’re feeling…', send: 'Send', voice: 'Voice mode', text: 'Text mode', record: 'Speak your concern', stop: 'Stop recording', recording: 'Listening… tap to finish',
    processing: 'Preparing a careful reply…', safety: 'Arogya Voice is an AI prototype, not a doctor. It cannot diagnose or prescribe. For severe or rapidly worsening symptoms, contact local emergency services now.',
    privacy: 'Your messages go to the AI service to generate replies. The app saves only session ID, language, and timestamps in Firebase; it does not save chat text or audio.',
    error: 'I couldn’t get a reply just now. Please try again in a moment.', audioError: 'Your text reply is ready, but voice playback is unavailable right now.',
    session: 'Private session', connection: 'Secure connection', emergency: 'Need urgent help?',
    welcomeLabel: 'WELCOME TO AROGYA VOICE', chooseLabel: 'A LITTLE ABOUT YOU', chatLabel: 'YOUR CONVERSATION', back: 'Back',
  },
  kn: {
    welcome: 'ಆರೈಕೆ ಮಾತುಕತೆಯಿಂದ ಆರಂಭವಾಗುತ್ತದೆ', welcomeSub: 'ಮುಂದಿನ ಸುರಕ್ಷಿತ ಹೆಜ್ಜೆಯನ್ನು ತಿಳಿಯಲು ಆರೋಗ್ಯ ವಾಯ್ಸ್ ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
    name: 'ರೋಗಿಯ ಹೆಸರು', phone: 'ಫೋನ್ ಸಂಖ್ಯೆ', card: 'ಆಯುಷ್ಮಾನ್ ಕಾರ್ಡ್ ಸಂಖ್ಯೆ', continue: 'ಮುಂದುವರಿಸಿ',
    demoWarning: 'ಇದು ಮಾದರಿ ನಮೂನೆ. ನಕಲಿ ವಿವರಗಳನ್ನು ಬಳಸಿ; ನಿಜವಾದ ಫೋನ್ ಅಥವಾ ಆಯುಷ್ಮಾನ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಬೇಡಿ.',
    languageTitle: 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ', languageSub: 'ಮಾತುಕತೆ ಮತ್ತು ಧ್ವನಿ ಉತ್ತರಗಳಿಗೆ ಈ ಭಾಷೆಯನ್ನು ಬಳಸುತ್ತೇವೆ.',
    hello: 'ನಮಸ್ಕಾರ', assistant: 'ಆರೋಗ್ಯ ಸಹಾಯಕ', role: 'AI ಆರೋಗ್ಯ ಮಾರ್ಗದರ್ಶಿ', newChat: 'ಹೊಸ ಮಾತುಕತೆ', today: 'ನಿಮ್ಮ ಆರೈಕೆ ಸ್ಥಳ',
    greeting: 'ನಿಮ್ಮ ಮಾತು ಕೇಳಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ. ನಿಮಗೆ ಏನು ತೊಂದರೆ ಎಂದು ಹೇಳಿ; ಸುರಕ್ಷಿತ ಮುಂದಿನ ಹೆಜ್ಜೆ ಯೋಚಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.',
    inputHint: 'ನಿಮಗೆ ಹೇಗಿದೆ ಎಂದು ಬರೆಯಿರಿ…', send: 'ಕಳುಹಿಸಿ', voice: 'ಧ್ವನಿ ವಿಧಾನ', text: 'ಪಠ್ಯ ವಿಧಾನ', record: 'ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಹೇಳಿ', stop: 'ರೆಕಾರ್ಡಿಂಗ್ ನಿಲ್ಲಿಸಿ', recording: 'ಕೇಳುತ್ತಿದ್ದೇನೆ… ಮುಗಿಸಲು ಒತ್ತಿರಿ',
    processing: 'ಜಾಗರೂಕ ಉತ್ತರ ಸಿದ್ಧವಾಗುತ್ತಿದೆ…', safety: 'ಆರೋಗ್ಯ ವಾಯ್ಸ್ ವೈದ್ಯರಲ್ಲ; ಇದು AI ಮಾದರಿ. ರೋಗನಿರ್ಣಯ ಅಥವಾ ಔಷಧ ಸೂಚನೆ ನೀಡುವುದಿಲ್ಲ. ತೀವ್ರ ಅಥವಾ ಬೇಗ ಹದಗೆಡುವ ಲಕ್ಷಣಗಳಿದ್ದರೆ ತಕ್ಷಣ ಸ್ಥಳೀಯ ತುರ್ತು ಸೇವೆಗಳನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    privacy: 'ಉತ್ತರ ರಚಿಸಲು ನಿಮ್ಮ ಸಂದೇಶಗಳು AI ಸೇವೆಗೆ ಹೋಗುತ್ತವೆ. Firebase ನಲ್ಲಿ ಸೆಷನ್ ID, ಭಾಷೆ ಮತ್ತು ಸಮಯದ ವಿವರಗಳು ಮಾತ್ರ ಉಳಿಯುತ್ತವೆ; ಚಾಟ್ ಪಠ್ಯ ಅಥವಾ ಧ್ವನಿ ಉಳಿಯುವುದಿಲ್ಲ.',
    error: 'ಈಗ ಉತ್ತರ ಪಡೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಸ್ವಲ್ಪ ಹೊತ್ತಿನ ಬಳಿಕ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.', audioError: 'ಪಠ್ಯ ಉತ್ತರ ಸಿದ್ಧವಾಗಿದೆ, ಆದರೆ ಈಗ ಧ್ವನಿ ಪ್ಲೇ ಆಗುತ್ತಿಲ್ಲ.',
    session: 'ಖಾಸಗಿ ಸೆಷನ್', connection: 'ಸುರಕ್ಷಿತ ಸಂಪರ್ಕ', emergency: 'ತುರ್ತು ಸಹಾಯ ಬೇಕೇ?',
    welcomeLabel: 'ಆರೋಗ್ಯ ವಾಯ್ಸ್‌ಗೆ ಸ್ವಾಗತ', chooseLabel: 'ನಿಮ್ಮ ಬಗ್ಗೆ ಸ್ವಲ್ಪ', chatLabel: 'ನಿಮ್ಮ ಮಾತುಕತೆ', back: 'ಹಿಂದೆ',
  },
  te: {
    welcome: 'మాటతోనే ఆరోగ్య సంరక్షణ మొదలు', welcomeSub: 'తర్వాతి సురక్షిత అడుగు తెలుసుకోవడానికి ఆరోగ్య వాయిస్ సహాయపడుతుంది.',
    name: 'రోగి పేరు', phone: 'ఫోన్ నంబర్', card: 'ఆయుష్మాన్ కార్డ్ నంబర్', continue: 'కొనసాగించండి',
    demoWarning: 'ఇది నమూనా ఫారమ్ మాత్రమే. డెమో వివరాలు వాడండి; నిజమైన ఫోన్ లేదా ఆయుష్మాన్ నంబర్ ఇవ్వకండి.',
    languageTitle: 'మీకు నచ్చిన భాషను ఎంచుకోండి', languageSub: 'సంభాషణ మరియు వాయిస్ సమాధానాలకు ఇదే భాష వాడతాం.',
    hello: 'నమస్కారం', assistant: 'ఆరోగ్య సహాయకుడు', role: 'AI ఆరోగ్య మార్గదర్శి', newChat: 'కొత్త సంభాషణ', today: 'మీ ఆరోగ్య స్థలం',
    greeting: 'మీ మాట వినడానికి నేను ఇక్కడ ఉన్నాను. మీకు ఏమి ఇబ్బందిగా ఉందో చెప్పండి; సురక్షితమైన తదుపరి అడుగు ఆలోచించడంలో సహాయపడతాను.',
    inputHint: 'మీకు ఎలా అనిపిస్తోందో రాయండి…', send: 'పంపండి', voice: 'వాయిస్ మోడ్', text: 'టెక్స్ట్ మోడ్', record: 'మీ సమస్యను చెప్పండి', stop: 'రికార్డింగ్ ఆపండి', recording: 'వింటున్నాను… పూర్తయ్యాక నొక్కండి',
    processing: 'జాగ్రత్తగా సమాధానం సిద్ధమవుతోంది…', safety: 'ఆరోగ్య వాయిస్ వైద్యుడు కాదు; ఇది AI నమూనా. వ్యాధి నిర్ధారణ లేదా మందుల సూచనలు ఇవ్వదు. తీవ్రమైన లేదా త్వరగా పెరుగుతున్న లక్షణాలుంటే వెంటనే స్థానిక అత్యవసర సేవలను సంప్రదించండి.',
    privacy: 'సమాధానాల కోసం మీ సందేశాలు AI సేవకు వెళ్తాయి. Firebase లో సెషన్ ID, భాష, సమయ వివరాలు మాత్రమే సేవ్ అవుతాయి; చాట్ లేదా ఆడియో సేవ్ కావు.',
    error: 'ఇప్పుడే సమాధానం పొందలేకపోయాను. కొద్దిసేపటికి మళ్లీ ప్రయత్నించండి.', audioError: 'టెక్స్ట్ సమాధానం వచ్చింది, కానీ ఇప్పుడు వాయిస్ ప్లే కావడం లేదు.',
    session: 'వ్యక్తిగత సెషన్', connection: 'సురక్షిత కనెక్షన్', emergency: 'అత్యవసర సహాయం కావాలా?',
    welcomeLabel: 'ఆరోగ్య వాయిస్‌కు స్వాగతం', chooseLabel: 'మీ గురించి కొంచెం', chatLabel: 'మీ సంభాషణ', back: 'వెనక్కి',
  },
  hi: {
    welcome: 'देखभाल की शुरुआत बातचीत से', welcomeSub: 'आरोग्य वॉइस अगला सुरक्षित कदम समझने में मदद कर सकता है।',
    name: 'मरीज़ का नाम', phone: 'फ़ोन नंबर', card: 'आयुष्मान कार्ड नंबर', continue: 'आगे बढ़ें',
    demoWarning: 'यह केवल डेमो फ़ॉर्म है। नकली जानकारी भरें; अपना असली फ़ोन या आयुष्मान नंबर न डालें।',
    languageTitle: 'अपनी पसंद की भाषा चुनें', languageSub: 'बातचीत और आवाज़ के जवाबों में यही भाषा इस्तेमाल होगी।',
    hello: 'नमस्ते', assistant: 'आरोग्य सहायक', role: 'AI स्वास्थ्य मार्गदर्शक', newChat: 'नई बातचीत', today: 'आपकी देखभाल की जगह',
    greeting: 'मैं आपकी बात सुनने के लिए यहाँ हूँ। आपको क्या परेशानी है, बताइए; मैं सुरक्षित अगला कदम सोचने में मदद करूँगा।',
    inputHint: 'आप कैसा महसूस कर रहे हैं, लिखें…', send: 'भेजें', voice: 'आवाज़ मोड', text: 'टेक्स्ट मोड', record: 'अपनी परेशानी बोलें', stop: 'रिकॉर्डिंग रोकें', recording: 'सुन रहा हूँ… पूरा होने पर दबाएँ',
    processing: 'सावधानी से जवाब तैयार हो रहा है…', safety: 'आरोग्य वॉइस डॉक्टर नहीं, AI प्रोटोटाइप है। यह बीमारी का निदान या दवा की सलाह नहीं देता। गंभीर या तेज़ी से बिगड़ते लक्षण हों तो तुरंत स्थानीय आपातकालीन सेवा से संपर्क करें।',
    privacy: 'जवाब बनाने के लिए आपके संदेश AI सेवा को भेजे जाते हैं। Firebase में केवल सेशन ID, भाषा और समय की जानकारी सहेजी जाती है; चैट या आवाज़ नहीं।',
    error: 'अभी जवाब नहीं मिल पाया। कृपया थोड़ी देर बाद फिर कोशिश करें।', audioError: 'टेक्स्ट जवाब तैयार है, लेकिन आवाज़ अभी उपलब्ध नहीं है।',
    session: 'निजी सेशन', connection: 'सुरक्षित कनेक्शन', emergency: 'तुरंत मदद चाहिए?',
    welcomeLabel: 'आरोग्य वॉइस में स्वागत है', chooseLabel: 'आपके बारे में थोड़ा', chatLabel: 'आपकी बातचीत', back: 'वापस',
  },
};

async function errorFrom(response, fallback) {
  try {
    const body = await response.json();
    return body.detail || fallback;
  } catch {
    return fallback;
  }
}

async function blobToWav(blob) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Audio recording is unavailable in this browser.');
  const context = new AudioContextClass();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const frameCount = decoded.length;
    const sampleRate = decoded.sampleRate;
    const samples = new Float32Array(frameCount);
    for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
      const channelData = decoded.getChannelData(channel);
      for (let i = 0; i < frameCount; i += 1) samples[i] += channelData[i] / decoded.numberOfChannels;
    }
    const bytes = new ArrayBuffer(44 + frameCount * 2);
    const view = new DataView(bytes);
    const writeText = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
    writeText(0, 'RIFF'); view.setUint32(4, 36 + frameCount * 2, true); writeText(8, 'WAVE');
    writeText(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeText(36, 'data'); view.setUint32(40, frameCount * 2, true);
    for (let i = 0; i < frameCount; i += 1) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(44 + i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
    }
    return new Blob([bytes], { type: 'audio/wav' });
  } finally {
    await context.close();
  }
}

function Brand() {
  return <a className="brand" href="#top" aria-label="Arogya Voice"><span className="brand-mark">✳</span><span>Arogya <b>Voice</b></span></a>;
}

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [language, setLanguage] = useState('en');
  const [patientName, setPatientName] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState('text');
  const [busy, setBusy] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState('');
  const [sessionStatus, setSessionStatus] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState('');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioUrlsRef = useRef([]);
  const t = words[language];

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function enterLanguageStep(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPatientName(String(form.get('patientName') || '').trim());
    event.currentTarget.reset();
    setScreen('language');
  }

  async function chooseLanguage(code) {
    setLanguage(code);
    setScreen('chat');
    setMode('text');
    setNotice('');
    setMessages([{ id: 'welcome-' + Date.now(), role: 'assistant', content: words[code].greeting }]);
    try {
      const session = await createSession(code);
      setCurrentSessionId(session.sessionId);
      setSessionStatus(session.saved ? 'saved' : 'local');
    } catch {
      setCurrentSessionId('');
      setSessionStatus('local');
    }
  }

  async function sendMessage(text = draft, speak = mode === 'voice') {
    const cleanText = text.trim();
    if (!cleanText || busy) return;
    const history = messages.filter((item) => item.role === 'user' || item.role === 'assistant').slice(-16).map(({ role, content }) => ({ role, content }));
    const userItem = { id: 'u-' + Date.now(), role: 'user', content: cleanText };
    const pendingId = 'pending-' + Date.now();
    setMessages((current) => [...current, userItem, { id: pendingId, role: 'assistant', pending: true, content: t.processing }]);
    setDraft('');
    setNotice('');
    setBusy(true);
    if (currentSessionId) void touchSession(currentSessionId).catch(() => setSessionStatus('local'));
    try {
      const response = await fetch(API_BASE + '/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, message: cleanText, history }),
      });
      if (!response.ok) throw new Error(await errorFrom(response, t.error));
      const data = await response.json();
      const assistantItem = { id: 'a-' + Date.now(), role: 'assistant', content: data.reply };
      setMessages((current) => current.map((item) => item.id === pendingId ? assistantItem : item));
      if (speak) {
        try {
          const speech = await fetch(API_BASE + '/voice/tts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language, text: data.reply }),
          });
          if (!speech.ok) throw new Error('tts');
          const wavBlob = new Blob([await speech.blob()], { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(wavBlob);
          audioUrlsRef.current.push(audioUrl);
          setMessages((current) => current.map((item) => item.id === assistantItem.id ? { ...item, audioUrl } : item));
          const player = new Audio(audioUrl);
          player.play().catch(() => setNotice('Tap the audio controls to play the reply.'));
        } catch {
          setNotice(t.audioError);
        }
      }
    } catch (error) {
      setMessages((current) => current.map((item) => item.id === pendingId ? { id: pendingId, role: 'assistant', content: error.message || t.error, error: true } : item));
    } finally {
      setBusy(false);
    }
  }

  async function processRecording(blob) {
    setVoiceBusy(true);
    try {
      const wav = await blobToWav(blob);
      const form = new FormData();
      form.append('audio_file', wav, 'patient-recording.wav');
      form.append('language', language);
      const response = await fetch(API_BASE + '/voice/stt', { method: 'POST', body: form });
      if (!response.ok) throw new Error(await errorFrom(response, t.error));
      const data = await response.json();
      if (!data.transcript?.trim()) throw new Error('I could not hear speech. Please try again.');
      await sendMessage(data.transcript, true);
    } catch (error) {
      setNotice(error.message || t.error);
    } finally {
      setVoiceBusy(false);
    }
  }

  async function toggleRecording() {
    if (busy || voiceBusy) return;
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      return;
    }
    setNotice('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setNotice('Microphone recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => setNotice(t.error);
      recorder.onstop = () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const recordingBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (recordingBlob.size) void processRecording(recordingBlob);
      };
      recorder.start();
      setRecording(true);
      timerRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 30000);
    } catch {
      setNotice('Allow microphone access in your browser to speak to Arogya Voice.');
    }
  }

  function startNewConversation() {
    setScreen('language');
    setMessages([]);
    setNotice('');
    setSessionStatus('');
    setCurrentSessionId('');
    setPatientName('');
  }

  if (screen === 'welcome') return <main className="welcome-page" id="top">
    <div className="welcome-top"><Brand /><span className="prototype-pill"><span className="status-dot" /> Prototype</span></div>
    <section className="welcome-card">
      <div className="welcome-art" aria-hidden="true"><span className="art-ring ring-one"/><span className="art-ring ring-two"/><span className="art-spark">✦</span><div className="art-cross">＋</div><div className="art-leaf leaf-a"/><div className="art-leaf leaf-b"/><div className="art-stem"/></div>
      <div className="welcome-content"><span className="eyebrow">{words.en.welcomeLabel}</span><h1>{words.en.welcome}</h1><p className="welcome-intro">{words.en.welcomeSub}</p>
        <form className="patient-form" onSubmit={enterLanguageStep} autoComplete="off">
          <label>{words.en.name}<input name="patientName" placeholder="Demo Patient" maxLength="60" autoComplete="off" /></label>
          <div className="form-row"><label>{words.en.phone}<input name="phone" type="tel" placeholder="0000000000" maxLength="20" autoComplete="off" /></label><label>{words.en.card}<input name="card" placeholder="DEMO-0000" maxLength="30" autoComplete="off" /></label></div>
          <p className="demo-note"><span>ⓘ</span>{words.en.demoWarning}</p>
          <button className="primary-button full-button" type="submit">{words.en.continue}<span>→</span></button>
        </form>
        <p className="welcome-foot"><span className="shield">♧</span> No account or verification needed for this demo</p>
      </div>
    </section>
    <footer className="welcome-footer"><span>Care, in your language.</span><span>English <i>·</i> ಕನ್ನಡ <i>·</i> తెలుగు <i>·</i> हिन्दी</span></footer>
  </main>;

  if (screen === 'language') return <main className="language-page" id="top">
    <div className="welcome-top"><Brand /><button className="text-button" type="button" onClick={() => setScreen('welcome')}>← {words.en.back}</button></div>
    <section className="language-card"><div className="language-symbol">文</div><span className="eyebrow">{words.en.chooseLabel}</span><h1>{words.en.languageTitle}</h1><p>{words.en.languageSub}</p>
      <div className="language-options">{languageOptions.map((option) => <button className="language-option" type="button" key={option.code} onClick={() => void chooseLanguage(option.code)}><span className="language-native">{option.native}</span><span className="language-english">{option.label}</span><span className="option-arrow">→</span></button>)}</div>
      <p className="language-private"><span className="shield">♧</span> Your choice is saved with session details only.</p>
    </section>
    <footer className="welcome-footer"><span>Designed for care, built with caution.</span><span>Demo experience <i>·</i> Synthetic data only</span></footer>
  </main>;

  return <main className="app-layout" id="top">
    <aside className="sidebar"><Brand /><div className="side-caption">{t.today}</div><button type="button" className="new-chat-button" onClick={startNewConversation}><span>＋</span>{t.newChat}</button><div className="side-session"><span className="session-icon">✳</span><span><b>{t.session}</b><small>{t.connection}</small></span><i className="status-dot"/></div><div className="side-spacer"/><div className="sidebar-safety"><span className="safety-icon">＋</span><p>{t.emergency}<br/><small>{t.safety}</small></p></div><div className="side-bottom"><span>✳</span> Arogya Voice <small>v0.2 prototype</small></div></aside>
    <section className="chat-column"><header className="chat-header"><div className="assistant-heading"><span className="assistant-avatar">✳</span><span><b>{t.assistant}</b><small><i className="status-dot"/> {t.role}</small></span></div><div className="chat-header-right"><span className="language-chip">{languageOptions.find((item) => item.code === language)?.native}</span><div className="mode-switch" role="group" aria-label="Conversation mode"><button type="button" className={mode === 'voice' ? 'active' : ''} aria-pressed={mode === 'voice'} onClick={() => setMode('voice')}><span>◖</span>{t.voice}</button><button type="button" className={mode === 'text' ? 'active' : ''} aria-pressed={mode === 'text'} onClick={() => setMode('text')}><span>▤</span>{t.text}</button></div></div></header>
      <div className="conversation-scroll"><div className="conversation-inner"><div className="day-divider"><span/><b>{t.chatLabel}</b><span/></div><div className="messages" aria-live="polite">{messages.map((item) => <article className={'message-row ' + (item.role === 'user' ? 'from-user' : 'from-assistant')} key={item.id}><span className={item.role === 'user' ? 'message-avatar user-avatar' : 'message-avatar assistant-avatar'}>{item.role === 'user' ? (patientName ? patientName.slice(0, 1).toUpperCase() : 'Y') : '✳'}</span><div className="message-stack"><span className="message-author">{item.role === 'user' ? (patientName || 'You') : t.assistant}</span><div className={'message-bubble ' + (item.role === 'user' ? 'user-bubble' : 'assistant-bubble') + (item.error ? ' error-bubble' : '')}>{item.pending ? <><span className="typing-dots"><i/><i/><i/></span>{item.content}</> : item.content}</div>{item.audioUrl && <audio className="audio-player" controls preload="none" src={item.audioUrl}>{t.speaking}</audio>}</div></article>)}</div><div className="chat-disclosures"><div className="safety-banner"><span className="safety-icon">＋</span><p>{t.safety}</p></div><p className="privacy-line">{t.privacy}</p></div></div></div>
      <div className="composer-wrap"><div className="composer-inner">{mode === 'voice' && <div className={'voice-prompt ' + (recording ? 'is-recording' : '')}><span className="voice-wave"><i/><i/><i/><i/><i/></span><span>{recording ? t.recording : voiceBusy ? t.processing : t.record}</span></div>}<div className="composer"><textarea aria-label={t.inputHint} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={t.inputHint} rows="1" maxLength={2000} disabled={busy || voiceBusy}/>{mode === 'voice' && <button className={'mic-button ' + (recording ? 'recording' : '')} type="button" onClick={() => void toggleRecording()} disabled={busy || voiceBusy} aria-label={recording ? t.stop : t.record}>{recording ? '■' : '●'}</button>}<button className="send-button" type="button" onClick={() => void sendMessage()} disabled={busy || voiceBusy || !draft.trim()} aria-label={t.send}>{busy || voiceBusy ? <span className="send-spinner"/> : '↑'}</button></div><div className="composer-bottom"><span>{mode === 'voice' ? '30 sec max · Your recording is not saved by this app' : 'Press Enter to send · Shift + Enter for a new line'}</span><span>✳ Arogya Voice may make mistakes</span></div>{notice && <p className="inline-notice" role="status">{notice}</p>}{sessionStatus === 'local' && <p className="inline-notice" role="status">Session metadata could not be saved. The conversation remains temporary in this tab.</p>}</div></div>
    </section>
  </main>;
}
