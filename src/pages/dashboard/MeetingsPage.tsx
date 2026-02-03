import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { Calendar, Plus, Users, Clock, MapPin, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { format, isFuture, isPast } from 'date-fns';
import { toast } from 'sonner';
import { 
  sendMeetingNotifications, 
  playNotificationSound,
  getNotificationRecipients,
  type MeetingNotificationType 
} from '@/lib/meetingNotificationService';

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
  marked_at: string | null;
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
  const { status, showSuccess } = useStatus();
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
    // Use correct column names from database schema
    const { data, error } = await supabase
      .from('meetings')
      .select('id, title, meeting_type, scheduled_date, venue, agenda, status, created_by, created_at')
      .order('scheduled_date', { ascending: false });

    if (error) {
      toast.error('Failed to fetch meetings');
    } else {
      setMeetings((data || []) as Meeting[]);
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
    // Use correct column names from database schema
    const { data } = await supabase
      .from('meeting_attendance')
      .select('id, meeting_id, member_id, attended, apology_sent, apology_reason, marked_at')
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

    const { data, error } = await supabase.from('meetings').insert({
      title: newMeeting.title,
      meeting_type: newMeeting.meeting_type,
      scheduled_date: newMeeting.scheduled_date,
      venue: newMeeting.venue || null,
      agenda: newMeeting.agenda || null,
      status: 'scheduled',
      created_by: user?.id
    }).select().single();

    if (error) {
      toast.error('Failed to create meeting');
      return;
    }

    // Get notification recipients based on meeting type
    const recipients = await getNotificationRecipients(newMeeting.meeting_type);
    
    // Send notifications
    await sendMeetingNotifications(
      {
        meetingId: data.id,
        title: newMeeting.title,
        scheduledDate: newMeeting.scheduled_date,
        type: 'scheduled' as MeetingNotificationType,
        venue: newMeeting.venue,
        agenda: newMeeting.agenda,
        createdBy: user?.id,
      },
      recipients
    );

    // Play notification sound
    playNotificationSound(0.6);

    toast.success('Meeting scheduled successfully and notifications sent');
    setShowCreateDialog(false);
    setNewMeeting({ title: '', meeting_type: 'member', scheduled_date: '', venue: '', agenda: '' });
    fetchMeetings();
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

  const updateMeetingStatus = async (meetingId: string, newStatus: string) => {
    // Find the meeting to get its details
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) {
      toast.error('Meeting not found');
      return;
    }

    const { error } = await supabase
      .from('meetings')
      .update({ status: newStatus })
      .eq('id', meetingId);

    if (error) {
      toast.error('Failed to update status');
      return;
    }

    // Send cancellation notifications if status is changed to cancelled
    if (newStatus === 'cancelled') {
      const recipients = await getNotificationRecipients(meeting.meeting_type);
      await sendMeetingNotifications(
        {
          meetingId: meeting.id,
          title: meeting.title,
          scheduledDate: meeting.scheduled_date,
          type: 'cancelled' as MeetingNotificationType,
          venue: meeting.venue,
          agenda: meeting.agenda,
          createdBy: meeting.created_by,
        },
        recipients
      );
      playNotificationSound(0.5);
    }

    toast.success('Status updated successfully');
    fetchMeetings();
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

  const getStatusBadge = (meetingStatus: string) => {
    // Map meeting statuses to standard statuses
    const statusMap: Record<string, string> = {
      scheduled: 'pending',
      in_progress: 'active',
      completed: 'active',
      cancelled: 'dormant'
    };
    return <StatusBadge status={statusMap[meetingStatus] || meetingStatus} />;
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
      <AccessibleStatus 
        message={status.message} 
        type={status.type} 
        isVisible={status.isVisible} 
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-muted-foreground">Schedule and manage association meetings</p>
        </div>
        {canManage && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <AccessibleButton ariaLabel="Schedule new meeting" size="sm"><Plus className="h-4 w-4 mr-2" />Schedule Meeting</AccessibleButton>
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
                <AccessibleButton ariaLabel="Create new meeting" onClick={() => {
                  createMeeting();
                  showSuccess('Meeting scheduled successfully', 2000);
                }} className="w-full">Schedule Meeting</AccessibleButton>
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
                        <AccessibleButton 
                          variant="outline" 
                          size="sm" 
                          ariaLabel={`View and manage attendance for meeting: ${meeting.title}`}
                          onClick={() => openAttendanceDialog(meeting)}
                        >
                          <Users className="h-4 w-4 mr-1" />Attendance
                        </AccessibleButton>
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
              {pastMeetings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No past meetings
                  </TableCell>
                </TableRow>
              ) : (
                pastMeetings.map(meeting => (
                  <TableRow key={meeting.id}>
                    <TableCell className="font-medium">{meeting.title}</TableCell>
                    <TableCell>{getMeetingTypeBadge(meeting.meeting_type)}</TableCell>
                    <TableCell>{format(new Date(meeting.scheduled_date), 'PP')}</TableCell>
                    <TableCell>{meeting.venue || '-'}</TableCell>
                    <TableCell>{getStatusBadge(meeting.status)}</TableCell>
                    {canManage && (
                      <TableCell>
                        <AccessibleButton 
                          variant="outline" 
                          size="sm"
                          ariaLabel={`View attendance for ${meeting.title}`}
                          onClick={() => openAttendanceDialog(meeting)}
                        >
                          View Attendance
                        </AccessibleButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Attendance Dialog */}
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
                  <AccessibleButton 
                    ariaLabel="Initialize attendance for all members"
                    onClick={() => selectedMeeting && initializeAttendance(selectedMeeting.id)}
                  >
                    Initialize Attendance
                  </AccessibleButton>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Membership #</TableHead>
                    <TableHead>Attended</TableHead>
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
                        ) : (
                          <Badge className="bg-red-100 text-red-800">Absent</Badge>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <AccessibleButton 
                            variant="outline" 
                            size="sm"
                            ariaLabel={`Toggle attendance for ${record.profiles?.full_name}`}
                            onClick={() => toggleAttendance(record.id, record.attended)}
                          >
                            {record.attended ? 'Mark Absent' : 'Mark Present'}
                          </AccessibleButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
