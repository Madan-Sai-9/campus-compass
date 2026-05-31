import React, { useState, useEffect } from 'react';
import { Map, Footprints, Wifi, Accessibility, Compass, ShieldAlert, MapPin } from 'lucide-react';

export default function CampusMap({ selectedBuilding, setSelectedBuilding }) {
  // THE FIX: Initialize array as an empty loop fallback explicitly to avoid runtime crashes
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeRoutePath, setActiveRoutePath] = useState('');
  const [routeMetrics, setRouteMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(false);

  // Sync locations on mount
  useEffect(() => {
    async function streamMapCoordinates() {
      try {
        const res = await fetch('/api/v2/map/locations');
        if (!res.ok) throw new Error('Network spatial matrix sync failure.');
        const data = await res.json();
        setLocations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Map parsing runtime error:', err);
        setErrorStatus(true);
      } finally {
        setLoading(false);
      }
    }
    streamMapCoordinates();
  }, []);

  // Synchronize dynamic selected building state changes (from global search or parent state updates)
  useEffect(() => {
    if (selectedBuilding && locations.length > 0) {
      const targetAsset = locations.find(l => l.id === selectedBuilding);
      if (targetAsset) {
        setSelectedLocation(targetAsset);
        // Automatically calculate path on change
        fetch(`/api/v2/map/route?origin=hostel_boys&destination=${selectedBuilding}`)
          .then(res => {
            if (!res.ok) throw new Error('Path calculation fault.');
            return res.json();
          })
          .then(data => {
            setActiveRoutePath(data.path);
            setRouteMetrics(data.metrics);
          })
          .catch(err => console.error(err));
      }
    }
  }, [selectedBuilding, locations]);

  const generateCampusRoute = async (destinationId) => {
    if (setSelectedBuilding) {
      setSelectedBuilding(destinationId);
    } else {
      const targetAsset = locations.find(l => l.id === destinationId);
      setSelectedLocation(targetAsset);
      
      try {
        // Default baseline origin configured as Boys Hostel Block for distance mapping
        const res = await fetch(`/api/v2/map/route?origin=hostel_boys&destination=${destinationId}`);
        if (!res.ok) throw new Error('Path calculation fault.');
        const data = await res.json();
        
        setActiveRoutePath(data.path);
        setRouteMetrics(data.metrics);
      } catch (err) {
        console.error('Failed to parse vector connection segments:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-[450px] bg-bg-card border border-border-color rounded-xl flex flex-col items-center justify-center gap-3">
        <Compass className="w-8 h-8 text-[var(--accent-primary)] animate-spin" />
        <p className="text-sm text-[var(--text-secondary)] tracking-wide">Syncing campus spatial coordinates from cloud database...</p>
      </div>
    );
  }

  if (errorStatus) {
    return (
      <div className="h-[450px] bg-bg-card border border-danger/20 rounded-xl flex flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert className="w-10 h-10 text-[var(--color-danger)]" />
        <h4 className="text-md font-semibold font-display">Spatial Engine Offline</h4>
        <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed">
          The app failed to interface with `/api/v2/map/locations`. Verify that your database server is running and migrations are applied.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-color)]">
      
      {/* Sidebar Navigation: List of Grid Assets */}
      <div className="lg:col-span-1 flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-2 text-left">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 block">Infrastructure Hub</span>
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => generateCampusRoute(loc.id)}
            className={`flex items-center gap-3 p-3 text-xs font-semibold rounded-lg border transition-all ${
              selectedLocation?.id === loc.id
                ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] border-[var(--border-hover)] shadow-sm'
                : 'text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span 
              className="w-1.5 h-1.5 rounded-full block shrink-0" 
              style={{
                backgroundColor: 
                  loc.asset_category === 'hostel' ? 'var(--color-success)' :
                  loc.asset_category === 'mess' ? 'var(--color-warning)' :
                  loc.asset_category === 'sports' ? 'var(--color-info)' : 'var(--accent-primary)'
              }}
            />
            <span className="truncate">{loc.name}</span>
          </button>
        ))}
      </div>

      {/* Main Vector SVG Mapping Container */}
      <div className="lg:col-span-2 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)] flex items-center justify-center relative min-h-[400px]">
        <svg viewBox="0 0 800 500" className="w-full h-auto select-none rounded-lg shadow-inner bg-[#06080F]">
          {/* Animated Route Line Overlay Layer */}
          {activeRoutePath && (
            <path
              d={activeRoutePath}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="map-route-line"
            />
          )}

          {/* Render Geometric Asset Nodes across SVG Grid points */}
          {locations.map((loc) => (
            <g
              key={loc.id}
              onClick={() => generateCampusRoute(loc.id)}
              className="cursor-pointer group"
            >
              {loc.asset_category === 'sports' ? (
                <circle
                  cx={loc.center_x}
                  cy={loc.center_y}
                  r="42"
                  className={`transition-all duration-300 ${selectedLocation?.id === loc.id ? 'fill-accent-primary/20 stroke-accent-primary stroke-2' : 'fill-[var(--bg-card)] stroke-[var(--border-color)] stroke-1 group-hover:stroke-[var(--border-hover)]'}`}
                />
              ) : (
                <rect
                  x={loc.center_x - 60}
                  y={loc.center_y - 22}
                  width="120"
                  height="44"
                  rx="6"
                  className={`transition-all duration-300 ${selectedLocation?.id === loc.id ? 'fill-accent-primary/20 stroke-accent-primary stroke-2' : 'fill-[var(--bg-card)] stroke-[var(--border-color)] stroke-1 group-hover:stroke-[var(--border-hover)]'}`}
                />
              )}
              <text
                x={loc.center_x}
                y={loc.center_y + 4}
                textAnchor="middle"
                className="fill-[var(--text-primary)] font-sans text-[10px] font-semibold tracking-wide pointer-events-none select-none transition-colors group-hover:fill-[var(--accent-primary)]"
              >
                {loc.name.split(' ')[0]} {loc.name.split(' ')[1] || ''}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Right Side Info Matrix Card Overlay */}
      <div className="lg:col-span-1 bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)] flex flex-col justify-between text-left">
        {selectedLocation ? (
          <div className="space-y-5 flex flex-col h-full justify-between">
            <div className="space-y-2.5">
              <span className="text-[9px] font-bold uppercase tracking-widest bg-[var(--bg-secondary)] text-[var(--accent-primary)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                @{selectedLocation.asset_category}
              </span>
              <h3 className="text-lg font-bold text-[var(--text-primary)] font-display tracking-tight pt-1">{selectedLocation.name}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{selectedLocation.description}</p>
            </div>
            
            <div className="border-t border-[var(--border-color)] pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center"><span className="text-[var(--text-secondary)] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Floors Count:</span><span className="font-semibold text-[var(--text-primary)]">{selectedLocation.floors_count} F</span></div>
              <div className="flex justify-between items-center"><span className="text-[var(--text-secondary)] flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Local SSID:</span><span className="font-mono text-[var(--accent-primary)] font-medium">{selectedLocation.campus_wifi_ssid}</span></div>
              <div className="flex justify-between items-center"><span className="text-[var(--text-secondary)] flex items-center gap-1.5"><Accessibility className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Accessibility:</span><span className="text-[var(--text-primary)] font-medium">{selectedLocation.accessibility_verified ? 'Verified Support' : 'Standard'}</span></div>
              
              {routeMetrics && (
                <div className="flex justify-between items-center border-t border-[var(--border-color)] mt-3 pt-3">
                  <span className="text-[var(--text-secondary)] flex items-center gap-1.5 font-medium"><Footprints className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> Est. Walk Time:</span>
                  <span className="text-xs font-bold text-[var(--color-success)] bg-[var(--color-success)]/10 px-2 py-0.5 rounded border border-[var(--color-success)]/20">{routeMetrics.estimated_minutes}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-[var(--text-secondary)] m-auto flex flex-col items-center gap-2">
            <Map className="w-5 h-5 text-[var(--text-muted)]" />
            <p className="text-xs max-w-[180px] leading-normal mx-auto">Select a regional campus asset node to execute dynamic path routing profiles.</p>
          </div>
        )}
      </div>

    </div>
  );
}
