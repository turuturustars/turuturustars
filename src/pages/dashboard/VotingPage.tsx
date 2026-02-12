import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useInteractionGuard } from '@/hooks/useInteractionGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccessibleButton, AccessibleStatus, useStatus } from '@/components/accessible';
import { Vote, Plus, CheckCircle, XCircle, MinusCircle, Loader2, Gavel, Eye, EyeOff, Lock } from 'lucide-react';
import { hasPermission, normalizeRoles } from '@/lib/rolePermissions';

interface VotingMotion {
  id: string;
  meeting_id?: string | null;
  title: string;
  description?: string | null;
  motion_type?: string;
  voting_type?: string;
  status: string;
  yes_votes: number;
  no_votes: number;
  votes_abstain?: number;
  tie_breaker_vote?: string | null;
  tie_breaker_by?: string | null;
  opened_at?: string | null;
  closed_at?: string | null;
  created_by?: string;
  created_at: string;
  is_confidential?: boolean;
  total_votes?: number;
  // For display compatibility
  votes_for?: number;
  votes_against?: number;
}

interface UserVote {
  id: string;
  motion_id: string;
  member_id: string;
  vote: string;
  voted_at: string | null;
}

interface Meeting {
  id: string;
  title: string;
}

export default function VotingPage() {
  const { user, hasRole, roles } = useAuth();
  const { canInteract, assertCanInteract, readOnlyMessage } = useInteractionGuard();
  const { status, showSuccess, showError } = useStatus();
  const userRoles = normalizeRoles(roles);
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

  const canManage = canInteract && (hasPermission(userRoles, 'manage_voting') || hasPermission(userRoles, 'create_voting'));
  const canVote = canInteract && hasPermission(userRoles, 'cast_vote');
  const canViewResults = hasPermission(userRoles, 'view_voting_results');
  const isChair = hasRole('chairperson') || hasRole('vice_chairman');

  useEffect(() => {
    fetchMotions();
    fetchMeetings();
    if (user) {
      fetchUserVotes();
    }

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
      .from('voting_motions_with_vote_breakdown')
      .select('id, title, status, created_at, yes_votes, no_votes, total_votes')
      .in('status', ['pending', 'open', 'voting'])
      .order('created_at', { ascending: false });

    if (error) {
      showError('Failed to fetch motions');
      console.error('Error fetching voting motions:', error);
    } else {
      // Map yes_votes/no_votes to votes_for/votes_against for display compatibility
      const mappedData = (data as any[])?.map(m => ({
        ...m,
        votes_for: m.yes_votes,
        votes_against: m.no_votes
      })) || [];
      setMotions(mappedData as VotingMotion[]);
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
      .select('id, motion_id, member_id, vote, voted_at')
      .eq('member_id', user?.id);
    setUserVotes((data as UserVote[]) || []);
  };

  const createMotion = async () => {
    if (!assertCanInteract('create motions')) return;

    if (!newMotion.title.trim()) {
      showError('Please enter a motion title');
      return;
    }

    const { error } = await supabase.from('voting_motions').insert({
      title: newMotion.title,
      description: newMotion.description || null,
      motion_type: newMotion.motion_type,
      meeting_id: newMotion.meeting_id || null,
      created_by: user?.id,
      status: 'pending'
    });

    if (error) {
      showError('Failed to create motion');
      console.error('Error creating motion:', error);
    } else {
      showSuccess('Motion created successfully');
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
    if (!assertCanInteract('open voting')) return;

    const { error } = await supabase
      .from('voting_motions')
      .update({ status: 'open', opened_at: new Date().toISOString() })
      .eq('id', motionId);

    if (error) {
      showError('Failed to open voting');
    } else {
      showSuccess('Voting is now open');
      fetchMotions();
    }
  };

  const closeVoting = async (motion: VotingMotion) => {
    if (!assertCanInteract('close voting')) return;

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
      showError('Failed to close voting');
    } else {
      showSuccess(`Voting closed - Motion ${finalStatus}`);
      fetchMotions();
    }
  };

  const castVote = async (motionId: string, vote: 'for' | 'against' | 'abstain') => {
    if (!assertCanInteract('cast votes')) return;

    const existingVote = userVotes.find(v => v.motion_id === motionId);
    if (existingVote) {
      showError('You have already voted on this motion - Voting is confidential and cannot be changed');
      return;
    }

    const { error: voteError } = await supabase.from('votes').insert({
      motion_id: motionId,
      member_id: user?.id,
      vote
    });
    if (voteError) {
      showError('Failed to cast vote');
      return;
    }

    const motion = motions.find(m => m.id === motionId);
    if (motion) {
      let updateField: string;
      let currentCount: number;
      
      if (vote === 'for') {
        updateField = 'votes_for';
        currentCount = motion.votes_for;
      } else if (vote === 'against') {
        updateField = 'votes_against';
        currentCount = motion.votes_against;
      } else {
        updateField = 'votes_abstain';
        currentCount = motion.votes_abstain;
      }
      
      await supabase
        .from('voting_motions')
        .update({ [updateField]: currentCount + 1 })
        .eq('id', motionId);
    }

    showSuccess('Your vote has been recorded confidentially');
    fetchMotions();
    fetchUserVotes();
  };

  const castTieBreaker = async (motionId: string, vote: 'for' | 'against') => {
    if (!assertCanInteract('cast tie-breaker vote')) return;

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
      showError('Failed to cast tie-breaker');
    } else {
      showSuccess(`Tie broken - Motion ${vote === 'for' ? 'passed' : 'failed'}`);
      fetchMotions();
    }
  };

  const getStatusBadge = (status: string) => {
    // Map voting statuses to standard status names
    const statusMap: Record<string, string> = {
      pending: 'pending',
      open: 'pending',
      closed: 'closed',
      passed: 'active',
      failed: 'missed',
      tied: 'pending'
    };
    return <StatusBadge status={statusMap[status] || status} />;
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
      {!canInteract && readOnlyMessage && (
        <div className="rounded-lg border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {readOnlyMessage}
        </div>
      )}
      <AccessibleStatus 
        message={status.message} 
        type={status.type} 
        isVisible={status.isVisible} 
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Digital Voting System</h1>
          <p className="text-muted-foreground">Vote on agendas, elections, and resolutions - All votes are confidential</p>
        </div>
        {canManage && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <AccessibleButton ariaLabel="Initiate a new voting motion">
                <Plus className="h-4 w-4 mr-2" />
                Initiate Voting
              </AccessibleButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Voting Motion</DialogTitle>
                <DialogDescription>
                  Enter the motion details, select the voting type, and prepare for voting. All votes will be kept confidential.
                </DialogDescription>
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

                <AccessibleButton 
                  onClick={createMotion} 
                  className="w-full"
                  ariaLabel="Create and prepare this motion for voting"
                >
                  Create Motion
                </AccessibleButton>
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
                            <Lock className="h-4 w-4 text-muted-foreground" aria-label="Confidential voting" />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {getStatusBadge(motion.status)}
                          {getVotingTypeBadge(motion.voting_type)}
                          {getMotionTypeBadge(motion.motion_type)}
                        </div>
                      </div>
                      <AccessibleButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowVoteDetails(showDetails ? null : motion.id)}
                        ariaLabel={showDetails ? "Hide voting results and details" : "Show voting results and details"}
                      >
                        {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </AccessibleButton>
                    </div>
                    {motion.description && (
                      <CardDescription className="mt-2">{motion.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {showDetails && canViewResults && (
                      <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span>For</span>
                          <span className="font-semibold text-green-600">{motion.votes_for}</span>
                        </div>
                        <Progress value={forPercent} className="h-2 bg-gray-200" />
                        
                        <div className="flex items-center justify-between text-sm">
                          <span>Against</span>
                          <span className="font-semibold text-red-600">{motion.votes_against}</span>
                        </div>
                        <Progress value={againstPercent} className="h-2 bg-gray-200" />
                        
                        <div className="flex items-center justify-between text-sm">
                          <span>Abstain</span>
                          <span className="font-semibold text-gray-600">{motion.votes_abstain}</span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          Total votes: {totalVotes}
                        </p>
                      </div>
                    )}

                    {canVote && !voted && (
                      <div className="flex flex-wrap gap-2">
                        <AccessibleButton
                          onClick={() => {
                            castVote(motion.id, 'for');
                            showSuccess('Your vote for has been recorded confidentially', 2000);
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          ariaLabel={`Vote for: ${motion.title}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Vote For
                        </AccessibleButton>
                        <AccessibleButton
                          onClick={() => {
                            castVote(motion.id, 'against');
                            showSuccess('Your vote against has been recorded confidentially', 2000);
                          }}
                          variant="destructive"
                          className="flex-1"
                          ariaLabel={`Vote against: ${motion.title}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Vote Against
                        </AccessibleButton>
                        <AccessibleButton
                          onClick={() => {
                            castVote(motion.id, 'abstain');
                            showSuccess('Your abstention has been recorded confidentially', 2000);
                          }}
                          variant="outline"
                          className="flex-1"
                          ariaLabel={`Abstain from voting: ${motion.title}`}
                        >
                          <MinusCircle className="h-4 w-4 mr-2" />
                          Abstain
                        </AccessibleButton>
                      </div>
                    )}

                    {voted && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm text-green-800">
                          You voted: <span className="font-semibold capitalize">{myVote}</span>
                        </span>
                      </div>
                    )}

                    {canManage && (
                      <div className="flex gap-2 pt-2 border-t">
                        <AccessibleButton
                          onClick={() => {
                            closeVoting(motion);
                            showSuccess('Voting closed', 2000);
                          }}
                          variant="outline"
                          size="sm"
                          ariaLabel={`Close voting for: ${motion.title}`}
                        >
                          Close Voting
                        </AccessibleButton>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
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
                      <CardTitle className="text-lg">{motion.title}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {getStatusBadge(motion.status)}
                        {getVotingTypeBadge(motion.voting_type)}
                      </div>
                    </div>
                    {canManage && (
                      <AccessibleButton 
                        onClick={() => {
                          openVoting(motion.id);
                          showSuccess('Voting is now open', 2000);
                        }} 
                        size="sm"
                        ariaLabel={`Open voting for: ${motion.title}`}
                      >
                        Open Voting
                      </AccessibleButton>
                    )}
                  </div>
                  {motion.description && (
                    <CardDescription>{motion.description}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          {closedMotions.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No closed motions</CardContent></Card>
          ) : (
            closedMotions.map(motion => {
              const isTied = motion.status === 'tied';
              
              const getBorderClass = (status: string): string => {
                if (status === 'passed') return 'border-l-4 border-l-green-500';
                if (status === 'failed') return 'border-l-4 border-l-red-500';
                return 'border-l-4 border-l-yellow-500';
              };
              
              return (
                <Card key={motion.id} className={getBorderClass(motion.status)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{motion.title}</CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {getStatusBadge(motion.status)}
                          {getVotingTypeBadge(motion.voting_type)}
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>For: {motion.votes_for}</p>
                        <p>Against: {motion.votes_against}</p>
                        <p>Abstain: {motion.votes_abstain}</p>
                      </div>
                    </div>
                  </CardHeader>
                  {isTied && isChair && !motion.tie_breaker_vote && (
                    <CardContent>
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800 mb-3">
                          <Gavel className="inline h-4 w-4 mr-1" />
                          As chairperson, you may cast the tie-breaking vote.
                        </p>
                        <div className="flex gap-2">
                          <AccessibleButton
                            onClick={() => {
                              castTieBreaker(motion.id, 'for');
                              showSuccess('Motion passed with your tie-breaker vote', 2000);
                            }}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            ariaLabel={`Cast tie-breaking vote for: ${motion.title}`}
                          >
                            Break Tie: For
                          </AccessibleButton>
                          <AccessibleButton
                            onClick={() => {
                              castTieBreaker(motion.id, 'against');
                              showSuccess('Motion failed with your tie-breaker vote', 2000);
                            }}
                            size="sm"
                            variant="destructive"
                            ariaLabel={`Cast tie-breaking vote against: ${motion.title}`}
                          >
                            Break Tie: Against
                          </AccessibleButton>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
