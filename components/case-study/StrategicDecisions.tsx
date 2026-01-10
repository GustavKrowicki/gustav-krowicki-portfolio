import { ReactNode } from 'react';

interface StrategicDecisionsProps {
  header: string;
  leftTitle: string;
  leftText: string;
  rightTitle: string;
  rightText: string;
  illustration?: ReactNode;
}

export default function StrategicDecisions({
  header,
  leftTitle,
  leftText,
  rightTitle,
  rightText,
  illustration,
}: StrategicDecisionsProps) {
  return (
    <div className="bg-[#E01A24] text-black rounded-2xl md:rounded-3xl overflow-hidden">
      {/* Big Bold Header */}
      <div className="py-12 md:py-16">
        <h2 className="text-6xl md:text-8xl font-bold text-black text-center">
          {header}
        </h2>
      </div>

      {/* Two Column Layout with Illustration */}
      <div className="relative pb-12 md:pb-16">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 px-6 md:px-12">
          {/* Left Column */}
          <div className="space-y-4 p-6 md:p-8">
            <h3 className="text-xl md:text-2xl font-semibold text-black">
              {leftTitle}
            </h3>
            <p className="text-base md:text-lg text-black leading-relaxed">
              {leftText}
            </p>
          </div>

          {/* Right Column */}
          <div className="space-y-4 p-6 md:p-8 md:mt-16">
            <h3 className="text-xl md:text-2xl font-semibold text-black">
              {rightTitle}
            </h3>
            <p className="text-base md:text-lg text-black leading-relaxed">
              {rightText}
            </p>
          </div>
        </div>

        {/* Illustration Space - Positioned Lower in the Middle */}
        <div className="mt-12 md:mt-4 flex items-center justify-center">
          {illustration || <div className="w-full h-full" />}
        </div>
      </div>
    </div>
  );
}
