import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Heart, CheckCircle } from 'lucide-react';

import { supabase } from '../supabase/supabaseClient';

interface AuthProps {
  role: string; // coming from App.tsx
  onAuthenticated: (userData: { email: string; role: string; name: string }) => void;
}

export function Auth({ role, onAuthenticated }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      const user = data.user;
      if (!user) {
        setError('Login failed. Please try again.');
        return;
      }

      // Get profile name if available
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error(profileError);
      }

      const finalName = profile?.full_name || name || email.split('@')[0];

      setName(finalName);
      localStorage.setItem('lastEmail', email);

      onAuthenticated({
        email,
        role,
        name: finalName,
      });
    } catch (err) {
      console.error(err);
      setError('Unexpected error during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const user = data.user;
      if (!user) {
        setError('Sign up failed. Please try again.');
        return;
      }

      // Create / update profile row
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: name,
      });

      if (profileError) {
        console.error(profileError);
      }

      localStorage.setItem('lastEmail', email);

      onAuthenticated({
        email,
        role,
        name,
      });
    } catch (err) {
      console.error(err);
      setError('Unexpected error during sign up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#F3F7FF' }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Heart className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle>Patient Health Records</CardTitle>
          <CardDescription>
            Secure, Offline, FHIR-Compliant Personal Storage
          </CardDescription>
          <div className="mt-2 text-xs text-muted-foreground">
            Logging in as{' '}
            <span className="font-semibold capitalize">{role}</span>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Logging in…' : 'Login'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account…' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 space-y-2">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                <strong>Privacy First:</strong> All data stored locally on your device
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
