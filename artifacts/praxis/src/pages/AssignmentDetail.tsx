import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useGetMe } from '@workspace/api-client-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(dueDate?: string) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function parseMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, '<br/>');
}

export function AssignmentDetail() {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const [, navigate] = useLocation();
  const [essay, setEssay] = useState('');
  const qc = useQueryClient();

  const { data: assignment, isLoading } = useQuery({ queryKey: ['assignment', assignmentId], queryFn: () => apiFetch<any>(`/assignments/${assignmentId}`) });
  const { data: submission } = useQuery({ queryKey: ['my-submission', assignmentId], queryFn: () => apiFetch<any | null>(`/assignments/${assignmentId}/my-submission`) });
  const { data: course } = useQuery({ queryKey: ['course', courseId], queryFn: () => apiFetch<any>(`/courses/${courseId}`) });

  const submitMutation = useMutation({
    mutationFn: () => apiFetch(`/assignments/${assignmentId}/submit`, { method: 'POST', body: JSON.stringify({ body: essay }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-submission', assignmentId] }),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64" /></div>;
  if (!assignment) return <div className="text-muted-foreground">Assignment not found.</div>;

  const overdue = isOverdue(assignment.dueDate);
  const graded = submission?.status === 'graded';
  const submitted = !!submission && submission.status !== 'graded';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <a href="/courses" className="hover:text-foreground">Courses</a>
        <ChevronRight className="h-4 w-4" />
        <a href={`/courses/${courseId}?tab=assignments`} className="hover:text-foreground">{course?.title ?? 'Course'}</a>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{assignment.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{assignment.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline">{assignment.pointsPossible} pts</Badge>
            {assignment.dueDate && (
              <Badge variant={overdue ? 'destructive' : 'outline'} className="gap-1">
                {overdue ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {overdue ? 'Overdue · ' : 'Due '}{formatDate(assignment.dueDate)}
              </Badge>
            )}
            {graded && <Badge className="bg-green-600">Graded</Badge>}
            {submitted && <Badge variant="secondary">Submitted</Badge>}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main: instructions */}
        <div className="md:col-span-2 space-y-4">
          {assignment.description && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Description</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground text-sm">{assignment.description}</p></CardContent>
            </Card>
          )}
          {assignment.instructions && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Instructions</CardTitle></CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-foreground text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: parseMarkdown(assignment.instructions) }} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: submission panel */}
        <div className="space-y-4">
          {graded && (
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base">Graded</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-bold text-foreground">{submission.score} <span className="text-lg text-muted-foreground">/ {assignment.pointsPossible}</span></div>
                {submission.letterGrade && <Badge variant="outline" className="text-lg px-3 py-1">{submission.letterGrade}</Badge>}
                {submission.feedback && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Feedback</div>
                    <p className="text-sm text-foreground leading-relaxed bg-muted/50 rounded-md p-3">{submission.feedback}</p>
                  </div>
                )}
                {submission.body && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Your submission</div>
                    <p className="text-sm text-muted-foreground">{submission.body}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {submitted && !graded && (
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="py-4 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-foreground">Submitted</div>
                  <div className="text-xs text-muted-foreground">{formatDate(submission.submittedAt)} · Awaiting grade</div>
                </div>
              </CardContent>
            </Card>
          )}

          {!submission && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Submit Assignment</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {assignment.submissionType === 'essay' && (
                  <Textarea
                    placeholder="Write your response here..."
                    value={essay}
                    onChange={(e) => setEssay(e.target.value)}
                    className="min-h-[200px] text-sm resize-none"
                  />
                )}
                {assignment.submissionType === 'file_upload' && (
                  <div className="border-2 border-dashed border-border rounded-md p-8 text-center text-sm text-muted-foreground">
                    File upload coming soon. Paste your response below.
                    <Textarea placeholder="Or write your response here..." value={essay} onChange={(e) => setEssay(e.target.value)} className="mt-3 min-h-[120px] text-sm" />
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || (!essay.trim() && assignment.submissionType !== 'file_upload')}
                >
                  {submitMutation.isPending ? 'Submitting...' : 'Submit Assignment'}
                </Button>
                {submitMutation.isError && <p className="text-xs text-red-500">{String((submitMutation.error as Error).message)}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
