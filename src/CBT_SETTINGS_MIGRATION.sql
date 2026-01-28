-- ========================================
-- CBT SETTINGS TABLE MIGRATION
-- Adds missing columns to cbt_settings
-- ========================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add allow_calculator column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cbt_settings' AND column_name = 'allow_calculator') THEN
        ALTER TABLE cbt_settings ADD COLUMN allow_calculator BOOLEAN DEFAULT false;
    END IF;
    
    -- Add disable_right_click column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cbt_settings' AND column_name = 'disable_right_click') THEN
        ALTER TABLE cbt_settings ADD COLUMN disable_right_click BOOLEAN DEFAULT true;
    END IF;
    
    -- Add randomize_questions column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cbt_settings' AND column_name = 'randomize_questions') THEN
        ALTER TABLE cbt_settings ADD COLUMN randomize_questions BOOLEAN DEFAULT true;
    END IF;
    
    -- Add randomize_options column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cbt_settings' AND column_name = 'randomize_options') THEN
        ALTER TABLE cbt_settings ADD COLUMN randomize_options BOOLEAN DEFAULT true;
    END IF;
    
    -- Add show_results_after column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cbt_settings' AND column_name = 'show_results_after') THEN
        ALTER TABLE cbt_settings ADD COLUMN show_results_after BOOLEAN DEFAULT true;
    END IF;
    
    -- Add time_limit_per_question column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cbt_settings' AND column_name = 'time_limit_per_question') THEN
        ALTER TABLE cbt_settings ADD COLUMN time_limit_per_question INTEGER DEFAULT 0;
    END IF;
    
    -- Add allow_test_review column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cbt_settings' AND column_name = 'allow_test_review') THEN
        ALTER TABLE cbt_settings ADD COLUMN allow_test_review BOOLEAN DEFAULT true;
    END IF;
    
    -- Add notify_teacher_on_completion column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cbt_settings' AND column_name = 'notify_teacher_on_completion') THEN
        ALTER TABLE cbt_settings ADD COLUMN notify_teacher_on_completion BOOLEAN DEFAULT true;
    END IF;
    
    -- Add show_correct_answers column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cbt_settings' AND column_name = 'show_correct_answers') THEN
        ALTER TABLE cbt_settings ADD COLUMN show_correct_answers BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Verify columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'cbt_settings'
ORDER BY ordinal_position;
