-- Reset password for test account dgarcia89@gmail.com to "test123"
UPDATE auth.users 
SET encrypted_password = crypt('test123', gen_salt('bf'))
WHERE email = 'dgarcia89@gmail.com';