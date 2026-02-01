import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RecentExperiment } from '@/api/dashboard';
import ExperimentCard from './ExperimentCard';

interface RecentCarouselProps {
  experiments: RecentExperiment[];
}

export default function RecentCarousel({ experiments }: RecentCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCards, setVisibleCards] = useState(3);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Update visible cards based on screen width
  useEffect(() => {
    const updateVisibleCards = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setVisibleCards(1);
      } else if (width < 1024) {
        setVisibleCards(2);
      } else {
        setVisibleCards(3);
      }
    };

    updateVisibleCards();
    window.addEventListener('resize', updateVisibleCards);
    return () => window.removeEventListener('resize', updateVisibleCards);
  }, []);

  const maxIndex = Math.max(0, experiments.length - visibleCards);
  const numDots = Math.min(5, maxIndex + 1);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, maxIndex)));
  }, [maxIndex]);

  const goNext = useCallback(() => {
    goToIndex(currentIndex + 1);
  }, [currentIndex, goToIndex]);

  const goPrev = useCallback(() => {
    goToIndex(currentIndex - 1);
  }, [currentIndex, goToIndex]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) >= minSwipeDistance) {
      if (distance > 0) {
        goNext();
      } else {
        goPrev();
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Map current index to dot index (for more items than dots)
  const getDotIndex = () => {
    if (maxIndex === 0) return 0;
    if (numDots >= maxIndex + 1) return currentIndex;
    return Math.round((currentIndex / maxIndex) * (numDots - 1));
  };

  if (experiments.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
        Recent Experiments
      </h2>

      <div className="relative">
        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 hidden sm:flex"
            onClick={goPrev}
            aria-label="Previous experiments"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {currentIndex < maxIndex && (
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 hidden sm:flex"
            onClick={goNext}
            aria-label="Next experiments"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Cards Container */}
        <div
          ref={containerRef}
          className="overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex gap-4 transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(-${currentIndex * (256 + 16)}px)`,
            }}
          >
            {experiments.map((experiment) => (
              <ExperimentCard key={experiment.id} experiment={experiment} />
            ))}
          </div>
        </div>

        {/* Dot Indicators */}
        {numDots > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: numDots }).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (numDots >= maxIndex + 1) {
                    goToIndex(index);
                  } else {
                    goToIndex(Math.round((index / (numDots - 1)) * maxIndex));
                  }
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === getDotIndex()
                    ? 'bg-teal-600'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
