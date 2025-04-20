import { useFadeIn } from '../hooks/use-fade-in';

interface FadeInItemProps {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  once?: boolean;
}

export const FadeInItem: React.FC<FadeInItemProps> = ({ children, className = '', threshold = 0.1, once = true }) => {
  const { ref, isVisible } = useFadeIn<HTMLDivElement>(threshold, once);

  return (
    <div
      ref={ref}
      className={`${className} opacity-0 transition-all duration-700 ease-out
                       ${isVisible ? 'opacity-100 translate-y-0' : 'translate-y-10'}`}
    >
      {children}
    </div>
  );
};
