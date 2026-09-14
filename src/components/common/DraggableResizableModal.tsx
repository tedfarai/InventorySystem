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
  minWidth = 320,
  minHeight = 200,
  maxWidth,
  maxHeight,
  title,
  showControls = true,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  zIndex = 'z-50',
  modalId,
  'aria-label': ariaLabel,
  'aria-modal': ariaModal = true,
  role = 'dialog',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
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

  // Measure initial natural geometry on mount
  useLayoutEffect(() => {
    if (!isOpen) return;
    if (!isInitializedRef.current && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      const calculatedWidth = initialWidth || Math.round(rect.width);
      const calculatedHeight = initialHeight || Math.round(rect.height);

      // Safe viewport clamping
      const viewportW = window.innerWidth || 1024;
      const viewportH = window.innerHeight || 768;

      const finalW = Math.min(calculatedWidth, viewportW - 24);
      const finalH = Math.min(calculatedHeight, viewportH - 24);

      const left = Math.max(12, Math.round((viewportW - finalW) / 2));
      const top = Math.max(12, Math.round((viewportH - finalH) / 2));

      setPosition({ x: left, y: top });
      setSize({ width: finalW, height: finalH });
      isInitializedRef.current = true;
    }
  }, [isOpen, initialWidth, initialHeight]);

  // Keep window in bounds if browser window resizes
  useEffect(() => {
    const handleWindowResize = () => {
      if (!position || !size || isMaximized) return;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

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

      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      const effMinWidth = Math.min(minWidth, viewportW - 24);
      const effMinHeight = Math.min(minHeight, viewportH - 24);
      const effMaxWidth = maxWidth || viewportW - 16;
      const effMaxHeight = maxHeight || viewportH - 16;

      let newW = resizeRef.current.startWidth;
      let newH = resizeRef.current.startHeight;
      let newX = resizeRef.current.startPosX;
      let newY = resizeRef.current.startPosY;

      const dir = resizeRef.current.direction;

      // Horizontal resizing
      if (dir.includes('e')) {
        newW = Math.max(effMinWidth, Math.min(effMaxWidth, resizeRef.current.startWidth + dx));
        if (newX + newW > viewportW - 8) {
          newW = viewportW - 8 - newX;
        }
      } else if (dir.includes('w')) {
        const proposedW = resizeRef.current.startWidth - dx;
        newW = Math.max(effMinWidth, Math.min(effMaxWidth, proposedW));
        newX = resizeRef.current.startPosX + (resizeRef.current.startWidth - newW);
        if (newX < 8) {
          const diff = 8 - newX;
          newX = 8;
          newW -= diff;
        }
      }

      // Vertical resizing
      if (dir.includes('s')) {
        newH = Math.max(effMinHeight, Math.min(effMaxHeight, resizeRef.current.startHeight + dy));
        if (newY + newH > viewportH - 8) {
          newH = viewportH - 8 - newY;
        }
      } else if (dir.includes('n')) {
        const proposedH = resizeRef.current.startHeight - dy;
        newH = Math.max(effMinHeight, Math.min(effMaxHeight, proposedH));
        newY = resizeRef.current.startPosY + (resizeRef.current.startHeight - newH);
        if (newY < 8) {
          const diff = 8 - newY;
          newY = 8;
          newH -= diff;
        }
      }

      setPosition({ x: Math.round(newX), y: Math.round(newY) });
      setSize({ width: Math.round(newW), height: Math.round(newH) });
    };

    const handlePointerUp = () => {
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
        'button, input, textarea, select, a, [role="button"], [role="tab"], [data-no-drag="true"]'
      )
    ) {
      return;
    }
    toggleMaximize();
  };

  // Inspect child header clicks for automatic dragging
  const handleWindowPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
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
      <div
        id={modalId ? `${modalId}-backdrop` : undefined}
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 ${zIndex} ${
          isDragging || isResizing ? 'select-none' : ''
        } ${backdropClassName}`}
        onClick={(e) => {
          if (e.target === e.currentTarget && closeOnBackdropClick && onClose) {
            onClose();
          }
        }}
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
          className={`relative flex flex-col transition-shadow ${
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
              {/* North Edge */}
              <div
                onPointerDown={(e) => startResize(e, 'n')}
                className="absolute top-0 left-3 right-3 h-2 cursor-ns-resize z-40 hover:bg-emerald-500/20 active:bg-emerald-500/40 transition-colors"
                title="Resize window vertically"
              />
              {/* South Edge */}
              <div
                onPointerDown={(e) => startResize(e, 's')}
                className="absolute bottom-0 left-3 right-3 h-2.5 cursor-ns-resize z-40 hover:bg-emerald-500/20 active:bg-emerald-500/40 transition-colors"
                title="Resize window vertically"
              />
              {/* East Edge */}
              <div
                onPointerDown={(e) => startResize(e, 'e')}
                className="absolute top-3 bottom-3 right-0 w-2.5 cursor-ew-resize z-40 hover:bg-emerald-500/20 active:bg-emerald-500/40 transition-colors"
                title="Resize window horizontally"
              />
              {/* West Edge */}
              <div
                onPointerDown={(e) => startResize(e, 'w')}
                className="absolute top-3 bottom-3 left-0 w-2.5 cursor-ew-resize z-40 hover:bg-emerald-500/20 active:bg-emerald-500/40 transition-colors"
                title="Resize window horizontally"
              />
              {/* North-West Corner */}
              <div
                onPointerDown={(e) => startResize(e, 'nw')}
                className="absolute top-0 left-0 w-3.5 h-3.5 cursor-nwse-resize z-40 hover:bg-emerald-500/30 active:bg-emerald-500/50 rounded-tl-xl transition-colors"
                title="Resize window diagonally"
              />
              {/* North-East Corner */}
              <div
                onPointerDown={(e) => startResize(e, 'ne')}
                className="absolute top-0 right-0 w-3.5 h-3.5 cursor-nesw-resize z-40 hover:bg-emerald-500/30 active:bg-emerald-500/50 rounded-tr-xl transition-colors"
                title="Resize window diagonally"
              />
              {/* South-West Corner */}
              <div
                onPointerDown={(e) => startResize(e, 'sw')}
                className="absolute bottom-0 left-0 w-3.5 h-3.5 cursor-nesw-resize z-40 hover:bg-emerald-500/30 active:bg-emerald-500/50 rounded-bl-xl transition-colors"
                title="Resize window diagonally"
              />
              {/* South-East Corner (Tactile 6-Dot Resize Grip) */}
              <div
                onPointerDown={(e) => startResize(e, 'se')}
                className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-40 flex items-end justify-end p-1 select-none text-slate-400 dark:text-slate-500 hover:text-emerald-500 active:text-emerald-600 transition-colors group"
                title="Click and drag to resize window"
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
