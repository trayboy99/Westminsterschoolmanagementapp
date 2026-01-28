import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { 
  FileSearch, 
  Clock, 
  User, 
  Edit, 
  CheckCircle, 
  XCircle,
  Eye,
  Filter,
  Calendar,
  Download
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userRole: string;
  action: 'create' | 'edit' | 'submit' | 'approve' | 'reject' | 'view';
  entity: 'marks_entry' | 'student_mark' | 'submission';
  entityId: string;
  entityDescription: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  comment?: string;
  ipAddress?: string;
  sessionId?: string;
}

interface MarksAuditLogProps {
  auditLogs: AuditLogEntry[];
  onExport: () => void;
  className?: string;
}

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: new Date(2024, 8, 18, 14, 30, 15),
    userId: 'P001',
    userName: 'Dr. Sarah Johnson',
    userRole: 'Principal',
    action: 'approve',
    entity: 'marks_entry',
    entityId: 'ME001',
    entityDescription: 'Mathematics - Grade 10-A',
    comment: 'Marks approved after review',
    ipAddress: '192.168.1.100',
    sessionId: 'sess_xyz123'
  },
  {
    id: '2',
    timestamp: new Date(2024, 8, 18, 13, 45, 30),
    userId: 'T001',
    userName: 'Dr. Ahmed Hassan',
    userRole: 'Teacher',
    action: 'submit',
    entity: 'marks_entry',
    entityId: 'ME001',
    entityDescription: 'Mathematics - Grade 10-A',
    ipAddress: '192.168.1.105',
    sessionId: 'sess_abc456'
  },
  {
    id: '3',
    timestamp: new Date(2024, 8, 18, 11, 20, 45),
    userId: 'T001',
    userName: 'Dr. Ahmed Hassan',
    userRole: 'Teacher',
    action: 'edit',
    entity: 'student_mark',
    entityId: 'SM001',
    entityDescription: 'Aisha Mohammed - Mathematics Terminal Exam',
    oldValues: { terminalExam: 52 },
    newValues: { terminalExam: 55, total: 92 },
    ipAddress: '192.168.1.105',
    sessionId: 'sess_abc456'
  },
  {
    id: '4',
    timestamp: new Date(2024, 8, 17, 16, 45, 10),
    userId: 'P001',
    userName: 'Dr. Sarah Johnson',
    userRole: 'Principal',
    action: 'reject',
    entity: 'marks_entry',
    entityId: 'ME002',
    entityDescription: 'Chemistry - Grade 10-A',
    comment: 'Several marks appear inconsistent with class performance',
    ipAddress: '192.168.1.100',
    sessionId: 'sess_def789'
  },
  {
    id: '5',
    timestamp: new Date(2024, 8, 17, 15, 30, 25),
    userId: 'T004',
    userName: 'Dr. James Brown',
    userRole: 'Teacher',
    action: 'create',
    entity: 'marks_entry',
    entityId: 'ME002',
    entityDescription: 'Chemistry - Grade 10-A',
    ipAddress: '192.168.1.108',
    sessionId: 'sess_ghi012'
  },
  {
    id: '6',
    timestamp: new Date(2024, 8, 17, 14, 15, 35),
    userId: 'T002',
    userName: 'Ms. Sarah Wilson',
    userRole: 'Teacher',
    action: 'edit',
    entity: 'student_mark',
    entityId: 'SM002',
    entityDescription: 'Benjamin Okafor - English Midterm CA2',
    oldValues: { midtermCA2: 7 },
    newValues: { midtermCA2: 8, midtermTotal: 31 },
    ipAddress: '192.168.1.106',
    sessionId: 'sess_jkl345'
  },
  {
    id: '7',
    timestamp: new Date(2024, 8, 16, 10, 45, 20),
    userId: 'SA001',
    userName: 'Mr. Michael Thompson',
    userRole: 'Super Admin',
    action: 'view',
    entity: 'marks_entry',
    entityId: 'ME001',
    entityDescription: 'Mathematics - Grade 10-A',
    ipAddress: '192.168.1.101',
    sessionId: 'sess_mno678'
  }
];

export function MarksAuditLog({ 
  auditLogs = mockAuditLogs, 
  onExport,
  className = '' 
}: MarksAuditLogProps) {
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<string>('all');

  const filteredLogs = auditLogs.filter(log => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (filterUser !== 'all' && log.userId !== filterUser) return false;
    if (filterEntity !== 'all' && log.entity !== filterEntity) return false;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!log.entityDescription.toLowerCase().includes(searchLower) &&
          !log.userName.toLowerCase().includes(searchLower) &&
          !log.comment?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    if (dateRange !== 'all') {
      const now = new Date();
      const logDate = log.timestamp;
      
      switch (dateRange) {
        case 'today':
          if (logDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (logDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (logDate < monthAgo) return false;
          break;
      }
    }

    return true;
  });

  const getActionBadge = (action: string) => {
    const config = {
      create: { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800', icon: Edit },
      edit: { variant: 'secondary' as const, color: 'bg-orange-100 text-orange-800', icon: Edit },
      submit: { variant: 'default' as const, color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
      approve: { variant: 'default' as const, color: 'bg-green-100 text-green-800', icon: CheckCircle },
      reject: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800', icon: XCircle },
      view: { variant: 'outline' as const, color: 'bg-slate-100 text-slate-800', icon: Eye }
    };
    
    const actionConfig = config[action as keyof typeof config] || config.view;
    const Icon = actionConfig.icon;
    
    return (
      <Badge variant={actionConfig.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {action.charAt(0).toUpperCase() + action.slice(1)}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getUniqueUsers = () => {
    const users = [...new Set(auditLogs.map(log => ({ id: log.userId, name: log.userName })))];
    return users.filter((user, index, self) => self.findIndex(u => u.id === user.id) === index);
  };

  const formatValues = (values: Record<string, any>) => {
    return Object.entries(values).map(([key, value]) => `${key}: ${value}`).join(', ');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileSearch className="h-6 w-6" />
            Marks Entry Audit Log
          </h2>
          <p className="text-slate-600 mt-1">
            Complete audit trail of all marks entry activities
          </p>
        </div>
        <Button onClick={onExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Log
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
                <SelectItem value="submit">Submit</SelectItem>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
                <SelectItem value="view">View</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger>
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {getUniqueUsers().map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger>
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="marks_entry">Marks Entry</SelectItem>
                <SelectItem value="student_mark">Student Mark</SelectItem>
                <SelectItem value="submission">Submission</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center text-sm text-slate-600">
              {filteredLogs.length} of {auditLogs.length} entries
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Entries */}
      <div className="space-y-3">
        {filteredLogs.map((entry) => (
          <Card key={entry.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getActionBadge(entry.action)}
                        <span className="font-medium">{entry.entityDescription}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600 mb-2">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{entry.userName} ({entry.userRole})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatTimestamp(entry.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">IP: {entry.ipAddress}</span>
                        </div>
                      </div>

                      {entry.comment && (
                        <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded mt-2">
                          <strong>Comment:</strong> {entry.comment}
                        </div>
                      )}

                      {(entry.oldValues || entry.newValues) && (
                        <div className="mt-2 text-xs">
                          {entry.oldValues && (
                            <div className="text-red-600">
                              <strong>Previous:</strong> {formatValues(entry.oldValues)}
                            </div>
                          )}
                          {entry.newValues && (
                            <div className="text-green-600">
                              <strong>New:</strong> {formatValues(entry.newValues)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Audit Log Details</DialogTitle>
                      <DialogDescription>
                        View detailed information about this audit log entry
                      </DialogDescription>
                    </DialogHeader>
                    {selectedEntry && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Timestamp:</strong>
                            <div>{formatTimestamp(selectedEntry.timestamp)}</div>
                          </div>
                          <div>
                            <strong>Action:</strong>
                            <div>{getActionBadge(selectedEntry.action)}</div>
                          </div>
                          <div>
                            <strong>User:</strong>
                            <div>{selectedEntry.userName} ({selectedEntry.userRole})</div>
                          </div>
                          <div>
                            <strong>Entity:</strong>
                            <div>{selectedEntry.entity.replace('_', ' ').toUpperCase()}</div>
                          </div>
                          <div>
                            <strong>IP Address:</strong>
                            <div>{selectedEntry.ipAddress}</div>
                          </div>
                          <div>
                            <strong>Session ID:</strong>
                            <div className="font-mono text-xs">{selectedEntry.sessionId}</div>
                          </div>
                        </div>

                        <div>
                          <strong>Description:</strong>
                          <div className="mt-1">{selectedEntry.entityDescription}</div>
                        </div>

                        {selectedEntry.comment && (
                          <div>
                            <strong>Comment:</strong>
                            <div className="mt-1 bg-slate-50 p-3 rounded">{selectedEntry.comment}</div>
                          </div>
                        )}

                        {selectedEntry.oldValues && (
                          <div>
                            <strong>Previous Values:</strong>
                            <div className="mt-1 bg-red-50 p-3 rounded border border-red-200">
                              <pre className="text-xs">{JSON.stringify(selectedEntry.oldValues, null, 2)}</pre>
                            </div>
                          </div>
                        )}

                        {selectedEntry.newValues && (
                          <div>
                            <strong>New Values:</strong>
                            <div className="mt-1 bg-green-50 p-3 rounded border border-green-200">
                              <pre className="text-xs">{JSON.stringify(selectedEntry.newValues, null, 2)}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileSearch className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No Audit Entries Found</h3>
            <p className="text-slate-500">
              No audit log entries match your current filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}