import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { SpeechExercise } from '../src/components/exercises/speech-exercise';

afterEach(() => vi.unstubAllGlobals());
function Subject() {
  const [value, setValue] = useState('');
  return (
    <SpeechExercise
      config={{ audioText: 'My name is Ali.', language: 'en-US' }}
      value={value}
      onChange={setValue}
      disabled={false}
    />
  );
}
test('speech capture records, transcribes, plays back locally and releases microphone resources', async () => {
  const stopped = vi.fn();
  const revoke = vi.fn();
  const media = { getTracks: () => [{ stop: stopped }] };
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(media) },
  });
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:local-speech'),
      revokeObjectURL: revoke,
    }),
  );
  class Recorder {
    state = 'inactive';
    mimeType = 'audio/webm';
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    start() {
      this.state = 'recording';
    }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['audio'], { type: this.mimeType }) });
      this.onstop?.();
    }
  }
  const instances: Recognition[] = [];
  class Recognition {
    onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null = null;
    onend: (() => void) | null = null;
    stop = vi.fn();
    abort = vi.fn();
    start() {
      instances.push(this);
    }
  }
  vi.stubGlobal('MediaRecorder', Recorder);
  vi.stubGlobal('SpeechRecognition', Recognition);
  const view = render(<Subject />);
  await userEvent.click(screen.getByRole('button', { name: 'Gapirish' }));
  await expect(screen.findByText('Ovoz yozilmoqda…')).resolves.toBeVisible();
  instances[0]!.onresult?.({ results: { 0: { 0: { transcript: 'My name is Ali' } } } });
  instances[0]!.onend?.();
  await waitFor(() => expect(screen.getByLabelText('Aytilgan matn')).toHaveValue('My name is Ali'));
  expect(view.container.querySelector('audio')).toHaveAttribute('src', 'blob:local-speech');
  expect(stopped).toHaveBeenCalled();
  view.unmount();
  expect(revoke).toHaveBeenCalledWith('blob:local-speech');
});
test('denied microphone access leaves manual transcript entry usable', async () => {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockRejectedValue(new Error('Mikrofonga ruxsat berilmadi.')) },
  });
  render(<Subject />);
  await userEvent.click(screen.getByRole('button', { name: 'Gapirish' }));
  await expect(screen.findByText('Mikrofonga ruxsat berilmadi.')).resolves.toBeVisible();
  await userEvent.type(screen.getByLabelText('Aytilgan matn'), 'My name is Ali');
  expect(screen.getByLabelText('Aytilgan matn')).toHaveValue('My name is Ali');
});
