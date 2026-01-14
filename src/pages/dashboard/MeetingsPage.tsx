import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plus, Users, Clock, MapPin, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { format, isFuture, isPast } from 'date-fns';
import { toast } from 'sonner';

interface Meeting {
  id: string;
  title: string;
  meeting_type: string;
  scheduled_date: string;
  venue: string | null;
  agenda: string | null;
  status: string;
  created_by: string;
  created_at: string;
}

interface MeetingAttendance {
  id: string;
  meeting_id: string;
  member_id: string;
  attended: boolean;
  apology_sent: boolean;
  apology_reason: string | null;
  profiles?: {
    full_name: string;
    membership_number: string | null;
  };
}

interface Profile {
  id: string;
  full_name: string;
  membership_number: string | null;
  status: string;
}

export default function MeetingsPage() {
  const { user, hasRole, isOfficial } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [attendance, setAttendance] = useState<MeetingAttendance[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    meeting_type: 'member',
    scheduled_date: '',
    venue: '',
    agenda: ''
  });

  const canManage = hasRole('admin') || hasRole('chairperson') || hasRole('secretary') || 
                    hasRole('vice_chairman') || hasRole('vice_secretary') || hasRole('organizing_secretary');

  useEffect(() => {
    fetchMeetings();
    if (canManage) {
      fetchMembers();
    }
  }, [canManage]);

  const fetchMeetings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('scheduled_date', { ascending: false });

    if (error) {
      toast.error('Failed to fetch meetings');
    } else {
      setMeetings(data || []);
    }
    setIsLoading(false);
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, membership_number, status')
      .eq('status', 'active');
    setMembers(data || []);
  };

  const fetchAttendance = async (meetingId: string) => {
    const { data } = await supabase
      .from('meeting_attendance')
      .select('*')
      .eq('meeting_id', meetingId);
    
    if (data && data.length > 0) {
      const memberIds = data.map(a => a.member_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, membership_number')
        .in('id', memberIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const attendanceWithProfiles = data.map(a => ({
        ...a,
        profiles: profileMap.get(a.member_id) || { full_name: 'Unknown', membership_number: null }
      }));
      setAttendance(attendanceWithProfiles as MeetingAttendance[]);
    } else {
      setAttendance([]);
    }
  };

  const createMeeting = async () => {
    if (!newMeeting.title || !newMeeting.scheduled_date) {
      toast.error('Please fill in required fields');
      return;
    }

    const { error } = await supabase.from('meetings').insert({
      title: newMeeting.title,
      meeting_type: newMeeting.meeting_type,
      scheduled_date: newMeeting.scheduled_date,
      venue: newMeeting.venue || null,
      agenda: newMeeting.agenda || null,
      created_by: user?.id
    });

    if (error) {
      toast.error('Failed to create meeting');
    } else {
      toast.success('Meeting scheduled successfully');
      setShowCreateDialog(false);
      setNewMeeting({ title: '', meeting_type: 'member', scheduled_date: '', venue: '', agenda: '' });
      fetchMeetings();
    }
  };

  const initializeAttendance = async (meetingId: string) => {
    const attendanceRecords = members.map(member => ({
      meeting_id: meetingId,
      member_id: member.id,
      attended: false,
      marked_by: user?.id
    }));

    const { error } = await supabase.from('meeting_attendance').upsert(attendanceRecords, {
      onConflict: 'meeting_id,member_id'
    });

    if (error) {
      toast.error('Failed to initialize attendance');
    } else {
      fetchAttendance(meetingId);
    }
  };

  const toggleAttendance = async (attendanceId: string, currentAttended: boolean) => {
    const { error } = await supabase
      .from('meeting_attendance')
      .update({ attended: !currentAttended, marked_at: new Date().toISOString() })
      .eq('id', attendanceId);

    if (error) {
      toast.error('Failed to update attendance');
    } else {
      setAttendance(prev => prev.map(a => 
        a.id === attendanceId ? { ...a, attended: !currentAttended } : a
      ));
    }
  };

  const updateMeetingStatus = async (meetingId: string, status: string) => {
    const { error } = await supabase
      .from('meetings')
      .update({ status })
      .eq('id', meetingId);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success('Status updated');
      fetchMeetings();
    }
  };

  const openAttendanceDialog = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    fetchAttendance(meeting.id);
    setShowAttendanceDialog(true);
  };

  const getMeetingTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      member: 'bg-blue-100 text-blue-800',
      management_committee: 'bg-purple-100 text-purple-800',
      agm: 'bg-green-100 text-green-800',
      special: 'bg-orange-100 text-orange-800'
    };
    return <Badge className={variants[type] || 'bg-gray-100'}>{type.replace('_', ' ').toUpperCase()}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{status.replace('_', ' ')}</Badge>;
  };

  const upcomingMeetings = meetings.filter(m => isFuture(new Date(m.scheduled_date)) && m.status !== 'cancelled');
  const pastMeetings = meetings.filter(m => isPast(new Date(m.scheduled_date)) || m.status === 'completed');

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
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-muted-foreground">Schedule and manage association meetings</p>
        </div>
        {canManage && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Schedule Meeting</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule New Meeting</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Meeting Title"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                />
                <Select value={newMeeting.meeting_type} onValueChange={(v) => setNewMeeting({ ...newMeeting, meeting_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Meeting Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member Meeting</SelectItem>
                    <SelectItem value="management_committee">Management Committee</SelectItem>
                    <SelectItem value="agm">AGM</SelectItem>
                    <SelectItem value="special">Special Meeting</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="datetime-local"
                  value={newMeeting.scheduled_date}
                  onChange={(e) => setNewMeeting({ ...newMeeting, scheduled_date: e.target.value })}
                />
                <Input
                  placeholder="Venue"
                  value={newMeeting.venue}
                  onChange={(e) => setNewMeeting({ ...newMeeting, venue: e.target.value })}
                />
                <Textarea
                  placeholder="Agenda"
                  value={newMeeting.agenda}
                  onChange={(e) => setNewMeeting({ ...newMeeting, agenda: e.target.value })}
                />
                <Button onClick={createMeeting} className="w-full">Schedule Meeting</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{upcomingMeetings.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{pastMeetings.filter(m => m.status === 'completed').length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-sm text-muted-foreground">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{meetings.filter(m => m.status === 'cancelled').length}</p>
                <p className="text-sm text-muted-foreground">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingMeetings.length})</TabsTrigger>
          <TabsTrigger value="past">Past Meetings ({pastMeetings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingMeetings.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No upcoming meetings scheduled</CardContent></Card>
          ) : (
            upcomingMeetings.map(meeting => (
              <Card key={meeting.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{meeting.title}</h3>
                        {getMeetingTypeBadge(meeting.meeting_type)}
                        {getStatusBadge(meeting.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(meeting.scheduled_date), 'PPP p')}
                        </span>
                        {meeting.venue && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {meeting.venue}
                          </span>
                        )}
                      </div>
                      {meeting.agenda && <p className="text-sm">{meeting.agenda}</p>}
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openAttendanceDialog(meeting)}>
                          <Users className="h-4 w-4 mr-1" />Attendance
                        </Button>
                        <Select onValueChange={(v) => updateMeetingStatus(meeting.id, v)}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="past">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meeting</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pastMeetings.map(meeting => (
                <TableRow key={meeting.id}>
                  <TableCell className="font-medium">{meeting.title}</TableCell>
                  <TableCell>{getMeetingTypeBadge(meeting.meeting_type)}</TableCell>
                  <TableCell>{format(new Date(meeting.scheduled_date), 'PPP')}</TableCell>
                  <TableCell>{meeting.venue || '-'}</TableCell>
                  <TableCell>{getStatusBadge(meeting.status)}</TableCell>
                  {canManage && (
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openAttendanceDialog(meeting)}>
                        View Attendance
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Attendance: {selectedMeeting?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {attendance.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No attendance records yet</p>
                {canManage && (
                  <Button onClick={() => selectedMeeting && initializeAttendance(selectedMeeting.id)}>
                    Initialize Attendance List
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Membership #</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead>Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map(record => (
                    <TableRow key={record.id}>
                      <TableCell>{record.profiles?.full_name}</TableCell>
                      <TableCell>{record.profiles?.membership_number || '-'}</TableCell>
                      <TableCell>
                        {record.attended ? (
                          <Badge className="bg-green-100 text-green-800">Present</Badge>
                        ) : record.apology_sent ? (
                          <Badge className="bg-yellow-100 text-yellow-800">Apology</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">Absent</Badge>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAttendance(record.id, record.attended)}
                          >
                            {record.attended ? 'Mark Absent' : 'Mark Present'}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Present: {attendance.filter(a => a.attended).length}</span>
              <span>Absent: {attendance.filter(a => !a.attended && !a.apology_sent).length}</span>
              <span>Apologies: {attendance.filter(a => a.apology_sent).length}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
