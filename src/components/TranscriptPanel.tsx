import type { TranscriptMessage } from '@/lib/types';

const starterMessages: TranscriptMessage[] = [
  {
    id: '1',
    role: 'user',
    text: 'I have had a sore throat and fever for two days and I am not sure what kind of care makes sense.',
  },
  {
    id: '2',
    role: 'agent',
    text: 'I can help explain care-setting options and questions to ask a clinician, but I cannot diagnose you.',
  },
];

export default function TranscriptPanel() {
  return (
    <div className="card">
      <h2 className="section-title">Transcript</h2>
      <div className="transcript">
        {starterMessages.map((message) => (
          <div key={message.id} className={`bubble ${message.role}`}>
            <strong style={{ textTransform: 'capitalize' }}>{message.role}:</strong> {message.text}
          </div>
        ))}
      </div>
    </div>
  );
}
