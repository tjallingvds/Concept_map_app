import React, { JSX } from 'react';
import { useFadeIn } from '../hooks/use-fade-in';

interface FeatureData {
  title: string;
  description: string;
  icon: JSX.Element;
}

interface FeatureCardProps {
  feature: FeatureData;
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, index }) => {
  const { ref, isVisible } = useFadeIn<HTMLDivElement>(0.1, true);

  const delayClass = `delay-${index * 100}`;

  return (
    <div
      ref={ref}
      className={`p-6 rounded-xl border border-border bg-card shadow-sm text-center
                 opacity-0 transition-all duration-700 ease-out ${delayClass}
                 ${isVisible ? 'opacity-100 translate-y-0' : 'translate-y-10'}`}
    >
      <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto">
        {feature.icon}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
      <p className="text-muted-foreground">{feature.description}</p>
    </div>
  );
};

export default FeatureCard;
