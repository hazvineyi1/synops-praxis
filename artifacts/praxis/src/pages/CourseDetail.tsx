import React from 'react';
import { useGetCourse, useListModules, useCreateSession } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Clock, PlayCircle } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export function CourseDetail({ params }: { params: { courseId: string } }) {
  const { courseId } = params;
  const [, setLocation] = useLocation();
  const { data: course, isLoading: courseLoading } = useGetCourse(courseId, { query: { enabled: !!courseId, queryKey: ['course', courseId] } });
  const { data: modules, isLoading: modulesLoading } = useListModules(courseId, { query: { enabled: !!courseId, queryKey: ['modules', courseId] } });
  const createSession = useCreateSession();

  const handleStartModule = (moduleId: string) => {
    createSession.mutate(
      { data: { moduleId } },
      {
        onSuccess: (session) => {
          setLocation(`/learn/${session.id}`);
        }
      }
    );
  };

  if (courseLoading || modulesLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-48 bg-muted rounded-xl" />
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!course) return <div>Course not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in">
      <Button variant="ghost" size="sm" onClick={() => setLocation('/courses')} className="-ml-4 mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Catalog
      </Button>

      <div className="relative overflow-hidden rounded-3xl bg-card border border-border">
        {course.thumbnailUrl && (
          <div className="absolute inset-0 opacity-10">
            <img src={course.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="relative z-10 p-8 md:p-12 space-y-6">
          <div className="flex gap-2">
            {course.nqfLevel && (
              <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-semibold">
                NQF Level {course.nqfLevel}
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-semibold text-muted-foreground capitalize">
              {course.status}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-foreground max-w-3xl">
            {course.title}
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
            {course.description}
          </p>

          <div className="flex flex-wrap gap-6 pt-4 border-t border-border/50">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Modules</span>
              <span className="font-medium flex items-center gap-1"><BookOpen className="h-4 w-4 text-primary" /> {modules?.length || 0}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Enrolled</span>
              <span className="font-medium">{course.enrolmentCount || 0} learners</span>
            </div>
            {course.competencyTags && course.competencyTags.length > 0 && (
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Skills</span>
                <span className="font-medium">{course.competencyTags.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-serif font-semibold">Curriculum</h2>
        <div className="space-y-4">
          {modules?.map((module, index) => (
            <Card key={module.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 font-serif font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-serif mb-1">{module.title}</h3>
                    <p className="text-muted-foreground text-sm max-w-2xl">{module.description}</p>
                    <div className="flex gap-4 mt-3 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {module.estimatedMinutes ? `${module.estimatedMinutes} mins` : 'Self-paced'}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {module.beatCount || 0} Beats
                      </span>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => handleStartModule(module.id)}
                  disabled={createSession.isPending}
                  className="shrink-0 w-full sm:w-auto"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Begin Module
                </Button>
              </CardContent>
            </Card>
          ))}
          {modules?.length === 0 && (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              Modules are currently being developed for this course.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
