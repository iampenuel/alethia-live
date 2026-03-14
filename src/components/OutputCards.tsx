import type { SummaryCardData } from '@/lib/types';

const demoData: SummaryCardData = {
  plainSummary:
    'You want help understanding what kind of care setting may be appropriate and how to prepare for a clinician conversation.',
  carePathCategory: 'primary-care',
  questionsToAsk: [
    'What warning signs should make me get urgent help sooner?',
    'What should I monitor over the next day or two?',
    'Do I need an in-person exam or testing?',
  ],
  redFlags: ['Trouble breathing', 'Severe worsening symptoms', 'Confusion or fainting'],
  disclaimer:
    'Informational only. This does not diagnose or replace professional medical care.',
};

function formatCarePath(value: SummaryCardData['carePathCategory']) {
  return value.replace(/-/g, ' ');
}

export default function OutputCards() {
  return (
    <div className="stack">
      <div className="card">
        <h2 className="section-title">Plain-English Summary</h2>
        <p className="muted">{demoData.plainSummary}</p>
      </div>

      <div className="card">
        <h2 className="section-title">Care Path Category</h2>
        <p style={{ margin: 0, textTransform: 'capitalize' }}>{formatCarePath(demoData.carePathCategory)}</p>
      </div>

      <div className="card">
        <h2 className="section-title">Questions to Ask a Clinician</h2>
        <ul className="list">
          {demoData.questionsToAsk.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2 className="section-title">Emergency Red Flags</h2>
        <ul className="list">
          {demoData.redFlags.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="footer-note">{demoData.disclaimer}</p>
      </div>
    </div>
  );
}
