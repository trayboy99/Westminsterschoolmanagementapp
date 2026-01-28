import { supabase } from './client';

// Storage buckets for the School Management System
export const BUCKETS = {
  UPLOADS: 'uploads',
  AVATARS: 'avatars',
  DOCUMENTS: 'documents',
  REPORTS: 'reports'
} as const;

// File upload utilities
export const storage = {
  // Upload a file to the uploads bucket
  uploadFile: async (
    bucket: string,
    path: string,
    file: File,
    options?: {
      cacheControl?: string;
      contentType?: string;
      upsert?: boolean;
    }
  ) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: options?.cacheControl || '3600',
        contentType: options?.contentType || file.type,
        upsert: options?.upsert || false
      });

    if (error) throw error;
    return data;
  },

  // Upload educational materials (e-notes, exam questions, etc.)
  uploadEducationalMaterial: async (
    file: File,
    metadata: {
      teacherId: string;
      subjectId: string;
      classId: string;
      week: number;
      term: string;
      session: string;
      uploadType: string;
    }
  ) => {
    const fileName = `${metadata.session}/${metadata.term}/${metadata.subjectId}/${metadata.classId}/week-${metadata.week}/${metadata.uploadType}/${Date.now()}-${file.name}`;
    
    return await storage.uploadFile(BUCKETS.UPLOADS, fileName, file, {
      contentType: file.type,
      upsert: false
    });
  },

  // Upload user avatar
  uploadAvatar: async (userId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;
    
    return await storage.uploadFile(BUCKETS.AVATARS, fileName, file, {
      contentType: file.type,
      upsert: true
    });
  },

  // Upload document (reports, certificates, etc.)
  uploadDocument: async (
    file: File,
    folder: string,
    metadata?: {
      userId?: string;
      sessionId?: string;
      type?: string;
    }
  ) => {
    const timestamp = Date.now();
    const fileName = `${folder}/${timestamp}-${file.name}`;
    
    return await storage.uploadFile(BUCKETS.DOCUMENTS, fileName, file, {
      contentType: file.type,
      upsert: false
    });
  },

  // Get public URL for a file
  getPublicUrl: (bucket: string, path: string) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  },

  // Get signed URL for private files (expires in 1 hour by default)
  getSignedUrl: async (bucket: string, path: string, expiresIn: number = 3600) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data;
  },

  // Delete a file
  deleteFile: async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return data;
  },

  // List files in a folder
  listFiles: async (bucket: string, folder: string = '') => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder);

    if (error) throw error;
    return data;
  },

  // Get file information
  getFileInfo: async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list('', {
        limit: 1,
        search: path
      });

    if (error) throw error;
    return data?.[0] || null;
  },

  // Download file as blob
  downloadFile: async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) throw error;
    return data;
  },

  // Helper to generate organized file paths
  generateFilePath: {
    // For educational uploads
    educational: (metadata: {
      session: string;
      term: string;
      subjectCode: string;
      className: string;
      week: number;
      uploadType: string;
      fileName: string;
    }) => {
      const timestamp = Date.now();
      return `${metadata.session}/${metadata.term}/${metadata.subjectCode}/${metadata.className}/week-${metadata.week}/${metadata.uploadType}/${timestamp}-${metadata.fileName}`;
    },

    // For user avatars
    avatar: (userId: string, fileExtension: string) => {
      return `${userId}/avatar.${fileExtension}`;
    },

    // For reports and documents
    document: (type: string, fileName: string, userId?: string) => {
      const timestamp = Date.now();
      const folder = userId ? `${type}/${userId}` : type;
      return `${folder}/${timestamp}-${fileName}`;
    },

    // For result documents
    result: (session: string, term: string, classId: string, fileName: string) => {
      const timestamp = Date.now();
      return `results/${session}/${term}/${classId}/${timestamp}-${fileName}`;
    }
  },

  // Validate file before upload
  validateFile: (file: File, options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  }) => {
    const errors: string[] = [];

    // Check file size (default 50MB)
    const maxSize = options.maxSize || 50 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
    }

    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Check file extension
    if (options.allowedExtensions) {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!options.allowedExtensions.includes(extension)) {
        errors.push(`File extension ${extension} is not allowed`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// File type configurations for different upload types
export const FILE_CONFIGS = {
  EDUCATIONAL_MATERIALS: {
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'video/mp4'
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.mp4'],
    maxSize: 100 * 1024 * 1024 // 100MB
  },

  AVATARS: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxSize: 5 * 1024 * 1024 // 5MB
  },

  DOCUMENTS: {
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    maxSize: 50 * 1024 * 1024 // 50MB
  }
};

export default storage;