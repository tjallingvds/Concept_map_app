import { useCallback, useRef, useState } from 'react';

export const useFadeIn = <T extends Element>(threshold = 0, triggerOnce = true) => {
  const [isVisible, setVisible] = useState(false);

  const nodeRef = useRef<T | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback(
    (node: T | null) => {
      if (node) {
        nodeRef.current = node;

        if (observerRef.current) {
          observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const currentElement = nodeRef.current;
              if (!currentElement) return;

              if (entry.isIntersecting) {
                setVisible(true);
                if (triggerOnce && observerRef.current) {
                  observerRef.current.unobserve(entry.target);
                }
              } else {
                if (!triggerOnce) {
                  setVisible(false);
                }
              }
            });
          },
          {
            threshold: threshold,
          }
        );

        observerRef.current.observe(node);
      } else {
        nodeRef.current = null;

        if (observerRef.current) {
          observerRef.current.disconnect();
          observerRef.current = null;
        }
      }
    },
    [threshold, triggerOnce]
  );

  return { ref: setRef, isVisible };
};
