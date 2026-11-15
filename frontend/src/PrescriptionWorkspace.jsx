import { useEffect, useRef, useState } from 'react';
import { listPrescriptions, removePrescription, savePrescription } from './firebase.js';
import SpeechPlayback from './SpeechPlayback.jsx';
import './prescription.css';

const API = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const UI = {
  en: { cabinet: 'My Medicine Cabinet', upload: 'Add prescription', assistant: 'Ask about a prescription', chat: 'Health assistant', back: 'Back to health assistant', uploadTitle: 'Understand a prescription', uploadSub: 'Upload a PDF or photo. You will review every extracted detail before saving.', choose: 'Choose PDF or take a photo', process: 'Read prescription', processing: 'Reading…', review: 'Review each detail', doctor: 'Doctor name', date: 'Prescription date', add: 'Add medicine', checked: 'I compared these details with the original', unclear: 'Some details are unclear; ask my doctor or pharmacist', confirm: 'Confirm and save', empty: 'No prescriptions saved yet.', question: 'Ask a question about this prescription…', send: 'Send', voice: 'Voice', text: 'Text', select: 'Open assistant', remove: 'Remove', privacy: 'The source document is processed temporarily and is not saved. Only the details you confirm are stored in your private cabinet. Avoid real patient data in this prototype.', safety: 'This tool explains what was recorded; it does not change medication instructions. Confirm uncertain details with your prescriber or pharmacist.', saved: 'Prescription saved to your cabinet.', local: 'Firebase is not configured; this record is temporary and will disappear when this page closes.', verifyHelp: 'Mark each item as checked or unclear. Unclear items will remain flagged for professional confirmation.', noRead: 'No readable medication was found. Add details manually or upload a clearer image.' },
  kn: { cabinet: 'ನನ್ನ ಔಷಧಿ ಪಟ್ಟಿ', upload: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಸೇರಿಸಿ', assistant: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಬಗ್ಗೆ ಕೇಳಿ', chat: 'ಆರೋಗ್ಯ ಸಹಾಯಕ', back: 'ಆರೋಗ್ಯ ಸಹಾಯಕರಿಗೆ ಹಿಂತಿರುಗಿ', uploadTitle: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ', uploadSub: 'PDF ಅಥವಾ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ. ಉಳಿಸುವ ಮೊದಲು ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.', choose: 'PDF ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ಫೋಟೋ ತೆಗೆಯಿರಿ', process: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಓದಿ', processing: 'ಓದುತ್ತಿದೆ…', review: 'ಪ್ರತಿ ವಿವರ ಪರಿಶೀಲಿಸಿ', doctor: 'ವೈದ್ಯರ ಹೆಸರು', date: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ದಿನಾಂಕ', add: 'ಔಷಧಿ ಸೇರಿಸಿ', checked: 'ಮೂಲ ದಾಖಲೆಯೊಂದಿಗೆ ಹೋಲಿಸಿ ಪರಿಶೀಲಿಸಿದ್ದೇನೆ', unclear: 'ಕೆಲವು ವಿವರಗಳು ಸ್ಪಷ್ಟವಿಲ್ಲ; ವೈದ್ಯರು ಅಥವಾ ಔಷಧಿಕಾರರನ್ನು ಕೇಳಿ', confirm: 'ದೃಢೀಕರಿಸಿ ಉಳಿಸಿ', empty: 'ಇನ್ನೂ ಯಾವುದೇ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಉಳಿಸಿಲ್ಲ.', question: 'ಈ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಬಗ್ಗೆ ಕೇಳಿ…', send: 'ಕಳುಹಿಸಿ', voice: 'ಧ್ವನಿ', text: 'ಪಠ್ಯ', select: 'ಸಹಾಯಕ ತೆರೆಯಿರಿ', remove: 'ತೆಗೆದುಹಾಕಿ', privacy: 'ಮೂಲ ದಾಖಲೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಮಾತ್ರ ಸಂಸ್ಕರிக்கப்படும்; ಉಳಿಸಲಾಗುವುದಿಲ್ಲ. ನೀವು ದೃಢೀಕರಿಸಿದ ವಿವರಗಳನ್ನು ಮಾತ್ರ ಖಾಸಗಿ ಪಟ್ಟಿಯಲ್ಲಿ ಉಳಿಸಲಾಗುತ್ತದೆ.', safety: 'ಇದು ದಾಖಲಾದ ಮಾಹಿತಿಯನ್ನು ವಿವರಿಸುತ್ತದೆ; ಔಷಧ ಸೂಚನೆಗಳನ್ನು ಬದಲಾಯಿಸುವುದಿಲ್ಲ. ಅನುಮಾನಗಳಿದ್ದರೆ ವೈದ್ಯರು ಅಥವಾ ಔಷಧಿಕಾರರನ್ನು ಕೇಳಿ.', saved: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಪಟ್ಟಿಗೆ ಉಳಿಸಲಾಗಿದೆ.', local: 'Firebase ಹೊಂದಿಸಿಲ್ಲ; ಪುಟ ಮುಚ್ಚಿದಾಗ ಈ ತಾತ್ಕಾಲಿಕ ದಾಖಲೆ ಅಳಿಯುತ್ತದೆ.', verifyHelp: 'ಪ್ರತಿ ಔಷಧಿಯನ್ನು ಪರಿಶೀಲಿಸಿದ ಅಥವಾ ಸ್ಪಷ್ಟವಿಲ್ಲ ಎಂದು ಗುರುತಿಸಿ.', noRead: 'ಓದಬಹುದಾದ ಔಷಧಿ ಸಿಗಲಿಲ್ಲ. ವಿವರಗಳನ್ನು ಕೈಯಾರೆ ಸೇರಿಸಿ ಅಥವಾ ಸ್ಪಷ್ಟ ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.' },
  te: { cabinet: 'నా మందుల జాబితా', upload: 'ప్రిస్క్రిప్షన్ జోడించండి', assistant: 'ప్రిస్క్రిప్షన్ గురించి అడగండి', chat: 'ఆరోగ్య సహాయకుడు', back: 'ఆరోగ్య సహాయకుడికి తిరిగి వెళ్లండి', uploadTitle: 'ప్రిస్క్రిప్షన్‌ను అర్థం చేసుకోండి', uploadSub: 'PDF లేదా ఫోటో అప్‌లోడ్ చేయండి. సేవ్ చేసే ముందు వివరాలన్నీ చూడండి.', choose: 'PDF ఎంచుకోండి లేదా ఫోటో తీయండి', process: 'ప్రిస్క్రిప్షన్ చదవండి', processing: 'చదువుతోంది…', review: 'ప్రతి వివరాన్ని పరిశీలించండి', doctor: 'వైద్యుని పేరు', date: 'ప్రిస్క్రిప్షన్ తేదీ', add: 'మందు జోడించండి', checked: 'అసలు పత్రంతో వివరాలను పోల్చాను', unclear: 'కొన్ని వివరాలు స్పష్టంగా లేవు; వైద్యుడు లేదా ఫార్మసిస్ట్‌ను అడగాలి', confirm: 'నిర్ధారించి సేవ్ చేయండి', empty: 'ఇంకా ప్రిస్క్రిప్షన్లు సేవ్ చేయలేదు.', question: 'ఈ ప్రిస్క్రిప్షన్ గురించి అడగండి…', send: 'పంపండి', voice: 'వాయిస్', text: 'టెక్స్ట్', select: 'సహాయకుడిని తెరవండి', remove: 'తొలగించు', privacy: 'అసలు పత్రం తాత్కాలికంగా ప్రాసెస్ అవుతుంది; నిల్వ చేయబడదు. మీరు నిర్ధారించిన వివరాలే మీ జాబితాలో సేవ్ అవుతాయి.', safety: 'ఇది వ్రాసిన వివరాలనే వివరిస్తుంది; మందుల సూచనలను మార్చదు. సందేహాలుంటే వైద్యుడు లేదా ఫార్మసిస్ట్‌ను అడగండి.', saved: 'ప్రిస్క్రిప్షన్ జాబితాలో సేవ్ అయింది.', local: 'Firebase సెటప్ కాలేదు; ఈ రికార్డు తాత్కాలికం, పేజీ మూసినప్పుడు పోతుంది.', verifyHelp: 'ప్రతి మందును తనిఖీ చేసినట్లు లేదా స్పష్టతలేనిదిగా గుర్తించండి.', noRead: 'చదవగల మందు కనిపించలేదు. వివరాలు చేతితో జోడించండి లేదా స్పష్టమైన చిత్రం పంపండి.' },
  hi: { cabinet: 'मेरी दवा सूची', upload: 'पर्चा जोड़ें', assistant: 'पर्चे के बारे में पूछें', chat: 'स्वास्थ्य सहायक', back: 'स्वास्थ्य सहायक पर वापस जाएँ', uploadTitle: 'पर्चे को समझें', uploadSub: 'PDF या फोटो अपलोड करें। सेव करने से पहले हर जानकारी जाँचें।', choose: 'PDF चुनें या फोटो लें', process: 'पर्चा पढ़ें', processing: 'पढ़ रहा है…', review: 'हर जानकारी जाँचें', doctor: 'डॉक्टर का नाम', date: 'पर्चे की तारीख', add: 'दवा जोड़ें', checked: 'मैंने मूल पर्चे से जानकारी मिलाई है', unclear: 'कुछ जानकारी स्पष्ट नहीं है; डॉक्टर या फार्मासिस्ट से पूछें', confirm: 'पुष्टि करके सेव करें', empty: 'अभी कोई पर्चा सेव नहीं है।', question: 'इस पर्चे के बारे में पूछें…', send: 'भेजें', voice: 'आवाज़', text: 'टेक्स्ट', select: 'सहायक खोलें', remove: 'हटाएँ', privacy: 'मूल दस्तावेज़ अस्थायी रूप से पढ़ा जाता है और सेव नहीं होता। केवल आपकी पुष्टि की गई जानकारी निजी सूची में सेव होती है।', safety: 'यह लिखी जानकारी समझाता है; दवा के निर्देश नहीं बदलता। अस्पष्ट जानकारी के लिए डॉक्टर या फार्मासिस्ट से पूछें।', saved: 'पर्चा सूची में सेव हो गया।', local: 'Firebase सेट नहीं है; यह अस्थायी रिकॉर्ड पेज बंद होने पर मिट जाएगा।', verifyHelp: 'हर दवा को जाँचा हुआ या अस्पष्ट के रूप में चिह्नित करें।', noRead: 'पढ़ने योग्य दवा नहीं मिली। जानकारी खुद जोड़ें या साफ़ तस्वीर अपलोड करें।' },
};
const blankMedicine = () => ({ medicine_name: '', strength: '', dosage: '', frequency: '', timing: '', duration: '', route: '', instructions: '', confidence: 'unreadable', needs_doctor_confirmation: true });
const medicineFields = ['medicine_name', 'strength', 'dosage', 'frequency', 'timing', 'duration', 'route', 'instructions'];
const fieldLabels = { medicine_name: 'Medicine name', strength: 'Strength', dosage: 'Dosage as written', frequency: 'Frequency', timing: 'Time of administration', duration: 'Duration', route: 'Route', instructions: 'Doctor’s instructions' };

async function errorText(response) {
  try { const body = await response.json(); return body.detail || 'The request failed. Please try again.'; }
  catch { return 'The request failed. Please try again.'; }
}

async function blobToWav(blob) {
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextType) throw new Error('Audio conversion is unavailable in this browser.');
  const context = new AudioContextType();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const count = decoded.length;
    const buffer = new ArrayBuffer(44 + count * 2);
    const view = new DataView(buffer);
    const writeText = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
    writeText(0, 'RIFF'); view.setUint32(4, 36 + count * 2, true); writeText(8, 'WAVE');
    writeText(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, decoded.sampleRate, true);
    view.setUint32(28, decoded.sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    writeText(36, 'data'); view.setUint32(40, count * 2, true);
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, channel) => decoded.getChannelData(channel));
    for (let index = 0; index < count; index += 1) {
      let sample = channels.reduce((sum, channel) => sum + channel[index], 0) / channels.length;
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
  } finally { await context.close(); }
}

export default function PrescriptionWorkspace({ language = 'en', onBack }) {
  const t = UI[language] || UI.en;
  const [page, setPage] = useState('cabinet');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [draft, setDraft] = useState(null);
  const [checked, setChecked] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState([]);
  const [mode, setMode] = useState('text');
  const [recording, setRecording] = useState(false);
  const [history, setHistory] = useState([]);
  const recorder = useRef(null);
  const stream = useRef(null);
  const pieces = useRef([]);
  const micTimer = useRef(null);

  async function refreshCabinet() {
    try {
      const result = await listPrescriptions();
      if (result.saved) setItems(result.items);
    } catch (error) { setNotice(error.message || 'Could not load the cabinet.'); }
  }
  useEffect(() => { void refreshCabinet(); return () => { if (micTimer.current) window.clearTimeout(micTimer.current); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach((track) => track.stop()); }; }, []);
  useEffect(() => { if (!file) { setPreview(''); return undefined; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);

  function beginUpload() { setFile(null); setDraft(null); setChecked({}); setNotice(''); setPage('upload'); }
  async function extract() {
    if (!file) return;
    setBusy(true); setNotice('');
    try {
      const body = new FormData(); body.append('file', file); body.append('language', language);
      const response = await fetch(API + '/prescriptions/extract', { method: 'POST', body });
      if (!response.ok) throw new Error(await errorText(response));
      const data = await response.json();
      const normalized = { doctor_name: '', prescription_date: '', other_instructions: '', medicines: [], ...data.prescription, medicines: (data.prescription.medicines || []).map((m) => ({ ...blankMedicine(), ...m })) };
      setDraft(normalized); setChecked({}); setNotice([data.message, data.warning].filter(Boolean).join(' ')); setPage('review');
    } catch (error) { setNotice(error.message || 'Could not read the document.'); }
    finally { setBusy(false); }
  }
  function editTop(field, value) { setDraft((current) => ({ ...current, [field]: value })); }
  function editMedicine(index, field, value) { setDraft((current) => ({ ...current, medicines: current.medicines.map((item, i) => i === index ? { ...item, [field]: value } : item) })); }
  function addMedicine() { setDraft((current) => ({ ...current, medicines: [...current.medicines, blankMedicine()] })); setChecked((current) => ({ ...current, [draft?.medicines?.length || 0]: false })); }
  async function confirmPrescription() {
    if (!draft?.medicines?.length || draft.medicines.some((_, index) => !checked[index])) { setNotice('Review each medicine or mark it as unclear before confirming.'); return; }
    setBusy(true); setNotice('');
    const verified = { ...draft, status: 'verified', medicines: draft.medicines.map((medicine, index) => ({ ...medicine, needs_doctor_confirmation: Boolean(medicine.needs_doctor_confirmation || !medicine.medicine_name || !medicine.dosage || !medicine.frequency) })) };
    try {
      const result = await savePrescription(verified);
      const entry = { ...verified, id: result.id || `temporary-${Date.now()}`, createdAt: { seconds: Math.floor(Date.now() / 1000) } };
      if (!result.saved) setItems((current) => [entry, ...current]); else await refreshCabinet();
      setSelected(entry); setAnswers([]); setHistory([]); setPage('ask'); setNotice(result.saved ? t.saved : t.local);
    } catch (error) { setNotice(error.message || 'Could not save the prescription.'); }
    finally { setBusy(false); }
  }
  function openItem(item) { setSelected(item); setAnswers([]); setHistory([]); setPage('ask'); setNotice(''); }
  async function deleteItem(item) {
    if (!window.confirm('Remove this prescription from your cabinet?')) return;
    if (String(item.id).startsWith('temporary-')) { setItems((current) => current.filter((one) => one.id !== item.id)); return; }
    try { await removePrescription(item.id); setItems((current) => current.filter((one) => one.id !== item.id)); if (selected?.id === item.id) { setSelected(null); setPage('cabinet'); } }
    catch (error) { setNotice(error.message || 'Could not remove the prescription.'); }
  }
  async function ask(raw = question) {
    const text = raw.trim(); if (!text || !selected || busy) return;
    window.dispatchEvent(new Event('arogya:cancel-speech'));
    const userItem = { role: 'user', content: text };
    setAnswers((current) => [...current, userItem, { role: 'assistant', content: '…', pending: true }]); setQuestion(''); setBusy(true); setNotice('');
    const nextHistory = [...history, userItem].slice(-12);
    try {
      const response = await fetch(API + '/prescriptions/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language, question: text, history: history.slice(-12), prescription: selected }) });
      if (!response.ok) throw new Error(await errorText(response));
      const data = await response.json();
      setAnswers((current) => [...current.slice(0, -1), { role: 'assistant', content: data.reply }]);
      setHistory([...nextHistory, { role: 'assistant', content: data.reply }].slice(-12));
    } catch (error) { setAnswers((current) => [...current.slice(0, -1), { role: 'assistant', content: error.message || 'Could not get a reply.', error: true }]); }
    finally { setBusy(false); }
  }
  async function toggleMic() {
    if (recorder.current?.state === 'recording') { recorder.current.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setNotice('Microphone is unavailable in this browser.'); return; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true }); pieces.current = [];
      const media = new MediaRecorder(stream.current); recorder.current = media;
      media.ondataavailable = (event) => { if (event.data.size) pieces.current.push(event.data); };
      media.onstop = async () => {
        if (micTimer.current) window.clearTimeout(micTimer.current);
        stream.current?.getTracks().forEach((track) => track.stop()); setRecording(false); setBusy(true);
        try {
          const converted = await blobToWav(new Blob(pieces.current, { type: media.mimeType || 'audio/webm' }));
          const form = new FormData(); form.append('audio_file', converted, 'question.wav'); form.append('language', language);
          const response = await fetch(API + '/voice/stt', { method: 'POST', body: form }); if (!response.ok) throw new Error(await errorText(response));
          const result = await response.json(); if (!result.transcript?.trim()) throw new Error('I could not hear that. Please try again.');
          setBusy(false); await ask(result.transcript);
        } catch (error) { setNotice(error.message || 'Speech recognition failed.'); setBusy(false); }
      };
      media.start(); setRecording(true);
      micTimer.current = window.setTimeout(() => { if (media.state === 'recording') media.stop(); }, 30000);
    } catch { setNotice('Allow microphone access to ask by voice.'); }
  }

  return <main className="prescription-shell">
    <header className="prescription-header"><button type="button" className="text-button" onClick={onBack}>← {t.back}</button><div className="prescription-head-actions"><button type="button" className={page === 'cabinet' ? 'selected-tab' : ''} onClick={() => { setPage('cabinet'); setNotice(''); void refreshCabinet(); }}>▤ {t.cabinet}</button><button type="button" className="prescription-add" onClick={beginUpload}>＋ {t.upload}</button></div></header>
    <div className="prescription-content">
      {page === 'cabinet' && <section className="prescription-page"><div className="prescription-title"><span className="prescription-icon">✚</span><div><p className="eyebrow">AROGYA VOICE · HEALTH TOOLS</p><h1>{t.cabinet}</h1><p>Prescription details you reviewed, kept in one place.</p></div></div><div className="privacy-callout">♧ {t.privacy}</div>{items.length === 0 ? <div className="cabinet-empty"><span>▤</span><h2>{t.empty}</h2><p>Upload a synthetic demo prescription to try the feature.</p><button type="button" className="primary-button" onClick={beginUpload}>＋ {t.upload}</button></div> : <div className="cabinet-grid">{items.map((item) => <article className="cabinet-card" key={item.id}><div className="cabinet-card-top"><span className="prescription-icon">▤</span><span className="verified-pill">✓ User reviewed</span></div><h2>{item.doctor_name || 'Prescription'}</h2><p>{item.prescription_date || 'Date not specified'}</p><div className="medicine-chips">{item.medicines?.map((m, i) => <span key={i}><strong>{m.medicine_name || 'Unclear medicine'}{m.strength ? ` · ${m.strength}` : ''}</strong><small>{[m.dosage, m.frequency, m.timing, m.duration, m.route].filter(Boolean).join(' · ') || 'Directions not specified'}</small>{m.instructions && <small>{m.instructions}</small>}{m.needs_doctor_confirmation && <small className="medicine-caution">Confirm unclear details with your doctor or pharmacist.</small>}</span>)}</div><div className="cabinet-card-actions"><button type="button" className="primary-button" onClick={() => openItem(item)}>{t.select} →</button><button type="button" className="text-button" onClick={() => void deleteItem(item)}>{t.remove}</button></div></article>)}</div>}</section>}
      {page === 'upload' && <section className="prescription-page"><button type="button" className="text-button" onClick={() => setPage('cabinet')}>← {t.cabinet}</button><div className="prescription-title"><span className="prescription-icon">↑</span><div><p className="eyebrow">STEP 1 · UPLOAD</p><h1>{t.uploadTitle}</h1><p>{t.uploadSub}</p></div></div><div className="privacy-callout">♧ {t.privacy}</div><label className="upload-drop"><span className="upload-symbol">▧</span><strong>{t.choose}</strong><small>PDF, JPG, JPEG or PNG · Maximum 10 MB</small><input type="file" accept="application/pdf,image/jpeg,image/png" capture="environment" onChange={(event) => { setFile(event.target.files?.[0] || null); event.currentTarget.value = ''; }} /></label>{file && <div className="document-preview"><div className="preview-label"><strong>{file.name}</strong><button type="button" className="text-button" onClick={() => setFile(null)}>Remove</button></div>{file.name.toLowerCase().endsWith('.pdf') ? <iframe title="Prescription preview" src={preview} /> : <img src={preview} alt="Prescription preview" />}</div>}<button type="button" className="primary-button" disabled={!file || busy} onClick={() => void extract()}>{busy ? t.processing : t.process} →</button>{notice && <p className="module-notice" role="status">{notice}</p>}</section>}
      {page === 'review' && draft && <section className="prescription-page"><button type="button" className="text-button" onClick={() => setPage('upload')}>← {t.upload}</button><div className="prescription-title"><span className="prescription-icon">✓</span><div><p className="eyebrow">STEP 2 · VERIFY</p><h1>{t.review}</h1><p>{t.verifyHelp}</p></div></div>{preview && <div className="mini-document-preview">{file?.name.toLowerCase().endsWith('.pdf') ? <iframe title="Original prescription for comparison" src={preview} /> : <img src={preview} alt="Original prescription" />}</div>}<div className="review-summary"><label>{t.doctor}<input value={draft.doctor_name || ''} onChange={(event) => editTop('doctor_name', event.target.value)} /></label><label>{t.date}<input value={draft.prescription_date || ''} onChange={(event) => editTop('prescription_date', event.target.value)} placeholder="YYYY-MM-DD or as written" /></label></div>{draft.medicines.length === 0 && <div className="privacy-callout">{t.noRead}</div>}{draft.medicines.map((medicine, index) => <article className="medicine-review" key={index}><div className="medicine-review-heading"><b>Medicine {index + 1}</b><span className={'confidence-pill confidence-' + medicine.confidence}>{medicine.confidence || 'unreadable'} · review</span></div><div className="medicine-fields">{medicineFields.map((field) => <label key={field}>{fieldLabels[field]}<input value={medicine[field] || ''} placeholder="Not found — check original" onChange={(event) => editMedicine(index, field, event.target.value)} /></label>)}</div><label className="review-check"><input type="checkbox" checked={Boolean(checked[index])} onChange={(event) => setChecked((current) => ({ ...current, [index]: event.target.checked }))} />{t.checked}</label><label className="review-check unclear-check"><input type="checkbox" checked={Boolean(medicine.needs_doctor_confirmation)} onChange={(event) => editMedicine(index, 'needs_doctor_confirmation', event.target.checked)} />{t.unclear}</label></article>)}<button type="button" className="text-button add-medicine" onClick={addMedicine}>＋ {t.add}</button><label className="other-instructions">Other instructions<textarea value={draft.other_instructions || ''} onChange={(event) => editTop('other_instructions', event.target.value)} placeholder="Only enter what is written in the original" /></label><div className="privacy-callout">{t.safety}</div><button type="button" className="primary-button" disabled={busy || !draft.medicines.length || draft.medicines.some((_, index) => !checked[index])} onClick={() => void confirmPrescription()}>{busy ? 'Saving…' : t.confirm} →</button>{notice && <p className="module-notice" role="status">{notice}</p>}</section>}
      {page === 'ask' && selected && <section className="prescription-page ask-page"><button type="button" className="text-button" onClick={() => { setPage('cabinet'); void refreshCabinet(); }}>← {t.cabinet}</button><div className="prescription-title"><span className="prescription-icon">✳</span><div><p className="eyebrow">PRESCRIPTION ASSISTANT</p><h1>{selected.doctor_name || t.assistant}</h1><p>{selected.prescription_date || 'Date not specified'} · {selected.medicines?.length || 0} medicine(s)</p></div></div><div className="privacy-callout">{t.safety}</div><div className="selected-medicines">{selected.medicines?.map((medicine, index) => <div key={index}><strong>{medicine.medicine_name || 'Unclear medicine'}{medicine.strength ? ` · ${medicine.strength}` : ''}</strong><span>{[medicine.dosage, medicine.frequency, medicine.timing, medicine.duration].filter(Boolean).join(' · ') || 'Directions missing'}</span>{medicine.needs_doctor_confirmation && <small>Confirm these details with a doctor or pharmacist.</small>}</div>)}</div><div className="prescription-chat-messages" aria-live="polite">{answers.map((answer, index) => <div className={'prescription-answer ' + (answer.role === 'user' ? 'patient-answer' : '')} key={index}>{answer.pending ? 'Preparing a careful reply…' : answer.role === 'assistant' && !answer.error ? <SpeechPlayback text={answer.content} language={language} apiBase={API}/> : answer.content}</div>)}</div><div className="prescription-composer"><div className="prescription-mode"><button className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')} type="button">▤ {t.text}</button><button className={mode === 'voice' ? 'active' : ''} onClick={() => setMode('voice')} type="button">◖ {t.voice}</button></div><div className="composer"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t.question} rows="2" maxLength={2000} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void ask(); } }} disabled={busy} />{mode === 'voice' && <button className={'mic-button ' + (recording ? 'recording' : '')} type="button" onClick={() => void toggleMic()} disabled={busy} aria-label="Record a question">{recording ? '■' : '●'}</button>}<button className="send-button" type="button" disabled={busy || !question.trim()} onClick={() => void ask(question)}>{busy ? '…' : '↑'}</button></div><p className="prescription-privacy-note">{t.privacy}</p>{notice && <p className="module-notice" role="status">{notice}</p>}</div></section>}
    </div>
  </main>;
}
