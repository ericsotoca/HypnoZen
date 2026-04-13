/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Play, Pause, RotateCcw, Volume2, VolumeX, CheckCircle2, Leaf, Wind, Moon, Music } from 'lucide-react';
import { SCRIPTS } from './constants/scripts';

const ISSUES = [
  "Confiance en soi",
  "Prise de parole en public",
  "Gestion du stress",
  "Sommeil réparateur",
  "Arrêt du tabac",
  "Peur des serpents",
  "Perte de poids",
  "Peur de l'avion",
  "Concentration et mémoire",
  "Motivation au travail",
  "Lâcher-prise",
  "Gestion de la douleur",
  "Surmonter une rupture",
  "Créativité débloquée",
  "Phobie sociale",
  "Estime de soi",
  "Préparation aux examens",
  "Sport et performance",
  "Colère et impulsivité",
  "Timidité excessive"
];

export default function App() {
  const [name, setName] = useState('');
  const [selectedIssue, setSelectedIssue] = useState('');
  const [script, setScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.2);
  const [voiceRate, setVoiceRate] = useState(0.75);
  const [progress, setProgress] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioKey, setAudioKey] = useState(0);
  const [shouldPlayAfterLoad, setShouldPlayAfterLoad] = useState(false);
  const [currentStep, setCurrentStep] = useState<'setup' | 'playing'>('setup');
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

  const synth = window.speechSynthesis;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentsRef = useRef<string[]>([]);
  const isPausedRef = useRef(false);

  // Single stable music track for all themes
  const STABLE_MUSIC_URL = "https://assets.mixkit.co/music/preview/mixkit-meditation-spirit-627.mp3";

  const handleGenerate = async () => {
    if (!name || !selectedIssue) return;
    
    // Start music IMMEDIATELY on user gesture to bypass autoplay policy
    if (audioRef.current && musicEnabled && !isMuted) {
      audioRef.current.volume = musicVolume;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => console.error("Initial audio play failed:", err instanceof Error ? err.message : "Unknown error"));
      }
    }

    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const baseScript = SCRIPTS[selectedIssue] || `Bonjour {{name}}. Installez-vous confortablement. [PAUSE] Fermez les yeux et détendez-vous. [PAUSE] Vous êtes en sécurité. [PAUSE] Ressentez le calme vous envahir. [PAUSE] Tout va bien.`;
    const personalizedScript = baseScript.replace(/{{name}}/g, name);
    
    segmentsRef.current = personalizedScript.split('[PAUSE]').map(s => s.trim()).filter(s => s.length > 0);
    setScript(personalizedScript);
    setIsGenerating(false);
    setCurrentStep('playing');
    setCurrentSegmentIndex(0);
    startPlayback(0);
  };

  const toggleMusicTest = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        setIsAudioLoading(true);
        setAudioError(null);
        audioRef.current.volume = musicVolume;
        audioRef.current.play().catch(err => {
          console.error("Test play failed:", err instanceof Error ? err.message : "Unknown error");
          setAudioError("Erreur de lecture");
          setIsAudioLoading(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  };

  const startPlayback = (index: number) => {
    if (index >= segmentsRef.current.length) {
      setIsPlaying(false);
      setProgress(100);
      return;
    }

    setCurrentSegmentIndex(index);
    const text = segmentsRef.current[index];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = voiceRate;
    utterance.pitch = 0.85;
    
    utterance.onstart = () => {
      setIsPlaying(true);
      // Double check music is playing
      if (audioRef.current && musicEnabled && !isMuted && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    };

    utterance.onend = () => {
      if (isPausedRef.current) return;
      
      const nextProgress = ((index + 1) / segmentsRef.current.length) * 100;
      setProgress(nextProgress);
      
      // Add a 3-second silence between segments
      setTimeout(() => {
        if (!isPausedRef.current) {
          startPlayback(index + 1);
        }
      }, 3000);
    };

    synth.speak(utterance);
  };

  const togglePlay = () => {
    if (isPlaying) {
      synth.cancel();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      isPausedRef.current = true;
    } else {
      isPausedRef.current = false;
      if (audioRef.current && musicEnabled && !isMuted) {
        audioRef.current.volume = musicVolume;
        audioRef.current.play().catch(() => {});
      }
      startPlayback(currentSegmentIndex);
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef.current) {
      audioRef.current.muted = newMuted;
    }
  };

  const reset = () => {
    synth.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    isPausedRef.current = false;
    setCurrentStep('setup');
    setScript('');
    setProgress(0);
    setCurrentSegmentIndex(0);
  };

  useEffect(() => {
    if (audioRef.current) {
      setIsAudioLoading(true);
      setAudioError(null);
      audioRef.current.load();
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : musicVolume;
    }
  }, [musicVolume, isMuted]);

  useEffect(() => {
    return () => {
      synth.cancel();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const musicUrl = `${STABLE_MUSIC_URL}?v=${audioKey}`;

  return (
    <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-orange-500/30 overflow-hidden relative">
      <audio 
        key={audioKey}
        ref={audioRef} 
        src={musicUrl} 
        loop 
        preload="auto"
        onCanPlay={() => {
          setIsAudioLoading(false);
          setAudioError(null);
          if (shouldPlayAfterLoad && audioRef.current) {
            audioRef.current.play().catch(() => {});
            setShouldPlayAfterLoad(false);
          }
        }}
        onError={() => {
          console.error("Audio error: Failed to load stable music track");
          setAudioError("Impossible de charger le son");
          setIsAudioLoading(false);
          setShouldPlayAfterLoad(false);
        }}
      />
      
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#3a1510_0%,transparent_60%)] opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_80%,#ff4e00_0%,transparent_50%)] opacity-40" />
        <motion.div 
          animate={{ 
            scale: isPlaying ? [1, 1.2, 1] : 1,
            opacity: isPlaying ? [0.3, 0.6, 0.3] : 0.3
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-900/20 rounded-full blur-[100px]" 
        />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 min-h-screen flex flex-col">
        <header className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-[0.2em] text-orange-400 mb-4"
          >
            <Sparkles size={14} />
            Auto-Hypnose Personnalisée
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-6xl md:text-8xl font-light tracking-tighter mb-4"
          >
            Hypno<span className="italic font-serif text-orange-500">Zen</span>
          </motion.h1>
          <p className="text-white/60 max-w-md mx-auto">
            Laissez-vous guider vers un état de relaxation profonde et de changement positif.
          </p>
        </header>

        <AnimatePresence mode="wait">
          {currentStep === 'setup' ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-8"
            >
              <section className="space-y-4">
                <label className="block text-sm font-medium text-white/40 uppercase tracking-widest">Votre Prénom</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Entrez votre prénom..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder:text-white/20"
                />
              </section>

              <section className="space-y-4">
                <label className="block text-sm font-medium text-white/40 uppercase tracking-widest">Choisissez votre objectif</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {ISSUES.map((issue) => (
                    <button
                      key={issue}
                      onClick={() => setSelectedIssue(issue)}
                      className={`text-left px-6 py-4 rounded-2xl border transition-all flex items-center justify-between group ${
                        selectedIssue === issue 
                          ? 'bg-orange-500 border-orange-500 text-black' 
                          : 'bg-white/5 border-white/10 hover:border-white/30 text-white/80'
                      }`}
                    >
                      <span className="font-medium">{issue}</span>
                      {selectedIssue === issue && <CheckCircle2 size={18} />}
                    </button>
                  ))}
                </div>
              </section>

              <section className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${musicEnabled ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/20'}`}>
                    <Music size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium">Musique d'accompagnement</h3>
                    <p className="text-xs text-white/40">Activer une nappe sonore relaxante</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (audioError) {
                        setAudioKey(prev => prev + 1);
                        setAudioError(null);
                        setIsAudioLoading(true);
                        setShouldPlayAfterLoad(true);
                      } else {
                        toggleMusicTest();
                      }
                    }}
                    disabled={isAudioLoading}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] uppercase tracking-wider transition-all ${
                      audioError 
                        ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' 
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {isAudioLoading ? 'Chargement...' : audioError ? 'Réessayer' : (audioRef.current?.paused === false ? 'Arrêter le test' : 'Tester le son')}
                  </button>
                  <button
                    onClick={() => setMusicEnabled(!musicEnabled)}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${
                      musicEnabled ? 'bg-orange-500' : 'bg-white/10'
                    }`}
                  >
                    <motion.div
                      animate={{ x: musicEnabled ? 24 : 4 }}
                      className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
                    />
                  </button>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <Volume2 size={14} /> Volume Musique
                    </label>
                    <span className="text-xs font-mono text-orange-400">{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <Wind size={14} /> Vitesse Voix
                    </label>
                    <span className="text-xs font-mono text-orange-400">{voiceRate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.2"
                    step="0.05"
                    value={voiceRate}
                    onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                  />
                </div>
              </section>

              <div className="pt-8 mt-auto">
                <button
                  disabled={!name || !selectedIssue || isGenerating}
                  onClick={handleGenerate}
                  className="w-full bg-white text-black font-bold py-6 rounded-3xl text-xl hover:bg-orange-500 hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                >
                  {isGenerating ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <RotateCcw size={24} />
                      </motion.div>
                      Préparation de votre séance...
                    </>
                  ) : (
                    <>
                      Commencer la séance
                      <Play size={24} fill="currentColor" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 flex flex-col items-center justify-center gap-12 py-12"
            >
              <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
                {/* Visualizer Circles */}
                <motion.div
                  animate={{ 
                    scale: isPlaying ? [1, 1.3, 1] : 1,
                    rotate: isPlaying ? 360 : 0
                  }}
                  transition={{ 
                    scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" }
                  }}
                  className="absolute inset-0 border border-orange-500/20 rounded-full"
                />
                <motion.div
                  animate={{ 
                    scale: isPlaying ? [1, 1.6, 1] : 1,
                    rotate: isPlaying ? -360 : 0
                  }}
                  transition={{ 
                    scale: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 },
                    rotate: { duration: 25, repeat: Infinity, ease: "linear" }
                  }}
                  className="absolute inset-0 border border-orange-500/10 rounded-full"
                />
                
                <div className="relative z-10 text-center space-y-4">
                  <motion.div
                    animate={{ 
                      y: isPlaying ? [0, -10, 0] : 0,
                      opacity: isPlaying ? [0.5, 1, 0.5] : 1
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="text-orange-500 flex justify-center"
                  >
                    <Leaf size={64} />
                  </motion.div>
                  <div className="font-serif italic text-2xl text-white/80">
                    {isPlaying ? "Écoutez ma voix..." : "Séance en pause"}
                  </div>
                  {isPlaying && musicEnabled && (
                    <div className="flex items-center justify-center gap-1 text-orange-400/60">
                      <Music size={12} className="animate-pulse" />
                      <span className="text-[10px] uppercase tracking-tighter">Musique Zen active</span>
                    </div>
                  )}
                  {isPlaying && !musicEnabled && (
                    <div className="flex items-center justify-center gap-1 text-white/20">
                      <Music size={12} />
                      <span className="text-[10px] uppercase tracking-tighter">Musique désactivée</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-light mb-2">{selectedIssue}</h2>
                  <p className="text-white/40 text-sm italic">Séance personnalisée pour {name}</p>
                </div>

                <div className="space-y-2">
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/30 font-mono">
                    <span>DÉBUT</span>
                    <span>{Math.round(progress)}%</span>
                    <span>FIN</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-8">
                  <button 
                    onClick={reset}
                    className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/60"
                  >
                    <RotateCcw size={24} />
                  </button>
                  <button 
                    onClick={togglePlay}
                    className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                  >
                    {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                  </button>
                  <button 
                    onClick={toggleMute}
                    className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/60"
                  >
                    {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                  </button>
                </div>
              </div>

              <div className="mt-auto text-center max-w-lg">
                <p className="text-white/20 text-[10px] leading-relaxed uppercase tracking-[0.2em]">
                  Installez-vous confortablement, fermez les yeux et laissez-vous porter par les silences et la musique.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Decorative Icons */}
      <div className="fixed bottom-8 left-8 text-white/5 pointer-events-none hidden lg:block">
        <Wind size={120} />
      </div>
      <div className="fixed top-8 right-8 text-white/5 pointer-events-none hidden lg:block">
        <Moon size={120} />
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
