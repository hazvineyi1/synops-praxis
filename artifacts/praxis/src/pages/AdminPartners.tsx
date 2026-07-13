import React, { useState } from 'react';
import { useListPartners, useCreatePartner } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building, Plus, MoreVertical, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AdminPartners() {
  const { data: partners, isLoading, refetch } = useListPartners();
  const createPartner = useCreatePartner();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', contactEmail: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPartner.mutate(
      { data: formData },
      {
        onSuccess: () => {
          toast({ title: 'Partner Created', description: `${formData.name} tenant provisioned successfully.` });
          setOpen(false);
          setFormData({ name: '', slug: '', contactEmail: '' });
          refetch();
        }
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-serif font-bold tracking-tight">Partner Management</h1>
          <p className="text-muted-foreground">Provision and manage white-label enterprise tenants.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Provision Partner</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif">New Partner Tenant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Partner Name</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Tenant Slug (URL prefix)</Label>
                <Input value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} placeholder="e.g. acme-corp" required pattern="[a-z0-9-]+" />
                <p className="text-xs text-muted-foreground">Only lowercase letters, numbers, and hyphens.</p>
              </div>
              <div className="space-y-2">
                <Label>Admin Contact Email</Label>
                <Input type="email" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} required />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createPartner.isPending}>
                  {createPartner.isPending ? 'Provisioning...' : 'Create Tenant'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Partner Name</th>
                  <th className="px-6 py-4 font-medium">Domain / Slug</th>
                  <th className="px-6 py-4 font-medium">Organizations</th>
                  <th className="px-6 py-4 font-medium">Learners</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y border-t border-border">
                {isLoading && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading partners...</td></tr>
                )}
                {partners?.map(partner => (
                  <tr key={partner.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-primary/10 rounded flex items-center justify-center text-primary shrink-0">
                          <Building className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-foreground">{partner.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{partner.slug}</td>
                    <td className="px-6 py-4">{partner.orgCount || 0}</td>
                    <td className="px-6 py-4">{partner.learnerCount || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                        ${partner.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {partner.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4 text-muted-foreground" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
