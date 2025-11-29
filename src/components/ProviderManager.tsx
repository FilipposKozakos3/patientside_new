import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Plus, UserCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';

interface Provider {
  id: string;
  name: string;
  specialty: string;
  dateAdded: string;
}

const PROVIDERS_KEY = 'patient_providers';

export function ProviderManager() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: '',
    specialty: ''
  });

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = () => {
    try {
      const data = localStorage.getItem(PROVIDERS_KEY);
      if (data) {
        const parsedProviders = JSON.parse(data);
        setProviders(parsedProviders);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const handleAddProvider = () => {
    if (!newProvider.name.trim() || !newProvider.specialty.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const provider: Provider = {
      id: `provider-${Date.now()}`,
      name: newProvider.name,
      specialty: newProvider.specialty,
      dateAdded: new Date().toISOString()
    };

    const updatedProviders = [...providers, provider];
    localStorage.setItem(PROVIDERS_KEY, JSON.stringify(updatedProviders));
    setProviders(updatedProviders);
    setNewProvider({ name: '', specialty: '' });
    setIsDialogOpen(false);
    toast.success(`${provider.name} added successfully`);
  };

  const handleRemoveProvider = (id: string) => {
    const updatedProviders = providers.filter(p => p.id !== id);
    localStorage.setItem(PROVIDERS_KEY, JSON.stringify(updatedProviders));
    setProviders(updatedProviders);
    toast.success('Provider removed');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Manage Healthcare Providers
            </CardTitle>
            <CardDescription className="mt-1">
              Add and manage your healthcare provider network for easy record sharing
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 justify-center"
              >
                <Plus className="w-4 h-4" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Healthcare Provider</DialogTitle>
                <DialogDescription>
                  Add a new provider to your network
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="provider-name" className="text-sm font-medium">
                    Provider Name <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="provider-name"
                    placeholder="Dr. John Smith"
                    value={newProvider.name}
                    onChange={(e) =>
                      setNewProvider({ ...newProvider, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialty" className="text-sm font-medium">
                    Specialty <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="specialty"
                    placeholder="Cardiology"
                    value={newProvider.specialty}
                    onChange={(e) =>
                      setNewProvider({ ...newProvider, specialty: e.target.value })
                    }
                  />
                </div>
                <Button
                  onClick={handleAddProvider}
                  variant="outline"
                  className="w-full gap-2 justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Add Provider
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {providers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <UserCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No providers added yet</p>
            <p className="text-xs mt-2 text-gray-400">
              Click the &quot;Add Provider&quot; button to add your first provider
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12 bg-blue-500">
                    <AvatarFallback className="bg-blue-500 text-white font-medium">
                      {getInitials(provider.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {provider.name}
                    </h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {provider.specialty}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProvider(provider.id)}
                      className="mt-2 h-auto py-1 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
