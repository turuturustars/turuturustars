
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
import { Vote, Plus, CheckCircle, XCircle, MinusCircle, Loader2, Gavel, Users, Lock, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { hasPermission } from '@/lib/rolePermissions';

interface VotingMotion {
  id: string;
  meeting_id: string | null;
  title: string;
  description: string | null;
  motion_type: string;
  voting_type: string; // 'agenda', 'election', 'resolution', 'dispute'
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
  is_confidential: boolean;
}

interface UserVote {
  id: string;
  motion_id: string;
  member_id: string;
  vote: string;
  created_at: string;
}

interface Meeting {
  id: string;
  title: string;
}

export default function VotingPage() {
  const { user, hasRole, profile, roles } = useAuth();
  const userRoles = roles.map(r => r.role);
  const [motions, setMotions] = useState<VotingMotion[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [userVotes, setUserVotes] = useState<UserVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showVoteDetails, setShowVoteDetails] = useState<string | null>(null);

  const [newMotion, setNewMotion] = useState({
    title: '',
    description: '',
    motion_type: 'simple',
    voting_type: 'agenda',
    meeting_id: '',
    is_confidential: true
  });

  const canManage = hasPermission(userRoles, 'manage_voting') || hasPermission(userRoles, 'create_voting');
  const canVote = hasPermission(userRoles, 'cast_vote');
  const canViewResults = hasPermission(userRoles, 'view_voting_results');
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
      .in('status', ['pending', 'open', 'voting'])
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch motions');
      console.error('Error fetching voting motions:', error);
    } else {
      console.log('Fetched voting motions:', data);
      setMotions((data as VotingMotion[]) || []);
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
      .select('id, motion_id, member_id, vote, created_at')
      .eq('member_id', user?.id);
    setUserVotes((data as UserVote[]) || []);
  };

  const createMotion = async () => {
    if (!newMotion.title.trim()) {
      toast.error('Please enter a motion title');
      return;
    }

    const { error } = await supabase.from('voting_motions').insert({
      title: newMotion.title,
      description: newMotion.description || null,
      motion_type: newMotion.motion_type,
      voting_type: newMotion.voting_type,
      meeting_id: newMotion.meeting_id || null,
      created_by: user?.id,
      is_confidential: newMotion.is_confidential,
      status: 'pending'
    });

    if (error) {
      toast.error('Failed to create motion');
    } else {
      toast.success('Motion created successfully - Confidential by default');
      setShowCreateDialog(false);
      setNewMotion({ 
        title: '', 
        description: '', 
        motion_type: 'simple', 
        voting_type: 'agenda',
        meeting_id: '',
        is_confidential: true
      });
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
      toast.error('You have already voted on this motion - Voting is confidential and cannot be changed');
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

    toast.success('Your vote has been recorded confidentially');
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

  const getVotingTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      agenda: 'bg-blue-100 text-blue-800',
      election: 'bg-purple-100 text-purple-800',
      resolution: 'bg-orange-100 text-orange-800',
      dispute: 'bg-red-100 text-red-800'
    };
    const labels: Record<string, string> = {
      agenda: 'Development Agenda',
      election: 'Election',
      resolution: 'Dispute Resolution',
      dispute: 'Conflict Resolution'
    };
    return <Badge className={variants[type] || 'bg-gray-100'}>{labels[type] || type}</Badge>;
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
          <h1 className="text-2xl font-bold">Digital Voting System</h1>
          <p className="text-muted-foreground">Vote on agendas, elections, and resolutions - All votes are confidential</p>
        </div>
        {canManage && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Initiate Voting</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Voting Motion</DialogTitle>
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
                  className="min-h-24"
                />
                
                <Select value={newMotion.voting_type} onValueChange={(v) => setNewMotion({ ...newMotion, voting_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type of Voting" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agenda">Development Agenda</SelectItem>
                    <SelectItem value="election">Election (Candidate Voting)</SelectItem>
                    <SelectItem value="resolution">Resolution</SelectItem>
                    <SelectItem value="dispute">Dispute Resolution</SelectItem>
                  </SelectContent>
                </Select>

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

                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Lock className="h-5 w-5 text-blue-600" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900">Confidential by Default</p>
                    <p className="text-blue-800 text-xs">All votes are kept confidential. Vote history is not tracked publicly.</p>
                  </div>
                </div>

                <Button onClick={createMotion} className="w-full">Create & Prepare for Voting</Button>
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
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No open votes at this time</CardContent></Card>
          ) : (
            openMotions.map(motion => {
              const totalVotes = motion.votes_for + motion.votes_against + motion.votes_abstain;
              const forPercent = totalVotes > 0 ? (motion.votes_for / totalVotes) * 100 : 0;
              const againstPercent = totalVotes > 0 ? (motion.votes_against / totalVotes) * 100 : 0;
              const voted = hasUserVoted(motion.id);
              const myVote = getUserVote(motion.id);
              const showDetails = showVoteDetails === motion.id;

              return (
                <Card key={motion.id} className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{motion.title}</CardTitle>
                          {motion.is_confidential && (
                            <Lock className="h-4 w-4 text-gray-500" title="Confidential Vote" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          {getVotingTypeBadge(motion.voting_type)}
                          {getMotionTypeBadge(motion.motion_type)}
                          {getStatusBadge(motion.status)}
                        </div>
                        {motion.description && <CardDescription>{motion.description}</CardDescription>}
                      </div>
                      <div className="flex gap-2">
                        {canManage && (
                          <Button variant="outline" size="sm" onClick={() => closeVoting(motion)}>
                            Close Voting
                          </Button>
                        )}
                        {canViewResults && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowVoteDetails(showDetails ? null : motion.id)}
                          >
                            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Vote Count Display */}
                    {showDetails && canViewResults && (
                      <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-green-600">For: {motion.votes_for}</span>
                          <span className="text-red-600">Against: {motion.votes_against}</span>
                          <span className="text-gray-600">Abstain: {motion.votes_abstain}</span>
                        </div>
                        <div className="flex gap-1 h-4">
                          <div className="bg-green-500 rounded-l" style={{ width: `${forPercent}%` }} />
                          <div className="bg-red-500" style={{ width: `${againstPercent}%` }} />
                          <div className="bg-gray-300 rounded-r" style={{ width: `${100 - forPercent - againstPercent}%` }} />
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                          Total votes: {totalVotes}
                        </p>
                      </div>
                    )}

                    {/* Voting Buttons */}
                    {voted ? (
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-900">
                          <CheckCircle className="h-4 w-4 inline mr-2" />
                          Your vote has been recorded confidentially
                        </p>
                        <p className="text-xs text-green-800 mt-1">Votes cannot be changed to maintain confidentiality</p>
                      </div>
                    ) : canVote ? (
                      <div className="flex gap-2 justify-center flex-wrap">
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
                    ) : (
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-900">You don't have permission to vote on this motion</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Tied Motions Section */}
          {motions.filter(m => m.status === 'tied' && !m.tie_breaker_vote).map(motion => (
            <Card key={motion.id} className="border-yellow-500 border-l-4">
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
                  <p className="text-center text-muted-foreground">Awaiting Chairman's tie-breaker vote...</p>
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
              <Card key={motion.id} className="border-l-4 border-l-gray-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 mb-2">
                        {motion.title}
                        {motion.is_confidential && (
                          <Lock className="h-4 w-4 text-gray-500" />
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        {getVotingTypeBadge(motion.voting_type)}
                        {getMotionTypeBadge(motion.motion_type)}
                        {getStatusBadge(motion.status)}
                      </div>
                      {motion.description && <CardDescription>{motion.description}</CardDescription>}
                    </div>
                    {canManage && (
                      <Button onClick={() => openVoting(motion.id)} className="bg-blue-600 hover:bg-blue-700">
                        <Vote className="h-4 w-4 mr-2" />Open Voting
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
                <Card key={motion.id} className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {motion.title}
                      {motion.is_confidential && (
                        <Lock className="h-4 w-4 text-gray-500" />
                      )}
                      {getVotingTypeBadge(motion.voting_type)}
                      {getMotionTypeBadge(motion.motion_type)}
                      {getStatusBadge(motion.status)}
                    </CardTitle>
                    {motion.description && <CardDescription>{motion.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-center text-yellow-900">
                          <Gavel className="h-4 w-4 inline mr-2" />
                          Tie broken by Chairman: <strong className="capitalize">{motion.tie_breaker_vote}</strong>
                        </p>
                      </div>
                    )}

                    {motion.closed_at && (
                      <p className="text-sm text-center text-muted-foreground">
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

      {/* Confidentiality Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Lock className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Voting Confidentiality Policy</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ All votes are strictly confidential and recorded anonymously</li>
                <li>✓ Individual vote details are never disclosed publicly</li>
                <li>✓ Once a vote is cast, it cannot be changed or withdrawn</li>
                <li>✓ Vote tallies are shown only after voting is closed or by authorized officials</li>
                <li>✓ No individual vote tracking - only aggregated results are available</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
