import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
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
  const profileRef = useRef<UserProfile>(DEFAULT_PROFILE);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    async function initProfile() {
      setIsLoading(true);
      const loaded = await loadUserProfile();
      profileRef.current = loaded;
      setProfile(loaded);
      setIsLoading(false);
    }
    initProfile();
  }, []);

  const enqueueProfileMutation = (
    mutate: (current: UserProfile) => UserProfile
  ): Promise<void> => {
    const run = mutationQueueRef.current.then(async () => {
      const updated = mutate(profileRef.current);
      profileRef.current = updated;
      setProfile(updated);
      await saveUserProfile(updated);
    });

    mutationQueueRef.current = run.catch(() => undefined);
    return run;
  };

  const updateProfile = async (newProfile: Partial<UserProfile>) => {
    await enqueueProfileMutation((current) => ({ ...current, ...newProfile }));
  };

  const toggleCheatDay = async () => {
    await enqueueProfileMutation((current) => ({
      ...current,
      isCheatDay: !current.isCheatDay,
    }));
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
