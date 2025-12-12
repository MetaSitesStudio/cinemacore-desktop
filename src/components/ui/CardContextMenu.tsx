import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Play, Heart, EyeOff, Trash2, Edit2 } from 'lucide-react';

interface CardContextMenuProps {
  onPlayDefault: () => void;
  onPlayCustom: () => void;
  onToggleFavorite: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  isFavorite?: boolean;
  isHidden?: boolean;
}

export const CardContextMenu: React.FC<CardContextMenuProps> = ({
  onPlayDefault,
  onPlayCustom,
  onToggleFavorite,
  onToggleHidden,
  onDelete,
  onEdit,
  isFavorite,
  isHidden
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white/90 hover:text-primary hover:bg-black/80 transition-colors border border-white/10"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-surface border border-text/10 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="py-1">
            <button onClick={() => { onPlayDefault(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-text/10 flex items-center gap-2">
              <Play size={14} /> Play (Default)
            </button>
            <button onClick={() => { onPlayCustom(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-text/10 flex items-center gap-2">
              <Play size={14} /> Play (Custom)
            </button>
            <div className="h-px bg-text/10 my-1" />
            {onEdit && (
              <button onClick={() => { onEdit(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-text/10 flex items-center gap-2">
                <Edit2 size={14} /> Edit Metadata
              </button>
            )}
            <button onClick={() => { onToggleFavorite(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-text/10 flex items-center gap-2">
              <Heart size={14} className={isFavorite ? "fill-red-500 text-red-500" : ""} /> {isFavorite ? "Unfavorite" : "Favorite"}
            </button>
            <button onClick={() => { onToggleHidden(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-text/10 flex items-center gap-2">
              <EyeOff size={14} /> {isHidden ? "Unhide" : "Hide"}
            </button>
            <div className="h-px bg-text/10 my-1" />
            <button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-text/10 flex items-center gap-2">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
