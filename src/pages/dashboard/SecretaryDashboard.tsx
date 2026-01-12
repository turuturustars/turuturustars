import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  FileText, 
  Upload, 
  Calendar, 
  Users, 
  ClipboardList,
  Plus,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  description: string | null;
  document_type: string;
  cloudinary_url: string;
  file_name: string;
  file_size: number | null;
  is_public: boolean;
  tags: string[] | null;
  created_at: string;
  uploaded_by: string;
}

interface MeetingMinutes {
  id: string;
  title: string;
  meeting_date: string;
  meeting_type: string;
  attendees: string[] | null;
  agenda: string | null;
  minutes_content: string | null;
  action_items: unknown;
  status: string;
  created_at: string;
}

const SecretaryDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [meetings, setMeetings] = useState<MeetingMinutes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  
  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadType, setUploadType] = useState('general');
  const [uploadIsPublic, setUploadIsPublic] = useState(false);
  
  // Meeting form state
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingType, setMeetingType] = useState('general');
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [meetingContent, setMeetingContent] = useState('');

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchMeetings();
    }
  }, [user]);

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setDocuments(data);
    }
    setIsLoading(false);
  };

  const fetchMeetings = async () => {
    const { data, error } = await supabase
      .from('meeting_minutes')
      .select('*')
      .order('meeting_date', { ascending: false });
    
    if (!error && data) {
      setMeetings(data);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile || !uploadTitle || !user) return;
    
    setIsUploading(true);
    try {
      const result = await uploadToCloudinary(uploadFile, 'turuturu-stars/documents');
      
      const { error } = await supabase.from('documents').insert({
        title: uploadTitle,
        description: uploadDescription,
        document_type: uploadType,
        cloudinary_public_id: result.public_id,
        cloudinary_url: result.secure_url,
        file_name: uploadFile.name,
        file_size: result.bytes,
        mime_type: uploadFile.type,
        uploaded_by: user.id,
        is_public: uploadIsPublic,
      });
      
      if (error) throw error;
      
      toast({
        title: 'Document Uploaded',
        description: 'The document has been uploaded successfully.',
      });
      
      setUploadDialogOpen(false);
      resetUploadForm();
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle('');
    setUploadDescription('');
    setUploadType('general');
    setUploadIsPublic(false);
  };

  const handleCreateMeeting = async () => {
    if (!meetingTitle || !meetingDate || !user) return;
    
    try {
      const { error } = await supabase.from('meeting_minutes').insert({
        title: meetingTitle,
        meeting_date: meetingDate,
        meeting_type: meetingType,
        agenda: meetingAgenda,
        minutes_content: meetingContent,
        recorded_by: user.id,
        status: 'draft',
      });
      
      if (error) throw error;
      
      toast({
        title: 'Meeting Created',
        description: 'The meeting minutes have been saved as draft.',
      });
      
      setMeetingDialogOpen(false);
      resetMeetingForm();
      fetchMeetings();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetMeetingForm = () => {
    setMeetingTitle('');
    setMeetingDate('');
    setMeetingType('general');
    setMeetingAgenda('');
    setMeetingContent('');
  };

  const handleDeleteDocument = async (id: string) => {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    
    if (!error) {
      toast({ title: 'Document Deleted' });
      fetchDocuments();
    }
  };

  const handleApproveMeeting = async (id: string) => {
    const { error } = await supabase
      .from('meeting_minutes')
      .update({ 
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (!error) {
      toast({ title: 'Meeting Minutes Approved' });
      fetchMeetings();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Secretary Dashboard</h1>
        <p className="text-muted-foreground">Manage documents, meeting minutes, and administrative tasks</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents.length}</p>
                <p className="text-sm text-muted-foreground">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{meetings.length}</p>
                <p className="text-sm text-muted-foreground">Meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{meetings.filter(m => m.status === 'approved').length}</p>
                <p className="text-sm text-muted-foreground">Approved Minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{meetings.filter(m => m.status === 'draft').length}</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">
            <FileText className="w-4 h-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="meetings">
            <ClipboardList className="w-4 h-4 mr-2" />
            Meeting Minutes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Document Library</h2>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>File</Label>
                    <Input
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="Document title"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder="Brief description"
                    />
                  </div>
                  <div>
                    <Label>Document Type</Label>
                    <Select value={uploadType} onValueChange={setUploadType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="minutes">Meeting Minutes</SelectItem>
                        <SelectItem value="policy">Policy Document</SelectItem>
                        <SelectItem value="report">Report</SelectItem>
                        <SelectItem value="letter">Official Letter</SelectItem>
                        <SelectItem value="certificate">Certificate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={uploadIsPublic}
                      onChange={(e) => setUploadIsPublic(e.target.checked)}
                    />
                    <Label htmlFor="isPublic">Make document public to all members</Label>
                  </div>
                  <Button 
                    onClick={handleFileUpload} 
                    disabled={!uploadFile || !uploadTitle || isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Upload'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Public</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.document_type}</Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell>{format(new Date(doc.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        {doc.is_public ? (
                          <Badge className="bg-green-500">Public</Badge>
                        ) : (
                          <Badge variant="secondary">Private</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.cloudinary_url, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = doc.cloudinary_url;
                              link.download = doc.file_name;
                              link.click();
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {documents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No documents uploaded yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Meeting Minutes</h2>
            <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Meeting
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Meeting Minutes</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={meetingTitle}
                        onChange={(e) => setMeetingTitle(e.target.value)}
                        placeholder="Meeting title"
                      />
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Meeting Type</Label>
                    <Select value={meetingType} onValueChange={setMeetingType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Meeting</SelectItem>
                        <SelectItem value="agm">AGM</SelectItem>
                        <SelectItem value="executive">Executive Meeting</SelectItem>
                        <SelectItem value="committee">Committee Meeting</SelectItem>
                        <SelectItem value="special">Special Meeting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Agenda</Label>
                    <Textarea
                      value={meetingAgenda}
                      onChange={(e) => setMeetingAgenda(e.target.value)}
                      placeholder="Meeting agenda items"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Minutes</Label>
                    <Textarea
                      value={meetingContent}
                      onChange={(e) => setMeetingContent(e.target.value)}
                      placeholder="Detailed meeting minutes..."
                      rows={6}
                    />
                  </div>
                  <Button 
                    onClick={handleCreateMeeting} 
                    disabled={!meetingTitle || !meetingDate}
                    className="w-full"
                  >
                    Save as Draft
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map((meeting) => (
                    <TableRow key={meeting.id}>
                      <TableCell>
                        <p className="font-medium">{meeting.title}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{meeting.meeting_type}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(meeting.meeting_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(meeting.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {meeting.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveMeeting(meeting.id)}
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {meetings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No meeting minutes recorded yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecretaryDashboard;
