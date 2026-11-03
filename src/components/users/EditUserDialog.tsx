import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  CheckCircle,
  AlertTriangle,
  Send,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  college_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_default_admin: boolean;
  staff_id: string | null;
  register_number: string | null;
  role?: string;
}

interface Department {
  id: string;
  name: string;
}

interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  departments: Department[];
  onSuccess: () => void;
}

export function EditUserDialog({
  isOpen,
  onClose,
  user,
  departments,
  onSuccess,
}: EditUserDialogProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [role, setRole] = useState("student");
  const [departmentId, setDepartmentId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Load user data when dialog opens
  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
      setCollegeName(user.college_name || "");
      setStaffId(user.staff_id || "");
      setRegisterNumber(user.register_number || "");
      setRole(user.role || "student");
      setIsActive(user.is_active);
      setIsVerified(user.is_verified);
      
      // Fetch user department
      fetchUserDepartment(user.id);
    }
  }, [user, isOpen]);

  const fetchUserDepartment = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_departments")
        .select("department_id")
        .eq("user_id", userId)
        .limit(1);

      if (data && data.length > 0) {
        setDepartmentId(data[0].department_id);
      }
    } catch (error) {
      console.error("Error fetching user department:", error);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          college_name: collegeName.trim() || null,
          staff_id: staffId.trim() || null,
          register_number: registerNumber.trim() || null,
          is_active: isActive,
          is_verified: isVerified,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update role if changed
      if (role !== user.role) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: role as "admin" | "staff" | "student" | "technician" })
          .eq("user_id", user.id);

        if (roleError) throw roleError;
      }

      // Update or upsert department in user_departments
      if (departmentId) {
        const { data: existingDept } = await supabase
          .from("user_departments")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (existingDept && existingDept.length > 0) {
          const { error: deptError } = await supabase
            .from("user_departments")
            .update({ department_id: departmentId })
            .eq("user_id", user.id);

          if (deptError) throw deptError;
        } else {
          const { error: deptError } = await supabase
            .from("user_departments")
            .insert({
              user_id: user.id,
              department_id: departmentId,
            });

          if (deptError) throw deptError;
        }
      } else {
        // If department was unassigned/cleared, remove assignment
        const { error: deptDeleteError } = await supabase
          .from("user_departments")
          .delete()
          .eq("user_id", user.id);

        if (deptDeleteError) throw deptDeleteError;
      }

      // Send welcome email if user was just activated
      const wasActivated = isActive && isVerified && (!user.is_active || !user.is_verified);
      if (wasActivated) {
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              type: role === "student" ? "welcome_student" : "welcome_staff",
              to: user.email,
              name: fullName,
              email: user.email,
              role: role.charAt(0).toUpperCase() + role.slice(1),
            },
          });
        } catch (emailError) {
          console.log("Welcome email skipped (may require domain verification)");
        }
      }

      toast.success("User updated successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendConfirmationEmail = async () => {
    if (!user) return;

    setIsSendingEmail(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          type: "confirmation",
          to: user.email,
          name: fullName,
          confirmationLink: `${window.location.origin}/auth?confirm=true&email=${encodeURIComponent(user.email)}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Confirmation email sent!");
      } else {
        // Show helpful message about Resend API limitation
        toast.error("Email service requires domain verification. Please manually activate the user instead.");
      }
    } catch (error: any) {
      console.error("Email error:", error);
      toast.error("Email failed. Use manual activation instead.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleActivateUser = () => {
    setIsActive(true);
    setIsVerified(true);
    toast.info("Account marked as active. Click Save to confirm.");
  };

  // Don't render anything if user is null
  if (!user) {
    return null;
  }

  const isStudent = role === "student";
  const showConfirmationSection = !isVerified && isStudent;
  const willBeActivated = isActive && isVerified && (!user.is_active || !user.is_verified);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Edit User: {user.full_name}
          </DialogTitle>
          <DialogDescription>
            Edit user details, role, and status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Confirmation Status Alert */}
          {showConfirmationSection && (
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-warning">Student Not Confirmed</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This student has not verified their email.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSendConfirmationEmail}
                      disabled={isSendingEmail}
                      className="text-warning border-warning hover:bg-warning/10"
                    >
                      {isSendingEmail ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Confirmation Email
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleActivateUser}
                      className="bg-success hover:bg-success/90"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activate Manually
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Will Be Activated Alert */}
          {willBeActivated && (
            <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-success">Account Will Be Activated</p>
                  <p className="text-sm text-muted-foreground">
                    Click Save to activate this account.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name *
              </Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email (read-only)
              </Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="college" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                College
              </Label>
              <Input
                id="college"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="College name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff_id">Staff ID</Label>
              <Input
                id="staff_id"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="STF001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register_number">Register No.</Label>
              <Input
                id="register_number"
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value)}
                placeholder="21CS001"
              />
            </div>
          </div>

          {/* Role & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role
              </Label>
              <Select
                value={role}
                onValueChange={setRole}
                disabled={user.is_default_admin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Department
              </Label>
              <Select
                value={departmentId}
                onValueChange={setDepartmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status Toggles */}
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label>Account Active</Label>
                <p className="text-xs text-muted-foreground">
                  Active accounts can log in
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={user.is_default_admin}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Email Verified</Label>
                <p className="text-xs text-muted-foreground">
                  Verified accounts have confirmed email
                </p>
              </div>
              <Switch
                checked={isVerified}
                onCheckedChange={setIsVerified}
                disabled={user.is_default_admin}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
