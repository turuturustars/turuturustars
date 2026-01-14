-- First migration: Add new roles to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'vice_chairman';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'vice_secretary';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'organizing_secretary';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'committee_member';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'patron';