import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { Maximize2, Minimize2, RotateCcw, X, GripHorizontal, Move } from 'lucide-react';

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

export interface DraggableModalContextValue {
  isMaximized: boolean;
  toggleMaximize: () => void;
  resetPositionAndSize: () => void;
  isDragging: boolean;
  isResizing: boolean;
  close: () => void;
}

export const DraggableModalContext = createContext<DraggableModalContextValue | null>(null);

export const useDraggableModal = () => {
  const ctx = useContext(DraggableModalContext);
  return ctx;
};

export interface DraggableResizableModalProps {
  children: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
  backdropClassName?: string;
  initialWidth?: number;
  initialHeight?: number;
  initialPosition?: { x: number; y: number } | null;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  title?: React.ReactNode;
  showControls?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  zIndex?: string;
  modalId?: string;
  'aria-label'?: string;
  'aria-modal'?: boolean;
  role?: string;
}

export const DraggableResizableModal: React.FC<DraggableResizableModalProps> = ({
  children,
  isOpen = true,
  onClose,
  className = '',
  backdropClassName = '',
  initialWidth,
  initialHeight,
  initialPosition,
  minWidth = 320,
  minHeight = 180,
  maxWidth,
  maxHeight,
  title,
  showControls = true,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  zIndex = 'z-40',
  modalId,
  'aria-label': ariaLabel,
  'aria-modal': ariaModal = true,
  role = 'dialog',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const viewportW = typeof window !== 'undefined' ? window.innerWidth || 1024 : 1024;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight || 768 : 768;
  const defaultLandscapeWidth = Math.max(320, Math.min(Math.round(viewportW * 0.70), viewportW - 24));
  const defaultLandscapeHeight = Math.max(240, Math.min(Math.round(viewportH * 0.60), viewportH - 24));

  const [position, setPosition] = useState<Position | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeDirection, setActiveDirection] = useState<ResizeDirection | null>(null);

  // Pre-maximize saved dimensions
  const savedStateRef = useRef<{ position: Position | null; size: Size | null }>({
    position: null,
    size: null,
  });

  const isInitializedRef = useRef(false);

  // Reset initialization state whenever modal closes
  useEffect(() => {
    if (!isOpen) {
      isInitializedRef.current = false;
      setIsMaximized(false);
      setIsDragging(false);
      setIsResizing(false);
      setActiveDirection(null);
    }
  }, [isOpen]);

  // Measure initial natural geometry on mount or when opening
  useLayoutEffect(() => {
    if (!isOpen) return;
    if (!isInitializedRef.current && modalRef.current) {
      const curW = typeof window !== 'undefined' ? window.innerWidth : viewportW;
      const curH = typeof window !== 'undefined' ? window.innerHeight : viewportH;

      const calculatedWidth = initialWidth || defaultLandscapeWidth;
      const calculatedHeight = initialHeight || defaultLandscapeHeight;

      const finalW = Math.min(calculatedWidth, curW - 24);
      const finalH = Math.min(calculatedHeight, curH - 24);

      let left = Math.max(12, Math.round((curW - finalW) / 2));
      let top = Math.max(12, Math.round((curH - finalH) / 2));

      if (initialPosition && typeof initialPosition.x === 'number' && typeof initialPosition.y === 'number') {
        // Clamped smartly so context menu doesn't bleed off-screen
        left = Math.max(12, Math.min(initialPosition.x, curW - finalW - 12));
        top = Math.max(12, Math.min(initialPosition.y, curH - finalH - 12));
      }

      setPosition({ x: left, y: top });
      setSize({ width: finalW, height: finalH });
      isInitializedRef.current = true;
    }
  }, [isOpen, initialWidth, initialHeight, initialPosition, defaultLandscapeWidth, defaultLandscapeHeight, viewportW, viewportH]);

  // Keep window in bounds if browser window resizes
  useEffect(() => {
    const handleWindowResize = () => {
      if (!position || !size || isMaximized) return;
      let newX = position.x;
      let newY = position.y;
      let newW = size.width;
      let newH = size.height;

      if (newW > viewportW - 24) newW = Math.max(minWidth, viewportW - 24);
      if (newH > viewportH - 24) newH = Math.max(minHeight, viewportH - 24);

      if (newX + newW > viewportW - 12) newX = Math.max(12, viewportW - newW - 12);
      if (newY + newH > viewportH - 12) newY = Math.max(12, viewportH - newH - 12);

      setPosition({ x: newX, y: newY });
      setSize({ width: newW, height: newH });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [position, size, isMaximized, minWidth, minHeight]);

  // ESC key listener
  useEffect(() => {
    if (!isOpen || !closeOnEsc || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  // Reset to initial centered layout
  const resetPositionAndSize = useCallback(() => {
    setIsMaximized(false);
    isInitializedRef.current = false;
    setPosition(null);
    setSize(null);
    // Trigger re-measurement in next microtask
    setTimeout(() => {
      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const w = Math.min(Math.round(rect.width), viewportW - 24);
        const h = Math.min(Math.round(rect.height), viewportH - 24);
        const left = Math.max(12, Math.round((viewportW - w) / 2));
        const top = Math.max(12, Math.round((viewportH - h) / 2));
        setPosition({ x: left, y: top });
        setSize({ width: w, height: h });
        isInitializedRef.current = true;
      }
    }, 20);
  }, []);

  // Toggle Maximize / Restore
  const toggleMaximize = useCallback(() => {
    if (isMaximized) {
      setIsMaximized(false);
      if (savedStateRef.current.position && savedStateRef.current.size) {
        setPosition(savedStateRef.current.position);
        setSize(savedStateRef.current.size);
      } else {
        resetPositionAndSize();
      }
    } else {
      savedStateRef.current = { position, size };
      setIsMaximized(true);
    }
  }, [isMaximized, position, size, resetPositionAndSize]);

  // Drag handling refs
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    modalWidth: number;
    modalHeight: number;
  }>({
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    modalWidth: 0,
    modalHeight: 0,
  });

  // Start Drag
  const handlePointerDownHeader = (e: React.PointerEvent) => {
    if (isMaximized) return;

    // Check if target is interactive
    const target = e.target as HTMLElement;
    if (
      target.closest(
        'button, input, textarea, select, a, [role="button"], [role="tab"], [data-no-drag="true"]'
      )
    ) {
      return;
    }

    if (!position || !size) {
      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        setPosition({ x: rect.left, y: rect.top });
        setSize({ width: rect.width, height: rect.height });
        dragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          initialPosX: rect.left,
          initialPosY: rect.top,
          modalWidth: rect.width,
          modalHeight: rect.height,
        };
      }
    } else {
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialPosX: position.x,
        initialPosY: position.y,
        modalWidth: size.width,
        modalHeight: size.height,
      };
    }

    setIsDragging(true);

    const handlePointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - dragRef.current.startX;
      const dy = moveEv.clientY - dragRef.current.startY;

      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const w = dragRef.current.modalWidth;
      const h = dragRef.current.modalHeight;

      // Safe viewport boundary clamps: keep at least 80px visible horizontally, 40px vertically
      const minX = -(w - 80);
      const maxX = viewportW - 80;
      const minY = 8;
      const maxY = viewportH - 44;

      const newX = Math.max(minX, Math.min(maxX, dragRef.current.initialPosX + dx));
      const newY = Math.max(minY, Math.min(maxY, dragRef.current.initialPosY + dy));

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Resize handling refs
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startPosX: number;
    startPosY: number;
    direction: ResizeDirection;
  }>({
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startPosX: 0,
    startPosY: 0,
    direction: 'se',
  });

  // Helper to determine active cursor for resizing
  const getResizeCursor = (dir: ResizeDirection | null): string => {
    switch (dir) {
      case 'n':
      case 's':
        return 'cursor-ns-resize';
      case 'e':
      case 'w':
        return 'cursor-ew-resize';
      case 'nw':
      case 'se':
        return 'cursor-nwse-resize';
      case 'ne':
      case 'sw':
        return 'cursor-nesw-resize';
      default:
        return '';
    }
  };

  // Start Resize
  const startResize = (e: React.PointerEvent, direction: ResizeDirection) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();

    let curPos = position;
    let curSize = size;
    if (!curPos || !curSize) {
      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        curPos = { x: rect.left, y: rect.top };
        curSize = { width: rect.width, height: rect.height };
        setPosition(curPos);
        setSize(curSize);
      } else {
        return;
      }
    }

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }

    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: curSize.width,
      startHeight: curSize.height,
      startPosX: curPos.x,
      startPosY: curPos.y,
      direction,
    };

    setIsResizing(true);
    setActiveDirection(direction);

    const handlePointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - resizeRef.current.startX;
      const dy = moveEv.clientY - resizeRef.current.startY;

      const curViewportW = typeof window !== 'undefined' ? window.innerWidth : viewportW;
      const curViewportH = typeof window !== 'undefined' ? window.innerHeight : viewportH;

      const effMinWidth = Math.max(160, Math.min(minWidth, curViewportW - 24));
      const effMinHeight = Math.max(120, Math.min(minHeight, curViewportH - 24));
      const effMaxWidth = maxWidth ? Math.min(maxWidth, curViewportW - 16) : curViewportW - 16;
      const effMaxHeight = maxHeight ? Math.min(maxHeight, curViewportH - 16) : curViewportH - 16;

      let newW = resizeRef.current.startWidth;
      let newH = resizeRef.current.startHeight;
      let newX = resizeRef.current.startPosX;
      let newY = resizeRef.current.startPosY;

      const startRight = resizeRef.current.startPosX + resizeRef.current.startWidth;
      const startBottom = resizeRef.current.startPosY + resizeRef.current.startHeight;

      const dir = resizeRef.current.direction;

      // Horizontal resizing: East ('e') or West ('w')
      if (dir.includes('e')) {
        let proposedW = resizeRef.current.startWidth + dx;
        proposedW = Math.max(effMinWidth, Math.min(effMaxWidth, proposedW));
        if (newX + proposedW > curViewportW - 8) {
          proposedW = Math.max(effMinWidth, curViewportW - 8 - newX);
        }
        newW = proposedW;
      } else if (dir.includes('w')) {
        let proposedW = resizeRef.current.startWidth - dx;
        proposedW = Math.max(effMinWidth, Math.min(effMaxWidth, proposedW));
        let proposedX = startRight - proposedW;
        if (proposedX < 8) {
          proposedX = 8;
          proposedW = Math.min(effMaxWidth, Math.max(effMinWidth, startRight - 8));
        }
        newX = proposedX;
        newW = proposedW;
      }

      // Vertical resizing: South ('s') or North ('n')
      if (dir.includes('s')) {
        let proposedH = resizeRef.current.startHeight + dy;
        proposedH = Math.max(effMinHeight, Math.min(effMaxHeight, proposedH));
        if (newY + proposedH > curViewportH - 8) {
          proposedH = Math.max(effMinHeight, curViewportH - 8 - newY);
        }
        newH = proposedH;
      } else if (dir.includes('n')) {
        let proposedH = resizeRef.current.startHeight - dy;
        proposedH = Math.max(effMinHeight, Math.min(effMaxHeight, proposedH));
        let proposedY = startBottom - proposedH;
        if (proposedY < 8) {
          proposedY = 8;
          proposedH = Math.min(effMaxHeight, Math.max(effMinHeight, startBottom - 8));
        }
        newY = proposedY;
        newH = proposedH;
      }

      setPosition({ x: Math.round(newX), y: Math.round(newY) });
      setSize({ width: Math.round(newW), height: Math.round(newH) });
    };

    const handlePointerUp = (upEv: PointerEvent) => {
      try {
        (e.target as HTMLElement).releasePointerCapture(upEv.pointerId);
      } catch {
        // safe fallback
      }
      setIsResizing(false);
      setActiveDirection(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Double click header to toggle maximize
  const handleHeaderDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(
        'button, input, textarea, select, a, [role="button"], [role="tab"], [data-no-drag="true"], [data-resize-handle="true"]'
      )
    ) {
      return;
    }
    toggleMaximize();
  };

  // Inspect child header clicks for automatic dragging
  const handleWindowPointerDown = (e: React.PointerEvent) => {
    if (isResizing) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-resize-handle="true"], .resize-handle')) {
      return;
    }
    // If target has data-drag-handle or is inside the top header area
    const dragHandle = target.closest('[data-drag-handle="true"], .modal-drag-handle, header');
    const modalRect = modalRef.current?.getBoundingClientRect();
    const isTopBar = modalRect && e.clientY - modalRect.top <= 54;

    if (dragHandle || isTopBar) {
      handlePointerDownHeader(e);
    }
  };

  if (!isOpen) return null;

  const contextValue: DraggableModalContextValue = {
    isMaximized,
    toggleMaximize,
    resetPositionAndSize,
    isDragging,
    isResizing,
    close: onClose || (() => {}),
  };

  // Window positioning styles
  const windowStyle: React.CSSProperties = isMaximized
    ? {
        position: 'fixed',
        left: '8px',
        top: '8px',
        width: 'calc(100vw - 16px)',
        height: 'calc(100vh - 16px)',
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100vh - 16px)',
        margin: 0,
        zIndex: 60,
      }
    : position && size
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        maxWidth: maxWidth ? `${maxWidth}px` : 'calc(100vw - 16px)',
        maxHeight: maxHeight ? `${maxHeight}px` : 'calc(100vh - 16px)',
        margin: 0,
      }
    : {};

  return (
    <DraggableModalContext.Provider value={contextValue}>
      {/* Backdrop: semi-transparent overlay, NO blur so background UI stays visible.
          pointer-events-none lets sidebar/nav clicks pass through the backdrop area,
          except when dragging or resizing so mouse pointer remains locked to the active operation. */}
      <div
        id={modalId ? `${modalId}-backdrop` : undefined}
        className={`fixed inset-0 bg-slate-950/30 flex items-center justify-center p-2 sm:p-4 ${zIndex} ${
          isResizing
            ? `${getResizeCursor(activeDirection)} pointer-events-auto select-none`
            : isDragging
            ? 'cursor-grabbing pointer-events-auto select-none'
            : 'pointer-events-none'
        } ${backdropClassName}`}
        role="presentation"
      >
        <div
          ref={modalRef}
          id={modalId}
          role={role}
          aria-modal={ariaModal}
          aria-label={typeof ariaLabel === 'string' ? ariaLabel : undefined}
          style={windowStyle}
          onPointerDown={handleWindowPointerDown}
          onDoubleClick={handleHeaderDoubleClick}
          className={`relative flex flex-col transition-shadow pointer-events-auto ${
            isDragging ? 'shadow-2xl ring-2 ring-emerald-500/40 cursor-grabbing' : ''
          } ${isResizing ? 'shadow-2xl ring-1 ring-emerald-500/30' : ''} ${className}`}
        >
          {/* Subtle Top Window Control Pill (if enabled & not explicitly hidden) */}
          {showControls && (
            <div className="absolute top-2.5 right-11 z-30 flex items-center space-x-1 no-print bg-slate-950/40 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-white/10 text-slate-300">
              <span
                className="hidden sm:inline-flex items-center text-[10px] font-mono text-slate-400 px-1 select-none cursor-grab"
                title="Drag top header to move window"
              >
                <Move className="w-3 h-3 mr-0.5 text-slate-400" />
                Drag
              </span>
              <button
                type="button"
                onClick={resetPositionAndSize}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Reset position and size to center"
                aria-label="Reset window size and position"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={toggleMaximize}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title={isMaximized ? 'Restore window size' : 'Maximize window'}
                aria-label={isMaximized ? 'Restore window size' : 'Maximize window'}
              >
                {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
            </div>
          )}

          {/* Modal Content */}
          <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
            {children}
          </div>

          {/* 8-Directional Perimeter Mouse Resize Handles (Disabled when Maximized) */}
          {!isMaximized && (
            <>
              {/* North Edge (Top) */}
              <div
                data-resize-handle="true"
                onPointerDown={(e) => startResize(e, 'n')}
                className="absolute top-0 left-4 right-4 h-4 cursor-ns-resize z-50 touch-none group flex items-start justify-center"
                title="Drag to resize vertically from top"
                aria-label="Resize window vertically from top"
              >
                <div className="w-16 h-1 rounded-full bg-slate-400/0 group-hover:bg-emerald-500/60 group-active:bg-emerald-500 transition-colors mt-0.5" />
              </div>

              {/* South Edge (Bottom) */}
              <div
                data-resize-handle="true"
                onPointerDown={(e) => startResize(e, 's')}
                className="absolute bottom-0 left-4 right-4 h-4 cursor-ns-resize z-50 touch-none group flex items-end justify-center"
                title="Drag to resize vertically from bottom"
                aria-label="Resize window vertically from bottom"
              >
                <div className="w-16 h-1 rounded-full bg-slate-400/0 group-hover:bg-emerald-500/60 group-active:bg-emerald-500 transition-colors mb-0.5" />
              </div>

              {/* East Edge (Right) */}
              <div
                data-resize-handle="true"
                onPointerDown={(e) => startResize(e, 'e')}
                className="absolute top-4 bottom-4 right-0 w-4 cursor-ew-resize z-50 touch-none group flex items-center justify-end"
                title="Drag to resize horizontally from right"
                aria-label="Resize window horizontally from right"
              >
                <div className="h-16 w-1 rounded-full bg-slate-400/0 group-hover:bg-emerald-500/60 group-active:bg-emerald-500 transition-colors mr-0.5" />
              </div>

              {/* West Edge (Left) */}
              <div
                data-resize-handle="true"
                onPointerDown={(e) => startResize(e, 'w')}
                className="absolute top-4 bottom-4 left-0 w-4 cursor-ew-resize z-50 touch-none group flex items-center justify-start"
                title="Drag to resize horizontally from left"
                aria-label="Resize window horizontally from left"
              >
                <div className="h-16 w-1 rounded-full bg-slate-400/0 group-hover:bg-emerald-500/60 group-active:bg-emerald-500 transition-colors ml-0.5" />
              </div>

              {/* North-West Corner */}
              <div
                data-resize-handle="true"
                onPointerDown={(e) => startResize(e, 'nw')}
                className="absolute top-0 left-0 w-5 h-5 cursor-nwse-resize z-50 touch-none rounded-tl-xl hover:bg-emerald-500/30 active:bg-emerald-500/50 transition-colors"
                title="Drag to resize diagonally"
                aria-label="Resize window diagonally from top left"
              />

              {/* North-East Corner */}
              <div
                data-resize-handle="true"
                onPointerDown={(e) => startResize(e, 'ne')}
                className="absolute top-0 right-0 w-5 h-5 cursor-nesw-resize z-50 touch-none rounded-tr-xl hover:bg-emerald-500/30 active:bg-emerald-500/50 transition-colors"
                title="Drag to resize diagonally"
                aria-label="Resize window diagonally from top right"
              />

              {/* South-West Corner */}
              <div
                data-resize-handle="true"
                onPointerDown={(e) => startResize(e, 'sw')}
                className="absolute bottom-0 left-0 w-5 h-5 cursor-nesw-resize z-50 touch-none rounded-bl-xl hover:bg-emerald-500/30 active:bg-emerald-500/50 transition-colors"
                title="Drag to resize diagonally"
                aria-label="Resize window diagonally from bottom left"
              />

              {/* South-East Corner (Tactile 6-Dot Resize Grip) */}
              <div
                data-resize-handle="true"
                onPointerDown={(e) => startResize(e, 'se')}
                className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50 touch-none flex items-end justify-end p-1 select-none text-slate-400 dark:text-slate-500 hover:text-emerald-500 active:text-emerald-600 transition-colors group"
                title="Click and drag to resize window"
                aria-label="Resize window diagonally from bottom right"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 11 11"
                  className="fill-current pointer-events-none drop-shadow-xs"
                >
                  <circle cx="9" cy="9" r="1.1" />
                  <circle cx="5.5" cy="9" r="1.1" />
                  <circle cx="9" cy="5.5" r="1.1" />
                  <circle cx="2" cy="9" r="1.1" />
                  <circle cx="5.5" cy="5.5" r="1.1" />
                  <circle cx="9" cy="2" r="1.1" />
                </svg>
              </div>
            </>
          )}
        </div>
      </div>
    </DraggableModalContext.Provider>
  );
};
