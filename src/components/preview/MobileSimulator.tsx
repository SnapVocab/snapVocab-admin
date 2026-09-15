import React, { useState } from 'react';
import { Wifi, Battery, Signal, Smartphone, Layers, BookOpen } from 'lucide-react';
import { FlashcardPreview } from './FlashcardPreview';
import { DictionaryPreview } from './DictionaryPreview';
import { CardViewModel } from '../../domains/flashcard/types';

interface MobileSimulatorProps {
  card: CardViewModel;
}

export const MobileSimulator: React.FC<MobileSimulatorProps> = ({ card }) => {
  const [activeTab, setActiveTab] = useState<'card' | 'study'>('card');

  return (
    <div className="h-full flex flex-col items-center justify-between p-3.5 bg-surface-subtle/60 border-l border-border select-none overflow-hidden">
      {/* Simulator Toolbar */}
      <div className="w-full flex items-center justify-between pb-2.5 border-b border-border/80 text-xs">
        <div className="flex items-center gap-1.5 text-text font-bold">
          <Smartphone size={15} className="text-primary" />
          <span>Mobile Simulator</span>
        </div>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-md p-0.5" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'card'}
            onClick={() => setActiveTab('card')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              activeTab === 'card'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Thẻ học (SRS)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'study'}
            onClick={() => setActiveTab('study')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              activeTab === 'study'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Từ điển
          </button>
        </div>
      </div>

      {/* Phone Chassis */}
      <div className="my-auto py-1">
        <div className="w-[340px] h-[610px] bg-slate-950 rounded-[44px] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.18)] border-4 border-slate-700/60 relative flex flex-col">
          {/* Inner Screen */}
          <div className="w-full h-full bg-[#F8F9F7] rounded-[34px] overflow-hidden flex flex-col relative border border-slate-800">
            {/* Phone Status Bar */}
            <div className="w-full h-8 pt-1.5 px-6 flex items-center justify-between text-slate-800 text-[11px] font-semibold select-none z-20">
              <span>09:41</span>
              {/* Dynamic Island Notch */}
              <div className="w-20 h-3.5 bg-black rounded-full mx-auto" />
              <div className="flex items-center gap-1.5 text-slate-800">
                <Signal size={11} />
                <Wifi size={11} />
                <Battery size={13} />
              </div>
            </div>

            {/* App Header inside Simulator */}
            <div className="px-4 py-2 flex items-center justify-between border-b border-border/40 bg-surface/90 backdrop-blur-xs z-10">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🦊</span>
                <span className="font-black text-xs text-text tracking-tight">SnapVocab</span>
              </div>
              <div className="flex items-center gap-1 bg-reward-light text-reward-hover px-2 py-0.5 rounded-full text-[10px] font-bold border border-reward/30">
                <span>🔥 7 ngày streak</span>
              </div>
            </div>

            {/* Main Screen Content - Switch between Flashcard and Dictionary */}
            <div className="flex-1 overflow-y-auto p-2.5 flex flex-col justify-center items-center">
              {activeTab === 'card' ? (
                <FlashcardPreview card={card} />
              ) : (
                <DictionaryPreview card={card} />
              )}
            </div>

            {/* Bottom Home Indicator */}
            <div className="w-full h-4 flex items-center justify-center pb-0.5">
              <div className="w-28 h-1 bg-slate-400/60 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Simulator Footnote */}
      <div className="w-full text-center text-xs text-text-muted pt-2 border-t border-border/80 flex items-center justify-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-primary inline-block animate-pulse" />
        <span>Đồng bộ thời gian thực theo <strong className="font-mono text-primary font-bold">CardViewModel</strong></span>
      </div>
    </div>
  );
};

