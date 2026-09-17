'use client';

import React, { useState, useMemo } from 'react';
import type { InspectionProperty } from '@/types';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock,
  Plus
} from 'lucide-react';

interface DashboardCalendarCardProps {
  inspections: InspectionProperty[];
  onOpenBookingModal: (prefillDate?: string) => void;
  onOpenInspection?: (inspection: InspectionProperty) => void;
}

export default function DashboardCalendarCard({
  inspections,
  onOpenBookingModal,
  onOpenInspection,
}: DashboardCalendarCardProps) {
  // Current calendar view: Sep 2026 (matching the current app date context)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 8 is September (0-indexed)
  const [selectedDay, setSelectedDay] = useState(17); // Default to 17th (Today)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  // Map inspection items to date keys
  // Handle strings like 'Today' (Sep 17), 'Tomorrow' (Sep 18), 'Yesterday' (Sep 16), 'Sep 14', etc.
  const appointmentsByDay = useMemo(() => {
    const map: Record<number, InspectionProperty[]> = {};

    inspections.forEach(insp => {
      let day = 17; // Default to Today (Sep 17)
      const dStr = (insp.scheduledDate || '').toLowerCase();

      if (dStr.includes('today')) {
        day = 17;
      } else if (dStr.includes('tomorrow')) {
        day = 18;
      } else if (dStr.includes('yesterday')) {
        day = 16;
      } else if (dStr.includes('sep')) {
        const match = dStr.match(/\d+/);
        if (match) day = parseInt(match[0], 10);
      } else {
        const match = dStr.match(/\d+/);
        if (match) day = parseInt(match[0], 10);
      }

      if (!map[day]) map[day] = [];
      map[day].push(insp);
    });

    return map;
  }, [inspections]);

  const appointmentsForSelectedDay = appointmentsByDay[selectedDay] || [];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const selectedDateFormatted = `${monthNames[currentMonth].slice(0, 3)} ${selectedDay}, ${currentYear}`;
  const isTodaySelected = selectedDay === 17 && currentMonth === 8 && currentYear === 2026;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between h-[520px]">
      {/* ── Top Header ── */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Calendar</h3>
                <span className="px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 text-xs font-bold font-mono">
                  {inspections.length} Booked
                </span>
              </div>
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-700 mr-1">
              {monthNames[currentMonth].slice(0, 3)} {currentYear}
            </span>
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Mini Calendar Grid (Compact & Sleek) ── */}
        <div className="pt-2.5 pb-2">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Blank leading slots */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} className="h-7" />
            ))}

            {/* Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const hasAppointments = !!appointmentsByDay[day]?.length;
              const isSelected = selectedDay === day;
              const isToday = day === 17 && currentMonth === 8 && currentYear === 2026;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`h-7 rounded-lg text-xs font-medium relative flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-xs scale-105'
                      : isToday
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="leading-none text-[11px]">{day}</span>
                  {hasAppointments && (
                    <span
                      className={`w-1 h-1 rounded-full mt-0.5 ${
                        isSelected ? 'bg-white' : 'bg-blue-600'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Daily Schedule Header ── */}
      <div className="flex items-center justify-between py-1.5 px-2 bg-slate-50 rounded-xl border border-slate-100 my-1">
        <div className="flex items-center gap-1.5 text-xs">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-800">
            {selectedDateFormatted}
          </span>
          {isTodaySelected && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Today
            </span>
          )}
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          {appointmentsForSelectedDay.length} {appointmentsForSelectedDay.length === 1 ? 'appointment' : 'appointments'}
        </span>
      </div>

      {/* ── Scrollable Appointments List ── */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0 my-1">
        {appointmentsForSelectedDay.length > 0 ? (
          appointmentsForSelectedDay.map(apt => {
            const isDone = apt.status === 'completed';
            const isInProgress = apt.status === 'in_progress';

            return (
              <div
                key={apt.id}
                onClick={() => onOpenInspection?.(apt)}
                className="p-2.5 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer space-y-1.5 bg-white"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-500" />
                    {apt.scheduledTime}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isDone
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isInProgress
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {isDone ? 'Completed' : isInProgress ? 'In Progress' : 'Booked'}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-800 truncate" title={apt.address}>
                  {apt.address}, {apt.city}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 truncate">
                    <img
                      src={apt.assignedAgent.avatar}
                      alt={apt.assignedAgent.name}
                      className="w-4 h-4 rounded-full object-cover border border-slate-200"
                    />
                    <span className="truncate">{apt.assignedAgent.name}</span>
                  </div>
                  <span className="font-semibold text-slate-600 text-[10px] truncate max-w-[120px]">
                    {apt.clientName}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full min-h-[110px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-xs text-slate-500 font-medium">
              No appointments scheduled for {selectedDateFormatted}
            </p>
            <button
              type="button"
              onClick={() => onOpenBookingModal(selectedDateFormatted)}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Book Slot on this Date
            </button>
          </div>
        )}
      </div>

      {/* ── Card Footer CTA ── */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-400 font-medium">
          Agent appointment schedule
        </span>
        <button
          type="button"
          onClick={() => onOpenBookingModal(selectedDateFormatted)}
          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Book Appointment
        </button>
      </div>
    </div>
  );
}
