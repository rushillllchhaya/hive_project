'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { InspectionProperty } from '@/types';
import { CheckCircle2, RefreshCw, ZoomIn, ZoomOut, Maximize2, Minimize2, X } from 'lucide-react';

interface InspectionMapProps {
  inspections: InspectionProperty[];
  selectedId?: string | null;
  onSelectInspection?: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onOpenTemplate?: (inspection: InspectionProperty) => void;
  selectedAgentFilter?: string;
}

export default function InspectionMap({
  inspections,
  selectedId,
  onSelectInspection,
  onToggleStatus,
  onOpenTemplate,
  selectedAgentFilter = 'all',
}: InspectionMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'done'>('all');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Invalidate map size when expanded/collapsed or container size changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [isExpanded]);

  // Collapse on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Filtered properties based on agent & status filter
  const filtered = inspections.filter(item => {
    if (selectedAgentFilter !== 'all' && item.assignedAgent.name !== selectedAgentFilter) {
      return false;
    }
    if (filterMode === 'pending') return item.status !== 'completed';
    if (filterMode === 'done') return item.status === 'completed';
    return true;
  });

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      try {
        const L = (await import('leaflet')).default;

        if (!isMounted || !mapContainerRef.current) return;

        // Clean any leftover leaflet id on hot reload
        if ((mapContainerRef.current as any)._leaflet_id) {
          (mapContainerRef.current as any)._leaflet_id = null;
        }

        // Center on Denver, CO region
        const map = L.map(mapContainerRef.current, {
          center: [39.7392, -104.9903],
          zoom: 9,
          zoomControl: false,
          scrollWheelZoom: true,
        });

        // Add official clean OpenStreetMap tiles (no watermark / no API key required)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        setMapLoaded(true);
      } catch (err) {
        console.error('Error initializing map:', err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when filtered inspections change
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    let isMounted = true;

    const renderMarkers = async () => {
      const L = (await import('leaflet')).default;
      if (!isMounted || !mapInstanceRef.current) return;

      const map = mapInstanceRef.current;

      // Remove existing markers
      Object.values(markersRef.current).forEach((marker: any) => {
        map.removeLayer(marker);
      });
      markersRef.current = {};

      const latLngs: [number, number][] = [];

      filtered.forEach(prop => {
        const isDone = prop.status === 'completed';
        const isInProgress = prop.status === 'in_progress';
        const isSelected = selectedId === prop.id;

        // Custom HTML Marker matching Spectora's clean pin design
        const markerHtml = `
          <div class="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-110 ${isSelected ? 'scale-110 z-50' : 'z-20'}">
            ${
              isInProgress
                ? `<div class="absolute -inset-1 rounded-full bg-amber-400/40 animate-ping"></div>`
                : isDone
                ? ''
                : `<div class="absolute -inset-1 rounded-full bg-blue-400/30 animate-pulse"></div>`
            }
            <div class="relative w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold shadow-md border-2 border-white transition-all ${
              isDone
                ? 'bg-emerald-600 shadow-emerald-500/30'
                : isInProgress
                ? 'bg-amber-500 shadow-amber-500/30'
                : 'bg-blue-600 shadow-blue-500/30'
            }">
              ${
                isDone
                  ? `<svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`
                  : isInProgress
                  ? `<svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
                  : `<svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>`
              }
            </div>
            <div class="w-2 h-2 rotate-45 -mt-1 ${
              isDone ? 'bg-emerald-600' : isInProgress ? 'bg-amber-500' : 'bg-blue-600'
            }"></div>
            <div class="mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight shadow-sm whitespace-nowrap ${
              isDone
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : isInProgress
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }">
              ${prop.assignedAgent.name.split(' ')[0]} ${isDone ? '✓' : ''}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: markerHtml,
          className: 'custom-map-marker',
          iconSize: [42, 54],
          iconAnchor: [21, 48],
          popupAnchor: [0, -48],
        });

        const marker = L.marker([prop.lat, prop.lng], { icon: customIcon }).addTo(map);

        // Rich popup content with photo, agent details, and actions
        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 font-sans';
        popupContent.innerHTML = `
          <div class="w-64 space-y-2.5">
            <div class="relative h-28 w-full rounded-xl overflow-hidden bg-slate-100 shadow-inner">
              <img src="${prop.thumbnail}" alt="${prop.address}" class="w-full h-full object-cover" />
              <div class="absolute top-2 right-2">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm ${
                  isDone ? 'bg-emerald-600' : isInProgress ? 'bg-amber-500' : 'bg-blue-600'
                }">
                  ${isDone ? 'Done' : isInProgress ? 'In Progress' : 'To Inspect'}
                </span>
              </div>
            </div>

            <div>
              <h4 class="font-bold text-slate-900 text-sm leading-tight">${prop.address}</h4>
              <p class="text-[11px] text-slate-500 mt-0.5 font-medium">${prop.city}, ${prop.state} ${prop.zip}</p>
            </div>

            <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <img src="${prop.assignedAgent.avatar}" alt="${prop.assignedAgent.name}" class="w-6 h-6 rounded-full object-cover border border-slate-200" />
                <div>
                  <div class="font-bold text-slate-800 text-[11px]">${prop.assignedAgent.name}</div>
                  <div class="text-[9px] text-slate-400">Assigned Inspector</div>
                </div>
              </div>
              <div class="text-right">
                <span class="font-mono font-bold text-blue-600 text-xs">${prop.scheduledTime}</span>
              </div>
            </div>

            <div class="pt-2 flex items-center gap-1.5">
              <button id="toggle-done-${prop.id}" class="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isDone
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }">
                ${isDone ? '↺ Mark Pending' : '✓ Mark as Done'}
              </button>
              <button id="open-studio-${prop.id}" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors" title="Open in Template Studio">
                Template
              </button>
            </div>
          </div>
        `;

        // Wire popup click events
        marker.bindPopup(popupContent, {
          maxWidth: 290,
          className: 'custom-leaflet-popup',
        });

        marker.on('popupopen', () => {
          const btnToggle = document.getElementById(`toggle-done-${prop.id}`);
          if (btnToggle) {
            btnToggle.onclick = () => {
              onToggleStatus(prop.id);
              marker.closePopup();
            };
          }
          const btnStudio = document.getElementById(`open-studio-${prop.id}`);
          if (btnStudio && onOpenTemplate) {
            btnStudio.onclick = () => {
              onOpenTemplate(prop);
            };
          }
        });

        marker.on('click', () => {
          onSelectInspection?.(prop.id);
        });

        markersRef.current[prop.id] = marker;
        latLngs.push([prop.lat, prop.lng]);
      });

      // If a specific inspection is selected, zoom/pan to it
      if (selectedId && markersRef.current[selectedId]) {
        const selMarker = markersRef.current[selectedId];
        map.setView(selMarker.getLatLng(), 13, { animate: true });
        selMarker.openPopup();
      }
    };

    renderMarkers();

    return () => {
      isMounted = false;
    };
  }, [filtered, selectedId, mapLoaded]);

  // Center view helper
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([39.7392, -104.9903], 9, { animate: true });
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const pendingCount = inspections.filter(i => i.status !== 'completed').length;
  const doneCount = inspections.filter(i => i.status === 'completed').length;

  return (
    <>
      {/* Click-outside backdrop when map is expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[9980] bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsExpanded(false)}
          title="Click outside map to collapse"
        />
      )}

      <div
        className={`flex flex-col border shadow-xs transition-all duration-300 ${
          isExpanded
            ? 'fixed top-24 sm:top-28 bottom-8 sm:bottom-12 left-4 sm:left-12 right-4 sm:right-12 max-w-5xl mx-auto z-[9985] rounded-3xl shadow-2xl border-2 border-blue-400/80 bg-white overflow-hidden'
            : 'relative w-full h-full min-h-[440px] rounded-2xl border-slate-200 bg-slate-100 overflow-hidden'
        }`}
      >
        {/* Top Map Control Bar */}
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Status Filter Badges */}
          <div className="flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-sm pointer-events-auto">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All ({inspections.length})
            </button>
            <button
              onClick={() => setFilterMode('pending')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterMode === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Needs Inspection ({pendingCount})
            </button>
            <button
              onClick={() => setFilterMode('done')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterMode === 'done'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Done ({doneCount})
            </button>
          </div>

          {/* Zoom, Recenter, and Expand/Collapse Controls */}
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-sm p-1 pointer-events-auto">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetView}
              title="Reset Map View"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-slate-200 mx-0.5" />

            {/* Expand / Collapse Button */}
            <button
              onClick={() => setIsExpanded(prev => !prev)}
              title={isExpanded ? "Collapse map view (or click outside)" : "Expand map to large view"}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isExpanded
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50'
              }`}
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Expand</span>
                </>
              )}
            </button>

            {isExpanded && (
              <button
                onClick={() => setIsExpanded(false)}
                title="Close expanded view"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Map Canvas Container */}
        <div ref={mapContainerRef} className="w-full h-full min-h-[440px] flex-1 z-0" />

        {/* Legend Footer */}
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-sm text-[11px] flex items-center gap-3.5 text-slate-600 pointer-events-auto">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span className="font-semibold text-emerald-800">Done / Finished</span>
          </div>
        </div>

        {isExpanded && (
          <div className="absolute bottom-3 right-3 z-20 bg-slate-900/80 text-white backdrop-blur-md rounded-xl px-3 py-1.5 text-[11px] font-medium pointer-events-none shadow-sm flex items-center gap-1.5">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/20 font-mono text-[10px]">Esc</kbd> or click outside to collapse</span>
          </div>
        )}
      </div>
    </>
  );
}
