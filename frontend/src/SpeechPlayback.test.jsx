// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpeechPlayback, { splitSentences } from './SpeechPlayback.jsx';

let urlCounter;
let audioPlay;
let audioPause;
let previousScrollIntoView;

beforeEach(() => {
  urlCounter = 0;
  audioPlay = vi.fn(() => Promise.resolve());
  audioPause = vi.fn();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(audioPlay);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(audioPause);
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  previousScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['synthetic wav'], { type: 'audio/wav' }) })));
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => `blob:synthetic-${++urlCounter}`), revokeObjectURL: vi.fn() });
});

afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (previousScrollIntoView) Element.prototype.scrollIntoView = previousScrollIntoView;
  else delete Element.prototype.scrollIntoView;
});

describe('multilingual Gnani playback', () => {
  it('does not request or play audio until the user clicks Play', () => {
    render(<SpeechPlayback text="Headache." language="en" apiBase="http://api" />);
    expect(fetch).not.toHaveBeenCalled();
    expect(audioPlay).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
  });

  it('autoplays audio delivered with the chat response and reuses it for every control', async () => {
    const readyAudio = new Blob(['synthetic wav'], { type: 'audio/wav' });
    const { container } = render(<SpeechPlayback text="First sentence. Second sentence." language="en" apiBase="http://api" audioBlob={readyAudio} autoPlay />);
    await waitFor(() => expect(audioPlay).toHaveBeenCalledTimes(1));
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Restart' }));
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(fetch).not.toHaveBeenCalled();
    expect(audioPlay).toHaveBeenCalledTimes(3);
    await act(async () => fireEvent.timeUpdate(container.querySelector('audio'), { currentTime: 0.8, duration: 2 }));
    expect(container.querySelector('.speech-sentence-active')).toBeTruthy();
  });

  it('keeps ready audio available and shows a localized Play option when autoplay is blocked', async () => {
    audioPlay.mockRejectedValueOnce(new DOMException('Autoplay blocked', 'NotAllowedError'));
    render(<SpeechPlayback text="एक वाक्य।" language="hi" apiBase="http://api" audioBlob={new Blob(['wav'])} autoPlay />);
    expect(await screen.findByText('ऑडियो तैयार है। शुरू करने के लिए चलाएँ चुनें।')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'चलाएँ' }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates one audio clip per sentence and highlights each clip in order', async () => {
    const { container } = render(<SpeechPlayback text="First sentence. Second sentence." language="en" apiBase="http://api" />);
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('Playing')).toBeTruthy());
    expect(container.querySelectorAll('.speech-sentence-active')[0]?.textContent).toBe('First sentence. ');
    const audio = container.querySelector('audio');
    await act(async () => fireEvent.ended(audio));
    expect(container.querySelectorAll('.speech-sentence-active')[0]?.textContent).toBe('Second sentence.');
    await act(async () => fireEvent.ended(audio));
    expect(screen.getByText('Playback completed')).toBeTruthy();
    expect(container.querySelector('.speech-sentence-active')).toBeNull();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('pauses, resumes at the same audio position, restarts, then stops and clears highlighting', async () => {
    const { container } = render(<SpeechPlayback text="One sentence. Two sentence." language="en" apiBase="http://api" />);
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy());
    const audio = container.querySelector('audio');
    audio.currentTime = 1.75;
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(audioPause).toHaveBeenCalled();
    expect(screen.getByText('Paused')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(audio.currentTime).toBe(1.75);
    await userEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(audio.currentTime).toBe(0);
    expect(container.querySelectorAll('.speech-sentence-active')[0]?.textContent).toMatch(/^One sentence/);
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.getByText('Stopped')).toBeTruthy();
    expect(container.querySelector('.speech-sentence-active')).toBeNull();
  });

  it.each([
    ['en', 'Play', 'Generating audio...', 'Playing', 'Playback completed', 'Pause', 'Resume', 'Restart', 'Stop', 'Play again', 'Play this response', 'Pause speech', 'Paused', 'Stopped'],
    ['kn', 'ಪ್ಲೇ', 'ಧ್ವನಿ ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ...', 'ಪ್ಲೇ ಆಗುತ್ತಿದೆ', 'ಪ್ಲೇಬ್ಯಾಕ್ ಪೂರ್ಣಗೊಂಡಿದೆ', 'ವಿರಾಮ', 'ಮುಂದುವರಿಸಿ', 'ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಿ', 'ನಿಲ್ಲಿಸಿ', 'ಮತ್ತೆ ಪ್ಲೇ ಮಾಡಿ', 'ಈ ಉತ್ತರವನ್ನು ಧ್ವನಿಯಾಗಿ ಕೇಳಿ', 'ಧ್ವನಿಯನ್ನು ವಿರಾಮಗೊಳಿಸಿ', 'ವಿರಾಮಗೊಳಿಸಲಾಗಿದೆ', 'ನಿಲ್ಲಿಸಲಾಗಿದೆ'],
    ['hi', 'चलाएँ', 'ऑडियो तैयार किया जा रहा है...', 'चल रहा है', 'प्लेबैक पूरा हुआ', 'रोकें', 'फिर से शुरू करें', 'शुरुआत से चलाएँ', 'बंद करें', 'फिर से चलाएँ', 'इस जवाब को सुनें', 'ऑडियो रोकें', 'रुका हुआ है', 'बंद किया गया'],
    ['te', 'ప్లే చేయండి', 'ఆడియో సిద్ధమవుతోంది...', 'ప్లే అవుతోంది', 'ప్లేబ్యాక్ పూర్తయింది', 'పాజ్ చేయండి', 'కొనసాగించండి', 'మళ్లీ ప్రారంభించండి', 'ఆపివేయండి', 'మళ్లీ ప్లే చేయండి', 'ఈ సమాధానాన్ని వినండి', 'ఆడియోను పాజ్ చేయండి', 'పాజ్ చేయబడింది', 'ఆపివేయబడింది'],
  ])('localizes labels, statuses, and accessible names for %s', async (language, playLabel, generating, playing, completed, pauseLabel, resumeLabel, restartLabel, stopLabel, againLabel, playTip, pauseTip, pausedStatus, stoppedStatus) => {
    const { container } = render(<SpeechPlayback text="One sentence." language={language} apiBase="http://api" />);
    const play = screen.getByRole('button', { name: playLabel });
    expect(play.getAttribute('title')).toBe(playTip);
    await userEvent.click(play);
    await waitFor(() => expect(screen.getByText(playing)).toBeTruthy());
    const pause = screen.getByRole('button', { name: pauseLabel });
    expect(pause.getAttribute('title')).toBe(pauseTip);
    await userEvent.click(pause);
    expect(screen.getByText(pausedStatus)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: resumeLabel }));
    expect(screen.getByRole('button', { name: pauseLabel })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: restartLabel }));
    await act(async () => fireEvent.ended(container.querySelector('audio')));
    expect(screen.getByText(completed)).toBeTruthy();
    expect(screen.getByRole('button', { name: againLabel })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: stopLabel }));
    expect(screen.getByText(stoppedStatus)).toBeTruthy();
    expect(completed).toBeTruthy(); expect(generating).toBeTruthy();
  });

  it('updates playback labels immediately when the selected language changes', async () => {
    const { rerender } = render(<SpeechPlayback text="One sentence." language="en" apiBase="http://api" />);
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    await waitFor(() => expect(screen.getByText('Playing')).toBeTruthy());
    rerender(<SpeechPlayback text="One sentence." language="kn" apiBase="http://api" />);
    expect(screen.getByRole('button', { name: 'ಪ್ಲೇ' })).toBeTruthy();
    expect(screen.getByText('ನಿಲ್ಲಿಸಲಾಗಿದೆ')).toBeTruthy();
  });

  it('shows translated playback failure messages', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false });
    render(<SpeechPlayback text="एक वाक्य।" language="hi" apiBase="http://api" />);
    await userEvent.click(screen.getByRole('button', { name: 'चलाएँ' }));
    expect(await screen.findByText('ऑडियो तैयार नहीं हो सका। कृपया फिर कोशिश करें।')).toBeTruthy();
  });

  it('cancels pending TTS when another query starts and never shows a download control', async () => {
    let signal;
    vi.mocked(fetch).mockImplementation((_url, options) => {
      signal = options.signal;
      return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
    });
    const { container } = render(<SpeechPlayback text="A sentence." language="en" apiBase="http://api" />);
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByText('Generating audio...')).toBeTruthy();
    act(() => window.dispatchEvent(new Event('arogya:cancel-speech')));
    expect(signal.aborted).toBe(true);
    expect(screen.getByText('Stopped')).toBeTruthy();
    expect(container.querySelector('audio').controls).toBe(false);
    expect(container.querySelector('a')).toBeNull();
  });

  it('cancels another response before starting this one and revokes temporary blobs on stop', async () => {
    render(<><SpeechPlayback text="First." language="en" apiBase="http://api"/><SpeechPlayback text="Second." language="en" apiBase="http://api"/></>);
    const [firstPlay, secondPlay] = screen.getAllByRole('button', { name: 'Play' });
    await userEvent.click(firstPlay);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await userEvent.click(secondPlay);
    await waitFor(() => expect(screen.getAllByText('Stopped').length).toBe(1));
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('segments non-English text without hardcoding English sentence boundaries', () => {
    expect(splitSentences('ಮೊದಲ ವಾಕ್ಯ. ಎರಡನೇ ವಾಕ್ಯ.', 'kn')).toHaveLength(2);
    expect(splitSentences('पहला वाक्य। दूसरा वाक्य।', 'hi')).toHaveLength(2);
    expect(splitSentences('మొదటి వాక్యం. రెండో వాక్యం.', 'te')).toHaveLength(2);
  });
});
