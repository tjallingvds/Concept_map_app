import { useState, useEffect, useRef } from "react"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { useAuth } from "../contexts/auth-context"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "../components/ui/card"
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "../components/ui/avatar"
import { Separator } from "../components/ui/separator"
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "../components/ui/form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Camera, Upload, Map, Share2, Edit, Download } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"
import { MapItem } from "../components/file-system"
import {useConceptMapsApi} from "../services/concept_map_api.ts";
import {useUserApi} from "../services/userApi.ts";

// Form validation schema
const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false)
  const [avatarSrc, setAvatarSrc] = useState<string>("/avatars/default.jpg")
  const [tempAvatarSrc, setTempAvatarSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userMaps, setUserMaps] = useState<MapItem[]>([])
  const [loadingMaps, setLoadingMaps] = useState(true)
  const [mapsError, setMapsError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { getSavedMaps } = useConceptMapsApi();
  const {updateUserProfile} = useUserApi();


  // Fetch user's saved maps
  useEffect(() => {
    const fetchUserMaps = async () => {
      if (!user) return;
      
      try {
        setLoadingMaps(true);
        const maps = await getSavedMaps();
        setUserMaps(maps);
      } catch (error) {
        console.error("Error fetching user maps:", error);
        setMapsError("Failed to load your saved maps");
      } finally {
        setLoadingMaps(false);
      }
    };
    
    fetchUserMaps();
  }, [user]);
  
  // Form setup
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.displayName || "",
      email: user?.email || "",
      bio: user?.bio || "",
    },
  })
  
  // Update form values when user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.displayName || "",
        email: user.email || "",
        bio: user.bio || "",
      });
      
      // If user has avatar, use it
      if (user.avatarUrl) {
        setAvatarSrc(user.avatarUrl);
      }
    }
  }, [user, form]);
  
  // Save profile changes
  function base64ToFile(base64: string, filename = 'avatar.png') {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }
  const onSubmit = async (data: ProfileFormValues) => {
    try {
      // Prepare update data
      const updateData = {
        name: data.name,
        bio: data.bio,
        avatar: base64ToFile(tempAvatarSrc) || undefined,
      };

      const updatedUser = await updateUserProfile(updateData);

      // Update the user in the auth context
      updateUser(updatedUser);

      // Update the avatar source if a new one was selected
      if (tempAvatarSrc) {
        setAvatarSrc(tempAvatarSrc);
        setTempAvatarSrc(null);
      }

      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update profile");
      console.error("Profile update error:", error);
    }
  };
  
  // Handle avatar click to trigger file input
  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
      // Check if file is too large (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      
      // Create temporary URL for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setTempAvatarSrc(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col w-full overflow-hidden bg-background">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm font-medium">Profile</span>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6">
                <div className="relative">
                  <Avatar 
                    className={`h-24 w-24 ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`}
                    onClick={handleAvatarClick}
                  >
                    <AvatarImage 
                      src={tempAvatarSrc || avatarSrc} 
                      alt={user?.displayName || "User"} 
                    />
                    <AvatarFallback className="text-2xl">
                      {user?.email?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  {isEditing && (
                    <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
                
                <div className="space-y-2 text-center sm:text-left">
                  <h1 className="text-2xl font-bold">{user?.displayName || user?.email?.split('@')[0] || "User"}</h1>
                  <p className="text-muted-foreground">{user?.email}</p>
                  {!isEditing && (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Profile Information */}
              {isEditing ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Edit Profile</CardTitle>
                    <CardDescription>
                      Update your personal information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="Your email address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <textarea 
                                  className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  placeholder="Tell us about yourself" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Brief description about yourself (optional)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="font-medium text-sm">Name</h3>
                        <p>{user?.displayName || user?.email?.split('@')[0] || "User"}</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">Email</h3>
                        <p>{user?.email || "No email provided"}</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">Bio</h3>
                        <p className="text-muted-foreground">{user?.bio || "No bio provided"}</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                          <h3 className="text-xl font-bold">0</h3>
                          <p className="text-sm text-muted-foreground">Concept Maps</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                          <h3 className="text-xl font-bold">{userMaps.filter(map => map.isPublic).length}</h3>
                          <p className="text-sm text-muted-foreground">Public Maps</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                          <h3 className="text-xl font-bold">0</h3>
                          <p className="text-sm text-muted-foreground">Saved Maps</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}