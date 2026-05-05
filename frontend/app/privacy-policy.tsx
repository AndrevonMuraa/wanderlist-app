/**
 * Privacy Policy screen.
 *
 * Content is now fetched live from the Trust Center
 * (configurable via EXPO_PUBLIC_TRUST_CENTER_URL, defaults to https://wandermark.app/privacy.md).
 * Falls back to the bundled markdown if the network is unreachable.
 * See /app/frontend/components/LegalMarkdownViewer.tsx for the rendering logic.
 */
import React from 'react';
import LegalMarkdownViewer from '../components/LegalMarkdownViewer';

export default function PrivacyPolicyScreen() {
  return (
    <LegalMarkdownViewer
      doc="privacy"
      title="Privacy Policy"
      headerIcon="shield-checkmark"
      crossLinkLabel="View Terms of Service"
      crossLinkRoute="/terms-of-service"
      crossLinkIcon="document-text"
    />
  );
}
