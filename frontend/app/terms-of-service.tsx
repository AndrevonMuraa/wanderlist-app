/**
 * Terms of Service screen.
 *
 * Content is now fetched live from the Trust Center
 * (configurable via EXPO_PUBLIC_TRUST_CENTER_URL, defaults to https://wandermark.app/terms.md).
 * Falls back to the bundled markdown if the network is unreachable.
 * See /app/frontend/components/LegalMarkdownViewer.tsx for the rendering logic.
 */
import React from 'react';
import LegalMarkdownViewer from '../components/LegalMarkdownViewer';

export default function TermsOfServiceScreen() {
  return (
    <LegalMarkdownViewer
      doc="terms"
      title="Terms of Service"
      headerIcon="document-text"
      crossLinkLabel="View Privacy Policy"
      crossLinkRoute="/privacy-policy"
      crossLinkIcon="shield-checkmark"
    />
  );
}
