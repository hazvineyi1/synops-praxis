import { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft, ChevronRight, CheckCircle, BookOpen, List,
  MessageSquare, LayoutGrid, BarChart2, Play, HelpCircle,
  X, Menu, Trophy, Clock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizOption { id: string; text: string; }
interface Quiz {
  question: string;
  options: QuizOption[];
  correctId: string;
  explanation: string;
}

interface Beat {
  id: string;
  type: string;
  title: string;
  order: number;
  narration: string;
  bulletPoints?: string[] | null;
  scenario?: string | null;
  visualData?: { quiz?: Quiz; subtype?: string; columns?: [string, string] } | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
}

interface ModuleDetail {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  estimatedMinutes: number;
  beatCount: number;
  status: string;
  beats: Beat[];
}

interface CourseSummary { id: string; title: string; }

// ─── Beat metadata ────────────────────────────────────────────────────────────

const BEAT_META: Record<string, { icon: React.ElementType; label: string; accent: string }> = {
  title_card: { icon: BookOpen,     label: 'Introduction',  accent: 'text-primary' },
  points:     { icon: List,         label: 'Key Points',    accent: 'text-emerald-600' },
  scenario:   { icon: MessageSquare,label: 'Scenario',      accent: 'text-amber-600' },
  compare:    { icon: LayoutGrid,   label: 'Compare',       accent: 'text-violet-600' },
  diagram:    { icon: BarChart2,    label: 'Diagram',       accent: 'text-cyan-600' },
  close:      { icon: CheckCircle,  label: 'Summary',       accent: 'text-emerald-600' },
  video:      { icon: Play,         label: 'Video',         accent: 'text-blue-600' },
};

function getBeatMeta(beat: Beat) {
  if (beat.visualData?.quiz) {
    return { icon: HelpCircle, label: 'Check for Understanding', accent: 'text-violet-600' };
  }
  return BEAT_META[beat.type] ?? { icon: BookOpen, label: beat.type, accent: 'text-muted-foreground' };
}

// ─── Individual beat renderers ─────────────────────────────────────────────────

function TitleCardBeat({ beat }: { beat: Beat }) {
  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center px-8 py-20 text-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
      <motion.div
        className="max-w-2xl w-full"
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <Badge variant="secondary" className="mb-6 text-xs uppercase tracking-wider px-3 py-1">
          Introduction
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-8 leading-tight">
          {beat.title}
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
          {beat.narration}
        </p>
      </motion.div>
    </div>
  );
}

function PointsBeat({ beat }: { beat: Beat }) {
  const points = beat.bulletPoints ?? [];
  return (
    <div className="px-8 py-12 max-w-3xl mx-auto">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-lg text-muted-foreground mb-10 leading-relaxed"
      >
        {beat.narration}
      </motion.p>
      <div className="space-y-3">
        {points.map((pt, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.09, duration: 0.35, ease: 'easeOut' }}
          >
            <div className="flex gap-4 items-start p-4 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold text-sm">
                {i + 1}
              </div>
              <p className="text-base pt-0.5 leading-relaxed">{pt}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ScenarioBeat({ beat }: { beat: Beat }) {
  return (
    <div className="px-8 py-12 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 overflow-hidden shadow-sm">
          <div className="bg-amber-500/10 px-6 py-4 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-amber-700 dark:text-amber-400">Your Scenario</span>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-base text-muted-foreground leading-relaxed">{beat.narration}</p>
            {beat.scenario && (
              <blockquote className="border-l-4 border-amber-400 pl-5 py-1 italic text-foreground text-base leading-relaxed">
                {beat.scenario}
              </blockquote>
            )}
            <div className="bg-background/80 rounded-xl p-4 border border-border/40">
              <span className="font-semibold text-foreground text-sm">Reflect: </span>
              <span className="text-muted-foreground text-sm">
                What would you do in this situation? Consider both the immediate response and the
                longer-term impact on the relationship.
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CompareBeat({ beat }: { beat: Beat }) {
  const bullets = beat.bulletPoints ?? [];
  const mid = Math.ceil(bullets.length / 2);
  const leftItems = bullets.slice(0, mid);
  const rightItems = bullets.slice(mid);

  // Try to get column labels from "A vs B" title pattern
  const vsMatch = beat.title.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  const [leftLabel, rightLabel] = vsMatch
    ? [vsMatch[1].trim(), vsMatch[2].trim()]
    : ['Before', 'After'];

  const stripPrefix = (s: string) =>
    s.replace(/^(Reactive|Proactive|Formal|Informal|Before|After):\s*/i, '');

  return (
    <div className="px-8 py-12 max-w-4xl mx-auto">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-muted-foreground mb-10 leading-relaxed text-base"
      >
        {beat.narration}
      </motion.p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, x: -36 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.42 }}
        >
          <div className="rounded-xl border border-rose-200 dark:border-rose-800 overflow-hidden h-full">
            <div className="bg-rose-50 dark:bg-rose-950/30 px-5 py-3 flex items-center gap-2 border-b border-rose-200 dark:border-rose-800">
              <X className="h-4 w-4 text-rose-500" />
              <span className="font-semibold text-rose-700 dark:text-rose-400 text-sm">{leftLabel}</span>
            </div>
            <div className="p-4 space-y-3">
              {leftItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <X className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{stripPrefix(item)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 36 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.42 }}
        >
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 overflow-hidden h-full">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 px-5 py-3 flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">{rightLabel}</span>
            </div>
            <div className="p-4 space-y-3">
              {rightItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{stripPrefix(item)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function CloseBeat({ beat }: { beat: Beat }) {
  const points = beat.bulletPoints ?? [];
  return (
    <div className="px-8 py-12 max-w-3xl mx-auto">
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }}
      >
        <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mx-auto mb-5">
          <Trophy className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold mb-3">{beat.title}</h2>
        <p className="text-muted-foreground leading-relaxed max-w-lg mx-auto">{beat.narration}</p>
      </motion.div>
      {points.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-4">
            Key Takeaways
          </h3>
          {points.map((pt, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
            >
              <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border/50">
                <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm leading-relaxed">{pt}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoBeat({ beat }: { beat: Beat }) {
  return (
    <div className="px-8 py-12 max-w-3xl mx-auto">
      <p className="text-muted-foreground mb-6 leading-relaxed">{beat.narration}</p>
      {beat.videoUrl ? (
        <div className="aspect-video rounded-xl overflow-hidden bg-black border border-border shadow-md">
          <video src={beat.videoUrl} controls className="w-full h-full" />
        </div>
      ) : (
        <div className="aspect-video rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
          <div className="text-center text-muted-foreground">
            <Play className="h-12 w-12 mx-auto mb-3 opacity-25" />
            <p className="text-sm font-medium">Video content coming soon</p>
            <p className="text-xs mt-1 opacity-60">Upload a video in the Studio editor</p>
          </div>
        </div>
      )}
    </div>
  );
}

function QuizBeat({ beat }: { beat: Beat }) {
  const quiz = beat.visualData!.quiz!;
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = submitted && selected === quiz.correctId;

  return (
    <div className="px-8 py-12 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800 overflow-hidden shadow-sm">
          <div className="bg-violet-50 dark:bg-violet-950/20 px-6 py-4 border-b border-violet-200 dark:border-violet-800 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <span className="font-semibold text-violet-700 dark:text-violet-400">Check for Understanding</span>
          </div>
          <div className="p-6">
            <p className="text-base font-medium mb-7 leading-relaxed">{quiz.question}</p>
            <div className="space-y-3">
              {quiz.options.map((opt) => {
                const isOptionCorrect = submitted && opt.id === quiz.correctId;
                const isOptionWrong = submitted && opt.id === selected && opt.id !== quiz.correctId;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={submitted}
                    onClick={() => setSelected(opt.id)}
                    className={cn(
                      'w-full text-left flex items-center gap-3 p-4 rounded-xl border transition-all text-sm',
                      !submitted && selected === opt.id && 'border-primary bg-primary/10',
                      !submitted && selected !== opt.id && 'border-border hover:bg-muted/50',
                      isOptionCorrect && 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
                      isOptionWrong && 'border-rose-400 bg-rose-50 dark:bg-rose-950/30',
                    )}
                  >
                    <div className={cn(
                      'h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                      selected === opt.id ? 'border-primary' : 'border-muted-foreground/40',
                    )}>
                      {selected === opt.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <span className="flex-1">{opt.text}</span>
                    {isOptionCorrect && <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                    {isOptionWrong && <X className="h-4 w-4 text-rose-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            {!submitted ? (
              <Button
                className="mt-6"
                disabled={!selected}
                onClick={() => setSubmitted(true)}
              >
                Submit Answer
              </Button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'mt-6 p-4 rounded-xl border',
                  isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',
                )}
              >
                <div className={cn(
                  'flex items-center gap-2 font-semibold mb-2',
                  isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400',
                )}>
                  {isCorrect
                    ? <CheckCircle className="h-5 w-5" />
                    : <X className="h-5 w-5" />}
                  {isCorrect ? 'Correct! Well done.' : "Not quite — here's why:"}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{quiz.explanation}</p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Beat router ──────────────────────────────────────────────────────────────

function BeatRenderer({ beat }: { beat: Beat }) {
  if (beat.visualData?.quiz) return <QuizBeat key={beat.id} beat={beat} />;
  switch (beat.type) {
    case 'title_card': return <TitleCardBeat beat={beat} />;
    case 'points':     return <PointsBeat beat={beat} />;
    case 'scenario':   return <ScenarioBeat beat={beat} />;
    case 'compare':    return <CompareBeat beat={beat} />;
    case 'close':      return <CloseBeat beat={beat} />;
    case 'video':      return <VideoBeat beat={beat} />;
    default:           return <PointsBeat beat={beat} />;
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ModuleViewer() {
  const [, params] = useRoute<{ courseId: string; moduleId: string }>(
    '/courses/:courseId/modules/:moduleId',
  );
  const [, navigate] = useLocation();
  const { courseId, moduleId } = params ?? {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const { data: mod, isLoading } = useQuery({
    queryKey: ['module-detail', moduleId],
    queryFn: () => apiFetch<ModuleDetail>(`/modules/${moduleId}`),
    enabled: !!moduleId,
  });

  const { data: course } = useQuery({
    queryKey: ['course-summary', courseId],
    queryFn: () => apiFetch<CourseSummary>(`/courses/${courseId}`),
    enabled: !!courseId,
  });

  const beats = mod?.beats ?? [];
  const currentBeat = beats[currentIndex];
  const completedCount = completedIds.size;
  const pct = beats.length > 0 ? (completedCount / beats.length) * 100 : 0;

  // Scroll to top whenever beat changes
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex]);

  function markCurrentComplete() {
    if (currentBeat) setCompletedIds(prev => new Set([...prev, currentBeat.id]));
  }

  function goNext() {
    if (currentIndex < beats.length - 1) {
      markCurrentComplete();
      setDirection(1);
      setCurrentIndex(i => i + 1);
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(i => i - 1);
    }
  }

  function jumpTo(idx: number) {
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
    setSidebarOpen(false);
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="h-14 border-b border-border flex items-center px-4 gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="hidden lg:flex flex-col w-64 border-r border-border p-3 gap-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
          <div className="flex-1 p-8 max-w-3xl">
            <Skeleton className="h-8 w-48 mb-6" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!mod) return null;

  const isAllDone = completedCount === beats.length && beats.length > 0;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-2 px-4 h-14 border-b border-border flex-shrink-0 bg-card/95 backdrop-blur z-30">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => navigate(`/courses/${courseId}`)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline truncate max-w-[140px]">{course?.title ?? 'Course'}</span>
        </Button>
        <span className="text-muted-foreground/40 hidden sm:inline">/</span>
        <h1 className="font-semibold text-sm truncate flex-1 hidden sm:block">{mod.title}</h1>
        <div className="flex items-center gap-3 ml-auto shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{mod.estimatedMinutes}min</span>
          </div>
          <Progress value={pct} className="w-20 h-1.5 hidden sm:block" />
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {completedCount}/{beats.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(o => !o)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── BODY ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── SIDEBAR / TOC ─────────────────────────────────────────────────── */}
        <aside className={cn(
          'w-64 border-r border-border flex flex-col shrink-0 bg-card overflow-hidden',
          'fixed top-14 bottom-0 left-0 z-50 transition-transform duration-200',
          'lg:relative lg:top-auto lg:bottom-auto lg:z-auto lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}>
          <div className="px-4 py-3 border-b border-border shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Course Content
            </p>
            <div className="flex items-center gap-2">
              <Progress value={pct} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground tabular-nums">
                {completedCount}/{beats.length}
              </span>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-2">
            {beats.map((beat, idx) => {
              const meta = getBeatMeta(beat);
              const Icon = meta.icon;
              const isActive = idx === currentIndex;
              const isDone = completedIds.has(beat.id);

              return (
                <button
                  key={beat.id}
                  type="button"
                  onClick={() => jumpTo(idx)}
                  className={cn(
                    'w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors mb-0.5',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/50 text-foreground',
                  )}
                >
                  <Icon className={cn(
                    'h-4 w-4 mt-0.5 shrink-0',
                    isActive ? 'text-primary' : meta.accent,
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                      {meta.label}
                    </div>
                    <div className={cn('text-xs font-medium leading-snug', isActive && 'text-primary')}>
                      {beat.title}
                    </div>
                  </div>
                  {isDone && (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentBeat?.id ?? currentIndex}
              custom={direction}
              variants={{
                enter:  (d: number) => ({ opacity: 0, x: d > 0 ?  48 : -48 }),
                center: { opacity: 1, x: 0 },
                exit:   (d: number) => ({ opacity: 0, x: d > 0 ? -48 :  48 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.26, ease: 'easeInOut' }}
            >
              {currentBeat ? (
                <BeatRenderer beat={currentBeat} />
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                  No content available for this module yet.
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Module complete banner */}
          {isAllDone && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-8 mb-10 p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center"
            >
              <Trophy className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
              <p className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                Module Complete!
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                You've worked through all {beats.length} pages in this module.
              </p>
              <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
                Back to Course
              </Button>
            </motion.div>
          )}

          {/* Spacer for bottom nav */}
          <div className="h-20" />
        </main>
      </div>

      {/* ── BOTTOM NAV ──────────────────────────────────────────────────────── */}
      <footer className="flex items-center justify-between px-6 py-3 border-t border-border shrink-0 bg-card/95 backdrop-blur z-30">
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>

        <span className="text-xs text-muted-foreground tabular-nums">
          {currentIndex + 1} of {beats.length}
        </span>

        <div className="flex items-center gap-2">
          {currentBeat && !completedIds.has(currentBeat.id) && currentIndex === beats.length - 1 && (
            <Button size="sm" variant="outline" onClick={markCurrentComplete} className="gap-1.5">
              <CheckCircle className="h-4 w-4" /> Mark Complete
            </Button>
          )}
          <Button
            size="sm"
            onClick={goNext}
            disabled={currentIndex === beats.length - 1}
            className="gap-1.5"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
