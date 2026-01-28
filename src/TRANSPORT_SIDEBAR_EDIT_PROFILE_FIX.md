# Transport Sidebar Edit Profile Fix - COMPLETE ✅

## Issue
The "Click to edit profile" functionality in the Transport Manager Dashboard sidebar footer was not working - clicking on the user profile section did nothing.

## Root Cause
The TransportSidebar component was missing:
1. Import for the `ProfileSettings` component
2. State management for profile dialog visibility
3. Profile photo URL state and fetching
4. Click handler on the user profile section  
5. Rendering of the `ProfileSettings` dialog component

## Changes Made

### 1. Added Missing Imports
```tsx
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ProfileSettings } from './ProfileSettings';
```

### 2. Added State Variables
```tsx
const [showProfileDialog, setShowProfileDialog] = useState(false);
const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');
```

### 3. Added Profile Photo Fetching
```tsx
const fetchProfilePhoto = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/profile/${user.id}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );
    const data = await res.json();
    if (data.success && data.profile?.photo_url) {
      setProfilePhotoUrl(data.profile.photo_url);
    }
  } catch (error) {
    console.error('[TransportSidebar] Failed to fetch profile photo:', error);
  }
};

const handleProfileUpdate = () => {
  // Refresh profile photo after update
  fetchProfilePhoto();
};
```

### 4. Made Profile Section Clickable
```tsx
<div 
  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors"
  onClick={() => setShowProfileDialog(true)}
>
  <Avatar className="h-10 w-10 bg-blue-600 flex-shrink-0">
    <AvatarImage src={profilePhotoUrl} alt="Profile" />
    <AvatarFallback className="bg-blue-600 text-white">
      {getInitials(userName)}
    </AvatarFallback>
  </Avatar>
  {/* ... rest of profile display ... */}
</div>
```

### 5. Added ProfileSettings Dialog
```tsx
{/* Profile Settings Dialog */}
<ProfileSettings 
  open={showProfileDialog} 
  onOpenChange={setShowProfileDialog}
  onProfileUpdate={handleProfileUpdate}
/>
```

## Features Now Working

✅ **Click to Open Profile**: Clicking anywhere on the user profile section in the footer opens the profile settings dialog

✅ **Profile Photo Display**: Shows the user's uploaded profile photo (if available) in the sidebar avatar

✅ **Profile Photo Updates**: After updating the profile photo in the dialog, it refreshes automatically in the sidebar

✅ **Visual Feedback**: Hover effect on the profile section indicates it's clickable

✅ **Consistent with Other Dashboards**: Matches the implementation in TeacherSidebar, StudentSidebar, FinanceAdminSidebar, and DirectorSidebar

## Testing Instructions

1. **Login as Transport Manager** and navigate to the Transport Manager Dashboard

2. **View the Sidebar Footer**: 
   - You should see your name and "Transport Manager" role
   - Text "Click to edit profile" appears below

3. **Click on Profile Section**: 
   - Click anywhere on the user profile area (avatar, name, or role)
   - Profile settings dialog should open

4. **Edit Profile**:
   - Update your first name, surname, phone, address
   - Upload a profile photo, signature, or CV
   - Click "Save Profile"

5. **Verify Photo Update**:
   - After uploading a photo, close the dialog
   - The new photo should appear in the sidebar avatar

6. **Test on Mobile**:
   - Open mobile menu
   - Profile section should work the same way

## Files Modified

- `/components/TransportSidebar.tsx` - Added profile dialog functionality

## Additional Notes

- The ProfileSettings component is already created and working for other dashboards
- It uses the same backend endpoints (`/profile/:id` for fetching, `/profile` for saving)
- Profile data is stored in the KV store on the backend
- Photos are uploaded to Supabase Storage with signed URLs
