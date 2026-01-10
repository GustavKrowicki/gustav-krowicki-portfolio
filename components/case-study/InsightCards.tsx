import { ReactNode } from 'react';

interface InsightCardProps {
  header: string;
  illustration?: ReactNode;
  text: string;
  backgroundColor: 'yellow' | 'orange' | 'cream';
}

function InsightCard({ header, illustration, text, backgroundColor }: InsightCardProps) {
  const bgColors = {
    yellow: 'bg-[#F8C118]',
    orange: 'bg-[#FF643E]',
    cream: 'bg-[#F7E5B1]',
  };

  return (
    <div className={`${bgColors[backgroundColor]} flex flex-col h-full rounded-lg`}>
      <div className="p-6 pb-4">
        <h3 className="text-2xl md:text-3xl font-bold text-black leading-tight">
          {header}
        </h3>
      </div>
      
      <div className="flex-1 flex items-center justify-center min-h-[200px] md:min-h-[300px] px-6">
        {illustration || <div className="w-full h-full" />}
      </div>
      
      <div className="p-6 pt-4">
        <p className="text-base md:text-lg text-black leading-relaxed">
          {text}
        </p>
      </div>
    </div>
  );
}

interface InsightCardsProps {
  cards: Array<{
    header: string;
    illustration?: ReactNode;
    text: string;
    backgroundColor: 'yellow' | 'orange' | 'cream';
  }>;
}

export default function InsightCards({ cards }: InsightCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {cards.map((card, index) => (
        <div key={index}>
          <InsightCard
            header={card.header}
            illustration={card.illustration}
            text={card.text}
            backgroundColor={card.backgroundColor}
          />
        </div>
      ))}
    </div>
  );
}
