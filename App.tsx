
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Library, BookOpen, BarChart3, Settings, Plus, Search, 
  Headphones, Pause, Play, X, Type, Moon, Sun, Highlighter, 
  Camera, ChevronLeft, BookMarked, BrainCircuit, Timer, Share2,
  Bookmark as BookmarkIcon, List, Trash2, ArrowLeft, ArrowRight,
  MoreVertical, FileText, Mic, Volume2, Zap, RotateCcw,
  Palette, Undo, Image, Smile, ScanLine, MousePointerClick, CheckCircle2,
  Edit2, Tag, Sticker, Trash, Move, Ghost, Eye, Bold, Italic, AlignLeft,
  MousePointer2, FolderPlus, Folder, FolderOpen, MoreHorizontal, CheckSquare, Square
} from './components/Icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { dbService } from './services/db';
import { fileService } from './services/fileService';
import { Book, AppView, AppSettings, Highlight, GlossaryItem, Bookmark, HighlightColor, ReaderMode, BookSticker, Achievement, ReadingSession, BookmarkStyle, PageSticker, UserSticker, BookCoverText, Category } from './types';

// --- Constants ---
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 1.6,
  ttsSpeed: 1,
  ttsPitch: 1,
  ttsVoiceURI: null,
  karaokeSpeed: 200, // ms per word (lower is faster)
  karaokeOpacity: 0.5,
  karaokeColor: 'yellow'
};

const WORDS_PER_PAGE = 200;

// Expanded Emoji Categories
const EMOJI_CATEGORIES: Record<string, string[]> = {
    "Reacciones": ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '👏', '🙏', '🔥', '✨', '🎉', '💯', '🤔', '👀', '🧠', '💩', '🤡', '👻'],
    "Lectura & Estudio": ['📚', '📖', '🔖', '🖊️', '📝', '🖍️', '💡', '🧐', '👓', '☕', '🍵', '🎓', '🏫', '🏛️', '🔬', '🔭', '🎨'],
    "Naturaleza": ['🌸', '🌹', '🌻', '🌲', '🌵', '🌴', '🍁', '🍄', '🌙', '☀️', '☁️', '🌧️', '❄️', '🌊', '🌈', '⚡', '🔥', '🌍'],
    "Comida": ['🍎', '🍕', '🍔', '🍟', '🍦', '🍩', '🍪', '🍫', '🍿', '🥤', '🍺', '🍷', '🍰', '🍣', '🌮', '🥗'],
    "Animales": ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🦄', '🐝', '🦋', '🐢'],
    "Objetos": ['💻', '📱', '📷', '📺', '📻', '⏰', '⏳', '🎈', '🎁', '💎', '🔑', '🛡️', '⚔️', '🚀', '🚗', '✈️', '🚲'],
    "Símbolos": ['✅', '❌', '⚠️', '⛔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓']
};

const STICKER_PACKS: Record<string, string[]> = {
    "Gatos": ['🐱', '😼', '😹', '🙀', '😿', '😽', '😻', '🐈', '🐈‍⬛', '🐾', '🦁', '🐯'],
    "Perros": ['🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🦴', '🐾', '🐺', '🦊'],
    "Espacio": ['🚀', '🛸', '🛰️', '🌌', '🌍', '🌎', '🌏', '🌑', '🌕', '🌟', '☄️', '👨‍🚀', '👽', '🔭'],
    "Fantasía": ['🧙‍♂️', '🧙‍♀️', '🧚‍♀️', '🧛‍♂️', '🧜‍♀️', '🧝‍♂️', '🧞‍♂️', '🦄', '🐲', '🔮', '✨', '🏰', '🛡️', '⚔️', '👑', '💍'],
    "Oficina": ['💼', '📁', '📅', '📌', '📍', '📎', '📏', '📐', '✂️', '🗑️', '📊', '📈', '🖨️', '💾'],
    "Retro": ['💾', '📼', '🕹️', '📻', '📺', '☎️', '📟', '📠', '💿', '📀', '🎞️', '📽️']
};

const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink', 'orange'];

// --- Achievement Definitions ---
interface AchievementContext {
    totalPages: number;
    totalMinutes: number;
    totalBooks: number;
    streak: number;
    lastSessionDate: string;
    lastSessionTime: number;
    
    // Feature usage
    totalHighlights: number;
    totalBookmarks: number;
    totalStickersPlaced: number;
    totalUserStickers: number; // Created stickers
    customCoversCount: number;
    categoriesCount: number;
    hasChangedTheme: boolean;
    hasUsedAudio: boolean;
    hasChangedVoice: boolean;
    hasChangedSpeed: boolean;
}

interface AchievementDef {
    id: string;
    title: string;
    description: string;
    icon: string;
    check: (ctx: AchievementContext) => boolean;
    maxProgress: (ctx: AchievementContext) => number;
    currentProgress: (ctx: AchievementContext) => number;
}

const ACHIEVEMENT_DEFINITIONS: AchievementDef[] = [
    // --- TIER 1: PÁGINAS (EXPLORADOR) ---
    { id: 'p_1', title: 'Primera Página', description: 'Lee tu primera página en Librina.', icon: '📄', check: (c) => c.totalPages >= 1, maxProgress: () => 1, currentProgress: (c) => c.totalPages },
    { id: 'p_50', title: 'Calentando Motores', description: 'Lee 50 páginas.', icon: '🔥', check: (c) => c.totalPages >= 50, maxProgress: () => 50, currentProgress: (c) => c.totalPages },
    { id: 'p_100', title: 'Lector Comprometido', description: 'Alcanza las 100 páginas.', icon: '📖', check: (c) => c.totalPages >= 100, maxProgress: () => 100, currentProgress: (c) => c.totalPages },
    { id: 'p_500', title: 'Devorador de Texto', description: '500 páginas leídas.', icon: '📚', check: (c) => c.totalPages >= 500, maxProgress: () => 500, currentProgress: (c) => c.totalPages },
    { id: 'p_1000', title: 'Viajero de Tinta', description: '¡1,000 páginas! Un viaje épico.', icon: '🌍', check: (c) => c.totalPages >= 1000, maxProgress: () => 1000, currentProgress: (c) => c.totalPages },
    { id: 'p_5000', title: 'Erudito', description: '5,000 páginas. Tu conocimiento crece.', icon: '🧠', check: (c) => c.totalPages >= 5000, maxProgress: () => 5000, currentProgress: (c) => c.totalPages },
    { id: 'p_10000', title: 'Leyenda de Librina', description: '10,000 páginas. Eres historia pura.', icon: '👑', check: (c) => c.totalPages >= 10000, maxProgress: () => 10000, currentProgress: (c) => c.totalPages },

    // --- TIER 2: LIBROS (BIBLIOTECARIO) ---
    { id: 'b_1', title: 'El Comienzo', description: 'Termina un libro completo.', icon: '📕', check: (c) => c.totalBooks >= 1, maxProgress: () => 1, currentProgress: (c) => c.totalBooks },
    { id: 'b_5', title: 'Pequeña Colección', description: 'Termina 5 libros.', icon: '🖐️', check: (c) => c.totalBooks >= 5, maxProgress: () => 5, currentProgress: (c) => c.totalBooks },
    { id: 'b_10', title: 'Estante Lleno', description: 'Termina 10 libros.', icon: '🍱', check: (c) => c.totalBooks >= 10, maxProgress: () => 10, currentProgress: (c) => c.totalBooks },
    { id: 'b_25', title: 'Bibliotecario', description: 'Termina 25 libros.', icon: '🏛️', check: (c) => c.totalBooks >= 25, maxProgress: () => 25, currentProgress: (c) => c.totalBooks },
    { id: 'b_50', title: 'Sabio', description: 'Termina 50 libros.', icon: '🧙‍♂️', check: (c) => c.totalBooks >= 50, maxProgress: () => 50, currentProgress: (c) => c.totalBooks },
    { id: 'b_100', title: 'Deidad Literaria', description: 'Termina 100 libros.', icon: '✨', check: (c) => c.totalBooks >= 100, maxProgress: () => 100, currentProgress: (c) => c.totalBooks },

    // --- TIER 3: TIEMPO (CRONOMETRISTA) ---
    { id: 't_60', title: 'Hora Dorada', description: 'Lee durante 1 hora (60 min).', icon: '🕐', check: (c) => c.totalMinutes >= 60, maxProgress: () => 60, currentProgress: (c) => c.totalMinutes },
    { id: 't_300', title: 'Maratón', description: 'Lee durante 5 horas.', icon: '🏃', check: (c) => c.totalMinutes >= 300, maxProgress: () => 300, currentProgress: (c) => c.totalMinutes },
    { id: 't_600', title: 'Dedicación', description: '10 horas de lectura.', icon: '🎯', check: (c) => c.totalMinutes >= 600, maxProgress: () => 600, currentProgress: (c) => c.totalMinutes },
    { id: 't_1440', title: 'Un Día Entero', description: '24 horas acumuladas de lectura.', icon: '☀️', check: (c) => c.totalMinutes >= 1440, maxProgress: () => 1440, currentProgress: (c) => c.totalMinutes },
    { id: 't_3000', title: 'Amante del Tiempo', description: '50 horas de lectura.', icon: '⏳', check: (c) => c.totalMinutes >= 3000, maxProgress: () => 3000, currentProgress: (c) => c.totalMinutes },
    { id: 't_6000', title: 'Centenario', description: '100 horas de lectura.', icon: '💯', check: (c) => c.totalMinutes >= 6000, maxProgress: () => 6000, currentProgress: (c) => c.totalMinutes },

    // --- TIER 4: RACHA (CONSTANCIA) ---
    { id: 's_3', title: 'Chispa', description: 'Racha de 3 días seguidos.', icon: '🕯️', check: (c) => c.streak >= 3, maxProgress: () => 3, currentProgress: (c) => c.streak },
    { id: 's_7', title: 'Hábito Semanal', description: 'Lee todos los días una semana.', icon: '📅', check: (c) => c.streak >= 7, maxProgress: () => 7, currentProgress: (c) => c.streak },
    { id: 's_14', title: 'Doble Semana', description: '14 días seguidos.', icon: '🚀', check: (c) => c.streak >= 14, maxProgress: () => 14, currentProgress: (c) => c.streak },
    { id: 's_30', title: 'Hábito de Hierro', description: '30 días de racha.', icon: '🛡️', check: (c) => c.streak >= 30, maxProgress: () => 30, currentProgress: (c) => c.streak },
    { id: 's_60', title: 'Imparable', description: '60 días de racha.', icon: '🚂', check: (c) => c.streak >= 60, maxProgress: () => 60, currentProgress: (c) => c.streak },
    { id: 's_100', title: 'Centinela', description: '100 días seguidos leyendo.', icon: '🏰', check: (c) => c.streak >= 100, maxProgress: () => 100, currentProgress: (c) => c.streak },
    { id: 's_365', title: 'Vuelta al Sol', description: 'Un año entero leyendo cada día.', icon: '🌎', check: (c) => c.streak >= 365, maxProgress: () => 365, currentProgress: (c) => c.streak },

    // --- TIER 5: HORARIOS ---
    { id: 'h_early', title: 'Alondra', description: 'Lee entre 5 AM y 8 AM.', icon: '🌅', check: (c) => { const h = new Date(c.lastSessionTime).getHours(); return h >= 5 && h < 8; }, maxProgress: () => 1, currentProgress: (c) => 0 },
    { id: 'h_lunch', title: 'Descanso Literario', description: 'Lee a la hora del almuerzo (12 PM - 2 PM).', icon: '🥗', check: (c) => { const h = new Date(c.lastSessionTime).getHours(); return h >= 12 && h < 14; }, maxProgress: () => 1, currentProgress: (c) => 0 },
    { id: 'h_night', title: 'Lector Nocturno', description: 'Lee entre 8 PM y 11 PM.', icon: '🌙', check: (c) => { const h = new Date(c.lastSessionTime).getHours(); return h >= 20 && h < 23; }, maxProgress: () => 1, currentProgress: (c) => 0 },
    { id: 'h_owl', title: 'Búho Insomne', description: 'Lee de madrugada (12 AM - 4 AM).', icon: '🦉', check: (c) => { const h = new Date(c.lastSessionTime).getHours(); return h >= 0 && h < 4; }, maxProgress: () => 1, currentProgress: (c) => 0 },

    // --- TIER 6: INTERACCIÓN (HIGHLIGHTS/BOOKMARKS) ---
    { id: 'i_h1', title: 'Primer Trazo', description: 'Resalta tu primera frase.', icon: '🖍️', check: (c) => c.totalHighlights >= 1, maxProgress: () => 1, currentProgress: (c) => c.totalHighlights },
    { id: 'i_h10', title: 'Analista', description: 'Haz 10 resaltados.', icon: '📝', check: (c) => c.totalHighlights >= 10, maxProgress: () => 10, currentProgress: (c) => c.totalHighlights },
    { id: 'i_h50', title: 'Investigador', description: '50 resaltados en tus libros.', icon: '🔎', check: (c) => c.totalHighlights >= 50, maxProgress: () => 50, currentProgress: (c) => c.totalHighlights },
    { id: 'i_b1', title: 'No me Olvides', description: 'Crea un marcador.', icon: '🔖', check: (c) => c.totalBookmarks >= 1, maxProgress: () => 1, currentProgress: (c) => c.totalBookmarks },
    { id: 'i_b10', title: 'Organizado', description: 'Usa 10 marcadores.', icon: '🗂️', check: (c) => c.totalBookmarks >= 10, maxProgress: () => 10, currentProgress: (c) => c.totalBookmarks },
    { id: 'i_b50', title: 'Cartógrafo', description: '50 marcadores creados.', icon: '📍', check: (c) => c.totalBookmarks >= 50, maxProgress: () => 50, currentProgress: (c) => c.totalBookmarks },

    // --- TIER 7: CREATIVIDAD (STICKERS/CUSTOM) ---
    { id: 'c_st1', title: 'Decorador', description: 'Pega tu primer Sticker.', icon: '😀', check: (c) => c.totalStickersPlaced >= 1, maxProgress: () => 1, currentProgress: (c) => c.totalStickersPlaced },
    { id: 'c_st10', title: 'Álbum Vivo', description: 'Pega 10 Stickers.', icon: '🎨', check: (c) => c.totalStickersPlaced >= 10, maxProgress: () => 10, currentProgress: (c) => c.totalStickersPlaced },
    { id: 'c_st50', title: 'Expresionista', description: '50 Stickers pegados.', icon: '🎭', check: (c) => c.totalStickersPlaced >= 50, maxProgress: () => 50, currentProgress: (c) => c.totalStickersPlaced },
    { id: 'c_cr1', title: 'Artista Digital', description: 'Sube/Crea un Sticker propio.', icon: '🖼️', check: (c) => c.totalUserStickers >= 1, maxProgress: () => 1, currentProgress: (c) => c.totalUserStickers },
    { id: 'c_cov1', title: 'Editor Jefe', description: 'Personaliza una portada de libro.', icon: '📓', check: (c) => c.customCoversCount >= 1, maxProgress: () => 1, currentProgress: (c) => c.customCoversCount },
    { id: 'c_cat1', title: 'Bibliotecólogo', description: 'Crea una categoría personalizada.', icon: '🏷️', check: (c) => c.categoriesCount >= 1, maxProgress: () => 1, currentProgress: (c) => c.categoriesCount },
    { id: 'c_theme', title: 'Cambio de Ambiente', description: 'Cambia el tema (Oscuro/Sepia).', icon: '🌗', check: (c) => c.hasChangedTheme, maxProgress: () => 1, currentProgress: (c) => c.hasChangedTheme ? 1 : 0 },

    // --- TIER 8: AUDIOVISUAL ---
    { id: 'a_listen', title: 'Oídos Atentos', description: 'Usa el modo Audiolibro.', icon: '🎧', check: (c) => c.hasUsedAudio, maxProgress: () => 1, currentProgress: (c) => c.hasUsedAudio ? 1 : 0 },
    { id: 'a_voice', title: 'Director de Casting', description: 'Cambia la voz del narrador.', icon: '🗣️', check: (c) => c.hasChangedVoice, maxProgress: () => 1, currentProgress: (c) => c.hasChangedVoice ? 1 : 0 },
    { id: 'a_speed', title: 'Cámara Rápida', description: 'Cambia la velocidad de lectura.', icon: '⏩', check: (c) => c.hasChangedSpeed, maxProgress: () => 1, currentProgress: (c) => c.hasChangedSpeed ? 1 : 0 },
];

// --- Helper Components ---
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 shrink-0">
          <h3 className="font-bold text-lg dark:text-white font-serif">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-gray-300">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- CONFETTI & POPUP COMPONENT ---
const AchievementPopup = ({ achievement, onClose }: { achievement: AchievementDef | null, onClose: () => void }) => {
    if (!achievement) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500 p-4">
            {/* Confetti CSS built-in for zero dependencies */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(30)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute animate-fall"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `-10%`,
                            backgroundColor: ['#FFD700', '#FF4500', '#00BFFF', '#32CD32', '#FF69B4', '#FFFFFF'][Math.floor(Math.random() * 6)],
                            width: '12px', height: '12px',
                            animationDuration: `${2 + Math.random() * 3}s`,
                            animationDelay: `${Math.random()}s`,
                            transform: `rotate(${Math.random() * 360}deg)`
                        }}
                    />
                ))}
            </div>

            <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-[0_0_60px_rgba(255,215,0,0.6)] border-4 border-[#FFD700] animate-in zoom-in duration-300">
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-[#FFD700] text-amber-900 px-6 py-2 rounded-full font-bold uppercase tracking-widest shadow-lg text-xs md:text-sm border-2 border-white flex items-center gap-2 whitespace-nowrap">
                    <Zap size={16} fill="currentColor"/> ¡Logro Desbloqueado!
                </div>
                
                <div className="mb-6 mt-6 relative inline-block">
                    <div className="text-7xl md:text-8xl filter drop-shadow-2xl animate-bounce">{achievement.icon}</div>
                    <div className="absolute inset-0 bg-yellow-400 opacity-30 blur-2xl rounded-full animate-pulse"></div>
                </div>
                
                <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white mb-2">{achievement.title}</h2>
                <p className="text-sm md:text-lg text-gray-500 dark:text-gray-300 mb-6">{achievement.description}</p>
                
                <button 
                    onClick={onClose}
                    className="w-full py-3 md:py-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold rounded-2xl shadow-xl transform transition-transform hover:scale-105 text-lg"
                >
                    ¡Increíble!
                </button>
            </div>

            <style>{`
                @keyframes fall {
                    to { transform: translateY(110vh) rotate(720deg); }
                }
                .animate-fall { animation-name: fall; animation-timing-function: linear; animation-iteration-count: infinite; }
            `}</style>
        </div>
    );
};

// --- SPLASH SCREEN COMPONENT ---
const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
    const [fade, setFade] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setFade(true), 2500); // Start fade out
        const finishTimer = setTimeout(onFinish, 3000); // Remove component
        return () => { clearTimeout(timer); clearTimeout(finishTimer); };
    }, [onFinish]);

    return (
        <div className={`fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex flex-col items-center justify-center transition-opacity duration-700 ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="animate-in zoom-in duration-1000 flex flex-col items-center">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/50 rotate-3 transform">
                    <BookOpen size={48} className="text-white md:w-16 md:h-16" />
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Librina</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm md:text-lg tracking-widest uppercase font-bold">Tu universo de lectura</p>
            </div>
            <div className="absolute bottom-10 w-48 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 animate-pulse w-full origin-left duration-[2000ms] transition-transform"></div>
            </div>
        </div>
    );
};

// --- Bookmark Creation/Edit Modal ---
const BookmarkModal = ({ isOpen, onClose, onSave, initialData, pageIndex }: { isOpen: boolean, onClose: () => void, onSave: (b: Partial<Bookmark>) => void, initialData?: Bookmark, pageIndex: number }) => {
    const [label, setLabel] = useState(initialData?.label || `Página ${pageIndex + 1}`);
    const [color, setColor] = useState<HighlightColor>(initialData?.color || 'blue');
    const [style, setStyle] = useState<BookmarkStyle>(initialData?.style || 'ribbon');

    useEffect(() => {
        if (isOpen) {
            setLabel(initialData?.label || `Página ${pageIndex + 1}`);
            setColor(initialData?.color || 'blue');
            setStyle(initialData?.style || 'ribbon');
        }
    }, [isOpen, initialData, pageIndex]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Marcador" : "Nuevo Marcador"}>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre del Marcador</label>
                    <input 
                        type="text" 
                        value={label} 
                        onChange={(e) => setLabel(e.target.value)}
                        className="w-full p-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Color</label>
                    <div className="flex gap-3">
                        {HIGHLIGHT_COLORS.map(c => (
                            <button 
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full bg-${c}-500 transform transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800' : 'hover:scale-110'}`}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Estilo</label>
                    <div className="flex gap-4">
                        <button onClick={() => setStyle('ribbon')} className={`flex flex-col items-center gap-2 p-3 rounded-lg border ${style === 'ribbon' ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30' : 'dark:border-gray-600'}`}>
                            <div className={`w-6 h-8 bg-${color}-500`} style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}></div>
                            <span className="text-xs">Cinta</span>
                        </button>
                        <button onClick={() => setStyle('clip')} className={`flex flex-col items-center gap-2 p-3 rounded-lg border ${style === 'clip' ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30' : 'dark:border-gray-600'}`}>
                            <div className={`w-6 h-8 bg-${color}-500 rounded-b-full`}></div>
                            <span className="text-xs">Clip</span>
                        </button>
                        <button onClick={() => setStyle('tag')} className={`flex flex-col items-center gap-2 p-3 rounded-lg border ${style === 'tag' ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30' : 'dark:border-gray-600'}`}>
                            <div className={`w-8 h-8 bg-${color}-500 rounded-full border-4 border-white dark:border-gray-800 shadow-sm`}></div>
                            <span className="text-xs">Punto</span>
                        </button>
                    </div>
                </div>

                <button 
                    onClick={() => onSave({ label, color, style })}
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700"
                >
                    Guardar
                </button>
            </div>
        </Modal>
    );
};

// --- Category Creation/Edit Modal ---
const CategoryModal = ({ isOpen, onClose, onSave, onDelete, initialData, books }: { isOpen: boolean, onClose: () => void, onSave: (c: Category) => void, onDelete?: (id: string) => void, initialData?: Category, books: Book[] }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [font, setFont] = useState<any>(initialData?.fontFamily || 'sans');
    const [icon, setIcon] = useState(initialData?.icon || '📁');
    const [selectedBookIds, setSelectedBookIds] = useState<string[]>(initialData?.bookIds || []);
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName(initialData?.name || '');
            setFont(initialData?.fontFamily || 'sans');
            setIcon(initialData?.icon || '📁');
            setSelectedBookIds(initialData?.bookIds || []);
        }
    }, [isOpen, initialData]);

    const toggleBook = (id: string) => {
        setSelectedBookIds(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Categoría" : "Nueva Categoría"}>
            <div className="space-y-6">
                <div className="flex gap-4">
                    <button 
                        onClick={() => setIsEmojiOpen(!isEmojiOpen)}
                        className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-3xl border border-gray-200 dark:border-gray-600 shrink-0"
                    >
                        {icon}
                    </button>
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre</label>
                        <input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. Terror, Estudio..."
                            className="w-full p-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                </div>

                {/* Emoji Picker Popover */}
                {isEmojiOpen && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded-xl grid grid-cols-6 gap-2 h-40 overflow-y-auto border dark:border-gray-700">
                        {['📁','📚','👻','🔪','❤️','🧠','🚀','🐉','💼','🎓','⚽','🎵','🎨','🎬','🧸','🦠','🔮','⚗️'].map(e => (
                            <button key={e} onClick={() => { setIcon(e); setIsEmojiOpen(false); }} className="text-2xl hover:bg-white dark:hover:bg-gray-700 rounded p-1">{e}</button>
                        ))}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Estilo de Letra</label>
                    <div className="flex gap-2 flex-wrap">
                        {['sans', 'serif', 'cursive', 'dyslexic'].map(f => (
                            <button 
                                key={f} 
                                onClick={() => setFont(f)}
                                className={`flex-1 py-2 px-3 border rounded-lg capitalize font-${f} text-sm ${font === f ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'dark:border-gray-600 dark:text-gray-300'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Libros ({selectedBookIds.length})</label>
                    <div className="max-h-48 overflow-y-auto border rounded-xl dark:border-gray-700 p-2 space-y-1">
                        {books.length === 0 && <p className="text-sm text-gray-400 p-2">No hay libros en la biblioteca.</p>}
                        {books.map(b => (
                            <div key={b.id} onClick={() => toggleBook(b.id)} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                                {selectedBookIds.includes(b.id) ? <CheckSquare className="text-indigo-600 shrink-0" /> : <Square className="text-gray-300 shrink-0" />}
                                <img src={b.coverUrl} className="w-8 h-12 object-cover rounded shrink-0" />
                                <span className="text-sm truncate dark:text-gray-200">{b.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                    {initialData && onDelete && (
                        <button onClick={() => onDelete(initialData.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100">
                            <Trash2 />
                        </button>
                    )}
                    <button 
                        onClick={() => onSave({
                            id: initialData?.id || crypto.randomUUID(),
                            name,
                            fontFamily: font,
                            icon,
                            bookIds: selectedBookIds,
                            createdAt: initialData?.createdAt || Date.now()
                        })}
                        disabled={!name.trim()}
                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {initialData ? 'Guardar Cambios' : 'Crear Categoría'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- WhatsApp Style Sticker Picker ---
const StickerPicker = ({ isOpen, onClose, onSelect }: { isOpen: boolean, onClose: () => void, onSelect: (data: { src: string, type: 'emoji' | 'image' }) => void }) => {
    const [tab, setTab] = useState<'emoji' | 'packs' | 'custom' | 'yours'>('emoji');
    const [userStickers, setUserStickers] = useState<UserSticker[]>([]);
    
    useEffect(() => {
        if (isOpen) {
            loadUserStickers();
        }
    }, [isOpen, tab]);

    const loadUserStickers = async () => {
        const s = await dbService.getUserStickers();
        setUserStickers(s);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await fileService.convertFileToBase64(file);
            const sticker: UserSticker = {
                id: crypto.randomUUID(),
                src: `data:${file.type};base64,${base64}`,
                type: 'image',
                createdAt: Date.now()
            };
            await dbService.saveUserSticker(sticker);
            await loadUserStickers();
            setTab('yours');
        }
    };

    const handleDeleteUserSticker = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(window.confirm("¿Borrar este sticker de tu colección?")) {
            await dbService.deleteUserSticker(id);
            await loadUserStickers();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm md:absolute md:inset-auto md:bottom-20 md:left-4 md:bg-transparent md:backdrop-filter-none md:p-0">
             {/* Mobile: Center Modal. Desktop: Popover */}
            <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl w-full max-w-sm md:w-80 h-[500px] md:h-96 flex flex-col border dark:border-gray-700 animate-in zoom-in-95 origin-bottom-left relative">
                 <div className="flex border-b dark:border-gray-700 overflow-x-auto no-scrollbar shrink-0">
                    <button onClick={() => setTab('emoji')} className={`flex-1 p-3 text-sm font-bold min-w-[70px] ${tab === 'emoji' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Emojis</button>
                    <button onClick={() => setTab('packs')} className={`flex-1 p-3 text-sm font-bold min-w-[70px] ${tab === 'packs' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Packs</button>
                    <button onClick={() => setTab('yours')} className={`flex-1 p-3 text-sm font-bold min-w-[70px] ${tab === 'yours' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Tuyos</button>
                    <button onClick={() => setTab('custom')} className={`flex-1 p-3 text-sm font-bold min-w-[70px] ${tab === 'custom' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Crear</button>
                    <button onClick={onClose} className="p-3 text-gray-400 hover:text-red-500"><X size={16}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                    {tab === 'emoji' && (
                        <div className="space-y-4">
                            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                                <div key={category}>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 sticky top-0 bg-white dark:bg-gray-800 py-1 z-10">{category}</h4>
                                    <div className="grid grid-cols-5 gap-2 text-2xl">
                                        {emojis.map(s => (
                                            <button key={s} onClick={() => { onSelect({src: s, type: 'emoji'}); onClose(); }} className="hover:scale-125 transition-transform">{s}</button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'packs' && (
                        <div className="space-y-6">
                             {Object.entries(STICKER_PACKS).map(([pack, emojis]) => (
                                <div key={pack}>
                                    <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-2 sticky top-0 bg-white dark:bg-gray-800 py-1 z-10 border-b dark:border-gray-700">{pack}</h4>
                                    <div className="grid grid-cols-5 gap-2 text-3xl">
                                        {emojis.map(s => (
                                            <button key={s} onClick={() => { onSelect({src: s, type: 'emoji'}); onClose(); }} className="hover:scale-125 transition-transform">{s}</button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'yours' && (
                        <div>
                             {userStickers.length === 0 ? (
                                 <p className="text-center text-sm text-gray-400 mt-10">No tienes stickers guardados. ¡Crea uno!</p>
                             ) : (
                                 <div className="grid grid-cols-4 gap-2">
                                    {userStickers.map(s => (
                                        <div key={s.id} className="relative group">
                                            <button onClick={() => { onSelect({src: s.src, type: 'image'}); onClose(); }} className="w-full aspect-square p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                                                <img src={s.src} alt="sticker" className="w-full h-full object-contain" />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteUserSticker(s.id, e)}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                 </div>
                             )}
                        </div>
                    )}
                    {tab === 'custom' && (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <p className="text-center text-sm text-gray-500">Sube una imagen para guardarla en "Tuyos"</p>
                            <label className="px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold cursor-pointer hover:bg-indigo-700 flex items-center gap-2">
                                <Image size={16} /> Subir Imagen
                                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                            </label>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<AppView>(AppView.LIBRARY);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Selection State
  const [selectedBookForMenu, setSelectedBookForMenu] = useState<Book | null>(null);
  
  // Reader State
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [activeReaderMode, setActiveReaderMode] = useState<ReaderMode>('read');
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isImporting, setIsImporting] = useState(false);

  // Achievement State
  const [newUnlockedAchievement, setNewUnlockedAchievement] = useState<AchievementDef | null>(null);
  
  // Load initial data
  useEffect(() => {
    const init = async () => {
      const storedSettings = await dbService.getSettings();
      if (storedSettings) setSettings(storedSettings);
      
      const storedBooks = await dbService.getAllBooks();
      setBooks(storedBooks);

      const storedCats = await dbService.getAllCategories();
      setCategories(storedCats);
    };
    init();
  }, []);

  // Update theme class
  useEffect(() => {
    document.documentElement.className = ''; // Clear
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (settings.theme === 'sepia') {
      document.documentElement.classList.add('sepia');
    }
  }, [settings.theme]);

  // Achievement Checker Logic
  const checkAchievements = async () => {
      const sessions = await dbService.getSessions();
      const allBooks = await dbService.getAllBooks();
      const seenIds = await dbService.getSeenAchievements();
      const allHighlights = await Promise.all(allBooks.map(b => dbService.getHighlights(b.id)));
      const flatHighlights = allHighlights.flat();
      const allBookmarks = await Promise.all(allBooks.map(b => dbService.getBookmarks(b.id)));
      const flatBookmarks = allBookmarks.flat();
      const allStickers = await Promise.all(allBooks.map(b => dbService.getPageStickers(b.id)));
      const flatStickers = allStickers.flat();
      const userStickers = await dbService.getUserStickers();
      const allCategories = await dbService.getAllCategories();

      // Aggregate Stats
      const totalPages = sessions.reduce((acc, s) => acc + s.pagesRead, 0);
      const totalMinutes = sessions.reduce((acc, s) => acc + s.minutes, 0);
      const totalBooks = allBooks.filter(b => b.progress >= 95).length;
      
      let streak = 0;
      const sortedSessions = sessions.sort((a,b) => b.date.localeCompare(a.date));
      if (sortedSessions.length > 0) {
           const todayStr = new Date().toISOString().split('T')[0];
           const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
           if (sortedSessions[0].date === todayStr || sortedSessions[0].date === yesterdayStr) {
               streak = 1;
               let currentDate = new Date(sortedSessions[0].date);
               for (let i = 1; i < sortedSessions.length; i++) {
                   const prevDate = new Date(sortedSessions[i].date);
                   const diffDays = Math.ceil(Math.abs(currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
                   if (diffDays === 1) { streak++; currentDate = prevDate; } else break;
               }
           }
      }

      const context: AchievementContext = {
          totalPages, totalMinutes, totalBooks, streak,
          lastSessionDate: sortedSessions[0]?.date || '',
          lastSessionTime: sortedSessions[0]?.lastUpdated || 0,
          totalHighlights: flatHighlights.length,
          totalBookmarks: flatBookmarks.length,
          totalStickersPlaced: flatStickers.length,
          totalUserStickers: userStickers.length,
          customCoversCount: allBooks.filter(b => b.originalMetadata && b.coverUrl !== b.originalMetadata.coverUrl).length,
          categoriesCount: allCategories.length,
          hasChangedTheme: settings.theme !== 'light',
          hasUsedAudio: true, // Simplified check, assumes if app used, features accessed
          hasChangedVoice: settings.ttsVoiceURI !== null,
          hasChangedSpeed: settings.ttsSpeed !== 1
      };

      // Check definitions
      for (const def of ACHIEVEMENT_DEFINITIONS) {
          if (!seenIds.includes(def.id) && def.check(context)) {
              setNewUnlockedAchievement(def);
              await dbService.markAchievementAsSeen(def.id);
              return; // Show one at a time
          }
      }
  };

  // Enhanced Book Upload Handler
  const handleBookUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);

    try {
        const base64 = await fileService.convertFileToBase64(file);
        const extractedText = await fileService.extractText(file, base64);
        
        const newBook: Book = {
            id: crypto.randomUUID(),
            title: file.name.replace(/\.[^/.]+$/, ""),
            originalName: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            author: 'Importado',
            content: extractedText,
            base64: base64,
            addedAt: Date.now(),
            lastReadAt: Date.now(),
            progress: 0,
            currentParagraphIndex: 0,
            currentPageIndex: 0,
            lastWordIndex: 0,
            coverUrl: `https://ui-avatars.com/api/?name=${file.name.substring(0,2)}&background=random&size=300`,
            // Set initial originalMetadata
            originalMetadata: {
                title: file.name.replace(/\.[^/.]+$/, ""),
                coverUrl: `https://ui-avatars.com/api/?name=${file.name.substring(0,2)}&background=random&size=300`
            }
        };

        await dbService.addBook(newBook);
        setBooks(prev => [newBook, ...prev]);
        setIsImporting(false);
    } catch (error) {
        console.error("Upload failed", error);
        alert("Error al importar el archivo. Intenta con otro formato.");
        setIsImporting(false);
    }
  };

  const handleCameraImport = (text: string) => {
     const title = `Escaneo ${new Date().toLocaleDateString()}`;
     const cover = `https://ui-avatars.com/api/?name=Scan&background=333&color=fff`;
     const newBook: Book = {
        id: crypto.randomUUID(),
        title: title,
        originalName: `scan_${Date.now()}.txt`,
        mimeType: 'text/plain',
        size: text.length,
        base64: btoa(text),
        author: 'Cámara',
        content: text,
        addedAt: Date.now(),
        lastReadAt: Date.now(),
        progress: 0,
        currentParagraphIndex: 0,
        currentPageIndex: 0,
        lastWordIndex: 0,
        coverUrl: cover,
        originalMetadata: { title, coverUrl: cover }
      };
      dbService.addBook(newBook).then(() => {
        setBooks(prev => [newBook, ...prev]);
        setView(AppView.LIBRARY);
      });
  };

  const launchReader = (book: Book, mode: ReaderMode) => {
      setActiveBook(book);
      setActiveReaderMode(mode);
      setSelectedBookForMenu(null);
      setView(AppView.READER);
  };

  const handleUpdateCategories = async (c: Category) => {
      await dbService.addCategory(c);
      const all = await dbService.getAllCategories();
      setCategories(all);
  };

  const handleDeleteCategory = async (id: string) => {
      await dbService.deleteCategory(id);
      const all = await dbService.getAllCategories();
      setCategories(all);
  };

  const renderContent = () => {
    switch (view) {
      case AppView.LIBRARY:
        return (
          <LibraryView 
            books={books} 
            categories={categories}
            onBookClick={(book) => setSelectedBookForMenu(book)} 
            onUpload={handleBookUpload}
            isImporting={isImporting}
            onCamera={() => setView(AppView.CAMERA_IMPORT)}
            onSaveCategory={handleUpdateCategories}
            onDeleteCategory={handleDeleteCategory}
          />
        );
      case AppView.CUSTOMIZE:
        return (
          <CustomizeView 
             books={books} 
             onUpdateBooks={setBooks}
          />
        );
      case AppView.READER:
        return activeBook ? (
          <ReaderView 
            book={activeBook} 
            mode={activeReaderMode}
            settings={settings}
            onBack={() => {
               dbService.getAllBooks().then(setBooks);
               // Trigger Check on Back
               checkAchievements();
               setView(AppView.LIBRARY); 
            }}
            onUpdateSettings={setSettings}
          />
        ) : <div>Error: No book selected</div>;
      case AppView.STATS:
        return <StatsView books={books} />;
      case AppView.SETTINGS:
        return <SettingsView settings={settings} onUpdate={setSettings} />;
      case AppView.CAMERA_IMPORT:
        return <CameraImportView onCancel={() => setView(AppView.LIBRARY)} onImport={handleCameraImport} />;
      default:
        return <div>View Not Found</div>;
    }
  };

  // --- RENDER APP ---
  if (showSplash) {
      return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className={`flex flex-col h-[100dvh] overflow-hidden ${settings.theme === 'sepia' ? 'bg-[#f4ecd8] text-[#5b4636]' : ''}`}>
      
      {/* Global Achievement Popup */}
      <AchievementPopup achievement={newUnlockedAchievement} onClose={() => setNewUnlockedAchievement(null)} />

      <main className="flex-1 overflow-hidden relative flex flex-col">
        {renderContent()}
      </main>
      
      {/* Bottom Navigation */}
      {view !== AppView.READER && view !== AppView.CAMERA_IMPORT && (
        <nav className="bg-white dark:bg-gray-900 border-t dark:border-gray-800 pb-safe z-50 shrink-0">
          <div className="flex justify-around items-center p-3">
            <NavBtn icon={<Library />} label="Biblioteca" active={view === AppView.LIBRARY} onClick={() => setView(AppView.LIBRARY)} />
            <NavBtn icon={<Palette />} label="Personalizar" active={view === AppView.CUSTOMIZE} onClick={() => setView(AppView.CUSTOMIZE)} />
            <NavBtn icon={<BarChart3 />} label="Progreso" active={view === AppView.STATS} onClick={() => setView(AppView.STATS)} />
            <NavBtn icon={<Settings />} label="Ajustes" active={view === AppView.SETTINGS} onClick={() => setView(AppView.SETTINGS)} />
          </div>
        </nav>
      )}

      {/* Mode Selection Modal */}
      <Modal 
        isOpen={!!selectedBookForMenu} 
        onClose={() => setSelectedBookForMenu(null)} 
        title="Elige tu experiencia"
      >
          {selectedBookForMenu && (
              <div className="flex flex-col gap-4 py-4">
                  <button 
                    onClick={() => launchReader(selectedBookForMenu, 'audio')}
                    className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 transition-colors group"
                  >
                      <div className="p-3 bg-indigo-600 text-white rounded-full shadow-lg group-hover:scale-110 transition-transform">
                          <Headphones size={24} />
                      </div>
                      <div className="text-left">
                          <h4 className="font-bold text-lg dark:text-white">Modo Audiolibro</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Narración fluida, resaltado karaoke y manos libres.</p>
                      </div>
                  </button>

                  <button 
                    onClick={() => launchReader(selectedBookForMenu, 'read')}
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-100 transition-colors group"
                  >
                      <div className="p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-full group-hover:scale-110 transition-transform">
                          <BookOpen size={24} />
                      </div>
                      <div className="text-left">
                          <h4 className="font-bold text-lg dark:text-white">Solo Lectura</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Lectura clásica con ayudas visuales y resaltado automático opcional.</p>
                      </div>
                  </button>
              </div>
          )}
      </Modal>

    </div>
  );
}

const NavBtn = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'} flex-1`}>
    {React.cloneElement(icon, { size: 24 })}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

// --- VIEW: Library ---
const LibraryView = ({ 
    books, categories, onBookClick, onUpload, isImporting, onCamera, onSaveCategory, onDeleteCategory 
}: { 
    books: Book[], categories: Category[], onBookClick: (b: Book) => void, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, isImporting: boolean, onCamera: () => void,
    onSaveCategory: (c: Category) => void, onDeleteCategory: (id: string) => void
}) => {
  const [search, setSearch] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | undefined>(undefined);

  // Filter books based on search AND active category
  const filtered = useMemo(() => {
      let result = books;
      // 1. Filter by Category
      if (activeCategoryId) {
          const cat = categories.find(c => c.id === activeCategoryId);
          if (cat) {
              result = result.filter(b => cat.bookIds.includes(b.id));
          }
      }
      // 2. Filter by Search
      if (search) {
          result = result.filter(b => b.title.toLowerCase().includes(search.toLowerCase()));
      }
      return result;
  }, [books, search, activeCategoryId, categories]);

  const handleCreateCategory = () => {
      setCategoryToEdit(undefined);
      setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (c: Category) => {
      setCategoryToEdit(c);
      setIsCategoryModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden bg-gray-50 dark:bg-gray-900">
      
      <CategoryModal 
         isOpen={isCategoryModalOpen}
         onClose={() => setIsCategoryModalOpen(false)}
         onSave={(c) => { onSaveCategory(c); setIsCategoryModalOpen(false); }}
         onDelete={(id) => { onDeleteCategory(id); setIsCategoryModalOpen(false); setActiveCategoryId(null); }}
         initialData={categoryToEdit}
         books={books}
      />

      <header className="flex justify-between items-center mb-6 shrink-0">
        <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold dark:text-white">Biblioteca</h1>
            <p className="text-xs md:text-sm text-gray-500">{books.length} libros</p>
        </div>
        <div className="flex gap-2">
            <button onClick={onCamera} className="p-3 bg-white dark:bg-gray-800 rounded-full hover:bg-gray-100 shadow-sm text-gray-700 dark:text-white border dark:border-gray-700">
                <Camera size={20} />
            </button>
            <label className={`p-3 bg-indigo-600 rounded-full text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 cursor-pointer ${isImporting ? 'opacity-50 cursor-wait' : ''}`}>
                {isImporting ? <BrainCircuit className="animate-spin" size={20} /> : <Plus size={20} />}
                <input type="file" className="hidden" onChange={onUpload} disabled={isImporting} multiple accept="*" />
            </label>
        </div>
      </header>
      
      {/* Search Bar */}
      <div className="relative mb-4 shrink-0">
        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar..." 
          className="w-full bg-white dark:bg-gray-800 pl-10 pr-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white shadow-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar shrink-0">
          <button 
            onClick={() => setActiveCategoryId(null)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${activeCategoryId === null ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 border dark:border-gray-700'}`}
          >
              Todos
          </button>
          {categories.map(c => (
              <div key={c.id} className="relative group flex-shrink-0">
                <button 
                    onClick={() => setActiveCategoryId(c.id)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold flex items-center gap-2 transition-all font-${c.fontFamily} ${activeCategoryId === c.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 border dark:border-gray-700'}`}
                >
                    <span>{c.icon}</span>
                    {c.name}
                </button>
                {activeCategoryId === c.id && (
                     <button 
                        onClick={() => handleEditCategory(c)}
                        className="absolute -top-2 -right-2 bg-gray-200 dark:bg-gray-700 rounded-full p-1 shadow-sm text-gray-600 dark:text-gray-300 animate-in zoom-in"
                     >
                         <MoreHorizontal size={12} />
                     </button>
                )}
              </div>
          ))}
          <button 
            onClick={handleCreateCategory}
            className="px-3 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 text-sm font-bold hover:bg-indigo-100 whitespace-nowrap shrink-0"
          >
              <Plus size={14} /> Nueva
          </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-safe">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 pb-20">
            {filtered.map(book => (
            <BookCard key={book.id} book={book} onClick={() => onBookClick(book)} />
            ))}
            {filtered.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 opacity-50">
                    {activeCategoryId ? (
                        <>
                            <FolderOpen size={48} className="mb-4 text-gray-400" />
                            <p>Esta categoría está vacía.</p>
                            <button onClick={() => handleEditCategory(categories.find(c => c.id === activeCategoryId)!)} className="text-indigo-500 underline text-sm mt-2">Agregar libros</button>
                        </>
                    ) : (
                        <>
                            <BookOpen size={48} className="mb-4 text-gray-400" />
                            <p>No se encontraron libros.</p>
                        </>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

// Extracted for reuse in Customize View
const BookCard = ({ book, onClick }: { book: Book, onClick?: () => void }) => {
    return (
        <div onClick={onClick} className="group cursor-pointer flex flex-col gap-2 relative">
            <div className="aspect-[2/3] rounded-r-lg rounded-l-sm overflow-hidden shadow-md relative bg-gray-200 dark:bg-gray-700 transition-transform transform group-hover:-translate-y-1 duration-300">
                {/* Spine Effect */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-black/20 to-transparent z-10"></div>
                
                {/* Cover Image */}
                <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                
                {/* Stickers Layer */}
                {book.stickers && book.stickers.map(sticker => (
                    <div 
                        key={sticker.id}
                        className="absolute pointer-events-none"
                        style={{
                            left: `${sticker.x}%`,
                            top: `${sticker.y}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        {sticker.type === 'emoji' ? (
                            <span style={{ fontSize: '24px' }}>{sticker.src}</span>
                        ) : (
                            <img src={sticker.src} alt="sticker" className="w-8 h-8 object-contain" />
                        )}
                    </div>
                ))}
                
                {/* Text Layers */}
                {book.coverTexts && book.coverTexts.map(text => (
                    <div 
                        key={text.id}
                        className="absolute pointer-events-none whitespace-nowrap"
                        style={{
                            left: `${text.x}%`,
                            top: `${text.y}%`,
                            transform: 'translate(-50%, -50%)',
                            color: text.color,
                            fontSize: `${text.fontSize}px`,
                            fontFamily: text.fontFamily,
                            fontWeight: text.fontWeight,
                            fontStyle: text.fontStyle,
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                        }}
                    >
                        {text.text}
                    </div>
                ))}

                <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm uppercase font-bold tracking-wide z-10">
                    {book.mimeType.split('/').pop()?.replace('vnd.openxmlformats-officedocument.wordprocessingml.document', 'DOCX').substring(0,4)}
                </div>
                {book.progress > 0 && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800/30 z-10">
                        <div className="h-full bg-indigo-500" style={{width: `${book.progress}%`}} />
                    </div>
                )}
            </div>
            <div>
                <h3 className="font-serif font-bold text-gray-900 dark:text-gray-100 truncate text-sm leading-tight">{book.title}</h3>
                <p className="text-xs text-gray-500 truncate">{book.author}</p>
            </div>
        </div>
    );
};

// --- VIEW: Customize ---
const CustomizeView = ({ books, onUpdateBooks }: { books: Book[], onUpdateBooks: React.Dispatch<React.SetStateAction<Book[]>> }) => {
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    
    // Editor State
    const [editTitle, setEditTitle] = useState('');
    const [editCover, setEditCover] = useState('');
    
    // Stickers
    const [activeStickers, setActiveStickers] = useState<BookSticker[]>([]);
    const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
    const [placingSticker, setPlacingSticker] = useState<{src: string, type: 'emoji'|'image'} | null>(null);
    
    // Texts
    const [activeTexts, setActiveTexts] = useState<BookCoverText[]>([]);
    const [textInput, setTextInput] = useState('');
    const [isPlacingText, setIsPlacingText] = useState(false); // State to trigger text placement
    const [textColor, setTextColor] = useState('#ffffff');
    const [textSize, setTextSize] = useState(16);
    const [textFamily, setTextFamily] = useState<'sans'|'serif'|'cursive'>('sans');
    const [textStyle, setTextStyle] = useState<'normal'|'italic'>('normal');
    const [textWeight, setTextWeight] = useState<'normal'|'bold'>('bold');

    // Dragging
    const [dragTarget, setDragTarget] = useState<{ id: string, type: 'sticker' | 'text' } | null>(null);
    const coverRef = useRef<HTMLDivElement>(null);

    const handleSelectBook = (book: Book) => {
        setSelectedBook(book);
        setEditTitle(book.title);
        setEditCover(book.coverUrl || '');
        setActiveStickers(book.stickers || []);
        setActiveTexts(book.coverTexts || []);
        
        // Ensure original metadata exists before editing
        if (!book.originalMetadata) {
            book.originalMetadata = {
                title: book.title,
                coverUrl: book.coverUrl
            };
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await fileService.convertFileToBase64(file);
            setEditCover(`data:${file.type};base64,${base64}`);
        }
    };

    const handleCoverClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!placingSticker && !isPlacingText) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        if (placingSticker) {
            const newSticker: BookSticker = {
                id: crypto.randomUUID(),
                src: placingSticker.src,
                type: placingSticker.type,
                x, y, scale: 1
            };
            setActiveStickers([...activeStickers, newSticker]);
            setPlacingSticker(null); // Reset after placement
        } else if (isPlacingText && textInput.trim()) {
            const newText: BookCoverText = {
                id: crypto.randomUUID(),
                text: textInput,
                x, y,
                color: textColor,
                fontSize: textSize,
                fontFamily: textFamily,
                fontStyle: textStyle,
                fontWeight: textWeight
            };
            setActiveTexts([...activeTexts, newText]);
            setTextInput(''); // Clear input
            setIsPlacingText(false);
        }
    };

    // Drag Logic
    const handlePointerDown = (e: React.PointerEvent, id: string, type: 'sticker' | 'text') => {
        e.stopPropagation();
        e.preventDefault();
        setDragTarget({ id, type });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragTarget || !coverRef.current) return;
        
        const rect = coverRef.current.getBoundingClientRect();
        const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));

        if (dragTarget.type === 'sticker') {
            setActiveStickers(prev => prev.map(s => s.id === dragTarget.id ? { ...s, x, y } : s));
        } else {
            setActiveTexts(prev => prev.map(t => t.id === dragTarget.id ? { ...t, x, y } : t));
        }
    };

    const handlePointerUp = () => {
        setDragTarget(null);
    };

    const deleteItem = (id: string, type: 'sticker' | 'text') => {
        if (type === 'sticker') {
            setActiveStickers(prev => prev.filter(s => s.id !== id));
        } else {
            setActiveTexts(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleSave = async () => {
        if (!selectedBook) return;
        const updatedBook: Book = {
            ...selectedBook,
            title: editTitle,
            coverUrl: editCover,
            stickers: activeStickers,
            coverTexts: activeTexts,
            // ensure original metadata is preserved
            originalMetadata: selectedBook.originalMetadata || { title: selectedBook.title, coverUrl: selectedBook.coverUrl }
        };
        await dbService.updateBook(updatedBook);
        
        // Update local state
        const allBooks = await dbService.getAllBooks();
        onUpdateBooks(allBooks);
        setSelectedBook(null); // Back to list
    };

    const handleRestore = async () => {
        if (!selectedBook || !selectedBook.originalMetadata) return;
        const restoredBook: Book = {
            ...selectedBook,
            title: selectedBook.originalMetadata.title,
            coverUrl: selectedBook.originalMetadata.coverUrl,
            stickers: [],
            coverTexts: []
        };
        await dbService.updateBook(restoredBook);
        const allBooks = await dbService.getAllBooks();
        onUpdateBooks(allBooks);
        setSelectedBook(null);
    };

    if (selectedBook) {
        return (
            <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
                <StickerPicker 
                    isOpen={isStickerPickerOpen} 
                    onClose={() => setIsStickerPickerOpen(false)} 
                    onSelect={(data) => setPlacingSticker(data)} 
                />

                <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10 shrink-0">
                    <button onClick={() => setSelectedBook(null)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="font-bold dark:text-white hidden md:block">Editor de Portada</h2>
                    <div className="flex gap-2">
                        <button onClick={handleRestore} className="p-2 text-red-500 hover:bg-red-50 rounded-full" title="Restaurar Original">
                            <Undo size={20} />
                        </button>
                        <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-full font-bold shadow-lg hover:bg-indigo-700">
                            Guardar
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 flex flex-col lg:flex-row gap-8 items-start justify-center">
                    
                    {/* Cover Preview Area */}
                    <div className="shrink-0 mx-auto sticky top-0 z-10 lg:static">
                        {placingSticker && (
                             <div className="bg-pink-500 text-white p-2 mb-2 rounded-lg text-center text-sm font-bold animate-pulse shadow-lg">
                                Toca la portada para pegar Sticker
                                <button onClick={() => setPlacingSticker(null)} className="ml-2 underline">Cancelar</button>
                            </div>
                        )}
                        {isPlacingText && (
                             <div className="bg-indigo-500 text-white p-2 mb-2 rounded-lg text-center text-sm font-bold animate-pulse shadow-lg">
                                Toca la portada para poner el Texto
                                <button onClick={() => setIsPlacingText(false)} className="ml-2 underline">Cancelar</button>
                            </div>
                        )}
                        
                        <div 
                            ref={coverRef}
                            className="relative w-48 md:w-80 aspect-[2/3] rounded-lg shadow-2xl overflow-hidden cursor-crosshair ring-4 ring-white dark:ring-gray-700 bg-gray-200 mx-auto"
                            onClick={handleCoverClick}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                        >
                            <img src={editCover} className="w-full h-full object-cover pointer-events-none select-none" alt="Cover" />
                            
                            {/* Render Stickers */}
                            {activeStickers.map(s => (
                                <div 
                                    key={s.id} 
                                    className="absolute cursor-move active:scale-110 transition-transform group" 
                                    style={{ left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%, -50%)' }}
                                    onPointerDown={(e) => handlePointerDown(e, s.id, 'sticker')}
                                >
                                     <button 
                                        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        onClick={(e) => { e.stopPropagation(); deleteItem(s.id, 'sticker'); }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                     >
                                        <X size={10} />
                                    </button>
                                    {s.type === 'emoji' ? (
                                        <span className="text-3xl md:text-5xl select-none filter drop-shadow-md">{s.src}</span>
                                    ) : (
                                        <img src={s.src} alt="sticker" className="w-12 h-12 md:w-20 md:h-20 object-contain select-none pointer-events-none filter drop-shadow-md" />
                                    )}
                                </div>
                            ))}

                            {/* Render Texts */}
                            {activeTexts.map(t => (
                                <div
                                    key={t.id}
                                    className="absolute cursor-move group whitespace-nowrap border border-transparent hover:border-dashed hover:border-white/50 px-1"
                                    style={{
                                        left: `${t.x}%`, 
                                        top: `${t.y}%`, 
                                        transform: 'translate(-50%, -50%)',
                                        color: t.color,
                                        fontSize: `${t.fontSize}px`,
                                        fontFamily: t.fontFamily,
                                        fontWeight: t.fontWeight,
                                        fontStyle: t.fontStyle,
                                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                    }}
                                    onPointerDown={(e) => handlePointerDown(e, t.id, 'text')}
                                >
                                     <button 
                                        className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"
                                        onClick={(e) => { e.stopPropagation(); deleteItem(t.id, 'text'); }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                     >
                                        <X size={12} />
                                    </button>
                                    {t.text}
                                </div>
                            ))}
                        </div>
                         <p className="text-center text-xs text-gray-500 mt-2">Arrastra los elementos para moverlos</p>
                    </div>

                    {/* Tools Panel */}
                    <div className="flex-1 w-full max-w-md space-y-6 pb-20 mx-auto">
                        {/* Title & Cover Upload */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 space-y-4">
                            <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">Metadatos</h3>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Título</label>
                                <input 
                                    value={editTitle} 
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full p-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                />
                            </div>
                             <label className="flex items-center justify-center gap-2 p-3 border border-dashed rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-gray-300 transition-colors">
                                <Image size={20} />
                                <span className="text-sm">Subir portada</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
                            </label>
                        </div>

                        {/* Sticker Tools */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">Stickers</h3>
                                {activeStickers.length > 0 && (
                                    <button onClick={() => setActiveStickers([])} className="text-xs text-red-500 hover:underline">Limpiar todo</button>
                                )}
                            </div>
                            <button 
                                onClick={() => setIsStickerPickerOpen(true)}
                                className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-800"
                            >
                                <Smile size={20} /> Abrir Galería
                            </button>
                        </div>

                        {/* Text Tools */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">Texto Personalizado</h3>
                                {activeTexts.length > 0 && (
                                    <button onClick={() => setActiveTexts([])} className="text-xs text-red-500 hover:underline">Limpiar textos</button>
                                )}
                            </div>
                            
                            <div className="flex gap-2">
                                <input 
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    placeholder="Escribe algo..."
                                    className="flex-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                <button 
                                    onClick={() => setIsPlacingText(true)}
                                    disabled={!textInput.trim()}
                                    className={`p-2 rounded-lg flex items-center gap-2 ${isPlacingText ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' : 'bg-gray-100 dark:bg-gray-700 dark:text-white'} disabled:opacity-50`}
                                    title="Tocar en la portada para colocar"
                                >
                                    <MousePointer2 size={20} />
                                    <span className="text-xs font-bold hidden sm:inline">Colocar</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs block mb-1 dark:text-gray-400">Color</label>
                                    <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                                </div>
                                <div>
                                    <label className="text-xs block mb-1 dark:text-gray-400">Tamaño ({textSize}px)</label>
                                    <input type="range" min="12" max="64" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} className="w-full accent-indigo-600" />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setTextWeight(w => w === 'bold' ? 'normal' : 'bold')} className={`flex-1 p-2 border rounded-lg flex justify-center ${textWeight === 'bold' ? 'bg-gray-200 dark:bg-gray-600' : 'dark:border-gray-600'}`}>
                                    <Bold size={18} />
                                </button>
                                <button onClick={() => setTextStyle(s => s === 'italic' ? 'normal' : 'italic')} className={`flex-1 p-2 border rounded-lg flex justify-center ${textStyle === 'italic' ? 'bg-gray-200 dark:bg-gray-600' : 'dark:border-gray-600'}`}>
                                    <Italic size={18} />
                                </button>
                            </div>

                            <div className="flex gap-2 text-xs">
                                <button onClick={() => setTextFamily('sans')} className={`flex-1 p-2 border rounded-lg font-sans ${textFamily === 'sans' ? 'ring-2 ring-indigo-500' : 'dark:border-gray-600'}`}>Sans</button>
                                <button onClick={() => setTextFamily('serif')} className={`flex-1 p-2 border rounded-lg font-serif ${textFamily === 'serif' ? 'ring-2 ring-indigo-500' : 'dark:border-gray-600'}`}>Serif</button>
                                <button onClick={() => setTextFamily('cursive')} className={`flex-1 p-2 border rounded-lg font-cursive italic ${textFamily === 'cursive' ? 'ring-2 ring-indigo-500' : 'dark:border-gray-600'}`}>Cursive</button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <h1 className="text-3xl font-serif font-bold dark:text-white mb-2">Estudio Creativo</h1>
            <p className="text-gray-500 mb-6">Elige un libro para personalizar su apariencia.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {books.map(book => (
                    <BookCard key={book.id} book={book} onClick={() => handleSelectBook(book)} />
                ))}
            </div>
        </div>
    );
};

// --- VIEW: Stats ---
const StatsView = ({ books }: { books: Book[] }) => {
    const [sessions, setSessions] = useState<ReadingSession[]>([]);
    const [seenAchievements, setSeenAchievements] = useState<string[]>([]);
    const [contextStats, setContextStats] = useState<any>({});

    useEffect(() => {
        const loadData = async () => {
            const s = await dbService.getSessions();
            setSessions(s);
            const seen = await dbService.getSeenAchievements();
            setSeenAchievements(seen);
            
            // Build temporary context for UI progress bars
            const allBooks = await dbService.getAllBooks();
            const totalPages = s.reduce((acc, sess) => acc + sess.pagesRead, 0);
            const totalMinutes = s.reduce((acc, sess) => acc + sess.minutes, 0);
            const totalBooks = allBooks.filter(b => b.progress >= 95).length;
            
            // NOTE: For full accuracy we'd need to fetch everything like checkAchievements does, 
            // but for UI speed we'll approximate the complex ones or fetch them lazily if needed.
            // For now, let's just use the basic stats we have readily available.
             const allHighlights = await Promise.all(allBooks.map(b => dbService.getHighlights(b.id)));
             const allBookmarks = await Promise.all(allBooks.map(b => dbService.getBookmarks(b.id)));
             const allStickers = await Promise.all(allBooks.map(b => dbService.getPageStickers(b.id)));
             const userStickers = await dbService.getUserStickers();
             const allCats = await dbService.getAllCategories();

            setContextStats({
                totalPages, totalMinutes, totalBooks, streak: 0, // Recalc streak
                totalHighlights: allHighlights.flat().length,
                totalBookmarks: allBookmarks.flat().length,
                totalStickersPlaced: allStickers.flat().length,
                totalUserStickers: userStickers.length,
                customCoversCount: allBooks.filter(b => b.originalMetadata && b.coverUrl !== b.originalMetadata.coverUrl).length,
                categoriesCount: allCats.length,
                hasChangedTheme: true, // Placeholder
                hasUsedAudio: true, // Placeholder
                hasChangedVoice: true, // Placeholder
                hasChangedSpeed: true, // Placeholder
                lastSessionTime: Date.now()
            });
        };
        loadData();
    }, []);

    // Calculate Stats for Dashboard
    const totalMinutes = sessions.reduce((acc, s) => acc + s.minutes, 0);
    const totalPages = sessions.reduce((acc, s) => acc + s.pagesRead, 0);
    const booksFinished = books.filter(b => b.progress >= 95).length;

    // Chart Data (Last 7 Days)
    const chartData = useMemo(() => {
        const last7Days = Array.from({length: 7}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        return last7Days.map(date => {
            const session = sessions.find(s => s.date === date);
            return {
                name: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
                minutes: session ? session.minutes : 0
            };
        });
    }, [sessions]);

    // Recalc streak logic for display
    let streak = 0;
    if (sessions.length > 0) {
        const sorted = [...sessions].sort((a,b) => b.date.localeCompare(a.date));
        const today = new Date().toISOString().split('T')[0];
        if (sorted[0].date === today || sorted[0].date === new Date(Date.now() - 86400000).toISOString().split('T')[0]) {
             streak = 1; 
             // ... loop
        }
    }
    const safeContext = { ...contextStats, streak };

    return (
        <div className="h-full overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900 pb-24">
            <h1 className="text-3xl font-serif font-bold dark:text-white mb-6">Tu Progreso</h1>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400">
                        <Timer size={18} /> <span>Tiempo Total</span>
                    </div>
                    <p className="text-2xl font-bold dark:text-white">{(totalMinutes / 60).toFixed(1)} <span className="text-sm font-normal">hrs</span></p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400">
                        <BookOpen size={18} /> <span>Páginas</span>
                    </div>
                    <p className="text-2xl font-bold dark:text-white">{totalPages}</p>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm mb-8 border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold mb-4 dark:text-white">Actividad Semanal</h3>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                cursor={{fill: 'transparent'}}
                            />
                            <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Achievements */}
            <h2 className="text-xl font-bold dark:text-white mb-4 flex items-center gap-2">
                <Zap className="text-yellow-500" fill="currentColor" /> Logros ({seenAchievements.length}/{ACHIEVEMENT_DEFINITIONS.length})
            </h2>
            <div className="space-y-4">
                {ACHIEVEMENT_DEFINITIONS.map(ach => {
                    const unlocked = seenAchievements.includes(ach.id);
                    // Prevent crash if context not fully loaded
                    const progress = safeContext.totalPages !== undefined ? ach.currentProgress(safeContext) : 0;
                    const max = safeContext.totalPages !== undefined ? ach.maxProgress(safeContext) : 100;
                    const percent = Math.min(100, Math.round((progress / max) * 100));

                    return (
                        <div key={ach.id} className={`flex items-center gap-4 p-4 rounded-xl border ${unlocked ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700' : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700 opacity-60'}`}>
                            <div className="text-3xl filter drop-shadow-sm">{ach.icon}</div>
                            <div className="flex-1">
                                <h4 className={`font-bold ${unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{ach.title}</h4>
                                <p className="text-xs text-gray-500">{ach.description}</p>
                                {!unlocked && (
                                    <div className="mt-2 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 transition-all duration-500" style={{width: `${percent}%`}}></div>
                                    </div>
                                )}
                            </div>
                            {unlocked && <div className="text-yellow-500"><Zap size={20} fill="currentColor" /></div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- VIEW: Settings ---
const SettingsView = ({ settings, onUpdate }: { settings: AppSettings, onUpdate: (s: AppSettings) => void }) => {
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        const loadVoices = () => {
            const available = window.speechSynthesis.getVoices();
            setVoices(available);
        };
        // Load immediately
        loadVoices();
        // Load when changed (browsers load async)
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const handleUpdate = (key: keyof AppSettings, value: any) => {
        const newSettings = { ...settings, [key]: value };
        onUpdate(newSettings);
        dbService.saveSettings(newSettings);
    };

    return (
        <div className="h-full p-4 md:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
            <h1 className="text-3xl font-serif font-bold dark:text-white mb-6">Ajustes</h1>
            
            {/* Visuals */}
            <section className="mb-8">
                <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4">Apariencia</h3>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border dark:border-gray-700 space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-3 dark:text-gray-300">Tema</label>
                        <div className="flex gap-2">
                            {['light', 'sepia', 'dark'].map((theme) => (
                                <button
                                    key={theme}
                                    onClick={() => handleUpdate('theme', theme)}
                                    className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 capitalize ${settings.theme === theme ? 'ring-2 ring-indigo-500 border-transparent bg-indigo-50 dark:bg-indigo-900/50' : 'border-gray-200 dark:border-gray-600 dark:text-gray-300'}`}
                                >
                                    {theme === 'light' && <Sun size={16} />}
                                    {theme === 'dark' && <Moon size={16} />}
                                    {theme}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-3 dark:text-gray-300">Fuente</label>
                        <div className="flex gap-2">
                            {['sans', 'serif', 'dyslexic'].map((font) => (
                                <button
                                    key={font}
                                    onClick={() => handleUpdate('fontFamily', font)}
                                    className={`flex-1 py-2 rounded-lg border capitalize ${settings.fontFamily === font ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/50' : 'border-gray-200 dark:border-gray-600 dark:text-gray-300'}`}
                                >
                                    {font}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-3 dark:text-gray-300">Tamaño: {settings.fontSize}px</label>
                        <input 
                            type="range" min="12" max="32" 
                            value={settings.fontSize} 
                            onChange={(e) => handleUpdate('fontSize', Number(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                    </div>
                </div>
            </section>

             {/* Voice & TTS */}
             <section className="mb-8">
                <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4">Voz y Narración</h3>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border dark:border-gray-700 space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-3 dark:text-gray-300">Seleccionar Voz</label>
                        <select 
                            value={settings.ttsVoiceURI || ''} 
                            onChange={(e) => handleUpdate('ttsVoiceURI', e.target.value)}
                            className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">Automático</option>
                            {voices.map(v => (
                                <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-3 dark:text-gray-300">Velocidad de Lectura (x{settings.ttsSpeed})</label>
                        <div className="flex items-center gap-4">
                            <span className="text-xs">Lento</span>
                            <input 
                                type="range" min="0.5" max="2" step="0.1"
                                value={settings.ttsSpeed} 
                                onChange={(e) => handleUpdate('ttsSpeed', Number(e.target.value))}
                                className="w-full accent-indigo-600"
                            />
                            <span className="text-xs">Rápido</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Karaoke & Audio */}
            <section>
                <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4">Karaoke Visual</h3>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border dark:border-gray-700 space-y-6">
                     <div>
                        <label className="block text-sm font-medium mb-3 dark:text-gray-300">Velocidad Karaoke Visual (Solo Lectura)</label>
                        <div className="flex items-center gap-4">
                            <span className="text-xs">Rápido</span>
                            <input 
                                type="range" min="50" max="1000" step="50"
                                value={settings.karaokeSpeed} 
                                onChange={(e) => handleUpdate('karaokeSpeed', Number(e.target.value))}
                                className="w-full accent-indigo-600"
                            />
                            <span className="text-xs">Lento</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-3 dark:text-gray-300">Brillo / Intensidad</label>
                        <input 
                            type="range" min="0.1" max="1" step="0.1"
                            value={settings.karaokeOpacity} 
                            onChange={(e) => handleUpdate('karaokeOpacity', Number(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                        <div className="h-6 mt-2 rounded bg-yellow-300" style={{ opacity: settings.karaokeOpacity }}></div>
                    </div>
                </div>
            </section>
        </div>
    );
};

// --- VIEW: Camera Import (Mock) ---
const CameraImportView = ({ onCancel, onImport }: { onCancel: () => void, onImport: (text: string) => void }) => {
    // In a real app, this would use the <video> tag and Tesseract.js or Gemini Vision
    // For this PWA, we simulate the "Capture" to be functional for the user flow.
    const [mockText, setMockText] = useState("Aquí aparecería el texto escaneado de tu libro físico. Por ahora, esto es una simulación del proceso de OCR usando IA.");

    return (
        <div className="h-full bg-black text-white flex flex-col p-6">
            <h2 className="text-center font-bold mb-4">Escanear Página</h2>
            <div className="flex-1 bg-gray-800 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-600 relative overflow-hidden">
                <p className="text-gray-400">Vista de Cámara</p>
                <div className="absolute inset-0 pointer-events-none border-4 border-indigo-500/30"></div>
            </div>
            <div className="py-6 flex flex-col gap-4">
                <textarea 
                    className="w-full bg-gray-900 p-2 rounded text-sm text-gray-300"
                    rows={3}
                    value={mockText}
                    onChange={(e) => setMockText(e.target.value)}
                />
                <div className="flex gap-4">
                    <button onClick={onCancel} className="flex-1 py-3 bg-gray-700 rounded-full font-bold">Cancelar</button>
                    <button onClick={() => onImport(mockText)} className="flex-1 py-3 bg-white text-black rounded-full font-bold flex items-center justify-center gap-2">
                        <Camera size={20} /> Capturar
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- VIEW: Reader (Complex Logic) ---
const ReaderView = ({ book, mode, settings, onBack, onUpdateSettings }: { book: Book, mode: ReaderMode, settings: AppSettings, onBack: () => void, onUpdateSettings: (s: AppSettings) => void }) => {
  const [pages, setPages] = useState<string[]>([]);
  // Use book.lastWordIndex to calculate page
  const initialPage = book.lastWordIndex ? Math.floor(book.lastWordIndex / WORDS_PER_PAGE) : 0;
  const initialKaraokeIndex = book.lastWordIndex ? book.lastWordIndex % WORDS_PER_PAGE : 0;
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isPlaying, setIsPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [karaokeWordIndex, setKaraokeWordIndex] = useState(initialKaraokeIndex); // Relative to current page words
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [pageStickers, setPageStickers] = useState<PageSticker[]>([]);
  
  // Section Reading State
  const [sectionMode, setSectionMode] = useState<'off' | 'pickStart' | 'pickEnd' | 'active'>('off');
  const [activeSection, setActiveSection] = useState<{start: number, end: number} | null>(null);

  // Selection Logic
  const [selectionRange, setSelectionRange] = useState<{start: number, end: number, text: string} | null>(null);

  // Bookmark Creation Modal State
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | undefined>(undefined);

  // Sticker State
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [placingSticker, setPlacingSticker] = useState<{src: string, type: 'emoji'|'image'} | null>(null);
  const [areStickersGhosted, setAreStickersGhosted] = useState(false);
  
  // Sticker Dragging State
  const [draggingStickerId, setDraggingStickerId] = useState<string | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wordsRef = useRef<string[]>([]);
  const intervalRef = useRef<any>(null);
  
  // Tracking
  const sessionStartRef = useRef(Date.now());
  const pagesVisitedRef = useRef<Set<number>>(new Set());

  // 1. Initialize Content & Highlights
  useEffect(() => {
    const loadContent = async () => {
        setIsLoading(true);
        // Simple pagination by words
        const allWords = book.content.split(/\s+/);
        const newPages = [];
        for (let i = 0; i < allWords.length; i += WORDS_PER_PAGE) {
            newPages.push(allWords.slice(i, i + WORDS_PER_PAGE).join(' '));
        }
        setPages(newPages);
        
        // Ensure current page is valid for new content
        if (currentPage >= newPages.length) setCurrentPage(0);
        
        // Load highlights for THIS mode
        const savedHighlights = await dbService.getHighlights(book.id, mode);
        setHighlights(savedHighlights);

        const savedBookmarks = await dbService.getBookmarks(book.id);
        setBookmarks(savedBookmarks);

        // Load stickers filtered by Mode
        const savedStickers = await dbService.getPageStickers(book.id, mode);
        setPageStickers(savedStickers);

        setIsLoading(false);
    };
    loadContent();

    return () => {
        stopAudio();
        stopKaraokeTimer();
        // Log Session on unmount
        const minutes = Math.round((Date.now() - sessionStartRef.current) / 60000);
        const uniquePages = pagesVisitedRef.current.size;
        dbService.logReadingSession(minutes, uniquePages);
    };
  }, [book.id, mode]); // Reload if mode changes

  // Reset local word index when page changes
  useEffect(() => {
      pagesVisitedRef.current.add(currentPage);
      // Only reset if we are not initializing from saved state
      // Logic handled in init
      stopAudio();
      stopKaraokeTimer();
      setIsPlaying(false);
      setSectionMode('off');
      setActiveSection(null);
  }, [currentPage]);

  // Handle Close Book explicitly
  const handleCloseBook = () => {
      // Calculate Exact Global Word Index
      // Global Index = (Current Page * WORDS_PER_PAGE) + Local Word Index
      const localIndex = karaokeWordIndex >= 0 ? karaokeWordIndex : 0;
      const globalIndex = (currentPage * WORDS_PER_PAGE) + localIndex;
      const totalWords = pages.join(' ').split(/\s+/).length;
      const progress = totalWords > 0 ? (globalIndex / totalWords) * 100 : 0;

      dbService.updateBookProgress(book.id, progress, currentPage, globalIndex).then(() => {
          onBack();
      });
  };

  // 2. Audio & Karaoke Logic
  const startAudio = (startIndex = 0) => {
    if (!window.speechSynthesis) return;
    stopAudio();

    // Determine the text range
    let textToRead = "";
    let globalOffset = 0;

    if (activeSection) {
        // If section is active, only read that slice
        const safeStart = Math.max(startIndex, activeSection.start);
        textToRead = wordsRef.current.slice(safeStart, activeSection.end + 1).join(' ');
        globalOffset = safeStart;
    } else {
        // Read from current index to end
        // IMPORTANT: Use current karaokeWordIndex if no startIndex provided and we are paused
        const actualStart = startIndex > 0 ? startIndex : (karaokeWordIndex > 0 ? karaokeWordIndex : 0);
        textToRead = wordsRef.current.slice(actualStart).join(' ');
        globalOffset = actualStart;
    }

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = settings.ttsSpeed;
    
    // Apply Selected Voice
    if (settings.ttsVoiceURI) {
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.voiceURI === settings.ttsVoiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
    }
    
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
         const textSoFar = textToRead.substring(0, event.charIndex);
         const wordsSoFar = textSoFar.split(/\s+/).length;
         setKaraokeWordIndex(globalOffset + wordsSoFar);
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      // Auto turn page only if NOT in section mode
      if (!activeSection && currentPage < pages.length - 1) {
          nextPage(); 
          setKaraokeWordIndex(0); // Reset for new page
      }
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const stopAudio = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    speechRef.current = null;
  };

  const startKaraokeTimer = () => {
      stopKaraokeTimer();
      setIsPlaying(true);
      
      const endIndex = activeSection ? activeSection.end : wordsRef.current.length - 1;

      intervalRef.current = setInterval(() => {
          setKaraokeWordIndex(prev => {
              // If current word exceeds the defined end point (section or page)
              if (prev >= endIndex) {
                  stopKaraokeTimer();
                  setIsPlaying(false);
                  if (!activeSection && currentPage < pages.length - 1) {
                      nextPage();
                      return 0;
                  }
                  return prev;
              }
              return prev + 1;
          });
      }, settings.karaokeSpeed);
  };

  const stopKaraokeTimer = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
  };

  const togglePlay = () => {
      if (isPlaying) {
          stopAudio();
          stopKaraokeTimer();
          setIsPlaying(false);
      } else {
          // Resume logic
          // If we have a section, ensure we start at the beginning of section if currently 0 or out of bounds
          let resumeIndex = karaokeWordIndex > 0 ? karaokeWordIndex : 0;
          
          if (activeSection) {
              if (resumeIndex < activeSection.start || resumeIndex > activeSection.end) {
                  resumeIndex = activeSection.start;
              }
          }

          if (mode === 'audio') {
              startAudio(resumeIndex);
          } else {
              setKaraokeWordIndex(resumeIndex);
              startKaraokeTimer();
          }
      }
  };

  const handleRestartPage = () => {
      stopAudio();
      stopKaraokeTimer();
      
      if (activeSection) {
          setKaraokeWordIndex(activeSection.start);
      } else {
          setKaraokeWordIndex(0);
      }
      
      setIsPlaying(false);
      // Optional: Auto start
      setTimeout(() => {
        if (mode === 'audio') startAudio(activeSection ? activeSection.start : 0);
        else startKaraokeTimer();
      }, 500);
  };

  // 3. Interaction Logic (Double vs Single Tap)
  const clickTimeoutRef = useRef<any>(null);

  const handleWordInteraction = (index: number, word: string) => {
      // SECTION MODE INTERCEPTION
      if (sectionMode === 'pickStart') {
          setActiveSection({ start: index, end: index });
          setSectionMode('pickEnd');
          return;
      }
      if (sectionMode === 'pickEnd') {
          setActiveSection(prev => prev ? { ...prev, end: index } : { start: index, end: index });
          setSectionMode('active');
          return;
      }
      
      if (placingSticker) return; // Ignore word clicks if placing sticker
      if (draggingStickerId) return; // Ignore if dragging

      // NORMAL INTERACTION
      if (clickTimeoutRef.current) {
          // Double Tap Detected -> Play from here
          clearTimeout(clickTimeoutRef.current);
          clickTimeoutRef.current = null;
          
          setKaraokeWordIndex(index);
          if (mode === 'audio') {
              startAudio(index);
          } else {
              if (isPlaying) startKaraokeTimer(); 
          }
      } else {
          // Wait for potential double tap
          clickTimeoutRef.current = setTimeout(() => {
              // Single Tap Action -> Highlight Menu
              setSelectionRange({ start: index, end: index, text: word });
              clickTimeoutRef.current = null;
          }, 250);
      }
  };

  const addColorHighlight = (color: HighlightColor) => {
      if (!selectionRange) return;
      const newH: Highlight = {
          id: crypto.randomUUID(),
          bookId: book.id,
          text: selectionRange.text,
          rangeStart: selectionRange.start,
          rangeEnd: selectionRange.end,
          pageIndex: currentPage,
          color,
          mode, // Save specifically for 'audio' or 'read'
          createdAt: Date.now()
      };
      dbService.addHighlight(newH).then(() => {
          setHighlights(prev => [...prev, newH]);
          setSelectionRange(null);
      });
  };

  // --- Bookmark Logic ---
  const handleOpenBookmarkModal = () => {
      setEditingBookmark(undefined); // New bookmark
      setIsBookmarkModalOpen(true);
  };

  const handleEditBookmark = (b: Bookmark) => {
      setEditingBookmark(b);
      setIsBookmarkModalOpen(true);
  };

  const handleSaveBookmark = (data: Partial<Bookmark>) => {
      const isNew = !editingBookmark;
      
      const b: Bookmark = isNew ? {
          id: crypto.randomUUID(),
          bookId: book.id,
          pageIndex: currentPage,
          createdAt: Date.now(),
          label: data.label || `Página ${currentPage + 1}`,
          color: data.color || 'blue',
          style: data.style || 'ribbon'
      } : {
          ...editingBookmark!,
          label: data.label!,
          color: data.color!,
          style: data.style!
      };

      dbService.addBookmark(b).then(() => {
          if (isNew) {
              setBookmarks(prev => [...prev, b]);
              alert("Marcador guardado");
          } else {
              setBookmarks(prev => prev.map(existing => existing.id === b.id ? b : existing));
          }
          setIsBookmarkModalOpen(false);
      });
  };

  // --- Sticker Placement Logic ---
  const handleStickerPlace = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!placingSticker || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const scrollY = containerRef.current.scrollTop;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top + scrollY) / containerRef.current.scrollHeight) * 100;
      
      const newSticker: PageSticker = {
          id: crypto.randomUUID(),
          bookId: book.id,
          pageIndex: currentPage,
          src: placingSticker.src,
          type: placingSticker.type,
          x, y, rotation: Math.random() * 20 - 10,
          mode, // Added mode
          createdAt: Date.now()
      };
      
      dbService.addPageSticker(newSticker).then(() => {
          setPageStickers(prev => [...prev, newSticker]);
          setPlacingSticker(null); // Exit placement mode
      });
  };

  // --- Sticker Drag Logic ---
  const handleStickerPointerDown = (e: React.PointerEvent, sticker: PageSticker) => {
      e.stopPropagation();
      if (!containerRef.current) return;
      // Prevent selecting text while dragging
      e.preventDefault();
      
      setDraggingStickerId(sticker.id);
      
      // Selection Toggle Logic
      if (selectedStickerId === sticker.id) {
          setSelectedStickerId(null);
      } else {
          setSelectedStickerId(sticker.id);
      }
      
      // We rely on pointer move on container to update position
      // Capture pointer to ensure smooth drag even if outside element
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!draggingStickerId || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const scrollY = containerRef.current.scrollTop;
      
      // Calc new % position
      const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((e.clientY - rect.top + scrollY) / containerRef.current.scrollHeight) * 100));

      setPageStickers(prev => prev.map(s => s.id === draggingStickerId ? { ...s, x, y } : s));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      if (draggingStickerId) {
          const sticker = pageStickers.find(s => s.id === draggingStickerId);
          if (sticker) {
              dbService.updatePageSticker(sticker.id, sticker.x, sticker.y);
          }
          setDraggingStickerId(null);
      }
  };

  const handleDeleteSticker = (id: string, e: React.MouseEvent) => {
      // CRITICAL FIX: Ensure no bubbling
      e.stopPropagation();
      e.preventDefault();
      
      dbService.deletePageSticker(id).then(() => {
          setPageStickers(prev => prev.filter(s => s.id !== id));
          if (selectedStickerId === id) setSelectedStickerId(null);
      });
  };

  // Toggle Section Mode
  const toggleSectionTool = () => {
      if (sectionMode !== 'off') {
          setSectionMode('off');
          setActiveSection(null);
          stopAudio();
          stopKaraokeTimer();
          setIsPlaying(false);
      } else {
          setSectionMode('pickStart');
      }
  };

  // 4. Render Page Content
  const renderedContent = useMemo(() => {
      if (!pages[currentPage]) return null;
      const words = pages[currentPage].split(/\s+/);
      wordsRef.current = words;

      return words.map((word, index) => {
          // Check highlight
          const hl = highlights.find(h => h.pageIndex === currentPage && index >= h.rangeStart && index <= h.rangeEnd);
          // Check karaoke
          const isCurrent = index === karaokeWordIndex;
          // Check section mode state
          const inSection = activeSection && index >= activeSection.start && index <= activeSection.end;
          const isDimmed = activeSection && !inSection;

          let className = "inline-block mr-1.5 px-0.5 rounded transition-all duration-200 cursor-pointer ";
          if (hl) className += `bg-${hl.color}-200 dark:bg-${hl.color}-900/50 `;
          
          if (isDimmed) className += "opacity-40 ";
          if (inSection) className += "dark:text-indigo-100 ";
          
          // Karaoke Style
          if (isCurrent) {
               className += `scale-110 font-bold z-10 relative `;
          } else {
              className += "hover:bg-gray-100 dark:hover:bg-gray-800 ";
          }

          const style = isCurrent ? {
              backgroundColor: settings.karaokeColor === 'yellow' ? '#fde047' : '#93c5fd',
              opacity: settings.karaokeOpacity,
              boxShadow: `0 0 10px ${settings.karaokeColor}`
          } : {};

          // Boundary Markers for Section Mode
          if (activeSection) {
              if (index === activeSection.start) className += "border-l-4 border-green-500 pl-1 ";
              if (index === activeSection.end) className += "border-r-4 border-red-500 pr-1 ";
          }

          // Selected for highlighting
          if (selectionRange && index >= selectionRange.start && index <= selectionRange.end) {
              className += "border-b-2 border-indigo-500 ";
          }

          return (
              <span 
                key={index} 
                className={className}
                style={style}
                onClick={() => handleWordInteraction(index, word)}
              >
                  {word}
              </span>
          );
      });
  }, [pages, currentPage, highlights, karaokeWordIndex, selectionRange, settings, mode, activeSection]);

  const nextPage = () => {
      setCurrentPage(p => Math.min(pages.length - 1, p + 1));
      setKaraokeWordIndex(0);
  }
  const prevPage = () => {
      setCurrentPage(p => Math.max(0, p - 1));
      setKaraokeWordIndex(0);
  }

  // Visual Bookmark Logic
  const currentBookmark = bookmarks.find(b => b.pageIndex === currentPage);

  // Filter Stickers for Current Page
  const currentStickers = pageStickers.filter(s => s.pageIndex === currentPage);

  if (isLoading) return <div className="flex items-center justify-center h-full"><BrainCircuit className="animate-spin text-indigo-500" size={40} /></div>;

  return (
    <div className={`h-full flex flex-col relative ${settings.fontFamily === 'serif' ? 'font-serif' : settings.fontFamily === 'dyslexic' ? 'font-dyslexic' : 'font-sans'}`}
         style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}>
        
        {/* Bookmark Modal */}
        <BookmarkModal 
            isOpen={isBookmarkModalOpen} 
            onClose={() => setIsBookmarkModalOpen(false)} 
            onSave={handleSaveBookmark} 
            initialData={editingBookmark}
            pageIndex={currentPage}
        />

        {/* Top Bar */}
        <div className="flex justify-between items-center p-3 md:p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b dark:border-gray-800 z-20 shrink-0">
             {/* Replace Back arrow with Close Book Button */}
            <button onClick={handleCloseBook} className="px-4 py-2 bg-red-100 text-red-600 rounded-full text-xs md:text-sm font-bold hover:bg-red-200 transition-colors">
                Cerrar Libro
            </button>
            <div className="flex gap-4">
                <button onClick={() => setShowBookmarks(!showBookmarks)}><BookmarkIcon size={24} className={showBookmarks ? "fill-indigo-500 text-indigo-500" : ""} /></button>
                <button onClick={() => setMenuOpen(!menuOpen)}><Type size={24} /></button>
            </div>
        </div>
        
        {/* Section Mode Banner */}
        {sectionMode !== 'off' && (
            <div className="bg-indigo-600 text-white p-2 text-center text-sm font-bold animate-in slide-in-from-top z-30 shadow-md">
                {sectionMode === 'pickStart' && "Toca la PRIMERA palabra"}
                {sectionMode === 'pickEnd' && "Toca la ÚLTIMA palabra"}
                {sectionMode === 'active' && "Sección lista para leer"}
            </div>
        )}

         {/* Sticker Placement Banner */}
         {placingSticker && (
            <div className="bg-pink-500 text-white p-2 text-center text-sm font-bold animate-in slide-in-from-top z-30 shadow-md flex justify-between px-4 items-center">
                <span>Toca donde quieras pegar el Sticker</span>
                <button onClick={() => setPlacingSticker(null)}><X size={16} /></button>
            </div>
        )}

        {/* Settings Dropdown */}
        {menuOpen && (
            <div className="absolute top-16 right-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl z-50 w-64 border dark:border-gray-700 animate-in zoom-in-95 origin-top-right">
                <p className="text-xs font-bold text-gray-400 mb-2">MODO {mode === 'audio' ? 'AUDIOLIBRO' : 'LECTURA'}</p>
                <div className="flex justify-between mb-4">
                    <button onClick={() => onUpdateSettings({...settings, fontSize: settings.fontSize - 2})} className="p-2 bg-gray-100 dark:bg-gray-700 rounded"><Type size={14} /></button>
                    <span>{settings.fontSize}px</span>
                    <button onClick={() => onUpdateSettings({...settings, fontSize: settings.fontSize + 2})} className="p-2 bg-gray-100 dark:bg-gray-700 rounded"><Type size={20} /></button>
                </div>
                {mode === 'read' && (
                     <div className="mb-2">
                        <label className="text-xs">Velocidad Karaoke</label>
                        <input type="range" min="100" max="1000" step="50" value={settings.karaokeSpeed} onChange={(e) => onUpdateSettings({...settings, karaokeSpeed: Number(e.target.value)})} className="w-full" />
                     </div>
                )}
            </div>
        )}

        {/* Bookmark Side Panel */}
        {showBookmarks && (
            <div className="fixed inset-0 md:absolute md:inset-auto md:right-0 md:top-16 md:bottom-20 md:w-80 bg-white dark:bg-gray-900 shadow-2xl z-40 border-l dark:border-gray-700 p-4 overflow-y-auto animate-in slide-in-from-right flex flex-col">
                <div className="flex justify-between items-center mb-4 md:hidden">
                    <h3 className="font-bold">Marcadores</h3>
                    <button onClick={() => setShowBookmarks(false)}><X size={24}/></button>
                </div>
                <h3 className="font-bold mb-4 hidden md:block">Marcadores</h3>
                <button onClick={handleOpenBookmarkModal} className="w-full py-2 bg-indigo-100 text-indigo-700 rounded-lg mb-4 flex justify-center gap-2 items-center">
                    <Plus size={16} /> Agregar actual
                </button>
                {bookmarks.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin marcadores</p>}
                {bookmarks.map(b => (
                    <div key={b.id} className="p-3 border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 flex justify-between items-start group">
                         <div onClick={() => { setCurrentPage(b.pageIndex); setShowBookmarks(false); }} className="cursor-pointer flex-1">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full bg-${b.color || 'blue'}-500`}></div>
                                <p className="text-sm font-bold truncate">{b.label}</p>
                            </div>
                            <p className="text-xs text-gray-500 ml-5">{new Date(b.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-1">
                             <button onClick={() => handleEditBookmark(b)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={async () => {
                                await dbService.deleteBookmark(b.id);
                                setBookmarks(prev => prev.filter(x => x.id !== b.id));
                            }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded text-red-400">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Sticker Picker Panel */}
        <StickerPicker 
            isOpen={isStickerPickerOpen} 
            onClose={() => setIsStickerPickerOpen(false)} 
            onSelect={(data) => setPlacingSticker(data)}
        />

        {/* Main Page Area */}
        <div 
            ref={containerRef} 
            className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-40 max-w-5xl mx-auto w-full no-scrollbar relative touch-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
             <div className={`bg-white dark:bg-gray-800/50 shadow-sm min-h-full p-6 md:p-12 rounded-lg relative ${settings.theme === 'sepia' ? 'bg-[#fdf6e3] text-[#5f4b32]' : ''}`}>
                 
                 {/* Visual Bookmark Indicator on Page */}
                 {currentBookmark && (
                     <div className="absolute top-0 right-4 md:right-8 z-10 pointer-events-none filter drop-shadow-md">
                         {currentBookmark.style === 'ribbon' && (
                             <div 
                                className={`w-6 h-10 md:w-8 md:h-12 bg-${currentBookmark.color}-500`} 
                                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}
                             />
                         )}
                         {currentBookmark.style === 'clip' && (
                             <div className={`w-6 h-8 md:w-8 md:h-10 bg-${currentBookmark.color}-500 rounded-b-xl -mt-2`} />
                         )}
                         {currentBookmark.style === 'tag' && (
                             <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full bg-${currentBookmark.color}-500 border-4 border-white dark:border-gray-800 mt-2`} />
                         )}
                     </div>
                 )}

                 {/* Render Page Stickers */}
                 <div className={areStickersGhosted ? 'pointer-events-none opacity-20' : ''}>
                     {currentStickers.map(s => {
                         const isSelected = selectedStickerId === s.id;
                         return (
                            <div 
                                key={s.id}
                                className={`absolute cursor-move transition-transform active:scale-95 flex flex-col items-center ${isSelected ? 'z-50' : 'z-10'}`}
                                style={{
                                    left: `${s.x}%`,
                                    top: `${s.y}%`,
                                    transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                                }}
                                onPointerDown={(e) => handleStickerPointerDown(e, s)}
                                onClick={(e) => {
                                    e.stopPropagation(); // Stop from deselecting
                                }}
                            >
                                {/* Actions for Selected Sticker */}
                                {isSelected && !areStickersGhosted && (
                                    <div className="absolute -top-12 flex gap-4 animate-in fade-in z-50 pointer-events-auto">
                                        <button 
                                            onPointerDown={(e) => e.stopPropagation()} // FIX: Stop drag start on delete button
                                            onClick={(e) => handleDeleteSticker(s.id, e)}
                                            className="bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-red-600 hover:scale-110 transition-all border-2 border-white dark:border-gray-800"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                         <div className="bg-indigo-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
                                            <Move size={20} />
                                        </div>
                                    </div>
                                )}

                                {/* The Sticker Content */}
                                <div className={`${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 rounded-lg' : ''} p-1 transition-all`}>
                                    {s.type === 'emoji' ? (
                                        <span className="text-3xl md:text-5xl filter drop-shadow-sm select-none">{s.src}</span>
                                    ) : (
                                        <img src={s.src} alt="sticker" className="w-12 h-12 md:w-20 md:h-20 object-contain filter drop-shadow-md select-none pointer-events-none" />
                                    )}
                                </div>
                            </div>
                         );
                     })}
                 </div>

                 {/* Sticker Placement Overlay */}
                 {placingSticker && (
                     <div 
                        className="absolute inset-0 z-50 cursor-crosshair bg-pink-500/10"
                        onClick={handleStickerPlace}
                     ></div>
                 )}

                 {renderedContent}
             </div>
             
             {/* Highlight Context Menu */}
             {selectionRange && !sectionMode.startsWith('pick') && !placingSticker && !draggingStickerId && (
                 <div className="fixed bottom-36 md:bottom-28 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 shadow-2xl rounded-full p-2 flex gap-2 z-50 border dark:border-gray-600 animate-in zoom-in">
                     {(['yellow', 'green', 'blue', 'pink', 'orange'] as HighlightColor[]).map(c => (
                         <button 
                            key={c} 
                            onClick={() => addColorHighlight(c)}
                            className={`w-8 h-8 rounded-full border border-gray-200 transform hover:scale-125 transition-transform bg-${c}-400`}
                         />
                     ))}
                     <button onClick={() => setSelectionRange(null)} className="p-1 ml-2 text-gray-400"><X size={20}/></button>
                 </div>
             )}
        </div>

        {/* Bottom Controls */}
        <div className="p-3 md:p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t dark:border-gray-800 flex flex-col gap-3 z-20 shrink-0 pb-safe">
            {/* Progress Slider */}
            <input 
                type="range" 
                min="0" max={pages.length - 1} 
                value={currentPage} 
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
            />
            
            {/* Control Buttons Container - Responsive */}
            <div className="flex justify-between items-center relative">
                
                {/* Previous Page */}
                <button onClick={prevPage} disabled={currentPage === 0} className="p-2 md:p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 shrink-0">
                    <ArrowLeft size={24} />
                </button>
                
                {/* Middle Tools - Scrollable on mobile */}
                <div className="flex-1 flex justify-center items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar px-2 mask-linear">
                     {/* Sticker Button */}
                     <button
                        onClick={() => setIsStickerPickerOpen(!isStickerPickerOpen)}
                        className={`p-2 md:p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 shrink-0 ${isStickerPickerOpen ? 'bg-indigo-100 text-indigo-600' : ''}`}
                        title="Stickers"
                     >
                         <Sticker size={20} />
                     </button>

                     {/* Sticker Ghost Mode Button */}
                     <button 
                        onClick={() => setAreStickersGhosted(!areStickersGhosted)}
                        className={`p-2 md:p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0 ${areStickersGhosted ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-500'}`}
                        title={areStickersGhosted ? "Stickers Visibles" : "Stickers Transparentes"}
                     >
                         {areStickersGhosted ? <Eye size={20} /> : <Ghost size={20} />}
                     </button>

                     {/* Play Button (Center Piece) */}
                     <button 
                        onClick={togglePlay} 
                        className="w-12 h-12 md:w-16 md:h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-300 dark:shadow-indigo-900/30 transition-transform active:scale-95 shrink-0 mx-2"
                    >
                        {isPlaying ? <Pause size={24} md:size={32} fill="currentColor" /> : <Play size={24} md:size={32} fill="currentColor" className="ml-1" />}
                    </button>

                     {/* Section Tool */}
                     <button 
                        onClick={toggleSectionTool}
                        className={`p-2 md:p-3 rounded-full transition-colors shrink-0 ${sectionMode !== 'off' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}
                        title="Leer Sección"
                     >
                         {sectionMode === 'active' ? <CheckCircle2 size={20} /> : (sectionMode === 'pickStart' || sectionMode === 'pickEnd') ? <MousePointerClick size={20} className="animate-pulse" /> : <ScanLine size={20} />}
                     </button>

                     <button onClick={handleRestartPage} className="p-2 md:p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 shrink-0" title="Reiniciar Página">
                        <RotateCcw size={20} />
                    </button>
                </div>

                {/* Next Page */}
                <button onClick={nextPage} disabled={currentPage === pages.length - 1} className="p-2 md:p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 shrink-0">
                    <ArrowRight size={24} />
                </button>
            </div>
            
            <div className="text-center text-[10px] md:text-xs text-gray-400 font-mono">
                Página {currentPage + 1} de {pages.length} • {Math.round(((currentPage + 1) / pages.length) * 100)}%
            </div>
        </div>
    </div>
  );
};
