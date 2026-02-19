import { useState } from 'react';

interface UpgradePromptOptions {
  onUpgrade?: (tier: 'basic' | 'premium') => void;
}

export const useUpgradePrompt = (options?: UpgradePromptOptions) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string>('');

  const checkResponse = async (response: Response) => {
    if (response.status === 403) {
      const error = await response.json();
      const message = error.detail || 'Upgrade required';
      
      // Show upgrade modal with specific reason
      setUpgradeReason(message);
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  };

  const handleUpgrade = (tier: 'basic' | 'premium') => {
    setShowUpgradeModal(false);
    options?.onUpgrade?.(tier);
  };

  const closeModal = () => {
    setShowUpgradeModal(false);
    setUpgradeReason('');
  };

  return {
    showUpgradeModal,
    upgradeReason,
    checkResponse,
    handleUpgrade,
    closeModal,
  };
};
