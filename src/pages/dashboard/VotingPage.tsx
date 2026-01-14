
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Vote, Plus, CheckCircle, XCircle, MinusCircle, Loader2, Gavel, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface VotingMotion {
  id: string;
  meeting_id: string | null;
  title: string;
  description: string | null;
  motion_type: string;
  status: string;
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  tie_breaker_vote: string | null;
  tie_breaker_by: string | null;
  opened_at: string | null;
  closed_at: string | null;
  created_by: string;
  created_at: string;
}

interface UserVote {
  id: string;
  motion_id: string;
  member_id: string;
  vote: string;
}

interface Meeting {
  id: string;
  title: string;
}

export default function VotingPage() {
  const { user, hasRole, profile } = useAuth();
  const [motions, setMotions] = useState<VotingMotion[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [userVotes, setUserVotes] = useState<UserVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [newMotion, setNewMotion] = useState({
    title: '',
    description: '',
    motion_type: 'simple',
    meeting_id: ''
  });

  const canManage = hasRole('admin') || hasRole('chairperson') || hasRole('secretary') || 
                    hasRole('vice_chairman') || hasRole('vice_secretary');
  const isChair = hasRole('chairperson') || hasRole('vice_chairman');

  useEffect(() => {
    fetchMotions();
    fetchMeetings();
    if (user) {
      fetchUserVotes();
    }

    // Real-time subscription for votes
    const channel = supabase
      .channel('voting_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        fetchMotions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voting_motions' }, () => {
        fetchMotions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchMotions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('voting_motions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch motions');
    } else {
      setMotions(data || []);
    }
    setIsLoading(false);
  };

  const fetchMeetings = async () => {
    const { data } = await supabase
      .from('meetings')
      .select('id, title')
      .eq('status', 'in_progress')
      .order('scheduled_date', { ascending: false });
    setMeetings(data || []);
  };

  const fetchUserVotes = async () => {
    const { data } = await supabase
      .from('votes')
      .select('*')
      .eq('member_id', user?.id);
    setUserVotes(data || []);
  };

  const createMotion = async () => {
    if (!newMotion.title) {
      toast.error('Please enter a motion title');
      return;
    }

    const { error } = await supabase.from('voting_motions').insert({
      title: newMotion.title,
      description: newMotion.description || null,
      motion_type: newMotion.motion_type,
      meeting_id: newMotion.meeting_id || null,
      created_by: user?.id
    });

    if (error) {
      toast.error('Failed to create motion');
    } else {
      toast.success('Motion created successfully');
      setShowCreateDialog(false);
      setNewMotion({ title: '', description: '', motion_type: 'simple', meeting_id: '' });
      fetchMotions();
    }
  };

  const openVoting = async (motionId: string) => {
    const { error } = await supabase
      .from('voting_motions')
      .update({ status: 'open', opened_at: new Date().toISOString() })
      .eq('id', motionId);

    if (error) {
      toast.error('Failed to open voting');
    } else {
      toast.success('Voting is now open');
      fetchMotions();
    }
  };

  const closeVoting = async (motion: VotingMotion) => {
    const totalVotes = motion.votes_for + motion.votes_against;
    let finalStatus: string;

    if (motion.votes_for > motion.votes_against) {
      finalStatus = 'passed';
    } else if (motion.votes_against > motion.votes_for) {
      finalStatus = 'failed';
    } else {
      finalStatus = 'tied';
    }

    const { error } = await supabase
      .from('voting_motions')
      .update({ status: finalStatus, closed_at: new Date().toISOString() })
      .eq('id', motion.id);

    if (error) {
      toast.error('Failed to close voting');
    } else {
      toast.success(`Voting closed - Motion ${finalStatus}`);
      fetchMotions();
    }
  };

  const castVote = async (motionId: string, vote: 'for' | 'against' | 'abstain') => {
    const existingVote = userVotes.find(v => v.motion_id === motionId);
    if (existingVote) {
      toast.error('You have already voted on this motion');
      return;
    }

    const { error: voteError } = await supabase.from('votes').insert({
      motion_id: motionId,
      member_id: user?.id,
      vote
    });

    if (voteError) {
      toast.error('Failed to cast vote');
      return;
    }

    // Update the motion vote counts
    const motion = motions.find(m => m.id === motionId);
    if (motion) {
      const updateField = vote === 'for' ? 'votes_for' : vote === 'against' ? 'votes_against' : 'votes_abstain';
      const currentCount = vote === 'for' ? motion.votes_for : vote === 'against' ? motion.votes_against : motion.votes_abstain;
      
      await supabase
        .from('voting_motions')
        .update({ [updateField]: currentCount + 1 })
        .eq('id', motionId);
    }

    toast.success('Vote cast successfully');
    fetchMotions();
    fetchUserVotes();
  };

  const castTieBreaker = async (motionId: string, vote: 'for' | 'against') => {
    const motion = motions.find(m => m.id === motionId);
    if (!motion) return;

    const { error } = await supabase
      .from('voting_motions')
      .update({
        tie_breaker_vote: vote,
        tie_breaker_by: user?.id,
        status: vote === 'for' ? 'passed' : 'failed',
        closed_at: new Date().toISOString()
      })
      .eq('id', motionId);

    if (error) {
      toast.error('Failed to cast tie-breaker');
    } else {
      toast.success(`Tie broken - Motion ${vote === 'for' ? 'passed' : 'failed'}`);
      fetchMotions();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800',
      open: 'bg-blue-100 text-blue-800',
      closed: 'bg-gray-100 text-gray-800',
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      tied: 'bg-yellow-100 text-yellow-800'
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{status.toUpperCase()}</Badge>;
  };

  const getMotionTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      simple: 'bg-blue-100 text-blue-800',
      special: 'bg-purple-100 text-purple-800',
      constitutional: 'bg-orange-100 text-orange-800'
    };
    const labels: Record<string, string> = {
      simple: 'Simple Majority',
      special: 'Special Resolution',
      constitutional: 'Constitutional'
    };
    return <Badge className={variants[type] || 'bg-gray-100'}>{labels[type] || type}</Badge>;
  };

  const hasUserVoted = (motionId: string) => userVotes.some(v => v.motion_id === motionId);
  const getUserVote = (motionId: string) => userVotes.find(v => v.motion_id === motionId)?.vote;

  const openMotions = motions.filter(m => m.status === 'open');
  const pendingMotions = motions.filter(m => m.status === 'pending');
  const closedMotions = motions.filter(m => ['passed', 'failed', 'tied', 'closed'].includes(m.status));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Digital Voting</h1>
          <p className="text-muted-foreground">Vote on motions and resolutions</p>
        </div>
        {canManage && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create Motion</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Motion</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Motion Title"
                  value={newMotion.title}
                  onChange={(e) => setNewMotion({ ...newMotion, title: e.target.value })}
                />
                <Textarea
                  placeholder="Motion Description (optional)"
                  value={newMotion.description}
                  onChange={(e) => setNewMotion({ ...newMotion, description: e.target.value })}
                />
                <Select value={newMotion.motion_type} onValueChange={(v) => setNewMotion({ ...newMotion, motion_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Motion Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple Majority</SelectItem>
                    <SelectItem value="special">Special Resolution (2/3)</SelectItem>
                    <SelectItem value="constitutional">Constitutional Amendment</SelectItem>
                  </SelectContent>
                </Select>
                {meetings.length > 0 && (
                  <Select value={newMotion.meeting_id} onValueChange={(v) => setNewMotion({ ...newMotion, meeting_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Link to Meeting (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {meetings.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button onClick={createMotion} className="w-full">Create Motion</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Vote className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{openMotions.length}</p>
                <p className="text-sm text-muted-foreground">Open for Voting</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{motions.filter(m => m.status === 'passed').length}</p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{motions.filter(m => m.status === 'failed').length}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Gavel className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{motions.filter(m => m.status === 'tied').length}</p>
                <p className="text-sm text-muted-foreground">Tied (Need Tie-breaker)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open Voting ({openMotions.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingMotions.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closedMotions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-4">
          {openMotions.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No open votes</CardContent></Card>
          ) : (
            openMotions.map(motion => {
              const totalVotes = motion.votes_for + motion.votes_against + motion.votes_abstain;
              const forPercent = totalVotes > 0 ? (motion.votes_for / totalVotes) * 100 : 0;
              const againstPercent = totalVotes > 0 ? (motion.votes_against / totalVotes) * 100 : 0;
              const voted = hasUserVoted(motion.id);
              const myVote = getUserVote(motion.id);

              return (
                <Card key={motion.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {motion.title}
                          {getMotionTypeBadge(motion.motion_type)}
                          {getStatusBadge(motion.status)}
                        </CardTitle>
                        {motion.description && <CardDescription>{motion.description}</CardDescription>}
                      </div>
                      {canManage && (
                        <Button variant="outline" size="sm" onClick={() => closeVoting(motion)}>
                          Close Voting
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">For: {motion.votes_for}</span>
                        <span className="text-red-600">Against: {motion.votes_against}</span>
                        <span className="text-gray-600">Abstain: {motion.votes_abstain}</span>
                      </div>
                      <div className="flex gap-1 h-4">
                        <div className="bg-green-500 rounded-l" style={{ width: `${forPercent}%` }} />
                        <div className="bg-red-500 rounded-r" style={{ width: `${againstPercent}%` }} />
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Total votes: {totalVotes}
                      </p>
                    </div>

                    {voted ? (
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-sm">You voted: <strong className="capitalize">{myVote}</strong></p>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <Button className="bg-green-600 hover:bg-green-700" onClick={() => castVote(motion.id, 'for')}>
                          <CheckCircle className="h-4 w-4 mr-2" />For
                        </Button>
                        <Button variant="destructive" onClick={() => castVote(motion.id, 'against')}>
                          <XCircle className="h-4 w-4 mr-2" />Against
                        </Button>
                        <Button variant="outline" onClick={() => castVote(motion.id, 'abstain')}>
                          <MinusCircle className="h-4 w-4 mr-2" />Abstain
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Tied motions needing tie-breaker */}
          {motions.filter(m => m.status === 'tied' && !m.tie_breaker_vote).map(motion => (
            <Card key={motion.id} className="border-yellow-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {motion.title}
                  {getStatusBadge('tied')}
                </CardTitle>
                <CardDescription>This motion is tied and requires a tie-breaker vote from the Chair</CardDescription>
              </CardHeader>
              <CardContent>
                {isChair ? (
                  <div className="flex gap-2 justify-center">
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => castTieBreaker(motion.id, 'for')}>
                      <Gavel className="h-4 w-4 mr-2" />Break Tie - For
                    </Button>
                    <Button variant="destructive" onClick={() => castTieBreaker(motion.id, 'against')}>
                      <Gavel className="h-4 w-4 mr-2" />Break Tie - Against
                    </Button>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">Waiting for Chairman's tie-breaker vote</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingMotions.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No pending motions</CardContent></Card>
          ) : (
            pendingMotions.map(motion => (
              <Card key={motion.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {motion.title}
                        {getMotionTypeBadge(motion.motion_type)}
                        {getStatusBadge(motion.status)}
                      </CardTitle>
                      {motion.description && <CardDescription>{motion.description}</CardDescription>}
                    </div>
                    {canManage && (
                      <Button onClick={() => openVoting(motion.id)}>
                        Open Voting
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created {format(new Date(motion.created_at), 'PPp')}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          {closedMotions.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No closed motions</CardContent></Card>
          ) : (
            closedMotions.map(motion => {
              const totalVotes = motion.votes_for + motion.votes_against + motion.votes_abstain;
              const forPercent = totalVotes > 0 ? (motion.votes_for / totalVotes) * 100 : 0;

              return (
                <Card key={motion.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {motion.title}
                      {getMotionTypeBadge(motion.motion_type)}
                      {getStatusBadge(motion.status)}
                    </CardTitle>
                    {motion.description && <CardDescription>{motion.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">{motion.votes_for}</p>
                        <p className="text-sm text-muted-foreground">For</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{motion.votes_against}</p>
                        <p className="text-sm text-muted-foreground">Against</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-600">{motion.votes_abstain}</p>
                        <p className="text-sm text-muted-foreground">Abstain</p>
                      </div>
                    </div>
                    {motion.tie_breaker_vote && (
                      <p className="text-sm text-center mt-4 text-muted-foreground">
                        Tie broken by Chairman: <strong className="capitalize">{motion.tie_breaker_vote}</strong>
                      </p>
                    )}
                    {motion.closed_at && (
                      <p className="text-sm text-center mt-2 text-muted-foreground">
                        Closed {format(new Date(motion.closed_at), 'PPp')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
