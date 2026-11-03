import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Save,
  Loader2,
  Sliders,
  Database,
  CheckCircle,
  Upload,
  Camera,
  Globe,
} from "lucide-react";
import { SSODomainSettings } from "@/components/settings/SSODomainSettings";
import { TallySettings } from "@/components/settings/TallySettings";

interface UserSettings {
  email_notifications: boolean;
  request_alerts: boolean;
  maintenance_alerts: boolean;
  low_stock_alerts: boolean;
  theme: string;
}

interface SystemSettings {
  default_borrow_duration_days: string;
  low_stock_threshold: string;
  system_name: string;
  allow_student_requests: string;
}

export default function Settings() {
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSavingSystem, setIsSavingSystem] = useState(false);

  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
  });

  const [userSettings, setUserSettings] = useState<UserSettings>({
    email_notifications: true,
    request_alerts: true,
    maintenance_alerts: true,
    low_stock_alerts: true,
    theme: "system",
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    default_borrow_duration_days: "7",
    low_stock_threshold: "5",
    system_name: "LabLink",
    allow_student_requests: "true",
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const isAdmin = userRole === "admin";

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserSettings();
      if (isAdmin) {
        fetchSystemSettings();
      }
    }
  }, [user, isAdmin]);

  const fetchProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      // Fetch user's department from user_departments and departments
      let departmentDisplayName = "";
      try {
        const { data: userDeptData } = await supabase
          .from("user_departments")
          .select("department_id")
          .eq("user_id", user.id)
          .limit(1);

        if (userDeptData && userDeptData.length > 0) {
          const deptId = userDeptData[0].department_id;
          const { data: dept } = await supabase
            .from("departments")
            .select("name, code")
            .eq("id", deptId)
            .single();

          if (dept) {
            departmentDisplayName = dept.code ? `${dept.name} (${dept.code})` : dept.name;
          }
        }
      } catch (err) {
        console.error("Failed to fetch department in Settings:", err);
      }

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: user.email || "",
          phone: data.phone || "",
          department: departmentDisplayName,
        });
      }
    } catch (error: any) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserSettings = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setUserSettings({
          email_notifications: data.email_notifications ?? true,
          request_alerts: data.request_alerts ?? true,
          maintenance_alerts: data.maintenance_alerts ?? true,
          low_stock_alerts: data.low_stock_alerts ?? true,
          theme: data.theme || "system",
        });
      }
    } catch (error) {
      console.error("Failed to fetch user settings:", error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value");

      if (!error && data) {
        const settings: Record<string, string> = {};
        data.forEach((s: { key: string; value: string }) => {
          settings[s.key] = s.value;
        });
        setSystemSettings({
          default_borrow_duration_days:
            settings.default_borrow_duration_days || "7",
          low_stock_threshold: settings.low_stock_threshold || "5",
          system_name: settings.system_name || "LabLink",
          allow_student_requests: settings.allow_student_requests || "true",
        });
      }
    } catch (error) {
      console.error("Failed to fetch system settings:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast({ title: "Success", description: "Profile updated successfully" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setIsSavingNotifications(true);
    try {
      const { error } = await supabase.from("user_settings").upsert({
        id: user.id,
        ...userSettings,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast({
        title: "Success",
        description: "Notification preferences saved",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save preferences",
      });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleSaveSystemSettings = async () => {
    if (!user || !isAdmin) return;
    setIsSavingSystem(true);
    try {
      const updates = Object.entries(systemSettings).map(([key, value]) => ({
        key,
        value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .update({
            value: update.value,
            updated_by: update.updated_by,
            updated_at: update.updated_at,
          })
          .eq("key", update.key);
        if (error) throw error;
      }

      toast({ title: "Success", description: "System settings updated" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update system settings",
      });
    } finally {
      setIsSavingSystem(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "New passwords do not match",
      });
      return;
    }

    if (passwords.new.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 6 characters",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Password updated successfully" });
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update password",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="Settings"
      subtitle="Manage your account and preferences"
    >
      <div className="max-w-4xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="system" className="gap-2">
                  <Sliders className="h-4 w-4" />
                  <span className="hidden sm:inline">System</span>
                </TabsTrigger>
                <TabsTrigger value="sso" className="gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">SSO</span>
                </TabsTrigger>
                <TabsTrigger value="tally" className="gap-2">
                  <Database className="h-4 w-4" />
                  <span className="hidden sm:inline">TallyPrime</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {profile.full_name?.charAt(0)?.toUpperCase() ||
                        user?.email?.charAt(0)?.toUpperCase() ||
                        "U"}
                    </div>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {profile.full_name || "Your Name"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {profile.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="capitalize">
                        {userRole}
                      </Badge>
                      {profile.department && (
                        <Badge variant="secondary">
                          {profile.department}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profile.full_name}
                      onChange={(e) =>
                        setProfile({ ...profile, full_name: e.target.value })
                      }
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile({ ...profile, phone: e.target.value })
                      }
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={profile.department || "No department assigned"}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Department is managed by administrators
                    </p>
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Configure how you receive notifications. Changes are saved to
                  your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={userSettings.email_notifications}
                    onCheckedChange={(checked) =>
                      setUserSettings({
                        ...userSettings,
                        email_notifications: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Request Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified about borrow requests
                    </p>
                  </div>
                  <Switch
                    checked={userSettings.request_alerts}
                    onCheckedChange={(checked) =>
                      setUserSettings({
                        ...userSettings,
                        request_alerts: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Maintenance Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified about maintenance updates
                    </p>
                  </div>
                  <Switch
                    checked={userSettings.maintenance_alerts}
                    onCheckedChange={(checked) =>
                      setUserSettings({
                        ...userSettings,
                        maintenance_alerts: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Low Stock Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when items are running low
                    </p>
                  </div>
                  <Switch
                    checked={userSettings.low_stock_alerts}
                    onCheckedChange={(checked) =>
                      setUserSettings({
                        ...userSettings,
                        low_stock_alerts: checked,
                      })
                    }
                  />
                </div>

                <Button
                  onClick={handleSaveNotifications}
                  disabled={isSavingNotifications}
                >
                  {isSavingNotifications ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your password and security preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwords.new}
                      onChange={(e) =>
                        setPasswords({ ...passwords, new: e.target.value })
                      }
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) =>
                        setPasswords({ ...passwords, confirm: e.target.value })
                      }
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={isSaving || !passwords.new}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="system">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    System Settings
                    <Badge className="ml-2">Admin Only</Badge>
                  </CardTitle>
                  <CardDescription>
                    Configure global system settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="systemName">System Name</Label>
                      <Input
                        id="systemName"
                        value={systemSettings.system_name}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            system_name: e.target.value,
                          })
                        }
                        placeholder="LabLink"
                      />
                      <p className="text-xs text-muted-foreground">
                        Display name for the system
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="borrowDuration">
                        Default Borrow Duration (days)
                      </Label>
                      <Input
                        id="borrowDuration"
                        type="number"
                        min="1"
                        max="90"
                        value={systemSettings.default_borrow_duration_days}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            default_borrow_duration_days: e.target.value,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Default duration for borrow requests
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="lowStock">Low Stock Threshold</Label>
                      <Input
                        id="lowStock"
                        type="number"
                        min="1"
                        max="100"
                        value={systemSettings.low_stock_threshold}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            low_stock_threshold: e.target.value,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Alert when items fall below this count
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Allow Student Requests</Label>
                      <div className="flex items-center gap-4 pt-2">
                        <Switch
                          checked={
                            systemSettings.allow_student_requests === "true"
                          }
                          onCheckedChange={(checked) =>
                            setSystemSettings({
                              ...systemSettings,
                              allow_student_requests: checked
                                ? "true"
                                : "false",
                            })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {systemSettings.allow_student_requests === "true"
                            ? "Enabled"
                            : "Disabled"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Allow students to create borrow requests
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    onClick={handleSaveSystemSettings}
                    disabled={isSavingSystem}
                  >
                    {isSavingSystem ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save System Settings
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* SSO Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="sso">
              <SSODomainSettings />
            </TabsContent>
          )}

          {/* TallyPrime Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="tally">
              <TallySettings />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
