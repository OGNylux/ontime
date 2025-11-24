import { useState, useRef, useEffect, useCallback } from "react";
import CalendarEntryOverlay from "./CalendarEntryOverlay";

interface CalendarDayProps {
    dayOfTheMonth: string;
    dayOfTheWeek: string;
}

interface TimeEntry {
    id: string;
    startMinute: number; // minutes since midnight
    endMinute: number;   // minutes since midnight
    title?: string;
    color?: string;
}

const MINPERHOUR = 60;
const MINPERDAY = 1440;

export default function CalendarDay({ dayOfTheMonth, dayOfTheWeek }: CalendarDayProps) {
    const hours = Array.from({ length: 24 }).map((_, i) => i);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<number>(0); // in minutes
    const [dragEnd, setDragEnd] = useState<number>(0);     // in minutes
    const containerRef = useRef<HTMLDivElement>(null);
    const [hourHeight, setHourHeight] = useState(40);

    useEffect(() => {
        const updateHourHeight = () => {
            if (containerRef.current) {
                const firstHour = containerRef.current.querySelector('[data-hour]');
                if (firstHour) {
                    setHourHeight(firstHour.getBoundingClientRect().height);
                }
            }
        };
        
        updateHourHeight();
        window.addEventListener('resize', updateHourHeight);
        
        return () => window.removeEventListener('resize', updateHourHeight);
    }, []);

    // hour is integer, but we want to start at the exact minute (rounded to 15)
    const handleStart = (hour: number, event?: React.MouseEvent) => {
        setIsDragging(true);
        let minuteOfHour = 0;
        let startMinute = 0;
        if (event) {
            // Get Y position relative to the hour slot
            const rect = (event.target as HTMLElement).getBoundingClientRect();
            const y = event.clientY - rect.top;
            minuteOfHour = Math.floor((y / rect.height) * MINPERHOUR);
            startMinute = hour * MINPERHOUR + minuteOfHour;
        } else {
            minuteOfHour = new Date().getMinutes();
            startMinute = hour * MINPERHOUR + minuteOfHour;
        }
        setDragStart(startMinute);
        setDragEnd(startMinute);

        // Add global mousemove listener
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const y = e.clientY - rect.top;
            
            // Clamp y to container
            const clampedY = Math.max(0, Math.min(rect.height - 1, y));
            const totalMinutes = Math.floor((clampedY / rect.height) * MINPERDAY); // 24*60
            setDragEnd(totalMinutes);
        };
        const handleGlobalMouseUp = () => {
            handleEnd();
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
    };

    // Remove slot-based mouse move logic, now handled globally

    const handleEnd = useCallback(() => {
        if (isDragging && dragStart !== null && dragEnd !== null) {
            const start = Math.min(dragStart, dragEnd);
            const end = Math.max(dragStart, dragEnd);
            const newEntry: TimeEntry = {
                id: Date.now().toString(),
                startMinute: start,
                endMinute: end,
                title: 'New Entry'
            };
            setTimeEntries(prev => [...prev, newEntry]);
        }
        setIsDragging(false);
        setDragStart(0);
        setDragEnd(0);
    }, [isDragging, dragStart, dragEnd]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            const target = e.target as HTMLElement;
            const hour = target.getAttribute('data-hour');
            if (hour) {
                const hourNum = parseInt(hour);
                const rect = target.getBoundingClientRect();
                const y = e.touches[0].clientY - rect.top;
                const minuteOfHour = Math.floor((y / rect.height) * MINPERHOUR);
                const startMinute = hourNum * MINPERHOUR + minuteOfHour;
                    setIsDragging(true);
                    setDragStart(startMinute);
                    setDragEnd(startMinute);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            const touch = e.touches[0];
            const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
            const hourElement = elements.find(el => el.hasAttribute('data-hour'));
            if (hourElement) {
                const hour = parseInt(hourElement.getAttribute('data-hour') || '0');
                const rect = hourElement.getBoundingClientRect();
                const y = touch.clientY - rect.top;
                const minuteOfHour = Math.floor((y / rect.height) * MINPERHOUR);
                const endMinute = hour * MINPERHOUR + minuteOfHour;
                    setDragEnd(endMinute);
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            e.preventDefault();
            // Create a small delay to ensure state has updated
            setTimeout(() => {
                handleEnd();
            }, 0);
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: false });
        container.addEventListener('touchcancel', handleTouchEnd, { passive: false });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleEnd]);
    
    return (
        <div 
            className="bg-gray-50 flex-1 md:min-w-24" 
            onMouseUp={handleEnd} 
            onMouseLeave={handleEnd}
        >
            <h2 className="h-16 sticky bg-gray-50 z-30 truncate font-semibold text-center text-s md:text-base">
                <p>{dayOfTheWeek}</p>
                <p>{dayOfTheMonth}</p>
            </h2>
            <div ref={containerRef} className="relative">
                {/* Hour slots grid */}
                {hours.map((hour) => {
                    return (
                        <div
                            key={hour}
                            data-hour={hour}
                            className={`h-10 md:h-12 border border-gray-200 last:border-b-0 relative select-none transition-all bg-white hover:bg-gray-50 cursor-pointer`}
                            onMouseDown={e => handleStart(hour, e)}
                            // Drag logic handled globally
                        />
                    );
                })}
                {/* Time entry overlays */}
                {timeEntries.map((entry) => (
                    <CalendarEntryOverlay 
                        key={entry.id}
                        entry={entry}
                        hourHeight={hourHeight}
                    />
                ))}
                {/* Live drag overlay */}
                {isDragging && dragStart !== dragEnd && (
                    <CalendarEntryOverlay
                        entry={{
                            id: 'drag',
                            startMinute: Math.min(dragStart, dragEnd),
                            endMinute: Math.max(dragStart, dragEnd),
                            title: 'New Entry',
                        }}
                        hourHeight={hourHeight}
                    />
                )}
            </div>
        </div>
    );
}
