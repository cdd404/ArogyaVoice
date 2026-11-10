import { useState } from 'react';

const languages = [
  { code: 'en', label: 'English' }, { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'te', label: 'తెలుగు' }, { code: 'hi', label: 'हिन्दी' },
];
const copy = {
  en: { eyebrow: 'A calmer first step', title: 'How are you feeling today?', desc: 'Share what is bothering you. Arogya Voice can help you find a sensible next step.', prompt: 'What would you like help with?', button: 'Continue', note: 'For emergencies, call your local emergency number now. This demo does not diagnose or prescribe.' },
  kn: { eyebrow: 'ಆರೋಗ್ಯದ ಕಡೆ ಮೊದಲ ಹೆಜ್ಜೆ', title: 'ಇಂದು ನಿಮಗೆ ಹೇಗಿದೆ?', desc: 'ನಿಮಗೆ ತೊಂದರೆ ಏನು ಎಂದು ಹಂಚಿಕೊಳ್ಳಿ. ಮುಂದಿನ ಹೆಜ್ಜೆ ಕಂಡುಕೊಳ್ಳಲು ಆರೋಗ್ಯ ವಾಯ್ಸ್ ಸಹಾಯ ಮಾಡುತ್ತದೆ.', prompt: 'ನಿಮಗೆ ಯಾವುದರಲ್ಲಿ ಸಹಾಯ ಬೇಕು?', button: 'ಮುಂದುವರಿಸಿ', note: 'ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಲ್ಲಿ ಸ್ಥಳೀಯ ತುರ್ತು ಸಂಖ್ಯೆಗೆ ಕರೆ ಮಾಡಿ. ಈ ಮಾದರಿ ರೋಗನಿರ್ಣಯ ಅಥವಾ ಔಷಧ ಸೂಚನೆ ನೀಡುವುದಿಲ್ಲ.' },
  te: { eyebrow: 'ఆరోగ్యానికి తొలి అడుగు', title: 'ఈ రోజు మీకు ఎలా ఉంది?', desc: 'మీకు ఇబ్బంది కలిగిస్తున్నది చెప్పండి. తదుపరి అడుగు కనుగొనడంలో ఆరోగ్య వాయిస్ సహాయపడుతుంది.', prompt: 'మీకు ఏ విషయంలో సహాయం కావాలి?', button: 'కొనసాగించండి', note: 'అత్యవసర పరిస్థితిలో స్థానిక అత్యవసర నంబర్‌కు కాల్ చేయండి. ఈ డెమో నిర్ధారణ లేదా మందుల సూచనలు ఇవ్వదు.' },
  hi: { eyebrow: 'सेहत की ओर पहला कदम', title: 'आज आप कैसा महसूस कर रहे हैं?', desc: 'जो परेशानी है, वह बताइए। आरोग्य वॉइस अगला सही कदम समझने में मदद करेगा।', prompt: 'आप किस बारे में मदद चाहते हैं?', button: 'आगे बढ़ें', note: 'आपातकाल में अपने स्थानीय आपातकालीन नंबर पर कॉल करें। यह डेमो निदान या दवा नहीं बताता।' },
};

export default function App() {
  const [language, setLanguage] = useState('en');
  const [message, setMessage] = useState('');
  const t = copy[language];
  return <main className="page-shell">
    <header className="topbar"><a className="brand" href="#home" aria-label="Arogya Voice home"><span className="brand-mark">✳</span><span>Arogya <b>Voice</b></span></a><div className="language-wrap"><label htmlFor="language">Language</label><select id="language" value={language} onChange={e => setLanguage(e.target.value)}>{languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select></div></header>
    <section className="hero" id="home"><div className="hero-copy"><span className="eyebrow"><span className="pulse" />{t.eyebrow}</span><h1>{t.title}</h1><p>{t.desc}</p><div className="trust"><span>●</span> A private space to start a conversation</div></div><div className="illustration" aria-hidden="true"><div className="sun"/><div className="leaf leaf-one"/><div className="leaf leaf-two"/><div className="person"><div className="head"/><div className="body"/><div className="arm"/></div><div className="sparkle">✦</div></div></section>
    <section className="intake"><div className="section-head"><div><span className="step">YOUR FIRST STEP</span><h2>Let’s start with you</h2></div><span className="step-count">01 <i/> 03</span></div><label className="sr-only" htmlFor="concern">{t.prompt}</label><textarea id="concern" value={message} onChange={e => setMessage(e.target.value)} placeholder={t.prompt} rows="4"/><div className="form-foot"><span>Take your time. You can share as much or as little as you like.</span><button type="button" onClick={() => setMessage('')} disabled={!message.trim()}>{t.button}<span>↗</span></button></div><div className="safety"><span className="safety-icon">＋</span><p>{t.note}</p></div></section>
    <footer><span>Designed for care, built with caution.</span><span>Demo experience <i>•</i> Synthetic data only</span></footer>
  </main>;
}
