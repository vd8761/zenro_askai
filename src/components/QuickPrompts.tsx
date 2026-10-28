'use client';

import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface QuickPromptsProps {
  onSelectPrompt: (promptText: string) => void;
  language?: string;
  orgTitle?: string;
}

export default function QuickPrompts({ onSelectPrompt, language, orgTitle }: QuickPromptsProps) {
  const isTamil = language === 'ta' || language?.includes('tamil');
  const isHindi = language === 'hi' || language?.includes('hindi');
  const displayOrg = orgTitle || 'Shadithya Hospital';

  const prompts = isTamil
    ? [
        {
          tag: 'சம்பளம்',
          color: '#2871FA',
          title: 'டாப் 10 அதிக சம்பளம் பெறும் ஊழியர்கள்',
          description: 'மருத்துவமனை ஊழியர்களின் மாதாந்திர மொத்த சம்பளம் மற்றும் பதவி வரிசை',
          prompt: 'அதிக சம்பளம் பெறும் டாப் 10 ஊழியர்களை அவர்களின் பதவி மற்றும் துறையுடன் காட்டுங்கள்.',
        },
        {
          tag: 'மருத்துவர்கள்',
          color: '#6111D1',
          title: 'மருத்துவர்கள் மற்றும் செவிலியர்கள்',
          description: 'அனைத்து மருத்துவர்கள், அறுவை சிகிச்சை நிபுணர்கள் மற்றும் செவிலியர்கள் பட்டியல்',
          prompt: 'அனைத்து மருத்துவர்கள், அறுவை சிகிச்சை நிபுணர்கள் மற்றும் செவிலியர்களின் பட்டியலை காட்டுங்கள்.',
        },
        {
          tag: 'துறைகள்',
          color: '#059669',
          title: 'துறை வாரியான சம்பள செலவு',
          description: 'துறை வாரியாக மொத்த சம்பள தொகை மற்றும் பணியாளர்களின் எண்ணிக்கை',
          prompt: 'துறை வாரியாக மொத்த சம்பள தொகை மற்றும் பணியாளர்களின் எண்ணிக்கையை காட்டுங்கள்.',
        },
        {
          tag: 'கடன்கள்',
          color: '#d97706',
          title: 'ஊழியர் கடன் (Loan) விவரங்கள்',
          description: 'செயலில் உள்ள கடன்கள், மாத EMI பிடித்தம் மற்றும் மீதித் தொகை விவரங்கள்',
          prompt: 'யாருக்கெல்லாம் கடன் உள்ளது, அவர்களின் மாத EMI மற்றும் மீதித் தொகை எவ்வளவு?',
        },
      ]
    : isHindi
    ? [
        {
          tag: 'वेतन',
          color: '#2871FA',
          title: 'शीर्ष 10 सबसे अधिक वेतन पाने वाले कर्मचारी',
          description: 'शादिथ्या अस्पताल के शीर्ष 10 कर्मचारियों की सूची और पदनाम',
          prompt: 'शादिथ्या अस्पताल के शीर्ष 10 सबसे अधिक वेतन पाने वाले कर्मचारियों की सूची दिखाएं।',
        },
        {
          tag: 'चिकित्सक',
          color: '#6111D1',
          title: 'डॉक्टरों और नर्सों की सूची',
          description: 'अस्पताल के सभी डॉक्टरों, सर्जनों और नर्सिंग स्टाफ की सूची',
          prompt: 'अस्पताल के सभी डॉक्टरों, सर्जनों और नर्सिंग स्टाफ की सूची दिखाएं।',
        },
        {
          tag: 'विभाग',
          color: '#059669',
          title: 'विभाग अनुसार कुल वेतन और कर्मचारी',
          description: 'प्रत्येक विभाग में कर्मचारी संख्या और उनका कुल मासिक वेतन',
          prompt: 'प्रत्येक विभाग में कितने कर्मचारी हैं और उनका कुल मासिक वेतन कितना है?',
        },
        {
          tag: 'ऋण',
          color: '#d97706',
          title: 'सक्रिय ऋण (Loans) और ईएमआई',
          description: 'किन कर्मचारियों के पास सक्रिय ऋण हैं और उनकी मासिक ईएमआई कटौती',
          prompt: 'किन कर्मचारियों के पास सक्रिय ऋण हैं और उनकी मासिक ईएमआई कितनी है?',
        },
      ]
    : [
        {
          tag: 'COMPENSATION',
          color: '#2871FA',
          title: 'Top 10 Highest Paid Staff',
          description: 'Rank hospital staff by monthly gross salary, designation, and department',
          prompt: 'Show me the top 10 highest paid employees with their designation, department, and monthly gross salary.',
        },
        {
          tag: 'SPECIALISTS',
          color: '#6111D1',
          title: 'Doctors, Surgeons & Nursing Staff',
          description: 'List all medical specialists, consultants, and nursing personnel',
          prompt: 'List all Doctors, Surgeons, Specialists, and Nursing staff with their department and designation.',
        },
        {
          tag: 'DEPARTMENTS',
          color: '#059669',
          title: 'Department Payroll Breakdown',
          description: 'Monthly payroll expenditure and employee headcount across hospital wings',
          prompt: 'Give me a department-wise breakdown of total monthly payroll and staff headcount.',
        },
        {
          tag: 'LOANS & ADVANCES',
          color: '#d97706',
          title: 'Active Employee Loans & EMIs',
          description: 'Outstanding loan pools, monthly deductions, and remaining balances',
          prompt: 'Which employees have active loans and what are their monthly EMI deductions and remaining balances?',
        },
      ];

  return (
    <div className="chat-hero-view">
      <h1 className="hero-title">Zenro Ask AI Copilot</h1>

      <p className="hero-subtitle">
        {isTamil ? (
          <>
            {displayOrg} பணியாளர் மற்றும் ஊதிய நுண்ணறிவு. சம்பளம், விடுப்பு, கடன்கள், வருகை விவரங்களை <strong>எந்த மொழியிலும்</strong> கேட்கலாம்.
          </>
        ) : (
          <>
            Direct live database intelligence for {displayOrg}. Query salaries, payslips, loans, leaves, and attendance in <strong>any language</strong> (English, தமிழ், हिंदी, తెలుగు, etc.).
          </>
        )}
      </p>

      <div className="quick-prompts-container">
        <div className="quick-prompts-header">
          <Sparkles size={15} className="sparkle-icon" />
          <span>{isTamil ? 'பரிந்துரைக்கப்பட்ட வினவல்கள்' : `Suggested Inquiries · ${displayOrg}`}</span>
        </div>

        <div className="quick-prompts-grid">
          {prompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt(p.prompt)}
              className="quick-prompt-card"
            >
              <div className="prompt-card-top">
                <span className="prompt-tag" style={{ color: p.color, borderColor: p.color }}>
                  {p.tag}
                </span>
                <ArrowRight size={14} className="prompt-action-icon" />
              </div>
              <h3 className="prompt-title">{p.title}</h3>
              <p className="prompt-desc">{p.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
