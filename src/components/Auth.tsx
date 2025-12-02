import React, { useState } from 'react';
import { supabase } from '../supabase/supabaseClient'; // Corrected path
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Loader2, UserCircle, ArrowLeft } from 'lucide-react';
import patientLogo from '../assets/patient_logo.png'; // Assuming you have this logo

// Define the expected role types with capitalized casing, matching your database ENUM
type UserRole = 'patient' | 'provider';

interface AuthProps {
  role: UserRole; // The role passed from App.tsx (determines the flow)
  onAuthenticated: (userData: { email: string; role: UserRole; name: string }) => void;
  onGoBack: () => void; // New prop for back navigation
}

export const Auth: React.FC<AuthProps> = ({ role, onAuthenticated, onGoBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPatient = role === 'patient';
  const roleText = role;

  // --- Sign-Up Logic (Sets the Role) ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        // 1. Authenticate the user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            // Include user_metadata if needed, e.g., { data: { full_name: name } }
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        // --- NEW CRITICAL CHECK ---
        // Get the user ID from the response data, which is most reliable.
        const user = authData.user;
        
        if (!user) {
            // This happens when email confirmation is enabled. User created but no active session.
            setError("Sign up successful! Please check your email to confirm your account and log in.");
            setLoading(false);
            return;
        }

        const userId = user.id;
        const userEmail = user.email;

        // 2. Insert profile data using the new user's ID
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                {
                    id: userId, // Must be correct
                    full_name: name,
                    email: userEmail,
                    role: role, // 'patient' or 'provider'
                },
            ]);

        if (profileError) {
            console.error("Profile creation failed, signing out user:", profileError);
            // This is still the RLS error. Sign out the half-registered user.
            await supabase.auth.signOut();
            setError("Sign up failed (Profile Error). Please try again later.");
        } else {
            // Success
            onAuthenticated({ email: userEmail!, role: role, name: name });
        }

    } catch (err) {
        setError("An unexpected error occurred.");
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
      if (!user) return; 

      // 2. Fetch the user's profile and stored role (Requires RLS SELECT Policy on profiles)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        setError("User profile not found. Please contact support.");
        await supabase.auth.signOut(); 
        return;
      }
      
      // 3. Verify the selected role (prop) matches the stored role (database)
      if (profileData.role !== role) {
        const actualRoleText = profileData.role; 
        
        // This is the error message that was triggering when the case didn't match.
        setError(
          `Your account is registered as a ${actualRoleText}. Please log in using the ${actualRoleText} entry point.`
        );
        
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
      
      {/* --- Back Button --- */}
      <Button
        variant="ghost"
        onClick={onGoBack} // Calls the function passed from App.tsx
        className="absolute top-4 left-4 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="mr-2 h-5 w-5" />
        Back to Role Selection
      </Button>
      {/* ------------------- */}

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