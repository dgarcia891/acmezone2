-- Create trigger to automatically create AZ profiles for new users
CREATE OR REPLACE TRIGGER on_auth_user_created_az
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.az_handle_new_user();