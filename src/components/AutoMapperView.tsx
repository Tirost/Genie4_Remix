import React, { useState, useRef, useEffect } from 'react';
import { MapRoom } from '../types';
import { findPath } from '../utils/gameEngine';
import {
  Compass,
  LocateFixed,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Footprints,
  Search,
  MapPin,
  Route,
} from 'lucide-react';

interface AutoMapperViewProps {
  rooms: MapRoom[];
  currentRoomId: number;
  onExecuteCommand: (cmd: string) => void;
}

export const AutoMapperView: React.FC<AutoMapperViewProps> = ({
  rooms,
  currentRoomId,
  onExecuteCommand,
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<number>(currentRoomId);
  const [zoom, setZoom] = useState<number>(1.2);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [walkingPath, setWalkingPath] = useState<string[] | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const currentRoom = rooms.find((r) => r.id === currentRoomId) || rooms[0];
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || currentRoom;

  // Path from current room to selected room
  const pathInfo = findPath(currentRoomId, selectedRoomId, rooms);

  // Center button functionality: Re-centers the view directly on the current room!
  const handleCenterOnPlayer = () => {
    if (!currentRoom) return;
    setPan({
      x: -currentRoom.x * zoom,
      y: -currentRoom.y * zoom,
    });
  };

  // Center initially
  useEffect(() => {
    handleCenterOnPlayer();
  }, [currentRoomId]);

  // Handle Canvas Dragging / Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Walk route step-by-step
  const handleWalkRoute = () => {
    if (!pathInfo || pathInfo.directions.length === 0) return;
    setWalkingPath(pathInfo.directions);

    let delay = 0;
    pathInfo.directions.forEach((dir, index) => {
      setTimeout(() => {
        onExecuteCommand(dir);
        if (index === pathInfo.directions.length - 1) {
          setWalkingPath(null);
        }
      }, delay);
      delay += 800;
    });
  };

  // Filter rooms for search dropdown
  const filteredRooms = searchQuery.trim()
    ? rooms.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.id.toString() === searchQuery.trim() ||
          r.desc?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div
      id="automapper-container"
      className="flex-1 flex flex-col md:flex-row h-full bg-stone-950 text-stone-200 overflow-hidden select-none relative"
    >
      {/* Mapper Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex-1 relative overflow-hidden bg-gradient-to-b from-[#111317] to-[#0c0d10] cursor-grab active:cursor-grabbing"
      >
        {/* Decorative Grid Pattern */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(#475569 1px, transparent 1px), radial-gradient(#475569 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            backgroundPosition: `${pan.x % 40}px ${pan.y % 40}px`,
          }}
        />

        {/* AutoMapper Controls Toolbar (Top Left) */}
        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5 bg-stone-900/90 p-1.5 rounded-lg border border-stone-800 backdrop-blur shadow-lg">
          {/* Center Button (Genie Remix specific feature) */}
          <button
            id="btn-map-center"
            onClick={handleCenterOnPlayer}
            title="Center view on current room (Genie Remix feature)"
            className="flex items-center space-x-1 px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-300 rounded text-xs font-semibold transition-colors"
          >
            <LocateFixed className="w-3.5 h-3.5 text-amber-400" />
            <span>Center on Player</span>
          </button>

          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
            title="Zoom In"
            className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded border border-stone-700 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
            title="Zoom Out"
            className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded border border-stone-700 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setZoom(1.2);
              handleCenterOnPlayer();
            }}
            title="Reset Zoom & Pan"
            className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded border border-stone-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Search Input */}
        <div className="absolute top-3 right-3 z-20 w-64 bg-stone-900/90 border border-stone-800 rounded-lg p-1.5 backdrop-blur shadow-lg">
          <div className="flex items-center space-x-1.5 px-2 py-1 bg-stone-950 rounded border border-stone-800">
            <Search className="w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room name or ID..."
              className="bg-transparent text-xs text-stone-200 focus:outline-none w-full"
            />
          </div>
          {filteredRooms.length > 0 && (
            <div className="mt-1 max-h-40 overflow-y-auto bg-stone-950 border border-stone-800 rounded divide-y divide-stone-800/60 text-xs">
              {filteredRooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRoomId(r.id);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-stone-800/80 flex items-center justify-between text-stone-300"
                >
                  <span className="truncate">{r.name}</span>
                  <span className="font-mono text-stone-500 text-[10px]">#{r.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Interactive SVG / Canvas Visualization */}
        <svg
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          {/* Centering Group: offset by half container width & height + pan */}
          <g
            transform={`translate(${
              (containerRef.current ? containerRef.current.clientWidth / 2 : 400) + pan.x
            }, ${
              (containerRef.current ? containerRef.current.clientHeight / 2 : 300) + pan.y
            }) scale(${zoom})`}
          >
            {/* Draw Exit Arcs */}
            {rooms.map((room) =>
              room.exits.map((exit, idx) => {
                const target = rooms.find((r) => r.id === exit.targetId);
                if (!target || target.id < room.id) return null; // Avoid drawing duplicate line twice

                const isPathStep =
                  pathInfo?.path.includes(room.id) && pathInfo?.path.includes(target.id);

                return (
                  <g key={`arc-${room.id}-${target.id}-${idx}`}>
                    <line
                      x1={room.x}
                      y1={room.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isPathStep ? '#38bdf8' : '#334155'}
                      strokeWidth={isPathStep ? 3 : 1.5}
                      strokeDasharray={isPathStep ? '4 2' : undefined}
                      opacity={isPathStep ? 1 : 0.6}
                    />
                    {/* Direction label in middle */}
                    <text
                      x={(room.x + target.x) / 2}
                      y={(room.y + target.y) / 2 - 4}
                      fill={isPathStep ? '#7dd3fc' : '#64748b'}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {exit.dir}
                    </text>
                  </g>
                );
              })
            )}

            {/* Draw Room Nodes */}
            {rooms.map((room) => {
              const isCurrent = room.id === currentRoomId;
              const isSelected = room.id === selectedRoomId;
              const inPath = pathInfo?.path.includes(room.id);

              return (
                <g
                  key={`room-${room.id}`}
                  transform={`translate(${room.x}, ${room.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRoomId(room.id);
                  }}
                  className="cursor-pointer group"
                >
                  {/* Glowing halo for player's current room */}
                  {isCurrent && (
                    <circle
                      r="22"
                      fill="#22c55e"
                      fillOpacity="0.2"
                      className="animate-ping"
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    r={isCurrent ? 14 : isSelected ? 12 : 10}
                    fill={
                      isCurrent
                        ? '#15803d'
                        : isSelected
                        ? '#d97706'
                        : inPath
                        ? '#0284c7'
                        : '#1e293b'
                    }
                    stroke={
                      isCurrent
                        ? '#4ade80'
                        : isSelected
                        ? '#fbbf24'
                        : inPath
                        ? '#38bdf8'
                        : '#475569'
                    }
                    strokeWidth={isCurrent || isSelected ? 2.5 : 1.5}
                  />

                  {/* Room ID inside node */}
                  <text
                    y="3"
                    fill={isCurrent || isSelected ? '#ffffff' : '#94a3b8'}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {room.id}
                  </text>

                  {/* Room Name Label */}
                  <text
                    y="22"
                    fill={
                      isCurrent
                        ? '#4ade80'
                        : isSelected
                        ? '#fbbf24'
                        : inPath
                        ? '#38bdf8'
                        : '#cbd5e1'
                    }
                    fontSize="10"
                    fontFamily="sans-serif"
                    fontWeight={isCurrent || isSelected ? 'bold' : 'normal'}
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                  >
                    {room.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend indicator */}
        <div className="absolute bottom-3 left-3 bg-stone-900/90 border border-stone-800 rounded-md px-2.5 py-1.5 text-[11px] text-stone-400 flex items-center space-x-3 shadow-md backdrop-blur">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-300" />
            <span>Player Location</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-300" />
            <span>Selected Room</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 border border-sky-300" />
            <span>Route Path</span>
          </div>
        </div>
      </div>

      {/* AutoMapper Details & Pathfinding Sidebar */}
      <div className="w-full md:w-80 bg-stone-900 border-l border-stone-800 flex flex-col p-4 space-y-4 overflow-y-auto">
        {/* Selected Room Header */}
        <div className="border-b border-stone-800 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-amber-400 font-semibold uppercase tracking-wider">
              {selectedRoom.zone} Zone
            </span>
            <span className="bg-stone-800 text-stone-300 text-[10px] font-mono px-2 py-0.5 rounded border border-stone-700">
              Room #{selectedRoom.id}
            </span>
          </div>
          <h2 className="text-base font-bold text-stone-100 mt-1">{selectedRoom.name}</h2>
          {selectedRoom.id === currentRoomId && (
            <span className="inline-block mt-1 text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-medium">
              ★ Current Location
            </span>
          )}
        </div>

        {/* Room Description */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Description
          </span>
          <p className="text-xs text-stone-300 leading-relaxed bg-stone-950/60 p-2.5 rounded border border-stone-800/80">
            {selectedRoom.desc || 'No description recorded.'}
          </p>
        </div>

        {/* Exits list */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Exits & Connections
          </span>
          <div className="grid grid-cols-2 gap-1 text-xs font-mono">
            {selectedRoom.exits.map((e, idx) => {
              const target = rooms.find((r) => r.id === e.targetId);
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedRoomId(e.targetId)}
                  className="flex items-center justify-between px-2 py-1 bg-stone-950/70 hover:bg-stone-800 border border-stone-800 rounded text-stone-300 transition-colors text-left"
                >
                  <span className="text-amber-300 font-bold uppercase">{e.dir}</span>
                  <span className="text-stone-500 text-[10px] truncate max-w-[80px]">
                    {target ? `#${target.id}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pathfinding Section */}
        <div className="space-y-2 border-t border-stone-800 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1">
              <Route className="w-3.5 h-3.5 text-sky-400" />
              Route Navigation
            </span>
            {pathInfo && pathInfo.directions.length > 0 && (
              <span className="text-xs font-mono text-sky-400 font-bold">
                {pathInfo.directions.length} {pathInfo.directions.length === 1 ? 'step' : 'steps'}
              </span>
            )}
          </div>

          {selectedRoomId === currentRoomId ? (
            <div className="text-xs text-stone-500 bg-stone-950/40 p-2.5 rounded text-center italic">
              You are already in this room.
            </div>
          ) : pathInfo && pathInfo.directions.length > 0 ? (
            <div className="space-y-2">
              <div className="bg-stone-950/80 p-2 rounded border border-stone-800 font-mono text-xs text-sky-300">
                <span className="text-stone-500">Route: </span>
                {pathInfo.directions.join(' → ')}
              </div>

              <button
                id="btn-walk-path"
                onClick={handleWalkRoute}
                disabled={walkingPath !== null}
                className={`w-full py-2 px-3 rounded flex items-center justify-center space-x-1.5 font-bold text-xs transition-colors cursor-pointer ${
                  walkingPath !== null
                    ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-md'
                }`}
              >
                <Footprints className="w-4 h-4" />
                <span>{walkingPath !== null ? 'Walking route...' : 'Walk Route to Room'}</span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-rose-400 bg-rose-950/30 p-2.5 rounded border border-rose-900/50 text-center">
              No direct overland path found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
