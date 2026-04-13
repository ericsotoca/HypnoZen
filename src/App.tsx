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
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [currentStep, setCurrentStep] = useState<'setup' | 'playing'>('setup');
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentTheme, setCurrentTheme] = useState<'zen' | 'ocean' | 'forest'>('zen');

  const synth = window.speechSynthesis;
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const lfoNodeRef = useRef<OscillatorNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const segmentsRef = useRef<string[]>([]);
  const isPausedRef = useRef(false);

  // Initialize and Control Web Audio Generator with Themes
  const initZenAudio = () => {
    if (audioContextRef.current) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        // Different noise types based on theme
        const white = Math.random() * 2 - 1;
        if (currentTheme === 'ocean') {
          // Pink-ish noise for ocean
          output[i] = (lastOut + (0.05 * white)) / 1.05;
        } else {
          // Brownian for Zen/Forest
          output[i] = (lastOut + (0.02 * white)) / 1.02;
        }
        lastOut = output[i];
        output[i] *= (currentTheme === 'forest' ? 2.5 : 4.0);
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      if (currentTheme === 'ocean') filter.frequency.value = 1200;
      else if (currentTheme === 'forest') filter.frequency.value = 800;
      else filter.frequency.value = 350;
      filterNodeRef.current = filter;

      const gainNode = ctx.createGain();
      gainNode.gain.value = 0;
      gainNodeRef.current = gainNode;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      // Slower breathing for Ocean
      lfo.frequency.value = currentTheme === 'ocean' ? 0.08 : 0.15;
      
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = currentTheme === 'ocean' ? 0.1 : 0.06;
      
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);

      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      noiseSource.start();
      lfo.start();
      noiseNodeRef.current = noiseSource;
      lfoNodeRef.current = lfo;
    } catch (err) {
      console.error("Web Audio Init failed:", err);
      setAudioError("Audio non supporté");
    }
  };

  const startZenAudio = () => {
    // If theme changed, reset audio context
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    initZenAudio();
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    if (gainNodeRef.current && musicEnabled && !isMuted) {
      gainNodeRef.current.gain.setTargetAtTime(musicVolume, audioContextRef.current!.currentTime, 1.5);
    }
  };

  const stopZenAudio = () => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(0, audioContextRef.current!.currentTime, 0.5);
    }
  };

  const handleGenerate = async () => {
    if (!name || !selectedIssue) return;
    startZenAudio();

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
    if (!audioContextRef.current || gainNodeRef.current?.gain.value === 0) {
      setIsTestingAudio(true);
      setAudioError(null);
      startZenAudio();
    } else {
      setIsTestingAudio(false);
      stopZenAudio();
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
      if (musicEnabled && !isMuted) startZenAudio();
    };

    utterance.onend = () => {
      if (isPausedRef.current) return;
      
      const nextProgress = ((index + 1) / segmentsRef.current.length) * 100;
      setProgress(nextProgress);
      
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
      stopZenAudio();
      setIsPlaying(false);
      isPausedRef.current = true;
    } else {
      isPausedRef.current = false;
      if (musicEnabled && !isMuted) startZenAudio();
      startPlayback(currentSegmentIndex);
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(newMuted ? 0 : musicVolume, audioContextRef.current!.currentTime, 0.2);
    }
  };

  const reset = () => {
    synth.cancel();
    stopZenAudio();
    setIsPlaying(false);
    isPausedRef.current = false;
    setCurrentStep('setup');
    setScript('');
    setProgress(0);
    setCurrentSegmentIndex(0);
  };

  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      const targetGain = (isMuted || !musicEnabled) ? 0 : musicVolume;
      gainNodeRef.current.gain.setTargetAtTime(targetGain, audioContextRef.current.currentTime, 0.2);
    }
  }, [musicVolume, isMuted, musicEnabled]);

  useEffect(() => {
    return () => {
      synth.cancel();
      audioContextRef.current?.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-orange-500/30 overflow-x-hidden relative">
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#3a1510_0%,transparent_60%)] opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_80%,#ff4e00_0%,transparent_50%)] opacity-40" />
        <motion.div 
          animate={{ 
            scale: isPlaying ? [1, 1.2, 1] : 1,
            opacity: isPlaying ? [0.3, 0.6, 0.3] : 0.3
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-orange-900/20 rounded-full blur-[100px]" 
        />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 min-h-screen flex flex-col">
        <header className="mb-8 md:mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] md:text-xs uppercase tracking-[0.2em] text-orange-400 mb-4"
          >
            <Sparkles size={14} />
            Auto-Hypnose Personnalisée
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-5xl md:text-8xl font-light tracking-tighter mb-4"
          >
            Hypno<span className="italic font-serif text-orange-500">Zen</span>
          </motion.h1>
          <p className="text-white/60 text-sm md:text-base max-w-md mx-auto px-4">
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
              className="flex-1 flex flex-col gap-6 md:gap-8"
            >
              <section className="space-y-4">
                <label className="block text-[10px] font-medium text-white/40 uppercase tracking-widest pl-1">Votre Prénom</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Entrez votre prénom..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 md:py-5 text-lg md:text-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder:text-white/20"
                />
              </section>

              <section className="space-y-4">
                <label className="block text-[10px] font-medium text-white/40 uppercase tracking-widest pl-1">Choisissez votre objectif</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 max-h-[250px] md:max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {ISSUES.map((issue) => (
                    <button
                      key={issue}
                      onClick={() => setSelectedIssue(issue)}
                      className={`text-left px-5 py-3 md:py-4 rounded-xl md:rounded-2xl border transition-all flex items-center justify-between group min-h-[56px] ${
                        selectedIssue === issue 
                          ? 'bg-orange-500 border-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.3)]' 
                          : 'bg-white/5 border-white/10 hover:border-white/30 text-white/80'
                      }`}
                    >
                      <span className="font-medium text-sm md:text-base leading-tight">{issue}</span>
                      {selectedIssue === issue && <CheckCircle2 size={18} />}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4 p-5 md:p-6 bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${musicEnabled ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/20'}`}>
                            <Music size={24} />
                        </div>
                        <div>
                            <h3 className="font-medium text-sm md:text-base">Ambiance Sonore</h3>
                            <p className="text-[10px] md:text-xs text-white/40">Choisissez votre environnement zen</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-black/30 p-1 rounded-xl self-start sm:self-center">
                        {[
                            { id: 'zen', label: 'Zen', icon: <Leaf size={14}/> },
                            { id: 'ocean', label: 'Mer', icon: <Wind size={14}/> },
                            { id: 'forest', label: 'Bois', icon: <Moon size={14}/> }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setCurrentTheme(t.id as any);
                                    if (isTestingAudio) {
                                        // Update noise immediately if testing
                                        if (audioContextRef.current) {
                                            audioContextRef.current.close();
                                            audioContextRef.current = null;
                                        }
                                        startZenAudio();
                                    }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all ${
                                    currentTheme === t.id 
                                        ? 'bg-orange-500 text-black' 
                                        : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                                }`}
                            >
                                {t.icon}
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (audioError) {
                                setAudioError(null);
                                startZenAudio();
                            } else {
                                toggleMusicTest();
                            }
                        }}
                        className={`px-4 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all min-w-[120px] ${
                            audioError 
                                ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                                : isTestingAudio 
                                    ? 'bg-white/10 border-orange-500/50 text-orange-400'
                                    : 'bg-white/5 border-white/10 text-white/60'
                        }`}
                    >
                        {audioError ? 'Erreur' : (isTestingAudio ? 'Stop Preview' : 'Écouter')}
                    </button>
                    
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase text-white/30 hidden xs:block">Musique</span>
                        <button
                            onClick={() => setMusicEnabled(!musicEnabled)}
                            className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                            musicEnabled ? 'bg-orange-500' : 'bg-white/10'
                            }`}
                        >
                            <motion.div
                            animate={{ x: musicEnabled ? 22 : 4 }}
                            className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
                            />
                        </button>
                    </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-5 md:p-6 bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl">
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-medium text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <Volume2 size={12} /> Volume Musique
                    </label>
                    <span className="text-[10px] font-mono text-orange-400">{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.01" value={musicVolume}
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="w-full h-1 md:h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-medium text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <Wind size={12} /> Vitesse Voix
                    </label>
                    <span className="text-[10px] font-mono text-orange-400">{voiceRate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range" min="0.5" max="1.2" step="0.05" value={voiceRate}
                    onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                    className="w-full h-1 md:h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                  />
                </div>
              </section>

              <div className="pt-4 md:pt-8 mt-auto sticky bottom-4 md:static">
                <button
                  disabled={!name || !selectedIssue || isGenerating}
                  onClick={handleGenerate}
                  className="w-full bg-white text-black font-extrabold py-5 md:py-6 rounded-2xl md:rounded-3xl text-lg md:text-xl active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
                >
                  {isGenerating ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                        <RotateCcw size={24} />
                      </motion.div>
                      Un instant...
                    </>
                  ) : (
                    <>
                      Lancer la séance
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
              className="flex-1 flex flex-col items-center justify-center gap-8 md:gap-12 py-6 md:py-12"
            >
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 flex items-center justify-center">
                <motion.div
                  animate={{ scale: isPlaying ? [1, 1.25, 1] : 1, rotate: isPlaying ? 360 : 0 }}
                  transition={{ scale: { duration: 5, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 30, repeat: Infinity, ease: "linear" } }}
                  className="absolute inset-0 border border-orange-500/20 rounded-full"
                />
                <motion.div
                  animate={{ scale: isPlaying ? [1, 1.5, 1] : 1, rotate: isPlaying ? -360 : 0 }}
                  transition={{ scale: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }, rotate: { duration: 40, repeat: Infinity, ease: "linear" } }}
                  className="absolute inset-0 border border-orange-500/10 rounded-full"
                />
                
                <div className="relative z-10 text-center space-y-4">
                  <motion.div
                    animate={{ y: isPlaying ? [0, -8, 0] : 0, opacity: isPlaying ? [0.6, 1, 0.6] : 1 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="text-orange-500 flex justify-center"
                  >
                    <Leaf size={48} md={64} />
                  </motion.div>
                  <div className="font-serif italic text-xl md:text-2xl text-white/80">
                    {isPlaying ? "Écoutez ma voix..." : "Séance en pause"}
                  </div>
                  {isPlaying && musicEnabled && (
                    <div className="flex items-center justify-center gap-1.5 text-orange-400/60 bg-white/5 py-1 px-3 rounded-full">
                      <Music size={10} className="animate-pulse" />
                      <span className="text-[10px] uppercase tracking-tighter font-bold">Modus {currentTheme} actif</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full max-w-md space-y-8 md:space-y-6">
                <div className="text-center">
                  <h2 className="text-xl md:text-2xl font-light mb-1 px-4">{selectedIssue}</h2>
                  <p className="text-white/40 text-[10px] md:text-xs italic uppercase tracking-widest px-4">Séance pour {name}</p>
                </div>

                <div className="space-y-3 px-2">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-orange-500" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold">
                    <span>DÉBUT</span>
                    <span>{Math.round(progress)}%</span>
                    <span>FIN</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 md:gap-8">
                  <button onClick={reset} className="p-4 md:p-5 rounded-full bg-white/5 border border-white/10 active:scale-90 transition-all text-white/60">
                    <RotateCcw size={24} />
                  </button>
                  <button onClick={togglePlay} className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white text-black flex items-center justify-center active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                    {isPlaying ? <Pause size={32} md={40} fill="currentColor" /> : <Play size={32} md={40} fill="currentColor" className="ml-1" />}
                  </button>
                  <button onClick={toggleMute} className="p-4 md:p-5 rounded-full bg-white/5 border border-white/10 active:scale-90 transition-all text-white/60">
                    {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                  </button>
                </div>
              </div>

              <div className="mt-auto text-center max-w-lg px-6">
                <p className="text-white/20 text-[9px] md:text-[10px] leading-relaxed uppercase tracking-[0.2em]">
                  Respirez calmement. Fermez les yeux. Le monde extérieur s'éloigne...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}</style>
    </div>
  );
}
