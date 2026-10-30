/**
 * User-friendly Firebase Authentication error mapper
 */
export function getFriendlyAuthErrorMessage(error: any, providerName?: string): string {
  if (!error) return 'An unexpected authentication error occurred.';
  const code = error.code || '';
  const message = error.message || '';

  switch (code) {
    case 'auth/operation-not-allowed':
      return `${providerName || 'This sign-in provider'} is not currently enabled in the Firebase Console. To enable it: Go to Firebase Console > Authentication > Sign-in method, click '${providerName || 'the provider'}', toggle 'Enable', and click Save.`;

    case 'auth/invalid-credential':
      return 'Invalid credentials. Please verify your email/phone and password.';

    case 'auth/user-not-found':
      return 'No account exists with this email address. Please create an account first.';

    case 'auth/wrong-password':
      return 'Incorrect password. Please verify and try again, or use "Forgot Password".';

    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please sign in instead.';

    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 6 characters.';

    case 'auth/popup-closed-by-user':
      return 'The authentication popup was closed before completing. Please try again.';

    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email using a different sign-in method. Please sign in using your original method.';

    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for OAuth sign-in. Add this site URL to Firebase Console > Authentication > Settings > Authorized Domains.';

    case 'auth/too-many-requests':
      return 'Access temporarily disabled due to multiple failed login attempts. Please wait a few moments and try again.';

    case 'auth/invalid-phone-number':
      return 'Invalid phone number format. Please enter an international phone number including country code (e.g., +1 555 123 4567 or +60 12 345 6789).';

    case 'auth/quota-exceeded':
      return 'SMS quota has been exceeded for this project. Please check Firebase SMS billing/quota or try another sign-in method.';

    case 'auth/invalid-verification-code':
      return 'The 6-digit SMS verification code entered is incorrect. Please check the text message and re-enter.';

    case 'auth/code-expired':
      return 'The SMS verification code has expired. Please request a new code.';

    case 'auth/captcha-check-failed':
      return 'reCAPTCHA verification failed. Please try again.';

    default:
      if (message.includes('auth/operation-not-allowed')) {
        return `${providerName || 'This sign-in provider'} is not enabled in Firebase Console. Please enable ${providerName || 'it'} under Authentication > Sign-in method.`;
      }
      return message || 'Authentication failed. Please check your credentials and try again.';
  }
}
