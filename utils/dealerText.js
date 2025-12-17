/**
 * Replaces placeholder tokens in text with dealer information
 * Tokens: {dealer.companyName}, {dealer.companyAddress}, {dealer.companyPhone}, {dealer.companyEmail}
 */
export function replaceDealerTokens(text, dealer) {
  if (!text || !dealer) return text;

  return text
    .replace(/\{dealer\.companyName\}/g, dealer.companyName || dealer.name || 'Our Dealership')
    .replace(/\{dealer\.companyAddress\}/g, dealer.companyAddress || dealer.address || '')
    .replace(/\{dealer\.companyPhone\}/g, dealer.companyPhone || dealer.phone || '')
    .replace(/\{dealer\.companyEmail\}/g, dealer.companyEmail || dealer.email || '')
    .replace(/\{dealer\.name\}/g, dealer.name || 'Our Dealership')
    .replace(/My New Motor LTD/g, dealer.companyName || dealer.name || 'Our Dealership')
    .replace(/My New Motor/g, dealer.companyName || dealer.name || 'Our Dealership');
}

/**
 * Get the company name to display, falling back gracefully
 */
export function getCompanyName(dealer) {
  return dealer?.companyName || dealer?.name || 'Our Dealership';
}

/**
 * Get formatted address for forms
 */
export function getFormattedAddress(dealer) {
  return dealer?.companyAddress || dealer?.address || '';
}

/**
 * Get contact phone for forms
 */
export function getContactPhone(dealer) {
  return dealer?.companyPhone || dealer?.phone || '';
}

/**
 * Get contact email for forms
 */
export function getContactEmail(dealer) {
  return dealer?.companyEmail || dealer?.email || '';
}
