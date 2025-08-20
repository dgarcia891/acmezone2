-- Fix security definer view issue by removing the view and keeping only the function
-- The view may be causing the security definer detection issue

DROP VIEW IF EXISTS public.pa_credit_balance;

-- Keep only the function which properly uses SECURITY DEFINER
-- This function is secure because it only returns data for the authenticated user