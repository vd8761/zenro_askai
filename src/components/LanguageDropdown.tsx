'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check, Sparkles } from 'lucide-react';

export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel?: string;
  badge?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'auto', label: 'Auto Detect', nativeLabel: 'All Languages', badge: 'AI' },
  { code: 'en', label: 'English', nativeLabel: 'English', badge: 'EN' },
  { code: 'ta', label: 'தமிழ்', nativeLabel: 'Tamil', badge: 'தமிழ்' },
  { code: 'hi', label: 'हिंदी', nativeLabel: 'Hindi', badge: 'हिंदी' },
  { code: 'te', label: 'తెలుగు', nativeLabel: 'Telugu', badge: 'తెలుగు' },
  { code: 'ml', label: 'മലയാളം', nativeLabel: 'Malayalam', badge: 'മല' },
  { code: 'kn', label: 'ಕನ್ನಡ', nativeLabel: 'Kannada', badge: 'ಕನ್ನಡ' },
  { code: 'es', label: 'Español', nativeLabel: 'Spanish', badge: 'ES' },
  { code: 'fr', label: 'Français', nativeLabel: 'French', badge: 'FR' },
  { code: 'ar', label: 'العربية', nativeLabel: 'Arabic', badge: 'AR' },
];

interface LanguageDropdownProps {
  selectedCode: string;
  onSelectLanguage: (code: string) => void;
}

export default function LanguageDropdown({
  selectedCode,
  onSelectLanguage,
}: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLang =
    SUPPORTED_LANGUAGES.find(l => l.code === selectedCode) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="modern-dropdown-wrapper" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`modern-dropdown-trigger ${isOpen ? 'active' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="trigger-icon-wrap">
          <Globe size={15} className="trigger-globe-icon" />
        </div>
        <span className="trigger-label">
          {activeLang.code === 'auto' ? 'Auto Detect (All Languages)' : `${activeLang.label} (${activeLang.nativeLabel})`}
        </span>
        <ChevronDown
          size={14}
          className={`trigger-chevron ${isOpen ? 'chevron-rotate' : ''}`}
        />
      </button>

      {/* Floating Modern Menu */}
      {isOpen && (
        <div className="modern-dropdown-menu" role="listbox">
          <div className="dropdown-menu-header">
            <Sparkles size={12} className="header-sparkle" />
            <span>Select Response Language</span>
          </div>

          <div className="dropdown-options-list">
            {SUPPORTED_LANGUAGES.map(lang => {
              const isSelected = lang.code === selectedCode;
              return (
                <div
                  key={lang.code}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelectLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`modern-dropdown-option ${isSelected ? 'selected' : ''}`}
                >
                  <div className="option-badge">{lang.badge}</div>
                  <div className="option-text-group">
                    <span className="option-primary-label">{lang.label}</span>
                    {lang.nativeLabel && lang.nativeLabel !== lang.label && (
                      <span className="option-native-label">{lang.nativeLabel}</span>
                    )}
                  </div>
                  {isSelected && (
                    <div className="option-check-icon">
                      <Check size={14} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
