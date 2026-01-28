import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Users, 
  Search, 
  Trash2, 
  Key, 
  Eye, 
  EyeOff, 
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  UserCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';

interface UserProfile {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  role: string;
  class_id?: string;
  // Extended fields from KV store
  gender?: string;
  phone?: string;
  address?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  state?: string;
  lga?: string;
  date_of_birth?: string;
  blood_group?: string;
  class_name?: string;
  photo_url?: string;
  health_document_url?: string;
}

export function UsersManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [viewUserDialogOpen, setViewUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, roleFilter, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('[UsersManagement] Fetching users...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[UsersManagement] No session found');
        toast.error('Session expired. Please log in again.');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users/list`;
      console.log('[UsersManagement] Fetching from:', url);

      const res = await fetch(url, { headers });
      console.log('[UsersManagement] Response status:', res.status);
      
      const result = await res.json();
      console.log('[UsersManagement] Response data:', result);

      if (result.success) {
        setUsers(result.users);
        console.log('[UsersManagement] Loaded users:', result.users.length);
        console.log('[UsersManagement] Sample user data:', result.users[0]);
        
        // Log extended data availability
        const usersWithExtendedData = result.users.filter((u: UserProfile) => 
          u.gender || u.phone || u.address || u.photo_url
        );
        console.log('[UsersManagement] Users with extended data:', usersWithExtendedData.length);
        console.log('[UsersManagement] Sample extended data:', {
          hasGender: !!result.users[0]?.gender,
          hasPhone: !!result.users[0]?.phone,
          hasAddress: !!result.users[0]?.address,
          hasPhoto: !!result.users[0]?.photo_url,
          hasParentInfo: !!result.users[0]?.parent_name
        });
        
        toast.success(`Loaded ${result.users.length} users successfully`);
      } else {
        console.error('[UsersManagement] Error from server:', result.error);
        toast.error(result.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('[UsersManagement] Fetch error:', error);
      toast.error('Failed to load users: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.first_name?.toLowerCase().includes(term) ||
        user.last_name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.phone?.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users/delete`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ user_id: userToDelete.id })
        }
      );
      const result = await res.json();

      if (result.success) {
        toast.success('User deleted successfully');
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        fetchUsers();
      } else {
        toast.error(result.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('[UsersManagement] Delete error:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleResetPassword = async () => {
    if (!userToResetPassword || !newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users/reset-password`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            user_id: userToResetPassword.id,
            new_password: newPassword
          })
        }
      );
      const result = await res.json();

      if (result.success) {
        toast.success('Password reset successfully');
        setResetPasswordDialogOpen(false);
        setUserToResetPassword(null);
        setNewPassword('');
      } else {
        toast.error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('[UsersManagement] Reset password error:', error);
      toast.error('Failed to reset password');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'student':
        return 'bg-blue-500';
      case 'teacher':
        return 'bg-green-500';
      case 'principal':
        return 'bg-purple-500';
      case 'it_admin':
        return 'bg-red-500';
      case 'finance_admin':
        return 'bg-yellow-600';
      default:
        return 'bg-slate-500';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'student':
        return 'Student';
      case 'teacher':
        return 'Teacher';
      case 'principal':
        return 'Principal';
      case 'it_admin':
        return 'IT Admin';
      case 'finance_admin':
        return 'Finance Admin';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-slate-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl flex items-center gap-2">
          <Users className="h-6 w-6 md:h-8 md:w-8" />
          Users Management
        </h1>
        <p className="text-slate-600 mt-2 text-sm md:text-base">
          Manage all system users, view complete profiles, and reset passwords
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={roleFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter('all')}
              >
                All ({users.length})
              </Button>
              <Button
                variant={roleFilter === 'student' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter('student')}
              >
                Students ({users.filter(u => u.role === 'student').length})
              </Button>
              <Button
                variant={roleFilter === 'teacher' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter('teacher')}
              >
                Teachers ({users.filter(u => u.role === 'teacher').length})
              </Button>
              <Button
                variant={roleFilter === 'principal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter('principal')}
              >
                Principals ({users.filter(u => u.role === 'principal').length})
              </Button>
              <Button
                variant={roleFilter === 'it_admin' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter('it_admin')}
              >
                IT Admins ({users.filter(u => u.role === 'it_admin').length})
              </Button>
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredUsers.length} User{filteredUsers.length !== 1 ? 's' : ''} Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found matching your search criteria</p>
              </div>
            ) : (
              (() => {
                // Calculate pagination
                const indexOfLastUser = currentPage * usersPerPage;
                const indexOfFirstUser = indexOfLastUser - usersPerPage;
                const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
                
                return currentUsers.map((user) => (
                <div
                  key={user.id}
                  className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {user.photo_url ? (
                          <img
                            src={user.photo_url}
                            alt={`${user.first_name} ${user.last_name}`}
                            className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                            <UserCircle className="h-6 w-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium truncate">
                            {user.first_name} {user.middle_name} {user.last_name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${getRoleBadgeColor(user.role)} text-xs`}>
                              {getRoleLabel(user.role)}
                            </Badge>
                            {user.class_name && (
                              <span className="text-xs text-slate-600">
                                {user.class_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 ml-0 sm:ml-13">
                        {user.email && (
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                        {user.gender && (
                          <div className="flex items-center gap-2">
                            <span className="opacity-50">Gender:</span>
                            <span>{user.gender}</span>
                          </div>
                        )}
                        {user.address && (
                          <div className="flex items-center gap-2 min-w-0 sm:col-span-2">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{user.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setViewUserDialogOpen(true);
                        }}
                        className="gap-2 w-full sm:w-auto justify-center sm:justify-start"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUserToResetPassword(user);
                          setResetPasswordDialogOpen(true);
                        }}
                        className="gap-2 w-full sm:w-auto justify-center sm:justify-start"
                      >
                        <Key className="h-4 w-4" />
                        <span>Reset Password</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUserToDelete(user);
                          setDeleteDialogOpen(true);
                        }}
                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto justify-center sm:justify-start"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ));
              })()
            )}
          </div>
          
          {/* Pagination Controls */}
          {filteredUsers.length > usersPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
              <div className="text-sm text-slate-600">
                Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <div className="flex items-center gap-1">
                  {(() => {
                    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
                    const pages: (number | string)[] = [];
                    
                    if (totalPages <= 7) {
                      // Show all pages if 7 or fewer
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Show smart pagination with ellipsis
                      if (currentPage <= 3) {
                        pages.push(1, 2, 3, 4, '...', totalPages);
                      } else if (currentPage >= totalPages - 2) {
                        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                      } else {
                        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                      }
                    }
                    
                    return pages.map((page, index) => (
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-slate-400">...</span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page as number)}
                          className="w-9"
                        >
                          {page}
                        </Button>
                      )
                    ));
                  })()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredUsers.length / usersPerPage)))}
                  disabled={currentPage === Math.ceil(filteredUsers.length / usersPerPage)}
                  className="gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.first_name} {userToDelete?.last_name}</strong>?
              This action cannot be undone. All user data including marks, uploads, and profile information will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{userToResetPassword?.first_name} {userToResetPassword?.last_name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 8 characters)"
              />
              <p className="text-xs text-slate-500 mt-1">
                Password must be at least 8 characters long
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResetPasswordDialogOpen(false);
                  setNewPassword('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleResetPassword}>
                Reset Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={viewUserDialogOpen} onOpenChange={setViewUserDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>
              Complete profile information for {selectedUser?.first_name} {selectedUser?.last_name}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              {/* Profile Photo */}
              {selectedUser.photo_url && (
                <div className="flex justify-center">
                  <img
                    src={selectedUser.photo_url}
                    alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                    className="h-24 w-24 sm:h-32 sm:w-32 rounded-full object-cover border-4 border-slate-200"
                  />
                </div>
              )}

              {/* Basic Info */}
              <div>
                <h3 className="font-medium mb-3 text-sm sm:text-base">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">First Name:</span>
                    <p className="font-medium">{selectedUser.first_name}</p>
                  </div>
                  {selectedUser.middle_name && (
                    <div>
                      <span className="text-slate-500">Middle Name:</span>
                      <p className="font-medium">{selectedUser.middle_name}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">Last Name:</span>
                    <p className="font-medium">{selectedUser.last_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <p className="font-medium truncate">{selectedUser.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Role:</span>
                    <p className="font-medium">{getRoleLabel(selectedUser.role)}</p>
                  </div>
                  {selectedUser.gender && (
                    <div>
                      <span className="text-slate-500">Gender:</span>
                      <p className="font-medium">{selectedUser.gender}</p>
                    </div>
                  )}
                  {selectedUser.class_name && (
                    <div>
                      <span className="text-slate-500">Class:</span>
                      <p className="font-medium">{selectedUser.class_name}</p>
                    </div>
                  )}
                  {selectedUser.date_of_birth && (
                    <div>
                      <span className="text-slate-500">Date of Birth:</span>
                      <p className="font-medium">{selectedUser.date_of_birth}</p>
                    </div>
                  )}
                  {selectedUser.blood_group && (
                    <div>
                      <span className="text-slate-500">Blood Group:</span>
                      <p className="font-medium">{selectedUser.blood_group}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              {(selectedUser.phone || selectedUser.address || selectedUser.state || selectedUser.lga) && (
                <div>
                  <h3 className="font-medium mb-3 text-sm sm:text-base">Contact Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {selectedUser.phone && (
                      <div>
                        <span className="text-slate-500">Phone:</span>
                        <p className="font-medium">{selectedUser.phone}</p>
                      </div>
                    )}
                    {selectedUser.address && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-500">Address:</span>
                        <p className="font-medium">{selectedUser.address}</p>
                      </div>
                    )}
                    {selectedUser.state && (
                      <div>
                        <span className="text-slate-500">State:</span>
                        <p className="font-medium">{selectedUser.state}</p>
                      </div>
                    )}
                    {selectedUser.lga && (
                      <div>
                        <span className="text-slate-500">LGA:</span>
                        <p className="font-medium">{selectedUser.lga}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Parent Info (for students) */}
              {(selectedUser.parent_name || selectedUser.parent_phone || selectedUser.parent_email) && (
                <div>
                  <h3 className="font-medium mb-3 text-sm sm:text-base">Parent/Guardian Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {selectedUser.parent_name && (
                      <div>
                        <span className="text-slate-500">Parent Name:</span>
                        <p className="font-medium">{selectedUser.parent_name}</p>
                      </div>
                    )}
                    {selectedUser.parent_phone && (
                      <div>
                        <span className="text-slate-500">Parent Phone:</span>
                        <p className="font-medium">{selectedUser.parent_phone}</p>
                      </div>
                    )}
                    {selectedUser.parent_email && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-500">Parent Email:</span>
                        <p className="font-medium break-all">{selectedUser.parent_email}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Account Info */}
              <div>
                <h3 className="font-medium mb-3 text-sm sm:text-base">Account Information</h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">User ID:</span>
                    <p className="font-medium font-mono text-xs break-all">{selectedUser.id}</p>
                  </div>
                  {selectedUser.health_document_url && (
                    <div>
                      <span className="text-slate-500">Health Document:</span>
                      <a
                        href={selectedUser.health_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline block mt-1"
                      >
                        View Health Document
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
