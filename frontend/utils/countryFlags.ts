export const countryFlags: Record<string, string> = {
  // Europe (20)
  france: '🇫🇷', spain: '🇪🇸', italy: '🇮🇹', germany: '🇩🇪',
  'united kingdom': '🇬🇧', greece: '🇬🇷', norway: '🇳🇴', portugal: '🇵🇹',
  netherlands: '🇳🇱', switzerland: '🇨🇭', austria: '🇦🇹', sweden: '🇸🇪',
  denmark: '🇩🇰', iceland: '🇮🇸', croatia: '🇭🇷', finland: '🇫🇮',
  turkey: '🇹🇷', ireland: '🇮🇪', hungary: '🇭🇺', 'czech republic': '🇨🇿',
  // Asia (20)
  japan: '🇯🇵', china: '🇨🇳', thailand: '🇹🇭', india: '🇮🇳',
  vietnam: '🇻🇳', 'south korea': '🇰🇷', indonesia: '🇮🇩', malaysia: '🇲🇾',
  singapore: '🇸🇬', philippines: '🇵🇭', cambodia: '🇰🇭', nepal: '🇳🇵',
  'sri lanka': '🇱🇰', taiwan: '🇹🇼', laos: '🇱🇦', mongolia: '🇲🇳',
  bhutan: '🇧🇹', georgia: '🇬🇪', uzbekistan: '🇺🇿', pakistan: '🇵🇰',
  // Africa (20)
  egypt: '🇪🇬', 'south africa': '🇿🇦', morocco: '🇲🇦', kenya: '🇰🇪',
  tanzania: '🇹🇿', botswana: '🇧🇼', namibia: '🇳🇦', tunisia: '🇹🇳',
  ghana: '🇬🇭', rwanda: '🇷🇼', uganda: '🇺🇬', ethiopia: '🇪🇹',
  senegal: '🇸🇳', zimbabwe: '🇿🇼', zambia: '🇿🇲', mozambique: '🇲🇿',
  'ivory coast': '🇨🇮', malawi: '🇲🇼', lesotho: '🇱🇸', eswatini: '🇸🇿',
  // Americas (20)
  usa: '🇺🇸', 'united states': '🇺🇸', canada: '🇨🇦', mexico: '🇲🇽',
  brazil: '🇧🇷', peru: '🇵🇪', argentina: '🇦🇷', chile: '🇨🇱',
  colombia: '🇨🇴', ecuador: '🇪🇨', 'costa rica': '🇨🇷', cuba: '🇨🇺',
  jamaica: '🇯🇲', 'dominican republic': '🇩🇴', panama: '🇵🇦', bahamas: '🇧🇸',
  barbados: '🇧🇧', uruguay: '🇺🇾', bolivia: '🇧🇴', belize: '🇧🇿',
  'saint lucia': '🇱🇨',
  // Oceania & Island Paradises (20)
  australia: '🇦🇺', 'new zealand': '🇳🇿', fiji: '🇫🇯', 'french polynesia': '🇵🇫',
  maldives: '🇲🇻', mauritius: '🇲🇺', seychelles: '🇸🇨',
  'cook islands': '🇨🇰', samoa: '🇼🇸', vanuatu: '🇻🇺',
  hawaii: '🇺🇸', madagascar: '🇲🇬', 'cape verde': '🇨🇻',
  'papua new guinea': '🇵🇬', palau: '🇵🇼', 'solomon islands': '🇸🇧',
  'new caledonia': '🇳🇨', guam: '🇬🇺', comoros: '🇰🇲', reunion: '🇷🇪',
};

export const getCountryFlag = (countryName: string): string => {
  const key = countryName.toLowerCase();
  return countryFlags[key] || '🏳️';
};
