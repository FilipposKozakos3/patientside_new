import React, { useState } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Loader2, UserCircle } from 'lucide-react';
import patientLogo from '../assets/patient_logo.png';

// Define the expected role types for type safety
type UserRole = 'patient' | 'provider';

interface AuthProps {
  role: UserRole; // The role passed from App.tsx (determines the flow)
  onAuthenticated: (userData: { email: string; role: UserRole; name: string }) => void;
}

export const Auth: React.FC<AuthProps> = ({ role, onAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPatient = role === 'patient';
  const roleText = isPatient ? 'Patient' : 'Provider';

  // --- Sign-Up Logic (Sets the Role) ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !name) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);

      // 1. Create the user in Supabase auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const user = authData.user;
      if (!user) {
        setError('Sign up failed. Please try again.');
        return;
      }

      // 2. Insert the profile into the public.profiles table with the correct role
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        full_name: name,
        role: role, // 👈 USING THE ROLE PROP HERE
      });

      if (profileError) {
        // Log the profile error and sign out the user created in step 1 if the profile failed
        console.error("Profile creation failed, signing out user:", profileError);
        await supabase.auth.signOut();
        setError('Failed to create user profile. Please try again.');
        return;
      }
      
      // 3. Success
      onAuthenticated({ email: user.email!, role, name });

    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred during sign up.');
    } finally {
      setLoading(false);
    }
  };

  // --- Log-In Logic (Verifies the Role) ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);

      // 1. Attempt standard Supabase login
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }
      
      const user = authData.user;
      if (!user) return; // Should not happen if signIn was successful

      // 2. Fetch the user's profile and stored role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        // If profile is missing
        setError("User profile not found. Please contact support.");
        await supabase.auth.signOut();
        return;
      }
      
      // 3. Verify the selected role matches the stored role
      if (profileData.role !== role) {
        const actualRoleText = profileData.role === 'patient' ? 'Patient' : 'Provider';

        setError(
          `Your account is registered as a ${actualRoleText}. Please log in using the ${actualRoleText} entry point.`
        );
        
        // Crucial: Log them out immediately if the role doesn't match
        await supabase.auth.signOut(); 
        return;
      }

      // 4. Successful login and role verification
      onAuthenticated({
        email: user.email!,
        role: profileData.role as UserRole,
        name: profileData.full_name,
      });

    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F3F7FF' }}>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <img 
            src={patientLogo} 
            alt="PatientSide logo" 
            className="h-10 w-auto mb-4 mx-auto" 
          />
          <CardTitle className="text-2xl text-center">
            {isLogin ? `Log In as ${roleText}` : `Sign Up as ${roleText}`}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin 
              ? `Access your ${roleText} portal.` 
              : `Create your secure ${roleText} account.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <UserCircle className="h-4 w-4" />
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required={!isLogin}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                isLogin ? 'Log In' : 'Sign Up'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <Button 
              variant="link" 
              onClick={() => {
                setIsLogin(!isLogin);
                setError(''); // Clear error on switch
              }}
              className="p-0 h-auto"
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};