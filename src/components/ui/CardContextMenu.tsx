import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Play, Heart, EyeOff, Trash2, Edit2, FolderOpen, Database } from 'lucide-react';

interface CardContextMenuProps {
  onPlayDefault?: () => void;
  onPlayCustom?: () => void;
  onOpenFileLocation?: () => void;
  onToggleFavorite?: () => void;
  onToggleHidden?: () => void;
  onDeleteFromDb?: () => void;
  onMoveToTrash?: () => void;
  onEdit?: () => void;
  isFavorite?: boolean;
  isHidden?: boolean;
}

export const CardContextMenu: React.FC<CardContextMenuProps> = ({
  onPlayDefault,
  onPlayCustom,
  onOpenFileLocation,
  onToggleFavorite,
  onToggleHidden,
  onDeleteFromDb,
  onMoveToTrash,
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
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
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
        <div className="absolute right-0 mt-2 w-56 bg-surface border border-text/10 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="py-1">
            {onPlayDefault && (
              <button onClick={() => { onPlayDefault(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-text/10 flex items-center gap-2">
                <Play size={14} /> Play (System Default)
              </button>
            )}
            {onPlayCustom && (
              <button onClick={() => { onPlayCustom(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-text/10 flex items-center gap-2">
                <Play size={14} /> Play (Custom Player)
              </button>
            )}
            
            {onOpenFileLocation && (
              <button onClick={() => { onOpenFileLocation(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-text/10 flex items-center gap-2">
                <FolderOpen size={14} /> Open file location
              </button>
            )}

            {(onPlayDefault || onPlayCustom || onOpenFileLocation) && <div className="h-px bg-text/10 my-1" />}
            
            {onEdit && (
              <button onClick={() => { onEdit(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-text/10 flex items-center gap-2">
                <Edit2 size={14} /> Edit Metadata
              </button>
            )}
            {onToggleFavorite && (
              <button onClick={() => { onToggleFavorite(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-text/10 flex items-center gap-2">
                <Heart size={14} className={isFavorite ? "fill-red-500 text-red-500" : ""} /> {isFavorite ? "Unfavorite" : "Favorite"}
              </button>
            )}
            {onToggleHidden && (
              <button onClick={() => { onToggleHidden(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-text/10 flex items-center gap-2">
                <EyeOff size={14} /> {isHidden ? "Unhide" : "Hide from library"}
              </button>
            )}
            
            {(onEdit || onToggleFavorite || onToggleHidden) && <div className="h-px bg-text/10 my-1" />}
            
            {onDeleteFromDb && (
              <button onClick={() => { onDeleteFromDb(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-text/10 flex items-center gap-2">
                <Database size={14} /> Delete from DB
              </button>
            )}
            
            {onMoveToTrash && (
              <button onClick={() => { onMoveToTrash(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-text/10 flex items-center gap-2">
                <Trash2 size={14} /> Move to Trash
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
