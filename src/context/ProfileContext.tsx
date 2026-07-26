import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';
import { DEFAULT_PROFILE, loadUserProfile, saveUserProfile } from '../services/storageService';
import { calculateBMR, calculateTDEE } from '../utils/calorieCalc';

interface ProfileContextType {
  profile: UserProfile;
  bmr: number;
  tdee: number;
  isLoading: boolean;
  updateProfile: (newProfile: Partial<UserProfile>) => Promise<void>;
  toggleCheatDay: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initProfile() {
      setIsLoading(true);
      const loaded = await loadUserProfile();
      setProfile(loaded);
      setIsLoading(false);
    }
    initProfile();
  }, []);

  const updateProfile = async (newProfile: Partial<UserProfile>) => {
    const updated = { ...profile, ...newProfile };
    setProfile(updated);
    await saveUserProfile(updated);
  };

  const toggleCheatDay = async () => {
    const updated = { ...profile, isCheatDay: !profile.isCheatDay };
    setProfile(updated);
    await saveUserProfile(updated);
  };

  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(profile);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        bmr,
        tdee,
        isLoading,
        updateProfile,
        toggleCheatDay,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
