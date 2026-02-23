import { useState, useEffect, useRef } from "react";
import api from "../api";
import { User, Upload, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [profile, setProfile] = useState<{
    UserID: number;
    UserName: string;
    Email: string;
    ProfileIcon: string | null;
    DateJoined: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const backendUrl = import.meta.env.VITE_API_BASE
    ? import.meta.env.VITE_API_BASE.replace("/api", "")
    : "http://localhost:5000";

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users/profile");
      setProfile(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    const formData = new FormData();
    formData.append("icon", file);

    try {
      setUploading(true);
      const res = await api.post("/users/profile/icon", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // Optionally update profile state with new icon path
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              ProfileIcon: res.data.ProfileIcon,
            }
          : null,
      );
      // Let other components (like Sidebar) know the profile icon changed if needed
      // A quick cheat is a page reload or emitting an event, but returning to standard react we just update our own state.
      // To force Sidebar to update, a window location reload works well for simple apps:
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to upload image");
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (loading) {
    return <div className="p-8">Loading profile...</div>;
  }

  if (error || !profile) {
    return (
      <div className="p-8 text-red-600">
        <p>{error || "Profile not found"}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 text-blue-500 underline"
        >
          Go Home
        </button>
      </div>
    );
  }

  const iconUrl = profile.ProfileIcon
    ? `${backendUrl}${profile.ProfileIcon}`
    : null;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          title="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-3xl font-bold text-gray-800">Your Profile</h1>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="flex flex-col items-center">
          {/* Profile Icon Container */}
          <div
            className="relative mb-6 group cursor-pointer"
            onClick={handleIconClick}
          >
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-md flex items-center justify-center relative">
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={64} className="text-gray-400" />
              )}

              {/* Overlay for hover */}
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="text-white mb-1" size={24} />
                <span className="text-white text-xs font-medium">
                  {uploading ? "Uploading..." : "Change Image"}
                </span>
              </div>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {profile.UserName}
          </h2>
          <p className="text-gray-500 mb-8">{profile.Email}</p>

          <div className="w-full border-t border-gray-100 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="block text-gray-500 mb-1">User ID</span>
                <span className="font-mono font-medium text-gray-900">
                  {profile.UserID}
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <span className="block text-gray-500 mb-1">Status</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                <span className="block text-gray-500 mb-1">Date Joined</span>
                <span className="font-medium text-gray-900">
                  {new Date(profile.DateJoined).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
