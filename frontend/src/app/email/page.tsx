'use client';

import React from 'react';
import EmailView from '../../components/EmailView';
import EmailSetupView from '../../components/EmailSetupView';

export default function EmailPage() {
  return <EmailView setupComponent={<EmailSetupView />} />;
}
