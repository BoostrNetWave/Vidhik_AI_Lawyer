import React, { useState, useRef, useEffect } from "react";
import { Camera, User, CreditCard, Save, Loader2, Award, BookOpen, MapPin, Globe, Briefcase, Star, Trash2, Plus } from "lucide-react";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../Components/ui/card";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { Badge } from "../Components/ui/badge";
import { Separator } from "../Components/ui/separator";
import { cn } from "../lib/utils";

interface ProfileFields {
  fullName: string;
  title: string;
  expertise: string;
  hourlyRate: string | number;
  bio: string;
  avatar?: string;
  practiceAreas: string[];
  languages: string[];
  workStatus: string;
  education: { degree: string; school: string; year: string }[];
  memberships: string[];
  location: string;
  experience: string;
  rating: number;
  reviews: number;
}

interface PaymentFields {
  bankName: string;
  accountNumber: string;
  ifsc: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"basic" | "professional" | "credentials" | "payouts">("basic");

  // Profile Info State
  const [profileFields, setProfileFields] = useState<ProfileFields>({
    fullName: user?.fullName || "",
    title: "",
    expertise: "",
    hourlyRate: "",
    bio: "",
    practiceAreas: [],
    languages: [],
    workStatus: "Available for Consultations",
    education: [],
    memberships: [],
    location: "",
    experience: "",
    rating: 0,
    reviews: 0
  });

  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  // Payment Info State
  const [paymentFields, setPaymentFields] = useState<PaymentFields>({
    bankName: "",
    accountNumber: "",
    ifsc: "",
  });

  const userId = user?.userId;

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const demoProfile = {
          fullName: user?.fullName || "Adv. Rajesh Kumar",
          title: "Corporate Law Expert",
          expertise: "Corporate Law",
          hourlyRate: 2500,
          bio: "Expert in Corporate Law with over 15 years of experience in handling complex mergers, acquisitions, and regulatory compliance. Have successfully represented Fortune 500 companies in high-stakes legal matters. Committed to providing strategic and results-driven legal counsel.",
          avatar: "/favicon.svg",
          practiceAreas: ["Mergers & Acquisitions", "Contract Negotiation", "Regulatory Compliance", "Intellectual Property Strategy", "Corporate Governance", "Risk Management"],
          languages: ["English", "Hindi", "Punjabi"],
          workStatus: "Available for Consultations",
          education: [
            { degree: "LL.M. in Corporate Law", school: "National Law School of India University", year: "2010" },
            { degree: "LL.B.", school: "Faculty of Law, University of Delhi", year: "2008" }
          ],
          memberships: ["Bar Council of Delhi", "Supreme Court Bar Association", "International Bar Association"],
          location: "New Delhi, India",
          experience: "15+ Years",
          rating: 4.9,
          reviews: 124
        };

        const demoPayment = {
          bankName: "National Bank",
          accountNumber: "****4582",
          ifsc: "NB0000123"
        };

        const [profileRes, paymentRes] = await Promise.all([
          api.get(`/profile/${userId}`).catch(() => ({ data: demoProfile })),
          api.get(`/payouts/${userId}`).catch(() => ({ data: demoPayment })),
        ]);

        if (profileRes.data) {
          setProfileFields({ ...demoProfile, ...profileRes.data });
          if (profileRes.data.avatar) {
            const avatarUrl = profileRes.data.avatar.startsWith('http')
              ? profileRes.data.avatar
              : `${api.defaults.baseURL?.replace('/api', '')}${profileRes.data.avatar}`;
            setAvatar(avatarUrl);
          } else {
            setAvatar("/favicon.svg");
          }
        }

        if (paymentRes.data) {
          setPaymentFields(paymentRes.data);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        error("Using pre-filled data for profile creation.");
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchData();
  }, [userId]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfileFields({ ...profileFields, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        error("Image is too large. (Max 2MB)");
        return;
      }
      setAvatarFile(file);
      setAvatar(URL.createObjectURL(file));
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      let avatarUrl = profileFields.avatar;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        formData.append('userId', userId || '');
        const uploadRes = await api.post('/profile/upload-avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        avatarUrl = uploadRes.data.avatarUrl;
      }

      const res = await api.put(`/profile/${userId}`, { ...profileFields, avatar: avatarUrl });
      setProfileFields(res.data);
      setAvatarFile(null);
      success("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      error("Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const savePayment = async () => {
    setSaving(true);
    try {
      const res = await api.post(`/payouts`, { ...paymentFields, userId });
      setPaymentFields(res.data);
      success("Payment information updated!");
    } catch (err) {
      console.error(err);
      error("Error saving payment details.");
    } finally {
      setSaving(false);
    }
  };

  const addEducation = () => {
    setProfileFields({
      ...profileFields,
      education: [...profileFields.education, { degree: "", school: "", year: "" }]
    });
  };

  const removeEducation = (index: number) => {
    const newEdu = [...profileFields.education];
    newEdu.splice(index, 1);
    setProfileFields({ ...profileFields, education: newEdu });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const NavItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all rounded-lg w-full text-left mb-1",
        activeTab === id 
            ? "bg-primary/10 text-primary/90 shadow-sm ring-1 ring-primary/30" 
            : "text-slate-600 hover:bg-slate-50 hover:text-primary"
      )}
    >
      <Icon className={cn("w-4 h-4", activeTab === id ? "text-primary" : "text-slate-400")} />
      {label}
    </button>
  );

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-slate-50/50">
      <header className="px-8 py-5 border-b bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Professional Profile</h1>
          <p className="text-xs text-slate-500 font-medium">Configure your public lawyer appearance and billing details</p>
        </div>
        <Button onClick={activeTab === 'payouts' ? savePayment : saveProfile} disabled={saving} className="bg-primary hover:bg-primary/90 shadow-primary/10 shadow-lg px-8">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </header>

      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
          {/* Sidebar Nav */}
          <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="p-6 text-center border-b bg-gradient-to-br from-primary/5 to-white">
                        <div className="relative inline-block group mx-auto mb-4">
                            <div className="w-20 h-20 rounded-full border-2 border-white shadow-md overflow-hidden bg-slate-100 ring-2 ring-primary/20">
                                {avatar ? (
                                    <img src={avatar} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <User className="w-full h-full p-4 text-slate-300" />
                                )}
                            </div>
                            <button 
                                onClick={() => avatarRef.current?.click()}
                                className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-transform hover:scale-110 border-2 border-white"
                            >
                                <Camera className="w-3.5 h-3.5" />
                            </button>
                            <input type="file" ref={avatarRef} className="hidden" onChange={handleAvatarChange} accept="image/*" />
                        </div>
                        <h2 className="font-bold text-slate-900 truncate">{profileFields.fullName || "Your Name"}</h2>
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-1">{profileFields.title || "Legal Professional"}</p>
                    </div>
                    <nav className="p-3">
                        <NavItem id="basic" label="Personal Details" icon={User} />
                        <NavItem id="professional" label="Expertise & Areas" icon={Briefcase} />
                        <NavItem id="credentials" label="Education & Credits" icon={Award} />
                        <NavItem id="payouts" label="Payout Settings" icon={CreditCard} />
                    </nav>
                </CardContent>
            </Card>

            <Card className="bg-primary border-none text-white overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-bold">Public Rating</span>
                    </div>
                    <div className="text-3xl font-extrabold mb-1">{profileFields.rating || "0.0"}</div>
                    <p className="text-primary-foreground/70 text-[10px] font-bold uppercase tracking-widest">Based on {profileFields.reviews || 0} client reviews</p>
                </CardContent>
            </Card>
          </aside>

          {/* Form Content */}
          <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {activeTab === "basic" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Setup your core profile details for client search results.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input id="fullName" name="fullName" value={profileFields.fullName} onChange={handleProfileChange} placeholder="Adv. Rajesh Kumar" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title">Professional Title</Label>
                                <Input id="title" name="title" value={profileFields.title} onChange={handleProfileChange} placeholder="Senior Corporate Advocate" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="location">Base Location</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input id="location" name="location" className="pl-10" value={profileFields.location} onChange={handleProfileChange} placeholder="New Delhi, India" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="workStatus">Availability Status</Label>
                                <Input id="workStatus" name="workStatus" value={profileFields.workStatus} onChange={handleProfileChange} placeholder="Available for Consultations" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bio">Professional Statement</Label>
                            <textarea 
                                id="bio" 
                                name="bio" 
                                value={profileFields.bio} 
                                onChange={handleProfileChange} 
                                rows={5}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] resize-none"
                                placeholder="Describe your legal journey and core value proposition..."
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === "professional" && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Core Expertise & Practices</CardTitle>
                            <CardDescription>Select the specializations you want to be ranked for.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="expertise">Primary Field</Label>
                                    <Input id="expertise" name="expertise" value={profileFields.expertise} onChange={handleProfileChange} placeholder="e.g. Criminal Law" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="experience">Years of Experience</Label>
                                    <Input id="experience" name="experience" value={profileFields.experience} onChange={handleProfileChange} placeholder="e.g. 15+ Years" />
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <Label>Specific Practice Areas (Comma separated)</Label>
                                <Input 
                                    value={profileFields.practiceAreas.join(", ")} 
                                    onChange={(e) => setProfileFields({ ...profileFields, practiceAreas: e.target.value.split(",").map(a => a.trim()) })}
                                    placeholder="Mergers & Acquisitions, Risk Management, etc."
                                />
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {profileFields.practiceAreas.map((area, i) => area && (
                                        <Badge key={i} variant="secondary" className="px-2 py-1 bg-primary/10 text-primary/90 border-primary/20 uppercase text-[10px] font-black tracking-wider">
                                            {area}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Billing & Engagement</CardTitle>
                            <CardDescription>Manage how much you charge for virtual consultations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="hourlyRate">Consultation Fee (₹ per session)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                                        <Input id="hourlyRate" name="hourlyRate" type="number" className="pl-8" value={profileFields.hourlyRate} onChange={handleProfileChange} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Languages Spoken</Label>
                                    <Input 
                                        value={profileFields.languages.join(", ")} 
                                        onChange={(e) => setProfileFields({ ...profileFields, languages: e.target.value.split(",").map(l => l.trim()) })}
                                        placeholder="English, Hindi, etc."
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === "credentials" && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
                            <div>
                                <CardTitle>Academic Credentials</CardTitle>
                                <CardDescription>Your educational background verifies your expertise.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={addEducation} className="gap-2">
                                <Plus className="w-4 h-4" /> Add Degree
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            {profileFields.education.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No education records added yet.</p>
                                </div>
                            )}
                            {profileFields.education.map((edu, idx) => (
                                <div key={idx} className="p-4 rounded-xl border bg-slate-50/30 space-y-4 relative group">
                                    <button 
                                        onClick={() => removeEducation(idx)}
                                        className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase text-slate-400">Degree / Qualification</Label>
                                            <Input 
                                                value={edu.degree} 
                                                onChange={(e) => {
                                                    const newE = [...profileFields.education];
                                                    newE[idx].degree = e.target.value;
                                                    setProfileFields({ ...profileFields, education: newE });
                                                }}
                                                className="bg-white"
                                                placeholder="e.g. LL.M in Criminal Law"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase text-slate-400">Institution / University</Label>
                                            <Input 
                                                value={edu.school} 
                                                onChange={(e) => {
                                                    const newE = [...profileFields.education];
                                                    newE[idx].school = e.target.value;
                                                    setProfileFields({ ...profileFields, education: newE });
                                                }}
                                                className="bg-white"
                                                placeholder="e.g. Harvard Law School"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase text-slate-400">Year</Label>
                                            <Input 
                                                value={edu.year} 
                                                onChange={(e) => {
                                                    const newE = [...profileFields.education];
                                                    newE[idx].year = e.target.value;
                                                    setProfileFields({ ...profileFields, education: newE });
                                                }}
                                                className="bg-white"
                                                placeholder="2015"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Professional Memberships</CardTitle>
                            <CardDescription>Verified associations and bar council registrations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Label>Bar Councils & Organizations (Comma separated)</Label>
                            <Input 
                                value={profileFields.memberships.join(", ")} 
                                onChange={(e) => setProfileFields({ ...profileFields, memberships: e.target.value.split(",").map(m => m.trim()) })}
                                placeholder="Supreme Court Bar Association, Delhi High Court Bar..."
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                                {profileFields.memberships.map((m, i) => m && (
                                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-bold">
                                        <Globe className="w-3 h-3" />
                                        {m}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === "payouts" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Bank Account Configuration</CardTitle>
                        <CardDescription>Your monthly earnings will be deposited into this account.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-4 mb-2">
                            <div className="p-2 bg-primary rounded-lg">
                                <CreditCard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-primary">Highly Secure Payouts</h4>
                                <p className="text-xs text-primary/90 mt-1 leading-relaxed">Financial data is encrypted and handled via secure banking protocols. Payouts are settlements for virtual consulting sessions.</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="bankName">Verified Bank Name</Label>
                                <Input id="bankName" name="bankName" value={paymentFields.bankName} onChange={(e) => setPaymentFields({ ...paymentFields, [e.target.name]: e.target.value })} placeholder="e.g. HDFC Bank" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="accountNumber">Account Number</Label>
                                    <Input id="accountNumber" name="accountNumber" value={paymentFields.accountNumber} onChange={(e) => setPaymentFields({ ...paymentFields, [e.target.name]: e.target.value })} placeholder="0000 0000 0000" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ifsc">IFSC / Routing Code</Label>
                                    <Input id="ifsc" name="ifsc" value={paymentFields.ifsc} onChange={(e) => setPaymentFields({ ...paymentFields, [e.target.name]: e.target.value })} placeholder="HDFC0001234" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t bg-slate-50/50 pt-6">
                        <Button onClick={savePayment} disabled={saving} className="ml-auto bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 shadow-lg">
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Verify & Update Bank Details"}
                        </Button>
                    </CardFooter>
                </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
